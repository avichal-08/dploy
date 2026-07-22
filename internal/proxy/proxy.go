package proxy

import (
	"fmt"
	"log/slog"
	"net/http"
	"net/http/httputil"
	"net/url"
	"strings"

	"github.com/avichal-08/dploy/internal/db"
	"github.com/avichal-08/dploy/internal/models"
)

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

	var replica models.Replica
	if err := db.DB.Where("deployment_id = ? AND status = ?", *project.ActiveDeploymentID, "healthy").First(&replica).Error; err != nil {
		slog.Warn("no healthy replicas available", "deployment_id", *project.ActiveDeploymentID)
		http.Error(w, "Service Unavailable - No healthy instances (503)", http.StatusServiceUnavailable)
		return
	}

	if replica.InternalPort == 0 {
		slog.Error("replica has no internal port mapped", "replica_id", replica.ID)
		http.Error(w, "Bad Gateway (502)", http.StatusBadGateway)
		return
	}

	targetStr := fmt.Sprintf("http://localhost:%d", replica.InternalPort)
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
