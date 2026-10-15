"use client";

import { useState, useEffect } from "react";
import {
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
   ChevronRight,
   MoreVertical,
   RotateCcw,
   Loader2,
   Key,
   Settings,
   Trash2,
   Plus,
   Eye,
   EyeOff,
   BarChart3,
} from "lucide-react";

import { AppHeader } from "@/components/app/AppHeader";
import { MetricsTab } from "@/components/MetricsTab";
import { DomainSettings } from "@/components/DomainSettings";
import { CustomDomainSettings } from "@/components/CustomDomainSettings";
import { GitHubWebhookSettings } from "@/components/GitHubWebhookSettings";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE;

export default function ProjectOverviewClient({
   projectId,
}: {
   projectId: string;
}) {
   const [project, setProject] = useState<any>(null);
   const [isLoading, setIsLoading] = useState(true);
   const [error, setError] = useState<string | null>(null);

   const [activeTab, setActiveTab] = useState<
      "deployments" | "variables" | "settings" | "metrics"
   >("deployments");

   const [envs, setEnvs] = useState<any[]>([]);
   const [newKey, setNewKey] = useState("");
   const [newValue, setNewValue] = useState("");
   const [isAddingEnv, setIsAddingEnv] = useState(false);
   const [visibleValues, setVisibleValues] = useState<{
      [key: string]: boolean;
   }>({});

   const [openMenuId, setOpenMenuId] = useState<string | null>(null);
   const [isRollingBack, setIsRollingBack] = useState<string | null>(null);
   const [isDeletingProject, setIsDeletingProject] = useState(false);
   const [confirmDeleteName, setConfirmDeleteName] = useState("");

   const fetchProject = async () => {
      if (!projectId) return;
      try {
         const res = await fetch(`${API_BASE}/project/${projectId}`, {
            credentials: "include",
         });

         if (res.status === 401) {
            window.location.href = "/auth/login";
            return;
         }

         if (!res.ok) throw new Error("Project not found or failed to load");
         const data = await res.json();
         setProject(data);
      } catch (err: any) {
         setError(err.message);
      } finally {
         setIsLoading(false);
      }
   };

   const fetchEnvs = async () => {
      if (!projectId) return;
      try {
         const res = await fetch(`${API_BASE}/projects/${projectId}/envs`, {
            credentials: "include",
         });

         if (res.status === 401) {
            window.location.href = "/auth/login";
            return;
         }

         if (res.ok) {
            const data = await res.json();
            setEnvs(data || []);
         }
      } catch (err) {
         console.error("Failed to fetch environment variables", err);
      }
   };

   useEffect(() => {
      if (!projectId) return;
      fetchProject();
      fetchEnvs();
   }, [projectId]);

   const handleRollback = async (e: React.MouseEvent, deploymentId: string) => {
      e.stopPropagation();
      setOpenMenuId(null);
      setIsRollingBack(deploymentId);

      try {
         const res = await fetch(
            `${API_BASE}/deployments/${deploymentId}/rollback`,
            {
               method: "POST",
               credentials: "include",
            },
         );

         if (res.status === 401) {
            window.location.href = "/auth/login";
            return;
         }

         if (!res.ok) {
            const text = await res.text();
            throw new Error(text || "Failed to rollback deployment");
         }

         await fetchProject();
      } catch (err: any) {
         alert(`Rollback failed: ${err.message}`);
      } finally {
         setIsRollingBack(null);
      }
   };

   const handleAddEnv = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!newKey.trim() || !newValue.trim()) return;

      setIsAddingEnv(true);
      try {
         const formattedKey = newKey.trim().toUpperCase().replace(/\s+/g, "_");
         const res = await fetch(`${API_BASE}/projects/${projectId}/envs`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify([
               { key: formattedKey, value: newValue.trim() },
            ]),
            credentials: "include",
         });

         if (res.status === 401) {
            window.location.href = "/auth/login";
            return;
         }

         if (!res.ok) {
            const errData = await res.json().catch(() => ({}));
            throw new Error(
               errData.error || "Failed to save environment variable",
            );
         }

         setNewKey("");
         setNewValue("");
         await fetchEnvs();
      } catch (err: any) {
         alert(err.message);
      } finally {
         setIsAddingEnv(false);
      }
   };

   const handleUpdateEnv = async (
      envId: string,
      key: string,
      value: string,
   ) => {
      try {
         const res = await fetch(`${API_BASE}/envs/${envId}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ key, value }),
            credentials: "include",
         });

         if (res.status === 401) {
            window.location.href = "/auth/login";
            return;
         }

         if (!res.ok) throw new Error("Failed to update environment variable");
         await fetchEnvs();
      } catch (err: any) {
         alert(err.message);
      }
   };

   const handleDeleteEnv = async (envId: string) => {
      try {
         const res = await fetch(`${API_BASE}/envs/${envId}`, {
            method: "DELETE",
            credentials: "include",
         });

         if (res.status === 401) {
            window.location.href = "/auth/login";
            return;
         }

         if (!res.ok) throw new Error("Failed to delete environment variable");
         await fetchEnvs();
      } catch (err: any) {
         alert(err.message);
      }
   };

   const handleDeleteProject = async () => {
      if (!project) return;
      const projectName = project.Name || project.name;
      if (confirmDeleteName !== projectName) return;

      setIsDeletingProject(true);
      try {
         const res = await fetch(`${API_BASE}/project/${projectId}`, {
            method: "DELETE",
            credentials: "include",
         });

         if (res.status === 401) {
            window.location.href = "/auth/login";
            return;
         }

         if (!res.ok) throw new Error("Failed to delete project");
         window.location.href = "/home";
      } catch (err: any) {
         alert(err.message);
         setIsDeletingProject(false);
      }
   };

   const getStatusColor = (rawStatus: string) => {
      const status = (rawStatus || "").toLowerCase();
      switch (status) {
         case "deployed":
         case "success":
         case "running":
            return "text-ok bg-ok/10 border-ok/20";
         case "failed":
            return "text-red-500 bg-red-500/10 border-red-500/20";
         default:
            return "text-mute bg-white/5 border-hair-strong";
      }
   };

   const getStatusIcon = (rawStatus: string) => {
      const status = (rawStatus || "").toLowerCase();
      switch (status) {
         case "deployed":
         case "success":
         case "running":
            return <CheckCircle2 className="w-4 h-4" />;
         case "failed":
            return <XCircle className="w-4 h-4" />;
         default:
            return <Activity className="w-4 h-4" />;
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
      return date.toLocaleDateString("en-US", {
         month: "short",
         day: "numeric",
         hour: "2-digit",
         minute: "2-digit",
      });
   };

   if (isLoading) {
      return (
         <div className="min-h-screen bg-ink flex items-center justify-center">
            <div className="flex flex-col items-center gap-4">
               <div className="w-8 h-8 border-2 border-hair-strong border-t-fg rounded-full animate-spin" />
               <p className="text-mute text-sm font-medium">
                  Loading project details...
               </p>
            </div>
         </div>
      );
   }

   if (error || !project) {
      return (
         <div className="min-h-screen bg-ink flex items-center justify-center p-6">
            <div className="max-w-md w-full bg-panel border border-hair-strong rounded-xl p-6 text-center space-y-4">
               <AlertCircle className="w-10 h-10 text-red-500 mx-auto" />
               <h2 className="text-fg text-lg font-bold">
                  Failed to load project
               </h2>
               <p className="text-mute text-sm">
                  {error || "Project could not be found."}
               </p>
               <button
                  onClick={() => (window.location.href = "/home")}
                  className="bg-fg text-ink px-4 py-2 rounded-md text-sm font-medium hover:bg-white transition-colors mt-2"
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
   const activeDeployment =
      project.ActiveDeploymentID || project.active_deployment_id;

   const productionUrl =
      project.ProductionURL ||
      project.production_url ||
      `https://${projectName}.dploy.avichal.me`;

   const customDomain = project.CustomDomain || project.custom_domain;

   const deployments = project.Deployments || project.deployments || [];
   const sortedDeployments = [...deployments].sort((a, b) => {
      const dateA = new Date(a.CreatedAt || a.created_at).getTime();
      const dateB = new Date(b.CreatedAt || b.created_at).getTime();
      return dateB - dateA;
   });

   const successfulDeployments = sortedDeployments.filter(
      (dep) =>
         (dep.Status || dep.status) === "success" ||
         (dep.Status || dep.status) === "deployed",
   );
   const eligibleRollbackIds = successfulDeployments
      .slice(0, 3)
      .map((dep) => dep.ID || dep.id);

   const liveUrl = productionUrl.startsWith("http") ? productionUrl : `https://${productionUrl}`;
   const tabs = [
      { id: "deployments" as const, label: "Deployments", icon: Activity },
      { id: "metrics" as const, label: "Metrics & Scaling", icon: BarChart3 },
      { id: "variables" as const, label: "Environment", icon: Key, count: envs.length },
      { id: "settings" as const, label: "Settings", icon: Settings },
   ];

   return (
      <div className="min-h-screen bg-ink text-fg flex flex-col">
         <AppHeader crumbs={[{ label: "Projects", href: "/home" }, { label: projectName }]} />

         <main className="flex-1">
            <div className="border-b border-hair">
               <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-10">
                  <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                     <div className="flex items-start gap-4 min-w-0">
                        <span className="hidden sm:flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-hair-strong bg-panel font-mono text-xl font-semibold uppercase text-fg">
                           {String(projectName).slice(0, 1)}
                        </span>
                        <div className="min-w-0 space-y-3">
                           <div className="flex flex-wrap items-center gap-3">
                              <h1 className="text-[32px] leading-none font-semibold tracking-[-0.035em] text-fg truncate">
                                 {projectName}
                              </h1>
                              <span
                                 className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-medium capitalize ${getStatusColor(status)}`}
                              >
                                 {getStatusIcon(status)}
                                 {status}
                              </span>
                           </div>

                           <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[13px]">
                              <a
                                 href={liveUrl}
                                 target="_blank"
                                 rel="noreferrer"
                                 className="flex items-center gap-1.5 font-mono text-signal hover:text-[#ff8a57] transition-colors"
                              >
                                 {liveUrl.replace(/^https?:\/\//, "")}
                                 <ExternalLink className="w-3.5 h-3.5" />
                              </a>
                              {customDomain && (
                                 <a
                                    href={`https://${customDomain}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="flex items-center gap-1.5 font-mono text-ok hover:brightness-110 transition"
                                 >
                                    {customDomain}
                                    <ExternalLink className="w-3.5 h-3.5" />
                                 </a>
                              )}
                              <a
                                 href={repoUrl}
                                 target="_blank"
                                 rel="noreferrer"
                                 className="flex items-center gap-1.5 font-mono text-mute hover:text-fg transition-colors"
                              >
                                 <GitBranch className="w-3.5 h-3.5" />
                                 {formatRepo(repoUrl)}
                              </a>
                           </div>
                        </div>
                     </div>

                     <div className="flex items-center gap-2 shrink-0">
                        <a href={liveUrl} target="_blank" rel="noreferrer" className="ui-btn-ghost px-3.5 py-2 text-[13px]">
                           Visit
                           <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                        <button
                           onClick={() => (window.location.href = `/project/${projectId}/deploy`)}
                           className="ui-btn-accent px-3.5 py-2 text-[13px]"
                        >
                           <RotateCcw className="w-3.5 h-3.5" />
                           Redeploy
                        </button>
                     </div>
                  </div>

                  <div role="tablist" className="mt-8 flex gap-1 overflow-x-auto -mb-px">
                     {tabs.map((t) => {
                        const active = activeTab === t.id;
                        return (
                           <button
                              key={t.id}
                              role="tab"
                              aria-selected={active}
                              onClick={() => setActiveTab(t.id)}
                              className={`relative flex items-center gap-2 whitespace-nowrap px-3 pb-3 pt-1 text-[13px] font-medium transition-colors border-b-2 ${
                                 active ? "border-signal text-fg" : "border-transparent text-mute hover:text-fg"
                              }`}
                           >
                              <t.icon className="w-4 h-4" />
                              {t.label}
                              {!!t.count && (
                                 <span className="rounded-full bg-white/10 px-1.5 py-0.5 text-[10px] text-fg">{t.count}</span>
                              )}
                           </button>
                        );
                     })}
                  </div>
               </div>
            </div>

            <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-8">
               {activeTab === "deployments" && (
                  <div className="space-y-8 animate-in fade-in duration-300">
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="bg-panel border border-hair-strong rounded-xl p-6 space-y-6">
                           <h2 className="text-lg font-semibold text-fg flex items-center gap-2">
                              <Activity className="w-4 h-4 text-mute" />
                              Current Deployment
                           </h2>

                           <div className="space-y-4">
                              <div className="grid grid-cols-3 text-sm">
                                 <span className="text-mute">Status</span>
                                 <span className="col-span-2 text-fg capitalize">
                                    {status}
                                 </span>
                              </div>
                              <div className="grid grid-cols-3 text-sm">
                                 <span className="text-mute">Created</span>
                                 <span className="col-span-2 text-fg">
                                    {formatDate(createdAt)}
                                 </span>
                              </div>
                              <div className="grid grid-cols-3 text-sm">
                                 <span className="text-mute">
                                    Framework
                                 </span>
                                 <div className="col-span-2 flex items-center gap-2">
                                    <Box className="w-4 h-4 text-fg" />
                                    <span className="text-fg capitalize">
                                       {framework}
                                    </span>
                                 </div>
                              </div>
                              <div className="grid grid-cols-3 text-sm">
                                 <span className="text-mute">
                                    Deployment ID
                                 </span>
                                 <span
                                    className="col-span-2 text-fg font-mono text-xs truncate"
                                    title={activeDeployment || "None"}
                                 >
                                    {activeDeployment
                                       ? activeDeployment.substring(0, 12) +
                                         "..."
                                       : "No active deployment"}
                                 </span>
                              </div>
                           </div>
                        </div>

                        <div className="bg-panel border border-hair-strong rounded-xl p-6 space-y-6">
                           <h2 className="text-lg font-semibold text-fg flex items-center gap-2">
                              <Terminal className="w-4 h-4 text-mute" />
                              Build Configuration
                           </h2>

                           <div className="space-y-5">
                              <div className="space-y-2">
                                 <span className="text-mute text-sm">
                                    Build Command
                                 </span>
                                 <div className="bg-ink border border-hair-strong rounded p-2.5 font-mono text-xs text-fg overflow-x-auto whitespace-nowrap">
                                    {buildCmd}
                                 </div>
                              </div>

                              <div className="space-y-2">
                                 <span className="text-mute text-sm">
                                    Run Command
                                 </span>
                                 <div className="bg-ink border border-hair-strong rounded p-2.5 font-mono text-xs text-fg overflow-x-auto whitespace-nowrap">
                                    {runCmd}
                                 </div>
                              </div>
                           </div>
                        </div>
                     </div>

                     <div className="bg-panel border border-hair-strong rounded-xl overflow-visible relative z-0">
                        <div className="p-6 border-b border-hair-strong flex items-center justify-between">
                           <h2 className="text-lg font-semibold text-fg flex items-center gap-2">
                              <Clock className="w-4 h-4 text-mute" />
                              Deployment History
                           </h2>
                        </div>

                        <div className="divide-y divide-hair-strong">
                           {sortedDeployments.length === 0 ? (
                              <div className="p-8 text-center text-mute text-sm">
                                 No deployments found for this project.
                              </div>
                           ) : (
                              sortedDeployments.map((dep: any) => {
                                 const depId = dep.ID || dep.id;
                                 const depStatus =
                                    dep.Status || dep.status || "Unknown";
                                 const depCommit =
                                    dep.CommitSHA || dep.commit_sha || "HEAD";
                                 const depCreatedAt =
                                    dep.CreatedAt || dep.created_at;

                                 const isActive = depId === activeDeployment;
                                 const isEligibleForRollback =
                                    !isActive &&
                                    eligibleRollbackIds.includes(depId);

                                 return (
                                    <div
                                       key={depId}
                                       onClick={() =>
                                          (window.location.href = `/project/${projectId}/${depId}`)
                                       }
                                       className={`group flex items-center justify-between p-4 hover:bg-white/5 transition-colors cursor-pointer relative ${openMenuId === depId ? "z-50" : "z-0"}`}
                                    >
                                       <div className="flex items-center gap-4">
                                          <div
                                             className={`flex items-center gap-2 w-28 px-2 py-1 rounded-md border text-xs font-medium capitalize ${getStatusColor(depStatus)}`}
                                          >
                                             {getStatusIcon(depStatus)}
                                             {depStatus}
                                          </div>

                                          <div className="flex items-center gap-2 text-sm">
                                             <GitCommit className="w-4 h-4 text-mute" />
                                             <span className="font-mono text-fg">
                                                {depCommit.substring(0, 7)}
                                             </span>
                                          </div>

                                          {isActive && (
                                             <div className="hidden md:flex items-center gap-1.5 px-2 py-0.5 rounded bg-signal/10 border border-signal/20 text-signal text-[10px] font-bold uppercase tracking-wider ml-2">
                                                <span className="w-1.5 h-1.5 rounded-full bg-signal animate-pulse" />
                                                Active
                                             </div>
                                          )}
                                       </div>

                                       <div className="flex items-center gap-4 md:gap-6">
                                          <span className="text-sm text-mute hidden sm:block">
                                             {formatDate(depCreatedAt)}
                                          </span>

                                          <div className="flex items-center gap-2">
                                             {isEligibleForRollback && (
                                                <div className="relative">
                                                   <button
                                                      onClick={(e) => {
                                                         e.preventDefault();
                                                         e.stopPropagation();
                                                         setOpenMenuId(
                                                            openMenuId === depId
                                                               ? null
                                                               : depId,
                                                         );
                                                      }}
                                                      className="rollback-menu-btn p-1 rounded text-mute hover:text-fg hover:bg-white/10 transition-colors"
                                                   >
                                                      {isRollingBack ===
                                                      depId ? (
                                                         <Loader2 className="w-4 h-4 animate-spin" />
                                                      ) : (
                                                         <MoreVertical className="w-4 h-4" />
                                                      )}
                                                   </button>

                                                   {openMenuId === depId && (
                                                      <div className="absolute right-0 mt-1 w-40 bg-panel border border-hair-strong rounded-xl shadow-xl overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-100">
                                                         <button
                                                            onClick={(e) => {
                                                               e.preventDefault();
                                                               handleRollback(
                                                                  e,
                                                                  depId,
                                                               );
                                                            }}
                                                            className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-fg hover:bg-white/10 transition-colors text-left"
                                                         >
                                                            <RotateCcw className="w-4 h-4" />
                                                            Rollback Here
                                                         </button>
                                                      </div>
                                                   )}
                                                </div>
                                             )}
                                             <ChevronRight className="w-4 h-4 text-faint group-hover:text-fg transition-colors" />
                                          </div>
                                       </div>
                                    </div>
                                 );
                              })
                           )}
                        </div>
                     </div>
                  </div>
               )}

               {activeTab === "metrics" && <MetricsTab projectId={projectId} />}

               {activeTab === "variables" && (
                  <div className="space-y-6 animate-in fade-in duration-300">
                     <div className="bg-panel border border-hair-strong rounded-xl p-6 space-y-6">
                        <div>
                           <h2 className="text-lg font-semibold text-fg">
                              Environment Variables
                           </h2>
                           <p className="text-sm text-mute mt-1">
                              Configure environment variables for your build and
                              runtime environments.
                           </p>
                        </div>

                        <form
                           onSubmit={handleAddEnv}
                           className="flex flex-col sm:flex-row items-center gap-3 pt-2"
                        >
                           <input
                              type="text"
                              placeholder="KEY (e.g. DATABASE_URL)"
                              value={newKey}
                              onChange={(e) => setNewKey(e.target.value)}
                              disabled={isAddingEnv}
                              className="w-full sm:w-1/3 bg-ink border border-hair-strong rounded-md px-3 py-2 text-sm text-fg font-mono placeholder:text-faint focus:outline-none focus:border-fg"
                           />
                           <input
                              type="text"
                              placeholder="VALUE"
                              value={newValue}
                              onChange={(e) => setNewValue(e.target.value)}
                              disabled={isAddingEnv}
                              className="w-full sm:flex-1 bg-ink border border-hair-strong rounded-md px-3 py-2 text-sm text-fg font-mono placeholder:text-faint focus:outline-none focus:border-fg"
                           />
                           <button
                              type="submit"
                              disabled={
                                 isAddingEnv ||
                                 !newKey.trim() ||
                                 !newValue.trim()
                              }
                              className="w-full sm:w-auto flex items-center justify-center gap-1.5 bg-fg text-ink px-4 py-2 rounded-md text-sm font-medium hover:bg-white transition-colors disabled:opacity-50 shrink-0"
                           >
                              {isAddingEnv ? (
                                 <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                 <Plus className="w-4 h-4" />
                              )}
                              Add
                           </button>
                        </form>
                     </div>

                     <div className="bg-panel border border-hair-strong rounded-xl overflow-hidden divide-y divide-hair-strong">
                        {envs.length === 0 ? (
                           <div className="p-8 text-center text-mute text-sm">
                              No environment variables added yet.
                           </div>
                        ) : (
                           envs.map((env: any) => {
                              const envId = env.ID || env.id;
                              const isVisible = visibleValues[envId];

                              return (
                                 <div
                                    key={envId}
                                    className="p-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-panel/50"
                                 >
                                    <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-3">
                                       <input
                                          type="text"
                                          defaultValue={env.Key || env.key}
                                          onBlur={(e) => {
                                             const newKeyVal = e.target.value
                                                .toUpperCase()
                                                .trim();
                                             if (
                                                newKeyVal &&
                                                newKeyVal !==
                                                   (env.Key || env.key)
                                             ) {
                                                handleUpdateEnv(
                                                   envId,
                                                   newKeyVal,
                                                   env.Value || env.value,
                                                );
                                             }
                                          }}
                                          className="bg-ink border border-hair-strong rounded px-3 py-1.5 text-sm text-fg font-mono focus:outline-none focus:border-fg"
                                       />
                                       <div className="relative flex items-center">
                                          <input
                                             type={
                                                isVisible ? "text" : "password"
                                             }
                                             defaultValue={
                                                env.Value || env.value
                                             }
                                             onBlur={(e) => {
                                                const newVal =
                                                   e.target.value.trim();
                                                if (
                                                   newVal !==
                                                   (env.Value || env.value)
                                                ) {
                                                   handleUpdateEnv(
                                                      envId,
                                                      env.Key || env.key,
                                                      newVal,
                                                   );
                                                }
                                             }}
                                             className="w-full bg-ink border border-hair-strong rounded px-3 py-1.5 pr-10 text-sm text-fg font-mono focus:outline-none focus:border-fg"
                                          />
                                          <button
                                             type="button"
                                             onClick={() =>
                                                setVisibleValues({
                                                   ...visibleValues,
                                                   [envId]: !isVisible,
                                                })
                                             }
                                             className="absolute right-2.5 text-mute hover:text-fg"
                                          >
                                             {isVisible ? (
                                                <EyeOff className="w-4 h-4" />
                                             ) : (
                                                <Eye className="w-4 h-4" />
                                             )}
                                          </button>
                                       </div>
                                    </div>

                                    <button
                                       onClick={() => handleDeleteEnv(envId)}
                                       className="self-end sm:self-center p-2 text-mute hover:text-red-400 hover:bg-red-400/10 rounded transition-colors"
                                       title="Delete Variable"
                                    >
                                       <Trash2 className="w-4 h-4" />
                                    </button>
                                 </div>
                              );
                           })
                        )}
                     </div>
                  </div>
               )}

               {activeTab === "settings" && (
                  <div className="space-y-6 animate-in fade-in duration-300">
                     <DomainSettings
                        projectId={projectId}
                        currentName={projectName}
                        currentUrl={productionUrl}
                     />

                     <CustomDomainSettings
                        projectId={projectId}
                        currentCustomDomain={
                           project.CustomDomain || project.custom_domain || null
                        }
                     />

                     <GitHubWebhookSettings
                        projectId={projectId}
                        repositoryUrl={repoUrl || ""}
                     />
                     <div className="bg-panel border border-red-500/20 rounded-md p-6 space-y-6">
                        <div>
                           <h2 className="text-lg font-semibold text-red-400">
                              Danger Zone
                           </h2>
                           <p className="text-sm text-mute mt-1">
                              Permanently delete this project, its
                              configuration, environment variables, and all
                              associated deployment containers.
                           </p>
                        </div>

                        <div className="pt-4 border-t border-hair-strong space-y-4">
                           <div className="space-y-2">
                              <label className="block text-xs font-medium text-mute">
                                 Type{" "}
                                 <strong className="text-fg font-mono">
                                    {projectName}
                                 </strong>{" "}
                                 to confirm deletion:
                              </label>
                              <input
                                 type="text"
                                 value={confirmDeleteName}
                                 onChange={(e) =>
                                    setConfirmDeleteName(e.target.value)
                                 }
                                 placeholder={projectName}
                                 className="w-full sm:w-80 bg-ink border border-hair-strong rounded-md px-3 py-2 text-sm text-fg font-mono focus:outline-none focus:border-red-500"
                              />
                           </div>

                           <button
                              onClick={handleDeleteProject}
                              disabled={
                                 isDeletingProject ||
                                 confirmDeleteName !== projectName
                              }
                              className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500 hover:text-white px-4 py-2 rounded-md text-sm font-medium transition-all disabled:opacity-30 disabled:hover:bg-red-500/10 disabled:hover:text-red-400 disabled:cursor-not-allowed"
                           >
                              {isDeletingProject ? (
                                 <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                 <Trash2 className="w-4 h-4" />
                              )}
                              Delete Project
                           </button>
                        </div>
                     </div>
                  </div>
               )}
            </div>
         </main>
      </div>
   );
}
