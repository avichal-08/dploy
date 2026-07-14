"use client";

import React, { useState, useEffect } from "react";
import {
  ArrowLeft,
  ExternalLink,
  GitBranch,
  Terminal,
  Box,
  Activity,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Clock,
  GitCommit,
  ChevronRight
} from "lucide-react";

const API_BASE = "http://localhost:8080/api";

export default function ProjectOverviewPage({ params }: { params?: { projectId: string } }) {
  const [projectId, setProjectId] = useState<string>("");
  const [project, setProject] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (params?.projectId) {
      setProjectId(params.projectId);
    } else if (typeof window !== "undefined") {
      const pathParts = window.location.pathname.split("/");
      setProjectId(pathParts[pathParts.length - 1]);
    }
  }, [params]);

  useEffect(() => {
    if (!projectId) return;

    const fetchProject = async () => {
      try {
        const res = await fetch(`${API_BASE}/project/${projectId}`);
        if (!res.ok) throw new Error("Project not found or failed to load");

        const data = await res.json();
        setProject(data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchProject();
  }, [projectId]);

  const getStatusColor = (rawStatus: string) => {
    const status = (rawStatus || "").toLowerCase();
    switch (status) {
      case "deployed":
      case "success":
      case "running": return "text-green-500 bg-green-500/10 border-green-500/20";
      case "failed": return "text-red-500 bg-red-500/10 border-red-500/20";
      default: return "text-[#A1A1AA] bg-[#27272A]/50 border-[#27272A]";
    }
  };

  const getStatusIcon = (rawStatus: string) => {
    const status = (rawStatus || "").toLowerCase();
    switch (status) {
      case "deployed":
      case "success":
      case "running": return <CheckCircle2 className="w-4 h-4" />;
      case "failed": return <XCircle className="w-4 h-4" />;
      default: return <Activity className="w-4 h-4" />;
    }
  };

  const formatRepo = (url: string) => {
    if (!url) return "Unknown Repository";
    return url.replace("https://github.com/", "").replace(".git", "");
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return "N/A";
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#09090B] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-2 border-[#27272A] border-t-[#FAFAFA] rounded-full animate-spin" />
          <p className="text-[#A1A1AA] text-sm font-medium">Loading project details...</p>
        </div>
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="min-h-screen bg-[#09090B] flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-[#111113] border border-[#27272A] rounded-md p-6 text-center space-y-4">
          <AlertCircle className="w-10 h-10 text-red-500 mx-auto" />
          <h2 className="text-[#FAFAFA] text-lg font-bold">Failed to load project</h2>
          <p className="text-[#A1A1AA] text-sm">{error || "Project could not be found."}</p>
          <button
            onClick={() => window.location.href = '/'}
            className="bg-[#FAFAFA] text-[#09090B] px-4 py-2 rounded-md text-sm font-medium hover:bg-[#E4E4E7] transition-colors mt-2"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const projectName = project.Name || project.name;
  const status = project.Status || project.status || "Unknown";
  const repoUrl = project.RepositoryURL || project.repository_url;
  const framework = project.Framework || project.framework || "Docker";
  const buildCmd = project.BuildCommand || project.build_command || "N/A";
  const runCmd = project.RunCommand || project.run_command || "N/A";
  const createdAt = project.CreatedAt || project.created_at;
  const activeDeployment = project.ActiveDeploymentID || project.active_deployment_id;
  const productionUrl = project.ProductionURL || project.production_url || `${projectName}.localhost:8000`;

  const deployments = project.Deployments || project.deployments || [];

  const sortedDeployments = [...deployments].sort((a, b) => {
    const dateA = new Date(a.CreatedAt || a.created_at).getTime();
    const dateB = new Date(b.CreatedAt || b.created_at).getTime();
    return dateB - dateA;
  });

  return (
    <div className="min-h-screen bg-[#09090B] text-[#FAFAFA] font-sans antialiased selection:bg-blue-500/30 flex flex-col">
      <nav className="h-14 border-b border-[#27272A] bg-[#09090B] shrink-0 px-6 flex items-center gap-4 sticky top-0 z-10">
        <button
          onClick={() => window.location.href = '/'}
          className="text-[#A1A1AA] hover:text-[#FAFAFA] transition-colors flex items-center justify-center p-1"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-2 text-sm font-medium">
          <span className="text-[#A1A1AA]">avichal-08</span>
          <span className="text-[#52525B]">/</span>
          <span className="text-[#FAFAFA]">{projectName}</span>
        </div>
      </nav>

      <main className="flex-1 overflow-y-auto p-6 md:p-10">
        <div className="max-w-5xl mx-auto space-y-8">

          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div className="space-y-4">
              <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-[#FAFAFA]">
                {projectName}
              </h1>

              <div className="flex flex-wrap items-center gap-3 text-sm">
                <a
                  href={`http://${productionUrl}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1.5 text-blue-400 hover:text-blue-300 transition-colors font-medium"
                >
                  {productionUrl}
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>

                <span className="text-[#27272A]">•</span>

                <a
                  href={repoUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1.5 text-[#A1A1AA] hover:text-[#FAFAFA] transition-colors"
                >
                  <GitBranch className="w-4 h-4" />
                  {formatRepo(repoUrl)}
                </a>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className={`flex items-center gap-2 px-3 py-1.5 rounded-md border text-sm font-medium capitalize ${getStatusColor(status)}`}>
                {getStatusIcon(status)}
                {status}
              </div>
              <button
                onClick={() => window.location.href = `/project/${projectId}/deploy`}
                className="bg-[#FAFAFA] text-[#09090B] px-4 py-1.5 rounded-md text-sm font-medium hover:bg-[#E4E4E7] transition-colors shadow-sm"
              >
                Redeploy
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-[#111113] border border-[#27272A] rounded-md p-6 space-y-6">
              <h2 className="text-lg font-semibold text-[#FAFAFA] flex items-center gap-2">
                <Activity className="w-4 h-4 text-[#A1A1AA]" />
                Current Deployment
              </h2>

              <div className="space-y-4">
                <div className="grid grid-cols-3 text-sm">
                  <span className="text-[#A1A1AA]">Status</span>
                  <span className="col-span-2 text-[#FAFAFA] capitalize">{status}</span>
                </div>
                <div className="grid grid-cols-3 text-sm">
                  <span className="text-[#A1A1AA]">Created</span>
                  <span className="col-span-2 text-[#FAFAFA]">{formatDate(createdAt)}</span>
                </div>
                <div className="grid grid-cols-3 text-sm">
                  <span className="text-[#A1A1AA]">Framework</span>
                  <div className="col-span-2 flex items-center gap-2">
                    <Box className="w-4 h-4 text-[#FAFAFA]" />
                    <span className="text-[#FAFAFA] capitalize">{framework}</span>
                  </div>
                </div>
                <div className="grid grid-cols-3 text-sm">
                  <span className="text-[#A1A1AA]">Deployment ID</span>
                  <span className="col-span-2 text-[#FAFAFA] font-mono text-xs truncate" title={activeDeployment || "None"}>
                    {activeDeployment || "No active deployment"}
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-[#111113] border border-[#27272A] rounded-md p-6 space-y-6">
              <h2 className="text-lg font-semibold text-[#FAFAFA] flex items-center gap-2">
                <Terminal className="w-4 h-4 text-[#A1A1AA]" />
                Build Configuration
              </h2>

              <div className="space-y-5">
                <div className="space-y-2">
                  <span className="text-[#A1A1AA] text-sm">Build Command</span>
                  <div className="bg-[#09090B] border border-[#27272A] rounded p-2.5 font-mono text-xs text-[#FAFAFA] overflow-x-auto whitespace-nowrap">
                    {buildCmd}
                  </div>
                </div>

                <div className="space-y-2">
                  <span className="text-[#A1A1AA] text-sm">Run Command</span>
                  <div className="bg-[#09090B] border border-[#27272A] rounded p-2.5 font-mono text-xs text-[#FAFAFA] overflow-x-auto whitespace-nowrap">
                    {runCmd}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-[#111113] border border-[#27272A] rounded-md overflow-hidden">
            <div className="p-6 border-b border-[#27272A] flex items-center justify-between">
              <h2 className="text-lg font-semibold text-[#FAFAFA] flex items-center gap-2">
                <Clock className="w-4 h-4 text-[#A1A1AA]" />
                Deployment History
              </h2>
            </div>

            <div className="divide-y divide-[#27272A]">
              {sortedDeployments.length === 0 ? (
                <div className="p-8 text-center text-[#A1A1AA] text-sm">
                  No deployments found for this project.
                </div>
              ) : (
                sortedDeployments.map((dep: any) => {
                  const depId = dep.ID || dep.id;
                  const depStatus = dep.Status || dep.status || "Unknown";
                  const depCommit = dep.CommitSHA || dep.commit_sha || "HEAD";
                  const depCreatedAt = dep.CreatedAt || dep.created_at;

                  return (
                    <div
                      key={depId}
                      onClick={() => window.location.href = `/project/${projectId}/${depId}`}
                      className="group flex items-center justify-between p-4 hover:bg-[#27272A]/30 transition-colors cursor-pointer"
                    >
                      <div className="flex items-center gap-4">
                        <div className={`flex items-center gap-2 w-28 px-2 py-1 rounded-md border text-xs font-medium capitalize ${getStatusColor(depStatus)}`}>
                          {getStatusIcon(depStatus)}
                          {depStatus}
                        </div>

                        <div className="flex items-center gap-2 text-sm">
                          <GitCommit className="w-4 h-4 text-[#A1A1AA]" />
                          <span className="font-mono text-[#FAFAFA]">
                            {depCommit.substring(0, 7)}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-6">
                        <span className="text-sm text-[#A1A1AA] hidden sm:block">
                          {formatDate(depCreatedAt)}
                        </span>
                        <ChevronRight className="w-4 h-4 text-[#52525B] group-hover:text-[#FAFAFA] transition-colors" />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}
