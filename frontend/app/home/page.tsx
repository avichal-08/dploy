"use client";

import { useState, useEffect } from "react";
import {
  Search,
  Bell,
  Command,
  Plus,
  Box,
  MoreVertical,
  GitBranch,
  Clock,
  TerminalSquare,
  LogOut,
  ExternalLink,
} from "lucide-react";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE;

const SIDEBAR_NAV = [
  { label: "Projects", icon: Box, active: true, href: "/home" }
];

export default function HomePage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [projects, setProjects] = useState<any[]>([]);
  const [user, setUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const projRes = await fetch(`${API_BASE}/projects`, {
          credentials: "include",
        });

        if (projRes.status === 401) {
          window.location.href = "/auth/login";
          return;
        }

        if (projRes.ok) {
          const data = await projRes.json();
          setProjects(data || []);
        }

        const userRes = await fetch(`${API_BASE}/user`, {
          credentials: "include",
        });

        if (userRes.status === 401) {
          window.location.href = "/auth/login";
          return;
        }

        if (userRes.ok) {
          const userData = await userRes.json();
          setUser(userData);
        }
      } catch (err) {
        console.error("Error fetching dashboard data:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        document.getElementById("project-search")?.focus();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleLogout = async () => {
    try {
      await fetch(`${API_BASE}/auth/logout`, {
        method: "POST",
        credentials: "include",
      });
      window.location.href = "/auth/login";
    } catch (err) {
      console.error("Failed to log out", err);
    }
  };

  const getStatusColor = (rawStatus: string) => {
    const status = (rawStatus || "").toLowerCase();
    switch (status) {
      case "deployed":
      case "success":
      case "running":
        return "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]";
      case "failed":
        return "bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.4)]";
      case "cloning":
      case "building":
      case "pending":
        return "bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.4)]";
      default:
        return "bg-[#A1A1AA]";
    }
  };

  const getStatusText = (rawStatus: string) => {
    const status = (rawStatus || "").toLowerCase();
    switch (status) {
      case "deployed":
      case "success":
      case "running":
        return "Deployed";
      case "failed":
        return "Failed";
      case "cloning":
        return "Cloning";
      case "building":
        return "Building";
      case "pending":
        return "Pending";
      default:
        return status || "Unknown";
    }
  };

  const formatRepo = (url: string) => {
    if (!url) return "Unknown Repository";
    return url.replace("https://github.com/", "").replace(".git", "");
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return "Unknown";
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return "Unknown";
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const filteredProjects = projects.filter((project: any) => {
    const name = (project.Name || project.name || "").toLowerCase();
    const repo = (project.RepositoryURL || project.repository_url || "").toLowerCase();
    const query = searchQuery.toLowerCase();
    return name.includes(query) || repo.includes(query);
  });

  return (
    <div className="flex h-screen bg-[#09090B] text-[#FAFAFA] font-sans antialiased overflow-hidden selection:bg-blue-500/30">

      <aside className="w-60 border-r border-[#27272A]/70 bg-[#09090B] flex flex-col flex-shrink-0">
        <div className="h-16 flex items-center px-5 border-b border-[#27272A]/70">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-md bg-[#111113] border border-[#27272A] flex items-center justify-center">
              <TerminalSquare className="w-4 h-4 text-[#FAFAFA]" />
            </div>
            <span className="font-bold tracking-wider text-sm">DPLOY<span className="text-blue-500">.</span></span>
          </div>
        </div>

        <div className="p-3 space-y-1 flex-1 overflow-y-auto">
          <div className="px-3 py-1.5 text-[10px] font-semibold tracking-wider uppercase text-[#71717A]">
            Platform
          </div>
          {SIDEBAR_NAV.map((item) => (
            <button
              key={item.label}
              onClick={() => (window.location.href = item.href)}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-xs font-medium transition-all ${
                item.active
                  ? "bg-[#1f1f23] text-[#FAFAFA] border border-[#27272A]/50 shadow-sm"
                  : "text-[#A1A1AA] hover:text-[#FAFAFA] hover:bg-[#111113]"
              }`}
            >
              <item.icon className="w-4 h-4 shrink-0 text-[#A1A1AA]" />
              {item.label}
            </button>
          ))}
        </div>

        <div className="p-3 border-t border-[#27272A]/70 relative">
          {isUserMenuOpen && (
            <div className="absolute bottom-[calc(100%-4px)] left-3 right-3 bg-[#111113] border border-[#27272A] rounded-lg shadow-2xl overflow-hidden z-50 animate-in fade-in slide-in-from-bottom-2 duration-150">
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-2.5 px-3.5 py-3 text-xs font-medium text-red-400 hover:bg-red-500/10 transition-colors text-left"
              >
                <LogOut className="w-3.5 h-3.5" />
                Sign out of account
              </button>
            </div>
          )}
          <button
            onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
            className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg transition-all text-left border border-transparent ${
              isUserMenuOpen ? "bg-[#111113] border-[#27272A]" : "hover:bg-[#111113]/60 hover:border-[#27272A]/40"
            }`}
          >
            <div className="w-7 h-7 rounded-md bg-[#27272A] border border-[#3f3f46] shrink-0 flex items-center justify-center font-bold text-xs text-[#FAFAFA] shadow-inner">
              {user ? (user.Email || user.email || "D")[0].toUpperCase() : ""}
            </div>
            <div className="flex-1 min-w-0">
              {user ? (
                <p className="text-xs font-medium text-[#FAFAFA] truncate">
                  {user.Email || user.email || "Developer"}
                </p>
              ) : (
                <div className="h-3.5 w-24 bg-[#27272A] rounded animate-pulse" />
              )}
            </div>
            <MoreVertical className="w-3.5 h-3.5 text-[#71717A]" />
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0 bg-[#09090B]">

        <header className="h-16 flex items-center justify-between px-8 border-b border-[#27272A]/70 bg-[#09090B]/80 backdrop-blur-md shrink-0">
          <div className="flex items-center flex-1">
            <div className="relative w-full max-w-sm flex items-center group">
              <Search className="w-3.5 h-3.5 text-[#71717A] absolute left-3 group-focus-within:text-[#FAFAFA] transition-colors" />
              <input
                id="project-search"
                type="text"
                placeholder="Search projects or repositories..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[#111113] border border-[#27272A] rounded-lg pl-9 pr-12 py-2 text-xs text-[#FAFAFA] placeholder:text-[#52525B] focus:outline-none focus:border-[#52525B] focus:ring-1 focus:ring-[#52525B] transition-all shadow-inner"
              />
              <div className="absolute right-3 flex items-center gap-1 text-[#52525B] pointer-events-none">
                <Command className="w-3 h-3" />
                <span className="text-[10px] font-mono">K</span>
              </div>
            </div>
          </div>

        </header>

        <main className="flex-1 overflow-y-auto p-8 lg:p-10">
          <div className="max-w-7xl mx-auto space-y-8">

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#27272A]/50 pb-6">
              <div>
                <h1 className="text-xl font-bold tracking-tight text-[#FAFAFA]">
                  Projects
                </h1>
                <p className="text-xs text-[#A1A1AA] mt-0.5">
                  Manage deployment pipelines, runtime metrics, and edge networking.
                </p>
              </div>

              <button
                onClick={() => (window.location.href = "/project/create")}
                className="flex items-center justify-center gap-2 bg-[#FAFAFA] text-[#09090B] px-4 py-2 rounded-lg text-xs font-semibold hover:bg-[#E4E4E7] transition-all shadow-sm shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                Create Project
              </button>
            </div>

            {/* Content Display */}
            {isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="bg-[#111113] border border-[#27272A]/60 rounded-xl p-5 h-40 animate-pulse flex flex-col justify-between"
                  >
                    <div className="flex justify-between items-start">
                      <div className="w-32 h-4 bg-[#27272A] rounded" />
                      <div className="w-16 h-4 bg-[#27272A] rounded" />
                    </div>
                    <div className="space-y-2">
                      <div className="w-3/4 h-3.5 bg-[#27272A] rounded" />
                      <div className="w-1/2 h-3.5 bg-[#27272A] rounded" />
                    </div>
                    <div className="w-full h-3.5 bg-[#27272A] rounded mt-2" />
                  </div>
                ))}
              </div>
            ) : filteredProjects.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                {filteredProjects.map((project: any) => {
                  const projectId = project.ID || project.id;
                  const projectName = project.Name || project.name;
                  const repoUrl = project.RepositoryURL || project.repository_url;
                  const framework = project.Framework || project.framework || "Docker";
                  const status = project.Status || project.status || "pending";
                  const createdAt = project.CreatedAt || project.created_at;

                  const productionUrl = project.ProductionURL || project.production_url || `https://${projectName}.dploy.avichal.me`;

                  return (
                    <div
                      key={projectId}
                      onClick={() => (window.location.href = `/project/${projectId}`)}
                      className="group flex flex-col bg-[#111113]/90 hover:bg-[#161619] border border-[#27272A]/80 hover:border-[#52525B] rounded-xl p-5 transition-all duration-200 cursor-pointer shadow-sm hover:shadow-md"
                    >
                      <div className="flex items-start justify-between mb-4">
                        <h3 className="font-semibold text-[#FAFAFA] text-sm tracking-wide truncate pr-2 group-hover:text-blue-400 transition-colors">
                          {projectName}
                        </h3>

                        <div className="flex items-center gap-1.5 bg-[#09090B] border border-[#27272A] px-2.5 py-1 rounded-full shrink-0">
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${getStatusColor(
                              status
                            )}`}
                          />
                          <span className="text-[10px] font-medium text-[#A1A1AA] uppercase tracking-wider">
                            {getStatusText(status)}
                          </span>
                        </div>
                      </div>

                      <div className="space-y-2.5 mb-6 flex-1 text-xs text-[#A1A1AA]">
                        <div className="flex items-center gap-2">
                          <GitBranch className="w-3.5 h-3.5 shrink-0 text-[#71717A]" />
                          <span className="truncate font-mono">{formatRepo(repoUrl)}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Box className="w-3.5 h-3.5 shrink-0 text-[#71717A]" />
                          <span className="capitalize">{framework}</span>
                        </div>
                      </div>

                      <div className="pt-3 border-t border-[#27272A]/60 flex items-center justify-between text-xs">
                        <a
                          href={productionUrl.startsWith("http") ? productionUrl : `https://${productionUrl}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[#A1A1AA] hover:text-[#FAFAFA] flex items-center gap-1 truncate mr-2 font-mono text-[11px] transition-colors"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <span className="truncate">{productionUrl.replace("https://", "").replace("http://", "")}</span>
                          <ExternalLink className="w-3 h-3 shrink-0 opacity-60" />
                        </a>
                        <div className="flex items-center gap-1 text-[#71717A] shrink-0 text-[10px]">
                          <Clock className="w-3 h-3" />
                          <span>{formatDate(createdAt)}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : searchQuery ? (
              <div className="flex flex-col items-center justify-center py-20 border border-dashed border-[#27272A] rounded-xl bg-[#111113]/30">
                <Search className="w-6 h-6 text-[#71717A] mb-3" />
                <h3 className="text-[#FAFAFA] text-sm font-medium mb-1">
                  No results found
                </h3>
                <p className="text-xs text-[#A1A1AA] mb-4">
                  No projects matching `{searchQuery}`.
                </p>
                <button
                  onClick={() => setSearchQuery("")}
                  className="text-xs text-blue-400 hover:underline font-medium"
                >
                  Clear search filter
                </button>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-24 border border-dashed border-[#27272A] rounded-xl bg-[#111113]/30">
                <Box className="w-8 h-8 text-[#52525B] mb-3" />
                <h3 className="text-[#FAFAFA] text-sm font-medium mb-1">
                  No projects deployed
                </h3>
                <p className="text-xs text-[#A1A1AA] mb-5">
                  Connect a repository to initialize your first automated pipeline.
                </p>
                <button
                  onClick={() => (window.location.href = "/project/create")}
                  className="flex items-center gap-2 bg-[#FAFAFA] text-[#09090B] px-4 py-2 rounded-lg text-xs font-semibold hover:bg-[#E4E4E7] transition-all shadow-sm"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Create Project
                </button>
              </div>
            )}

          </div>
        </main>
      </div>
    </div>
  );
}
