package api

import (
	"math"
	"net"
	"net/http"
	"os"
	"strconv"
	"strings"
	"sync"
	"time"

	"golang.org/x/time/rate"
)

type visitor struct {
	limiter  *rate.Limiter
	lastSeen time.Time
}

type IPRateLimiter struct {
	mu       sync.Mutex
	visitors map[string]*visitor
	every    time.Duration
	burst    int
	idleTTL  time.Duration
	lastGC   time.Time
}

func NewIPRateLimiter(every time.Duration, burst int) *IPRateLimiter {
	return &IPRateLimiter{
		visitors: make(map[string]*visitor),
		every:    every,
		burst:    burst,
		idleTTL:  every*time.Duration(burst) + time.Minute,
	}
}

func (l *IPRateLimiter) reserve(ip string, now time.Time) (bool, time.Duration) {
	l.mu.Lock()
	defer l.mu.Unlock()

	if now.Sub(l.lastGC) > l.idleTTL {
		for key, v := range l.visitors {
			if now.Sub(v.lastSeen) > l.idleTTL {
				delete(l.visitors, key)
			}
		}
		l.lastGC = now
	}

	v, ok := l.visitors[ip]
	if !ok {
		v = &visitor{limiter: rate.NewLimiter(rate.Every(l.every), l.burst)}
		l.visitors[ip] = v
	}
	v.lastSeen = now

	r := v.limiter.ReserveN(now, 1)
	if !r.OK() {
		return false, l.every
	}
	if delay := r.DelayFrom(now); delay > 0 {
		r.CancelAt(now)
		return false, delay
	}
	return true, 0
}

func (l *IPRateLimiter) Limit(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		allowed, retryAfter := l.reserve(clientIP(r), time.Now())
		if !allowed {
			w.Header().Set("Retry-After", strconv.Itoa(int(math.Ceil(retryAfter.Seconds()))))
			WriteError(w, http.StatusTooManyRequests, "Too many attempts. Please wait a moment and try again.")
			return
		}
		next(w, r)
	}
}

func clientIP(r *http.Request) string {
	if os.Getenv("TRUST_PROXY_HEADERS") == "true" {
		if xff := r.Header.Get("X-Forwarded-For"); xff != "" {
			parts := strings.Split(xff, ",")
			if ip := strings.TrimSpace(parts[len(parts)-1]); ip != "" {
				return ip
			}
		}
	}
	host, _, err := net.SplitHostPort(r.RemoteAddr)
	if err != nil {
		return r.RemoteAddr
	}
	return host
}
