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

	"github.com/avichal-08/dploy/internal/db"
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

	var project models.Project
	if err := db.DB.Where("name = ?", projectName).First(&project).Error; err != nil {
		slog.Warn("project not found in proxy", "host", r.Host, "project_name", projectName)
		http.Error(w, "Project not found (404)", http.StatusNotFound)
		return
	}

	if project.ActiveDeploymentID == nil || *project.ActiveDeploymentID == "" {
		slog.Warn("project has no active deployment", "project_name", projectName)
		http.Error(w, "No active deployment found (503)", http.StatusServiceUnavailable)
		return
	}

	var replicas []models.Replica
	if err := db.DB.Where("deployment_id = ? AND status = ?", *project.ActiveDeploymentID, "healthy").Find(&replicas).Error; err != nil || len(replicas) == 0 {
		slog.Warn("no healthy replicas available", "deployment_id", *project.ActiveDeploymentID)
		http.Error(w, "Service Unavailable - No healthy instances (503)", http.StatusServiceUnavailable)
		return
	}

	var selectedReplica *models.Replica
	var minConns int32 = -1

	for i := range replicas {
		rep := &replicas[i]
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
		slog.Error("all healthy replicas had invalid port mappings", "deployment_id", *project.ActiveDeploymentID)
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
