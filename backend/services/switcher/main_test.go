package main

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestCut(t *testing.T) {
	s := NewSwitcherServer()

	body, _ := json.Marshal(CutRequest{ME: 1, NewPreview: 5})
	req := httptest.NewRequest(http.MethodPost, "/cut", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()

	s.handleCut(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", w.Code)
	}

	var resp CutResponse
	json.NewDecoder(w.Body).Decode(&resp)

	if !resp.Success {
		t.Error("expected success=true")
	}
	if resp.NewProgram != 2 { // initial preview was 2
		t.Errorf("expected new program=2, got %d", resp.NewProgram)
	}
	if resp.NewPreview != 5 {
		t.Errorf("expected new preview=5, got %d", resp.NewPreview)
	}
	if resp.LatencyMicros > 16000 {
		t.Errorf("cut latency %dµs exceeds 16ms target", resp.LatencyMicros)
	}
}

func TestCutInvalidME(t *testing.T) {
	s := NewSwitcherServer()
	body, _ := json.Marshal(CutRequest{ME: 99, NewPreview: 1})
	req := httptest.NewRequest(http.MethodPost, "/cut", bytes.NewReader(body))
	w := httptest.NewRecorder()
	s.handleCut(w, req)
	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400, got %d", w.Code)
	}
}

func TestHealth(t *testing.T) {
	s := NewSwitcherServer()
	req := httptest.NewRequest(http.MethodGet, "/health", nil)
	w := httptest.NewRecorder()
	s.handleHealth(w, req)
	if w.Code != http.StatusOK {
		t.Errorf("expected 200, got %d", w.Code)
	}
}
