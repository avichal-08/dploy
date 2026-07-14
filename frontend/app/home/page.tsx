"use client";

import { useState, useEffect } from "react";
import {
  Search,
  Bell,
  Command,
  Plus,
  Box,
  Settings,
  MoreVertical,
  GitBranch,
  Clock,
  TerminalSquare,
} from "lucide-react";

const API_BASE = "http://localhost:8080/api";
const USER_ID = "44232737-74be-4fd0-8b5c-ddb1cd467a53";

const SIDEBAR_NAV = [
  { label: "Projects", icon: Box, active: true, href: "/" },

  { label: "Settings", icon: Settings, active: false, href: "/settings" },
];

export default function HomePage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [projects, setProjects] = useState<any[]>([]);
  const [user, setUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const projRes = await fetch(`${API_BASE}/projects/${USER_ID}`);
        if (projRes.ok) {
          const data = await projRes.json();
          setProjects(data || []);
        }

        const userRes = await fetch(`${API_BASE}/users/${USER_ID}`);
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
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        document.getElementById('project-search')?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const getStatusColor = (rawStatus: string) => {
    const status = (rawStatus || "").toLowerCase();
    switch (status) {
      case "deployed":
      case "success":
      case "running": return "bg-green-500";
      case "failed": return "bg-red-500";
      case "cloning":
      case "building":
      case "pending": return "bg-amber-500";
      default: return "bg-[#A1A1AA]";
    }
  };

  const getStatusText = (rawStatus: string) => {
    const status = (rawStatus || "").toLowerCase();
    switch (status) {
      case "deployed":
      case "success":
      case "running": return "Deployed";
      case "failed": return "Failed";
      case "cloning": return "Cloning";
      case "building": return "Building";
      case "pending": return "Pending";
      default: return status || "Unknown";
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
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
  };

  const filteredProjects = projects.filter((project: any) => {
    const name = (project.Name || project.name || "").toLowerCase();
    const repo = (project.RepositoryURL || project.repository_url || "").toLowerCase();
    const query = searchQuery.toLowerCase();
    return name.includes(query) || repo.includes(query);
  });

  return (
    <div className="flex h-screen bg-[#09090B] text-[#FAFAFA] font-sans antialiased overflow-hidden selection:bg-blue-500/30">

      <aside className="w-56 border-r border-[#27272A] bg-[#09090B] flex flex-col flex-shrink-0">
        <div className="h-14 flex items-center px-4 border-b border-[#27272A]">
          <div className="flex items-center gap-2">
            <TerminalSquare className="w-5 h-5 text-[#FAFAFA]" />
            <span className="font-bold tracking-tight text-sm">DPLOY</span>
          </div>
        </div>

        <div className="p-3 space-y-0.5 flex-1 overflow-y-auto">
          {SIDEBAR_NAV.map((item) => (
            <button
              key={item.label}
              onClick={() => window.location.href = item.href}
              className={`w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-sm transition-colors ${
                item.active
                  ? "bg-[#27272A] text-[#FAFAFA] font-medium"
                  : "text-[#A1A1AA] hover:text-[#FAFAFA] hover:bg-[#111113]"
              }`}
            >
              <item.icon className="w-4 h-4 shrink-0" />
              {item.label}
            </button>
          ))}
        </div>

        <div className="p-3 border-t border-[#27272A]">
          <button className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md hover:bg-[#111113] transition-colors text-left">
            <div className="w-6 h-6 rounded bg-[#27272A] border border-[#27272A] shrink-0" />
            <div className="flex-1 min-w-0">
              {user ? (
                <p className="text-sm font-medium text-[#FAFAFA] truncate">
                  {user.GithubID || user.Email || user.github_id || user.email || "Developer"}
                </p>
              ) : (
                <div className="h-4 w-20 bg-[#27272A] rounded animate-pulse" />
              )}
            </div>
            <MoreVertical className="w-4 h-4 text-[#A1A1AA]" />
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">

        <header className="h-14 flex items-center justify-between px-6 border-b border-[#27272A] bg-[#09090B] shrink-0">
          <div className="flex items-center flex-1">
            <div className="relative w-full max-w-md flex items-center group">
              <Search className="w-4 h-4 text-[#A1A1AA] absolute left-2.5 group-focus-within:text-[#FAFAFA] transition-colors" />
              <input
                id="project-search"
                type="text"
                placeholder="Search projects..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[#111113] border border-[#27272A] rounded-md pl-9 pr-12 py-1.5 text-sm text-[#FAFAFA] placeholder:text-[#52525B] focus:outline-none focus:border-[#FAFAFA] focus:ring-1 focus:ring-[#FAFAFA] transition-all"
              />
              <div className="absolute right-2.5 flex items-center gap-1 text-[#52525B] group-focus-within:opacity-0 transition-opacity">
                <Command className="w-3 h-3" />
                <span className="text-[10px] font-medium">K</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <button className="text-[#A1A1AA] hover:text-[#FAFAFA] transition-colors">
              <Bell className="w-4 h-4" />
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-8">
          <div className="max-w-6xl mx-auto space-y-6">

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-[#FAFAFA]">Projects</h1>
                <p className="text-sm text-[#A1A1AA] mt-1">Manage and deploy your applications.</p>
              </div>

              <button
                onClick={() => window.location.href = '/project/create'}
                className="flex items-center justify-center gap-2 bg-[#FAFAFA] text-[#09090B] px-3.5 py-1.5 rounded-md text-sm font-medium hover:bg-[#E4E4E7] transition-colors shrink-0"
              >
                <Plus className="w-4 h-4" />
                Create Project
              </button>
            </div>

            {isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="bg-[#111113] border border-[#27272A] rounded-md p-4 h-[160px] animate-pulse flex flex-col justify-between">
                    <div className="flex justify-between items-start">
                      <div className="w-32 h-5 bg-[#27272A] rounded" />
                      <div className="w-16 h-5 bg-[#27272A] rounded" />
                    </div>
                    <div className="space-y-3">
                      <div className="w-3/4 h-4 bg-[#27272A] rounded" />
                      <div className="w-1/2 h-4 bg-[#27272A] rounded" />
                    </div>
                    <div className="w-full h-4 bg-[#27272A] rounded mt-4" />
                  </div>
                ))}
              </div>
            ) : filteredProjects.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {filteredProjects.map((project: any) => {
                  const projectId = project.ID || project.id;
                  const projectName = project.Name || project.name;
                  const repoUrl = project.RepositoryURL || project.repository_url;
                  const framework = project.Framework || project.framework || "Docker";
                  const status = project.Status || project.status || "pending";
                  const createdAt = project.CreatedAt || project.created_at;

                  return (
                    <div
                      key={projectId}
                      onClick={() => window.location.href = `/project/${projectId}`}
                      className="group flex flex-col bg-[#111113] border border-[#27272A] rounded-md p-4 hover:border-[#52525B] transition-colors cursor-pointer"
                    >
                      <div className="flex items-start justify-between mb-4">
                        <h3 className="font-semibold text-[#FAFAFA] text-base leading-none truncate pr-2">
                          {projectName}
                        </h3>

                        <div className="flex items-center gap-1.5 bg-[#09090B] border border-[#27272A] px-2 py-0.5 rounded-md shrink-0">
                          <span className={`w-1.5 h-1.5 rounded-full ${getStatusColor(status)}`} />
                          <span className="text-[11px] font-medium text-[#A1A1AA] capitalize">
                            {getStatusText(status)}
                          </span>
                        </div>
                      </div>

                      <div className="space-y-3 mb-6 flex-1">
                        <div className="flex items-center gap-2 text-sm text-[#A1A1AA]">
                          <GitBranch className="w-4 h-4 shrink-0" />
                          <span className="truncate">{formatRepo(repoUrl)}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-[#A1A1AA]">
                          <Box className="w-4 h-4 shrink-0" />
                          <span className="capitalize">{framework}</span>
                        </div>
                      </div>

                      <div className="pt-3 border-t border-[#27272A] flex items-center justify-between text-xs">
                        <a
                          href={`http://${projectName}.localhost:8000`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[#FAFAFA] hover:underline truncate mr-4 font-medium"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {projectName}.localhost:8000
                        </a>
                        <div className="flex items-center gap-1 text-[#52525B] shrink-0">
                          <Clock className="w-3 h-3" />
                          <span>{formatDate(createdAt)}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : searchQuery ? (
              <div className="flex flex-col items-center justify-center py-24 border border-dashed border-[#27272A] rounded-md bg-[#111113]/50">
                <Search className="w-8 h-8 text-[#52525B] mb-3" />
                <h3 className="text-[#FAFAFA] font-medium mb-1">No results found</h3>
                <p className="text-sm text-[#A1A1AA] mb-4">No projects matching `${searchQuery}`.</p>
                <button
                  onClick={() => setSearchQuery("")}
                  className="text-sm text-[#FAFAFA] hover:underline"
                >
                  Clear search
                </button>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-24 border border-dashed border-[#27272A] rounded-md bg-[#111113]/50">
                <Box className="w-8 h-8 text-[#52525B] mb-3" />
                <h3 className="text-[#FAFAFA] font-medium mb-1">No projects found</h3>
                <p className="text-sm text-[#A1A1AA] mb-4">Deploy your first repository to get started.</p>
                <button
                  onClick={() => window.location.href = '/project/create'}
                  className="flex items-center gap-2 bg-[#FAFAFA] text-[#09090B] px-3.5 py-1.5 rounded-md text-sm font-medium hover:bg-[#E4E4E7] transition-colors"
                >
                  <Plus className="w-4 h-4" />
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
