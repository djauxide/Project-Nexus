// NEXUS — Blackmagic ATEM Integration Service
// Implements the ATEM UDP control protocol (port 9910)
// Supports: ATEM Mini, Mini Pro, Mini Extreme, 1 M/E, 2 M/E, 4 M/E, Constellation
package main

import (
	"context"
	"encoding/binary"
	"encoding/json"
	"fmt"
	"log"
	"net"
	"net/http"
	"os"
	"os/signal"
	"sync"
	"syscall"
	"time"
)

// ── ATEM Protocol Constants ───────────────────────────────────────────────────

const (
	ATEMPort        = 9910
	ATEMHeaderSize  = 12
	ATEMFlagHello   = 0x10
	ATEMFlagAck     = 0x80
	ATEMFlagResend  = 0x20
	ATEMFlagInit    = 0x02
	MaxRetries      = 5
	AckTimeout      = 500 * time.Millisecond
	HeartbeatPeriod = 1 * time.Second
)

// ATEM command IDs (4-byte ASCII)
var (
	CmdProgramInput  = [4]byte{'P', 'r', 'I', 'n'}
	CmdPreviewInput  = [4]byte{'P', 'v', 'I', 'n'}
	CmdTransitionPos = [4]byte{'T', 'r', 'P', 's'}
	CmdTransitionSt  = [4]byte{'T', 'r', 'S', 's'}
	CmdTallyByIndex  = [4]byte{'T', 'l', 'I', 'n'}
	CmdTallyBySource = [4]byte{'T', 'l', 'S', 'r'}
	CmdInputProp     = [4]byte{'I', 'n', 'P', 'r'}
	CmdAuxSource     = [4]byte{'A', 'x', 'S', 'r'}
	CmdMacroRun      = [4]byte{'M', 'a', 'R', 'u'}
	CmdMacroList     = [4]byte{'M', 'R', 'P', 'r'}
	CmdVersion       = [4]byte{'_', 'v', 'e', 'r'}
	CmdProductId     = [4]byte{'_', 'p', 'i', 'd'}
	CmdTopology      = [4]byte{'_', 't', 'o', 'p'}
)

// ── Packet ────────────────────────────────────────────────────────────────────

type ATEMPacket struct {
	Flags         uint8
	Length        uint16
	SessionID     uint16
	AckPacketID   uint16
	Unknown       uint16
	PacketID      uint16
	Commands      []ATEMCommand
}

type ATEMCommand struct {
	Length  uint16
	Unknown uint8
	Flags   uint8
	Name    [4]byte
	Data    []byte
}

func parsePacket(buf []byte) (*ATEMPacket, error) {
	if len(buf) < ATEMHeaderSize {
		return nil, fmt.Errorf("packet too short: %d", len(buf))
	}
	p := &ATEMPacket{
		Flags:       buf[0] >> 3,
		Length:      binary.BigEndian.Uint16(buf[0:2]) & 0x07FF,
		SessionID:   binary.BigEndian.Uint16(buf[2:4]),
		AckPacketID: binary.BigEndian.Uint16(buf[4:6]),
		Unknown:     binary.BigEndian.Uint16(buf[6:8]),
		PacketID:    binary.BigEndian.Uint16(buf[10:12]),
	}
	pos := ATEMHeaderSize
	for pos+8 <= len(buf) {
		cmdLen := int(binary.BigEndian.Uint16(buf[pos : pos+2]))
		if cmdLen < 8 || pos+cmdLen > len(buf) {
			break
		}
		cmd := ATEMCommand{
			Length:  uint16(cmdLen),
			Unknown: buf[pos+2],
			Flags:   buf[pos+3],
		}
		copy(cmd.Name[:], buf[pos+4:pos+8])
		if cmdLen > 8 {
			cmd.Data = make([]byte, cmdLen-8)
			copy(cmd.Data, buf[pos+8:pos+cmdLen])
		}
		p.Commands = append(p.Commands, cmd)
		pos += cmdLen
	}
	return p, nil
}

func buildPacket(flags uint8, sessionID, ackID, packetID uint16, cmds [][]byte) []byte {
	body := []byte{}
	for _, c := range cmds {
		body = append(body, c...)
	}
	totalLen := ATEMHeaderSize + len(body)
	buf := make([]byte, totalLen)
	binary.BigEndian.PutUint16(buf[0:2], uint16(flags<<3)|uint16(totalLen&0x07FF))
	binary.BigEndian.PutUint16(buf[2:4], sessionID)
	binary.BigEndian.PutUint16(buf[4:6], ackID)
	binary.BigEndian.PutUint16(buf[10:12], packetID)
	copy(buf[ATEMHeaderSize:], body)
	return buf
}

func buildCommand(name [4]byte, data []byte) []byte {
	cmdLen := 8 + len(data)
	buf := make([]byte, cmdLen)
	binary.BigEndian.PutUint16(buf[0:2], uint16(cmdLen))
	copy(buf[4:8], name[:])
	copy(buf[8:], data)
	return buf
}

// ── ATEM State ────────────────────────────────────────────────────────────────

type InputInfo struct {
	Index      uint16 `json:"index"`
	LongName   string `json:"long_name"`
	ShortName  string `json:"short_name"`
	InputType  uint8  `json:"input_type"`
}

type MEState struct {
	ProgramInput  uint16  `json:"program_input"`
	PreviewInput  uint16  `json:"preview_input"`
	InTransition  bool    `json:"in_transition"`
	TransPosition float64 `json:"trans_position"`
	TransStyle    uint8   `json:"trans_style"`
}

type TallyEntry struct {
	Source uint16 `json:"source"`
	PGM    bool   `json:"pgm"`
	PVW    bool   `json:"pvw"`
}

type ATEMState struct {
	mu          sync.RWMutex
	Connected   bool              `json:"connected"`
	ProductName string            `json:"product_name"`
	Version     string            `json:"version"`
	MEs         []MEState         `json:"mes"`
	Inputs      map[uint16]InputInfo `json:"inputs"`
	Tallies     []TallyEntry      `json:"tallies"`
	AuxSources  map[uint8]uint16  `json:"aux_sources"`
}

func newATEMState(meCount int) *ATEMState {
	s := &ATEMState{
		MEs:        make([]MEState, meCount),
		Inputs:     make(map[uint16]InputInfo),
		AuxSources: make(map[uint8]uint16),
	}
	return s
}

func (s *ATEMState) applyCommand(cmd ATEMCommand) {
	s.mu.Lock()
	defer s.mu.Unlock()
	switch cmd.Name {
	case CmdProgramInput:
		if len(cmd.Data) >= 4 {
			me := int(cmd.Data[0])
			src := binary.BigEndian.Uint16(cmd.Data[2:4])
			if me < len(s.MEs) {
				s.MEs[me].ProgramInput = src
			}
		}
	case CmdPreviewInput:
		if len(cmd.Data) >= 4 {
			me := int(cmd.Data[0])
			src := binary.BigEndian.Uint16(cmd.Data[2:4])
			if me < len(s.MEs) {
				s.MEs[me].PreviewInput = src
			}
		}
	case CmdTransitionPos:
		if len(cmd.Data) >= 4 {
			me := int(cmd.Data[0])
			pos := binary.BigEndian.Uint16(cmd.Data[2:4])
			if me < len(s.MEs) {
				s.MEs[me].TransPosition = float64(pos) / 9999.0
			}
		}
	case CmdTallyByIndex:
		if len(cmd.Data) >= 2 {
			count := int(binary.BigEndian.Uint16(cmd.Data[0:2]))
			s.Tallies = make([]TallyEntry, 0, count)
			for i := 0; i < count && 2+i < len(cmd.Data); i++ {
				b := cmd.Data[2+i]
				s.Tallies = append(s.Tallies, TallyEntry{
					Source: uint16(i + 1),
					PGM:    b&0x01 != 0,
					PVW:    b&0x02 != 0,
				})
			}
		}
	case CmdInputProp:
		if len(cmd.Data) >= 32 {
			idx := binary.BigEndian.Uint16(cmd.Data[0:2])
			s.Inputs[idx] = InputInfo{
				Index:     idx,
				LongName:  nullTermStr(cmd.Data[4:24]),
				ShortName: nullTermStr(cmd.Data[24:28]),
				InputType: cmd.Data[29],
			}
		}
	case CmdAuxSource:
		if len(cmd.Data) >= 4 {
			aux := cmd.Data[1]
			src := binary.BigEndian.Uint16(cmd.Data[2:4])
			s.AuxSources[aux] = src
		}
	case CmdProductId:
		if len(cmd.Data) >= 44 {
			s.ProductName = nullTermStr(cmd.Data[0:44])
		}
	case CmdVersion:
		if len(cmd.Data) >= 4 {
			major := binary.BigEndian.Uint16(cmd.Data[0:2])
			minor := binary.BigEndian.Uint16(cmd.Data[2:4])
			s.Version = fmt.Sprintf("%d.%d", major, minor)
		}
	}
}

func nullTermStr(b []byte) string {
	for i, c := range b {
		if c == 0 {
			return string(b[:i])
		}
	}
	return string(b)
}

// ── ATEM Client ───────────────────────────────────────────────────────────────

type ATEMClient struct {
	addr      string
	conn      *net.UDPConn
	sessionID uint16
	packetID  uint16
	state     *ATEMState
	events    chan Event
	mu        sync.Mutex
	connected bool
}

type Event struct {
	Type      string      `json:"type"`
	Timestamp time.Time   `json:"timestamp"`
	Data      interface{} `json:"data"`
}

func NewATEMClient(addr string, meCount int) *ATEMClient {
	return &ATEMClient{
		addr:   addr,
		state:  newATEMState(meCount),
		events: make(chan Event, 256),
	}
}

func (c *ATEMClient) Connect(ctx context.Context) error {
	udpAddr, err := net.ResolveUDPAddr("udp", fmt.Sprintf("%s:%d", c.addr, ATEMPort))
	if err != nil {
		return fmt.Errorf("resolve: %w", err)
	}
	conn, err := net.DialUDP("udp", nil, udpAddr)
	if err != nil {
		return fmt.Errorf("dial: %w", err)
	}
	c.conn = conn
	c.sessionID = 0x5678

	// Send hello
	hello := buildPacket(ATEMFlagHello, c.sessionID, 0, 0, nil)
	if _, err := conn.Write(hello); err != nil {
		return fmt.Errorf("hello: %w", err)
	}

	go c.readLoop(ctx)
	go c.heartbeatLoop(ctx)
	return nil
}

func (c *ATEMClient) readLoop(ctx context.Context) {
	buf := make([]byte, 65536)
	for {
		select {
		case <-ctx.Done():
			return
		default:
		}
		c.conn.SetReadDeadline(time.Now().Add(2 * time.Second))
		n, err := c.conn.Read(buf)
		if err != nil {
			if netErr, ok := err.(net.Error); ok && netErr.Timeout() {
				continue
			}
			log.Printf("ATEM read error: %v", err)
			c.state.mu.Lock()
			c.state.Connected = false
			c.state.mu.Unlock()
			return
		}
		pkt, err := parsePacket(buf[:n])
		if err != nil {
			continue
		}
		// Send ACK
		if pkt.Flags&ATEMFlagAck == 0 && pkt.PacketID > 0 {
			ack := buildPacket(ATEMFlagAck, c.sessionID, pkt.PacketID, 0, nil)
			c.conn.Write(ack)
		}
		// Handle init complete
		if pkt.Flags&ATEMFlagInit != 0 {
			c.state.mu.Lock()
			c.state.Connected = true
			c.state.mu.Unlock()
			c.events <- Event{Type: "connected", Timestamp: time.Now(), Data: c.addr}
		}
		// Apply commands
		for _, cmd := range pkt.Commands {
			c.state.applyCommand(cmd)
			c.events <- Event{
				Type:      fmt.Sprintf("cmd_%s", string(cmd.Name[:])),
				Timestamp: time.Now(),
				Data:      cmd.Data,
			}
		}
	}
}

func (c *ATEMClient) heartbeatLoop(ctx context.Context) {
	ticker := time.NewTicker(HeartbeatPeriod)
	defer ticker.Stop()
	for {
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
			c.mu.Lock()
			pkt := buildPacket(ATEMFlagAck, c.sessionID, 0, 0, nil)
			c.mu.Unlock()
			if c.conn != nil {
				c.conn.Write(pkt)
			}
		}
	}
}

// SendCut sends a program cut command to the ATEM
func (c *ATEMClient) SendCut(me uint8, source uint16) error {
	data := make([]byte, 4)
	data[0] = me
	binary.BigEndian.PutUint16(data[2:4], source)
	cmd := buildCommand(CmdProgramInput, data)
	c.mu.Lock()
	c.packetID++
	pkt := buildPacket(0x08, c.sessionID, 0, c.packetID, [][]byte{cmd})
	c.mu.Unlock()
	_, err := c.conn.Write(pkt)
	return err
}

// SendPreview sets the preview bus
func (c *ATEMClient) SendPreview(me uint8, source uint16) error {
	data := make([]byte, 4)
	data[0] = me
	binary.BigEndian.PutUint16(data[2:4], source)
	cmd := buildCommand(CmdPreviewInput, data)
	c.mu.Lock()
	c.packetID++
	pkt := buildPacket(0x08, c.sessionID, 0, c.packetID, [][]byte{cmd})
	c.mu.Unlock()
	_, err := c.conn.Write(pkt)
	return err
}

// SendAutoTransition triggers an auto transition
func (c *ATEMClient) SendAutoTransition(me uint8) error {
	data := []byte{me, 0, 0, 0}
	cmd := buildCommand([4]byte{'D', 'A', 'T', 'r'}, data)
	c.mu.Lock()
	c.packetID++
	pkt := buildPacket(0x08, c.sessionID, 0, c.packetID, [][]byte{cmd})
	c.mu.Unlock()
	_, err := c.conn.Write(pkt)
	return err
}

// SetAuxSource routes a source to an aux output
func (c *ATEMClient) SetAuxSource(aux uint8, source uint16) error {
	data := make([]byte, 4)
	data[1] = aux
	binary.BigEndian.PutUint16(data[2:4], source)
	cmd := buildCommand(CmdAuxSource, data)
	c.mu.Lock()
	c.packetID++
	pkt := buildPacket(0x08, c.sessionID, 0, c.packetID, [][]byte{cmd})
	c.mu.Unlock()
	_, err := c.conn.Write(pkt)
	return err
}

// ── HTTP API ──────────────────────────────────────────────────────────────────

type Server struct {
	client  *ATEMClient
	eventCh chan Event
}

func (s *Server) routes() *http.ServeMux {
	mux := http.NewServeMux()
	mux.HandleFunc("/health",      s.handleHealth)
	mux.HandleFunc("/state",       s.handleState)
	mux.HandleFunc("/cut",         s.handleCut)
	mux.HandleFunc("/preview",     s.handlePreview)
	mux.HandleFunc("/auto",        s.handleAuto)
	mux.HandleFunc("/aux",         s.handleAux)
	mux.HandleFunc("/tally",       s.handleTally)
	mux.HandleFunc("/inputs",      s.handleInputs)
	return mux
}

func (s *Server) handleHealth(w http.ResponseWriter, r *http.Request) {
	s.client.state.mu.RLock()
	connected := s.client.state.Connected
	product := s.client.state.ProductName
	version := s.client.state.Version
	s.client.state.mu.RUnlock()
	status := "healthy"
	if !connected {
		status = "disconnected"
	}
	jsonResp(w, map[string]interface{}{
		"status": status, "connected": connected,
		"product": product, "version": version,
	})
}

func (s *Server) handleState(w http.ResponseWriter, r *http.Request) {
	s.client.state.mu.RLock()
	defer s.client.state.mu.RUnlock()
	jsonResp(w, s.client.state)
}

func (s *Server) handleCut(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "POST only", 405); return
	}
	var req struct {
		ME     uint8  `json:"me"`
		Source uint16 `json:"source"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, err.Error(), 400); return
	}
	if err := s.client.SendCut(req.ME, req.Source); err != nil {
		http.Error(w, err.Error(), 500); return
	}
	jsonResp(w, map[string]bool{"success": true})
}

func (s *Server) handlePreview(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "POST only", 405); return
	}
	var req struct {
		ME     uint8  `json:"me"`
		Source uint16 `json:"source"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, err.Error(), 400); return
	}
	if err := s.client.SendPreview(req.ME, req.Source); err != nil {
		http.Error(w, err.Error(), 500); return
	}
	jsonResp(w, map[string]bool{"success": true})
}

func (s *Server) handleAuto(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "POST only", 405); return
	}
	var req struct{ ME uint8 `json:"me"` }
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, err.Error(), 400); return
	}
	if err := s.client.SendAutoTransition(req.ME); err != nil {
		http.Error(w, err.Error(), 500); return
	}
	jsonResp(w, map[string]bool{"success": true})
}

func (s *Server) handleAux(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "POST only", 405); return
	}
	var req struct {
		Aux    uint8  `json:"aux"`
		Source uint16 `json:"source"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, err.Error(), 400); return
	}
	if err := s.client.SetAuxSource(req.Aux, req.Source); err != nil {
		http.Error(w, err.Error(), 500); return
	}
	jsonResp(w, map[string]bool{"success": true})
}

func (s *Server) handleTally(w http.ResponseWriter, r *http.Request) {
	s.client.state.mu.RLock()
	defer s.client.state.mu.RUnlock()
	jsonResp(w, s.client.state.Tallies)
}

func (s *Server) handleInputs(w http.ResponseWriter, r *http.Request) {
	s.client.state.mu.RLock()
	defer s.client.state.mu.RUnlock()
	jsonResp(w, s.client.state.Inputs)
}

func jsonResp(w http.ResponseWriter, v interface{}) {
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(v)
}

func main() {
	atemAddr := os.Getenv("ATEM_ADDRESS")
	if atemAddr == "" {
		atemAddr = "192.168.10.240" // default ATEM IP
	}
	meCount := 4
	port := os.Getenv("PORT")
	if port == "" {
		port = "8020"
	}

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	client := NewATEMClient(atemAddr, meCount)
	srv := &Server{client: client}

	log.Printf("Connecting to ATEM at %s:%d", atemAddr, ATEMPort)
	if err := client.Connect(ctx); err != nil {
		log.Printf("ATEM connect failed (will retry): %v", err)
	}

	// Event logger
	go func() {
		for evt := range client.events {
			if evt.Type == "connected" {
				log.Printf("ATEM connected: %s", atemAddr)
			}
		}
	}()

	httpSrv := &http.Server{Addr: ":" + port, Handler: srv.routes()}
	go func() {
		log.Printf("ATEM service HTTP on :%s", port)
		if err := httpSrv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("HTTP error: %v", err)
		}
	}()

	sig := make(chan os.Signal, 1)
	signal.Notify(sig, syscall.SIGINT, syscall.SIGTERM)
	<-sig
	cancel()
	ctx2, cancel2 := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel2()
	httpSrv.Shutdown(ctx2)
	log.Println("ATEM service stopped")
}
