package main

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"sync"
	"time"
)

type RecordingState struct {
	mu       sync.RWMutex
	active   map[string]*Recording
	usedGB   float64
	totalGB  float64
}

type Recording struct {
	ID        string    `json:"id"`
	Name      string    `json:"name"`
	Format    string    `json:"format"`
	StartedAt time.Time `json:"started_at"`
	SizeBytes int64     `json:"size_bytes"`
	Active    bool      `json:"active"`
}

type StorageStatus struct {
	UsedGB      float64 `json:"used_gb"`
	TotalGB     float64 `json:"total_gb"`
	UsagePct    float64 `json:"usage_percent"`
	ActiveCount int     `json:"active_recordings"`
}

var state = &RecordingState{
	active:  make(map[string]*Recording),
	usedGB:  480,
	totalGB: 2000,
}

func handleStorage(w http.ResponseWriter, r *http.Request) {
	state.mu.RLock()
	defer state.mu.RUnlock()
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(StorageStatus{
		UsedGB:      state.usedGB,
		TotalGB:     state.totalGB,
		UsagePct:    (state.usedGB / state.totalGB) * 100,
		ActiveCount: len(state.active),
	})
}

func handleStart(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}
	var req struct {
		Name   string `json:"name"`
		Format string `json:"format"`
	}
	json.NewDecoder(r.Body).Decode(&req)
	if req.Format == "" {
		req.Format = os.Getenv("RECORDING_FORMAT")
	}
	if req.Format == "" {
		req.Format = "prores422hq"
	}

	id := fmt.Sprintf("REC-%d", time.Now().UnixMilli())
	rec := &Recording{
		ID:        id,
		Name:      req.Name,
		Format:    req.Format,
		StartedAt: time.Now(),
		Active:    true,
	}

	state.mu.Lock()
	state.active[id] = rec
	state.mu.Unlock()

	log.Printf("Recording started: %s (%s)", id, req.Format)
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(rec)
}

func handleStop(w http.ResponseWriter, r *http.Request) {
	id := r.URL.Query().Get("id")
	state.mu.Lock()
	rec, ok := state.active[id]
	if ok {
		rec.Active = false
		delete(state.active, id)
	}
	state.mu.Unlock()

	if !ok {
		http.Error(w, "recording not found", http.StatusNotFound)
		return
	}
	log.Printf("Recording stopped: %s", id)
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(rec)
}

func handleHealth(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"status": "healthy"})
}

func main() {
	mux := http.NewServeMux()
	mux.HandleFunc("/storage", handleStorage)
	mux.HandleFunc("/start",   handleStart)
	mux.HandleFunc("/stop",    handleStop)
	mux.HandleFunc("/health",  handleHealth)

	port := os.Getenv("PORT")
	if port == "" {
		port = "8095"
	}
	log.Printf("Recorder service listening on :%s", port)
	log.Fatal(http.ListenAndServe(":"+port, mux))
}
