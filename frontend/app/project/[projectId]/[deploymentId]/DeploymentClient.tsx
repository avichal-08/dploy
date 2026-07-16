"use client";

import { useState, useEffect } from "react";
import {
  ArrowLeft,
  Terminal,
  Activity,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Clock,
  GitCommit,
  Box,
  Hash
} from "lucide-react";

const API_BASE = "http://localhost:8080/api";

export default function DeploymentDetailsClient({ projectId, deploymentId }:  { projectId: string, deploymentId: string  }) {

  const [deployment, setDeployment] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!deploymentId) return;

    const fetchDeployment = async () => {
      try {
        const res = await fetch(`${API_BASE}/deployments/${deploymentId}`);
        if (!res.ok) throw new Error("Deployment not found or failed to load");

        const data = await res.json();
        setDeployment(data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDeployment();
  }, [deploymentId]);

  const getStatusColor = (rawStatus: string) => {
    const status = (rawStatus || "").toLowerCase();
    switch (status) {
      case "deployed":
      case "success": return "text-green-500 bg-green-500/10 border-green-500/20";
      case "failed": return "text-red-500 bg-red-500/10 border-red-500/20";
      default: return "text-[#A1A1AA] bg-[#27272A]/50 border-[#27272A]";
    }
  };

  const getStatusIcon = (rawStatus: string) => {
    const status = (rawStatus || "").toLowerCase();
    switch (status) {
      case "deployed":
      case "success": return <CheckCircle2 className="w-4 h-4" />;
      case "failed": return <XCircle className="w-4 h-4" />;
      default: return <Activity className="w-4 h-4 animate-pulse" />;
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return "N/A";
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit" });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#09090B] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-2 border-[#27272A] border-t-[#FAFAFA] rounded-full animate-spin" />
          <p className="text-[#A1A1AA] text-sm font-medium">Loading deployment...</p>
        </div>
      </div>
    );
  }

  if (error || !deployment) {
    return (
      <div className="min-h-screen bg-[#09090B] flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-[#111113] border border-[#27272A] rounded-md p-6 text-center space-y-4">
          <AlertCircle className="w-10 h-10 text-red-500 mx-auto" />
          <h2 className="text-[#FAFAFA] text-lg font-bold">Failed to load deployment</h2>
          <p className="text-[#A1A1AA] text-sm">{error || "Deployment could not be found."}</p>
          <button
            onClick={() => window.location.href = `/project/${projectId}`}
            className="bg-[#FAFAFA] text-[#09090B] px-4 py-2 rounded-md text-sm font-medium hover:bg-[#E4E4E7] transition-colors mt-2"
          >
            Back to Project
          </button>
        </div>
      </div>
    );
  }

  const status = deployment.Status || deployment.status || "Unknown";
  const commitSha = deployment.CommitSHA || deployment.commit_sha || "Unknown";
  const commitMsg = deployment.CommitMessage || deployment.commit_message || "No commit message";
  const containerId = deployment.ContainerID || deployment.container_id || "N/A";
  const internalPort = deployment.InternalPort || deployment.internal_port || "N/A";
  const buildLogs = deployment.BuildLogs || deployment.build_logs || "No logs available for this deployment.";
  const createdAt = deployment.CreatedAt || deployment.created_at;
  const finishedAt = deployment.FinishedAt || deployment.finished_at;

  return (
    <div className="min-h-screen bg-[#09090B] text-[#FAFAFA] font-sans antialiased selection:bg-blue-500/30 flex flex-col">

      <nav className="h-14 border-b border-[#27272A] bg-[#09090B] shrink-0 px-6 flex items-center gap-4 sticky top-0 z-10">
        <button
          onClick={() => window.location.href = `/project/${projectId}`}
          className="text-[#A1A1AA] hover:text-[#FAFAFA] transition-colors flex items-center justify-center p-1"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-2 text-sm font-medium">
          <span className="text-[#A1A1AA]">Deployments</span>
          <span className="text-[#52525B]">/</span>
          <span className="text-[#FAFAFA] font-mono">{deploymentId.substring(0, 8)}...</span>
        </div>
      </nav>

      <main className="flex-1 overflow-y-auto p-6 md:p-10">
        <div className="max-w-5xl mx-auto space-y-8">

          <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
            <div className="space-y-3">
              <h1 className="text-2xl font-bold tracking-tight text-[#FAFAFA] flex items-center gap-3">
                Commit Message <span className="font-mono text-[#A1A1AA] text-lg">{commitMsg}</span>
              </h1>

              <div className="flex flex-wrap items-center gap-4 text-sm">
                <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-xs font-medium capitalize ${getStatusColor(status)}`}>
                  {getStatusIcon(status)}
                  {status}
                </div>

                <div className="flex items-center gap-1.5 text-[#A1A1AA]">
                  <GitCommit className="w-4 h-4" />
                  Commit: <span className="text-[#FAFAFA] font-mono">{commitSha.substring(0, 7)}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-[#111113] border border-[#27272A] rounded-md p-4 space-y-1">
              <div className="text-[#A1A1AA] text-xs font-medium flex items-center gap-1.5 mb-2">
                <Clock className="w-3.5 h-3.5" /> Started At
              </div>
              <div className="text-[#FAFAFA] text-sm">{formatDate(createdAt)}</div>
            </div>

            <div className="bg-[#111113] border border-[#27272A] rounded-md p-4 space-y-1">
              <div className="text-[#A1A1AA] text-xs font-medium flex items-center gap-1.5 mb-2">
                <Clock className="w-3.5 h-3.5" /> Finished At
              </div>
              <div className="text-[#FAFAFA] text-sm">{finishedAt ? formatDate(finishedAt) : "In Progress"}</div>
            </div>

            <div className="bg-[#111113] border border-[#27272A] rounded-md p-4 space-y-1">
              <div className="text-[#A1A1AA] text-xs font-medium flex items-center gap-1.5 mb-2">
                <Box className="w-3.5 h-3.5" /> Container ID
              </div>
              <div className="text-[#FAFAFA] text-sm font-mono truncate" title={containerId}>
                {containerId !== "N/A" ? containerId.substring(0, 12) : "N/A"}
              </div>
            </div>

            <div className="bg-[#111113] border border-[#27272A] rounded-md p-4 space-y-1">
              <div className="text-[#A1A1AA] text-xs font-medium flex items-center gap-1.5 mb-2">
                <Hash className="w-3.5 h-3.5" /> Internal Port
              </div>
              <div className="text-[#FAFAFA] text-sm font-mono">{internalPort}</div>
            </div>
          </div>

          <div className="bg-[#0A0A0A] border border-[#27272A] rounded-md shadow-2xl overflow-hidden flex flex-col h-[600px]">
            <div className="bg-[#111113] border-b border-[#27272A] px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Terminal className="w-4 h-4 text-[#A1A1AA]" />
                <span className="text-xs font-mono text-[#A1A1AA] uppercase tracking-wider">Build & Run Logs</span>
              </div>
              <button
                onClick={() => navigator.clipboard.writeText(buildLogs)}
                className="text-xs text-[#A1A1AA] hover:text-[#FAFAFA] transition-colors"
              >
                Copy
              </button>
            </div>

            <div className="p-4 overflow-y-auto font-mono text-xs sm:text-sm flex-1 custom-scrollbar">
              <pre className="text-[#A1A1AA] leading-relaxed break-all whitespace-pre-wrap font-mono">
                {buildLogs}
              </pre>
            </div>
          </div>

        </div>
      </main>

      <style dangerouslySetInnerHTML={{
        __html: `
          .custom-scrollbar::-webkit-scrollbar { width: 8px; }
          .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
          .custom-scrollbar::-webkit-scrollbar-thumb { background: #3f3f46; border-radius: 4px; }
          .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #52525b; }
        `
      }} />
    </div>
  );
}
