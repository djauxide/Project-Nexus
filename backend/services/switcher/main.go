package main

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"os/signal"
	"sync"
	"syscall"
	"time"
)

const (
	defaultMECount    = 4
	defaultInputCount = 32
	cutLatencyTarget  = 16 * time.Millisecond
)

// MixEffect represents one M/E bank
type MixEffect struct {
	mu           sync.Mutex
	id           string
	program      int
	preview      int
	inTransition bool
	progress     float64
}

func (me *MixEffect) Cut(newPvw int) (oldPgm, oldPvw int) {
	me.mu.Lock()
	defer me.mu.Unlock()
	oldPgm = me.program
	oldPvw = me.preview
	me.program = me.preview
	me.preview = newPvw
	return
}

func (me *MixEffect) State() (pgm, pvw int) {
	me.mu.Lock()
	defer me.mu.Unlock()
	return me.program, me.preview
}

// SwitcherServer manages all M/E banks
type SwitcherServer struct {
	meBanks   []*MixEffect
	inputs    []Input
	eventChan chan Event
}

type Input struct {
	ID     string `json:"id"`
	Name   string `json:"name"`
	Format string `json:"format"`
}

type Event struct {
	Type      string                 `json:"type"`
	Timestamp time.Time              `json:"timestamp"`
	Data      map[string]interface{} `json:"data"`
}

type CutRequest struct {
	ME         int `json:"me"`
	NewPreview int `json:"new_preview"`
}

type CutResponse struct {
	Success       bool    `json:"success"`
	NewProgram    int     `json:"new_program"`
	NewPreview    int     `json:"new_preview"`
	LatencyMicros int64   `json:"latency_micros"`
}

func NewSwitcherServer() *SwitcherServer {
	s := &SwitcherServer{
		meBanks:   make([]*MixEffect, defaultMECount),
		inputs:    make([]Input, defaultInputCount),
		eventChan: make(chan Event, 100),
	}
	for i := range s.meBanks {
		s.meBanks[i] = &MixEffect{
			id:      fmt.Sprintf("ME-%d", i+1),
			program: 1,
			preview: 2,
		}
	}
	for i := range s.inputs {
		s.inputs[i] = Input{
			ID:     fmt.Sprintf("IN-%02d", i+1),
			Name:   fmt.Sprintf("CAM-%02d", i+1),
			Format: "1080i50",
		}
	}
	return s
}

func (s *SwitcherServer) handleCut(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}
	var req CutRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "invalid request", http.StatusBadRequest)
		return
	}
	if req.ME < 1 || req.ME > defaultMECount {
		http.Error(w, "invalid M/E bank", http.StatusBadRequest)
		return
	}
	if req.NewPreview < 1 || req.NewPreview > defaultInputCount {
		http.Error(w, "invalid preview input", http.StatusBadRequest)
		return
	}

	start := time.Now()
	me := s.meBanks[req.ME-1]
	oldPgm, oldPvw := me.Cut(req.NewPreview)
	latency := time.Since(start)

	s.eventChan <- Event{
		Type:      "CUT_COMPLETE",
		Timestamp: time.Now(),
		Data: map[string]interface{}{
			"me":         req.ME,
			"old_pgm":    oldPgm,
			"new_pgm":    oldPvw,
			"new_pvw":    req.NewPreview,
			"latency_ns": latency.Nanoseconds(),
		},
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(CutResponse{
		Success:       true,
		NewProgram:    oldPvw,
		NewPreview:    req.NewPreview,
		LatencyMicros: latency.Microseconds(),
	})
}

func (s *SwitcherServer) handleState(w http.ResponseWriter, r *http.Request) {
	type MEState struct {
		ID      string `json:"id"`
		Program int    `json:"program"`
		Preview int    `json:"preview"`
	}
	states := make([]MEState, len(s.meBanks))
	for i, me := range s.meBanks {
		pgm, pvw := me.State()
		states[i] = MEState{ID: me.id, Program: pgm, Preview: pvw}
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(states)
}

func (s *SwitcherServer) handleHealth(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"status": "healthy"})
}

func main() {
	server := NewSwitcherServer()

	mux := http.NewServeMux()
	mux.HandleFunc("/cut",    server.handleCut)
	mux.HandleFunc("/state",  server.handleState)
	mux.HandleFunc("/health", server.handleHealth)

	port := os.Getenv("PORT")
	if port == "" {
		port = "50051"
	}

	httpServer := &http.Server{
		Addr:    ":" + port,
		Handler: mux,
	}

	go func() {
		log.Printf("Switcher service listening on :%s", port)
		if err := httpServer.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("server error: %v", err)
		}
	}()

	sigChan := make(chan os.Signal, 1)
	signal.Notify(sigChan, syscall.SIGINT, syscall.SIGTERM)
	<-sigChan

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	httpServer.Shutdown(ctx)
	log.Println("Switcher service stopped")
}
