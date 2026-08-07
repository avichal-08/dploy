package proxy

import (
	"fmt"
	"log/slog"
	"net/http"
	"net/http/httputil"
	"net/url"
	"strings"
	"sync"
	"sync/atomic"

	"github.com/avichal-08/dploy/internal/models"
)

var activeConnections sync.Map

func getActiveConns(replicaID string) int32 {
	if val, ok := activeConnections.Load(replicaID); ok {
		return atomic.LoadInt32(val.(*int32))
	}
	return 0
}

func incConn(replicaID string) {
	val, _ := activeConnections.LoadOrStore(replicaID, new(int32))
	atomic.AddInt32(val.(*int32), 1)
}

func decConn(replicaID string) {
	if val, ok := activeConnections.Load(replicaID); ok {
		atomic.AddInt32(val.(*int32), -1)
	}
}

func GetReplicaConnectionCount(replicaID string) int32 {
	return getActiveConns(replicaID)
}

func ProxyHandler(w http.ResponseWriter, r *http.Request) {

	hostParts := strings.Split(r.Host, ".")
	if len(hostParts) < 2 {
		http.Error(w, "Invalid Host", http.StatusBadRequest)
		return
	}

	projectName := hostParts[0]

	route, err := CacheManager.GetRoute(projectName)
	if err != nil {
		slog.Warn("proxy routing failed", "project", projectName, "error", err)
		http.Error(w, "Service Unavailable (503)", http.StatusServiceUnavailable)
		return
	}

	if route.ProjectType == "static" {
		handleStaticS3Proxy(w, r, route.StoragePrefix)
		return
	}

	var selectedReplica *models.Replica
	var minConns int32 = -1

	for i := range route.Replicas {
		rep := &route.Replicas[i]
		if rep.InternalPort == 0 {
			continue
		}

		conns := getActiveConns(rep.ID)

		if minConns == -1 || conns < minConns {
			minConns = conns
			selectedReplica = rep
		}
	}

	if selectedReplica == nil {
		http.Error(w, "Bad Gateway (502)", http.StatusBadGateway)
		return
	}

	incConn(selectedReplica.ID)
	defer decConn(selectedReplica.ID)

	targetStr := fmt.Sprintf("http://localhost:%d", selectedReplica.InternalPort)
	targetURL, err := url.Parse(targetStr)
	if err != nil {
		http.Error(w, "Internal Server Error", http.StatusInternalServerError)
		return
	}

	proxy := httputil.NewSingleHostReverseProxy(targetURL)

	r.Header.Set("X-Forwarded-Host", r.Header.Get("Host"))

	proxy.ServeHTTP(w, r)
}

func StartProxyServer(port string) {
	slog.Info("Starting Reverse Proxy Router", "port", port)

	mux := http.NewServeMux()
	mux.HandleFunc("/", ProxyHandler)

	if err := http.ListenAndServe(":"+port, mux); err != nil {
		slog.Error("Reverse proxy server failed", "error", err)
	}
}
