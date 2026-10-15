package pipeline

import (
	"context"
	"errors"
	"net/http"
	"net/http/httptest"
	"sync/atomic"
	"testing"
	"time"
)

func testProbe(url string, timeout time.Duration) readinessProbe {
	return readinessProbe{
		url:      url,
		interval: 10 * time.Millisecond,
		timeout:  timeout,
		client:   &http.Client{Timeout: time.Second},
	}
}

func TestReadinessProbeReadyImmediately(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusNotFound)
	}))
	defer srv.Close()

	if err := testProbe(srv.URL, time.Second).wait(context.Background()); err != nil {
		t.Fatalf("expected ready, got %v", err)
	}
}

func TestReadinessProbeWaitsThrough5xx(t *testing.T) {
	var calls atomic.Int32
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if calls.Add(1) < 4 {
			w.WriteHeader(http.StatusServiceUnavailable)
			return
		}
		w.WriteHeader(http.StatusOK)
	}))
	defer srv.Close()

	if err := testProbe(srv.URL, 2*time.Second).wait(context.Background()); err != nil {
		t.Fatalf("expected ready after retries, got %v", err)
	}
	if got := calls.Load(); got < 4 {
		t.Fatalf("expected at least 4 attempts, got %d", got)
	}
}

func TestReadinessProbeTimesOut(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusInternalServerError)
	}))
	defer srv.Close()

	start := time.Now()
	err := testProbe(srv.URL, 150*time.Millisecond).wait(context.Background())
	if !errors.Is(err, ErrNotReady) {
		t.Fatalf("expected ErrNotReady, got %v", err)
	}
	if elapsed := time.Since(start); elapsed > time.Second {
		t.Fatalf("probe overran its timeout: %v", elapsed)
	}
}

func TestReadinessProbeNothingListening(t *testing.T) {
	srv := httptest.NewServer(http.NotFoundHandler())
	url := srv.URL
	srv.Close()

	if err := testProbe(url, 100*time.Millisecond).wait(context.Background()); !errors.Is(err, ErrNotReady) {
		t.Fatalf("expected ErrNotReady, got %v", err)
	}
}

func TestReadinessProbeFailsFastWhenContainerExits(t *testing.T) {
	srv := httptest.NewServer(http.NotFoundHandler())
	url := srv.URL
	srv.Close()

	p := testProbe(url, 5*time.Second)
	p.alive = func() (bool, error) { return false, nil }

	start := time.Now()
	if err := p.wait(context.Background()); !errors.Is(err, ErrContainerExited) {
		t.Fatalf("expected ErrContainerExited, got %v", err)
	}
	if elapsed := time.Since(start); elapsed > time.Second {
		t.Fatalf("expected a fast failure, took %v", elapsed)
	}
}
