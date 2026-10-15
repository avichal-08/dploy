"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowUpRight, Box, Clock, Command, GitBranch, Plus, Search } from "lucide-react";
import { AppHeader } from "@/components/app/AppHeader";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE;

type Project = Record<string, string | undefined>;

const pick = (p: Project, a: string, b: string) => p[a] || p[b] || "";

function statusMeta(rawStatus: string) {
   const status = (rawStatus || "").toLowerCase();
   switch (status) {
      case "deployed":
      case "success":
      case "running":
         return { label: "Live", dot: "bg-ok shadow-[0_0_8px_var(--color-ok)]", text: "text-ok" };
      case "failed":
         return { label: "Failed", dot: "bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)]", text: "text-red-400" };
      case "cloning":
      case "building":
      case "pending":
         return {
            label: status[0].toUpperCase() + status.slice(1),
            dot: "bg-signal animate-pulse shadow-[0_0_8px_var(--color-signal)]",
            text: "text-signal",
         };
      default:
         return { label: status || "Unknown", dot: "bg-faint", text: "text-mute" };
   }
}

const formatRepo = (url: string) =>
   url ? url.replace(/^https?:\/\/(www\.)?github\.com\//, "").replace(/\.git$/, "") : "Unknown repository";

function formatDate(dateString: string) {
   const date = new Date(dateString);
   if (!dateString || isNaN(date.getTime())) return "Unknown";
   return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function ProjectCard({ project }: { project: Project }) {
   const id = pick(project, "ID", "id");
   const name = pick(project, "Name", "name");
   const repoUrl = pick(project, "RepositoryURL", "repository_url");
   const framework = pick(project, "Framework", "framework") || "docker";
   const status = statusMeta(pick(project, "Status", "status") || "pending");
   const createdAt = pick(project, "CreatedAt", "created_at");
   const rawUrl = pick(project, "ProductionURL", "production_url");
   const productionUrl = rawUrl ? (rawUrl.startsWith("http") ? rawUrl : `https://${rawUrl}`) : "";

   return (
      <div className="group relative flex flex-col rounded-xl border border-hair-strong bg-panel p-5 transition-all duration-200 hover:-translate-y-0.5 hover:border-white/20 hover:bg-panel-2 hover:shadow-[0_20px_50px_-25px_rgba(0,0,0,0.9)]">
         <Link href={`/project/${id}`} className="absolute inset-0 rounded-xl" aria-label={`Open ${name}`} />

         <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
               <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-hair-strong bg-ink font-mono text-sm font-semibold uppercase text-fg">
                  {name.slice(0, 1)}
               </span>
               <div className="min-w-0">
                  <h3 className="truncate text-[15px] font-medium tracking-tight text-fg">{name}</h3>
                  <p className="truncate font-mono text-[11px] text-faint">{framework}</p>
               </div>
            </div>
            <span className={`flex shrink-0 items-center gap-1.5 rounded-full border border-hair-strong bg-ink px-2.5 py-1 text-[11px] font-medium ${status.text}`}>
               <span className={`h-1.5 w-1.5 rounded-full ${status.dot}`} />
               {status.label}
            </span>
         </div>

         <div className="mt-5 flex items-center gap-2 text-[13px] text-mute">
            <GitBranch className="h-3.5 w-3.5 shrink-0 text-faint" />
            <span className="truncate font-mono text-[12px]">{formatRepo(repoUrl)}</span>
         </div>

         <div className="mt-5 flex items-center justify-between gap-3 border-t border-hair pt-4 text-[12px]">
            {productionUrl ? (
               <a
                  href={productionUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="relative z-10 flex min-w-0 items-center gap-1 font-mono text-[11.5px] text-mute transition-colors hover:text-signal"
               >
                  <span className="truncate">{productionUrl.replace(/^https?:\/\//, "")}</span>
                  <ArrowUpRight className="h-3 w-3 shrink-0" />
               </a>
            ) : (
               <span className="font-mono text-[11.5px] text-faint">Not deployed yet</span>
            )}
            <span className="flex shrink-0 items-center gap-1 text-faint">
               <Clock className="h-3 w-3" />
               {formatDate(createdAt)}
            </span>
         </div>
      </div>
   );
}

function EmptyState({ icon: Icon, title, body, action }: { icon: typeof Box; title: string; body: string; action: React.ReactNode }) {
   return (
      <div className="dot-grid flex flex-col items-center justify-center rounded-2xl border border-dashed border-hair-strong px-6 py-20 text-center">
         <span className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl border border-hair-strong bg-panel">
            <Icon className="h-5 w-5 text-mute" />
         </span>
         <h3 className="text-[15px] font-medium text-fg">{title}</h3>
         <p className="mt-1 max-w-sm text-[13px] text-mute">{body}</p>
         <div className="mt-6">{action}</div>
      </div>
   );
}

export default function HomePage() {
   const [searchQuery, setSearchQuery] = useState("");
   const [projects, setProjects] = useState<Project[]>([]);
   const [isLoading, setIsLoading] = useState(true);

   useEffect(() => {
      const load = async () => {
         try {
            const res = await fetch(`${API_BASE}/projects`, { credentials: "include" });
            if (res.status === 401) {
               window.location.href = "/auth/login";
               return;
            }
            if (res.ok) setProjects((await res.json()) || []);
         } catch (err) {
            console.error("Error fetching projects:", err);
         } finally {
            setIsLoading(false);
         }
      };
      load();
   }, []);

   useEffect(() => {
      const onKey = (e: KeyboardEvent) => {
         if ((e.metaKey || e.ctrlKey) && e.key === "k") {
            e.preventDefault();
            document.getElementById("project-search")?.focus();
         }
      };
      window.addEventListener("keydown", onKey);
      return () => window.removeEventListener("keydown", onKey);
   }, []);

   const query = searchQuery.toLowerCase();
   const filtered = projects.filter(
      (p) =>
         pick(p, "Name", "name").toLowerCase().includes(query) ||
         pick(p, "RepositoryURL", "repository_url").toLowerCase().includes(query),
   );

   const createButton = (
      <Link href="/project/create" className="ui-btn-primary px-3.5 py-2 text-[13px]">
         <Plus className="h-4 w-4" />
         New project
      </Link>
   );

   return (
      <div className="min-h-screen bg-ink text-fg">
         <AppHeader crumbs={[{ label: "Projects" }]} />

         <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
            <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
               <div>
                  <h1 className="text-[32px] font-semibold tracking-[-0.035em]">Projects</h1>
                  <p className="mt-1 text-sm text-mute">
                     {isLoading
                        ? "Loading your projects..."
                        : `${projects.length} ${projects.length === 1 ? "project" : "projects"} deployed with dploy`}
                  </p>
               </div>
               <div className="flex items-center gap-2">
                  <div className="group relative w-full sm:w-72">
                     <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-faint transition-colors group-focus-within:text-fg" />
                     <input
                        id="project-search"
                        type="text"
                        placeholder="Search projects..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="ui-input py-2 pl-9 pr-12 text-[13px]"
                     />
                     <kbd className="pointer-events-none absolute right-2.5 top-1/2 flex -translate-y-1/2 items-center gap-0.5 rounded border border-hair-strong px-1.5 py-0.5 font-mono text-[10px] text-faint">
                        <Command className="h-2.5 w-2.5" />K
                     </kbd>
                  </div>
                  <div className="shrink-0">{createButton}</div>
               </div>
            </div>

            <div className="mt-10">
               {isLoading ? (
                  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                     {[0, 1, 2].map((i) => (
                        <div key={i} className="h-[178px] animate-pulse rounded-xl border border-hair bg-panel" />
                     ))}
                  </div>
               ) : filtered.length > 0 ? (
                  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                     {filtered.map((p) => (
                        <ProjectCard key={pick(p, "ID", "id")} project={p} />
                     ))}
                  </div>
               ) : searchQuery ? (
                  <EmptyState
                     icon={Search}
                     title="No matching projects"
                     body={`Nothing matches "${searchQuery}".`}
                     action={
                        <button onClick={() => setSearchQuery("")} className="ui-btn-ghost px-3.5 py-2 text-[13px]">
                           Clear search
                        </button>
                     }
                  />
               ) : (
                  <EmptyState
                     icon={Box}
                     title="No projects yet"
                     body="Import a GitHub repository and dploy will build it, roll it out and route traffic to it."
                     action={createButton}
                  />
               )}
            </div>
         </main>
      </div>
   );
}
