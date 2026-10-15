package api

import (
	"net/http"
	"net/http/httptest"
	"testing"
	"time"
)

func TestIPRateLimiterBurstThenBlocks(t *testing.T) {
	l := NewIPRateLimiter(time.Minute, 3)
	now := time.Now()
	for i := 0; i < 3; i++ {
		if ok, _ := l.reserve("1.1.1.1", now); !ok {
			t.Fatalf("request %d should be allowed", i+1)
		}
	}
	ok, retry := l.reserve("1.1.1.1", now)
	if ok {
		t.Fatal("4th request should be blocked")
	}
	if retry <= 0 || retry > time.Minute {
		t.Fatalf("unexpected retry-after %v", retry)
	}
	if ok, _ := l.reserve("2.2.2.2", now); !ok {
		t.Fatal("other IPs must not be affected")
	}
	if ok, _ := l.reserve("1.1.1.1", now.Add(time.Minute)); !ok {
		t.Fatal("a token should be back after the refill interval")
	}
}

func TestIPRateLimiterBlockedRequestsDoNotConsumeTokens(t *testing.T) {
	l := NewIPRateLimiter(time.Minute, 1)
	now := time.Now()
	l.reserve("1.1.1.1", now)
	for i := 0; i < 20; i++ {
		l.reserve("1.1.1.1", now)
	}
	if ok, _ := l.reserve("1.1.1.1", now.Add(time.Minute)); !ok {
		t.Fatal("hammering while blocked should not push the next token further out")
	}
}

func TestIPRateLimiterEvictsIdleVisitors(t *testing.T) {
	l := NewIPRateLimiter(time.Second, 1)
	now := time.Now()
	l.reserve("1.1.1.1", now)
	l.reserve("2.2.2.2", now.Add(time.Hour))
	if _, ok := l.visitors["1.1.1.1"]; ok {
		t.Fatal("idle visitor should have been evicted")
	}
}

func TestLimitMiddleware(t *testing.T) {
	l := NewIPRateLimiter(time.Hour, 1)
	calls := 0
	h := l.Limit(func(w http.ResponseWriter, r *http.Request) { calls++ })

	do := func() *httptest.ResponseRecorder {
		req := httptest.NewRequest("POST", "/api/auth/login", nil)
		req.RemoteAddr = "9.9.9.9:4321"
		rr := httptest.NewRecorder()
		h(rr, req)
		return rr
	}

	if rr := do(); rr.Code != http.StatusOK {
		t.Fatalf("first request: %d", rr.Code)
	}
	rr := do()
	if rr.Code != http.StatusTooManyRequests {
		t.Fatalf("second request: %d", rr.Code)
	}
	if rr.Header().Get("Retry-After") == "" {
		t.Fatal("missing Retry-After header")
	}
	if calls != 1 {
		t.Fatalf("handler ran %d times", calls)
	}
}

func TestClientIP(t *testing.T) {
	req := httptest.NewRequest("POST", "/", nil)
	req.RemoteAddr = "10.0.0.5:5555"
	req.Header.Set("X-Forwarded-For", "6.6.6.6, 203.0.113.9")

	t.Setenv("TRUST_PROXY_HEADERS", "")
	if got := clientIP(req); got != "10.0.0.5" {
		t.Fatalf("untrusted proxy headers must be ignored, got %s", got)
	}

	t.Setenv("TRUST_PROXY_HEADERS", "true")
	if got := clientIP(req); got != "203.0.113.9" {
		t.Fatalf("expected the proxy-appended client IP, got %s", got)
	}
}
