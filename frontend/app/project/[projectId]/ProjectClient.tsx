"use client";

import { useState, useEffect } from "react";
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
   Check,
} from "lucide-react";

const API_BASE = "http://localhost:8080/api";

export default function ProjectOverviewClient({
   projectId,
}: {
   projectId: string;
}) {
   const [project, setProject] = useState<any>(null);
   const [isLoading, setIsLoading] = useState(true);
   const [error, setError] = useState<string | null>(null);

   const [activeTab, setActiveTab] = useState<
      "deployments" | "variables" | "settings"
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

   const fetchEnvs = async () => {
      if (!projectId) return;
      try {
         const res = await fetch(`${API_BASE}/projects/${projectId}/envs`);
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
            },
         );

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
         });

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
         });

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
         });

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
         const res = await fetch(`${API_BASE}/projects/${projectId}`, {
            method: "DELETE",
         });

         if (!res.ok) throw new Error("Failed to delete project");
         window.location.href = "/";
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
            return "text-green-500 bg-green-500/10 border-green-500/20";
         case "failed":
            return "text-red-500 bg-red-500/10 border-red-500/20";
         default:
            return "text-[#A1A1AA] bg-[#27272A]/50 border-[#27272A]";
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
         <div className="min-h-screen bg-[#09090B] flex items-center justify-center">
            <div className="flex flex-col items-center gap-4">
               <div className="w-8 h-8 border-2 border-[#27272A] border-t-[#FAFAFA] rounded-full animate-spin" />
               <p className="text-[#A1A1AA] text-sm font-medium">
                  Loading project details...
               </p>
            </div>
         </div>
      );
   }

   if (error || !project) {
      return (
         <div className="min-h-screen bg-[#09090B] flex items-center justify-center p-6">
            <div className="max-w-md w-full bg-[#111113] border border-[#27272A] rounded-md p-6 text-center space-y-4">
               <AlertCircle className="w-10 h-10 text-red-500 mx-auto" />
               <h2 className="text-[#FAFAFA] text-lg font-bold">
                  Failed to load project
               </h2>
               <p className="text-[#A1A1AA] text-sm">
                  {error || "Project could not be found."}
               </p>
               <button
                  onClick={() => (window.location.href = "/")}
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
   const activeDeployment =
      project.ActiveDeploymentID || project.active_deployment_id;
   const productionUrl =
      project.ProductionURL ||
      project.production_url ||
      `${projectName}.localhost:8000`;

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

   return (
      <div className="min-h-screen bg-[#09090B] text-[#FAFAFA] font-sans antialiased selection:bg-blue-500/30 flex flex-col">
         <nav className="h-14 border-b border-[#27272A] bg-[#09090B] shrink-0 px-6 flex items-center gap-4 sticky top-0 z-10">
            <button
               onClick={() => (window.location.href = "/")}
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
                     <div
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-md border text-sm font-medium capitalize ${getStatusColor(status)}`}
                     >
                        {getStatusIcon(status)}
                        {status}
                     </div>
                     <button
                        onClick={() =>
                           (window.location.href = `/project/${projectId}/deploy`)
                        }
                        className="bg-[#FAFAFA] text-[#09090B] px-4 py-1.5 rounded-md text-sm font-medium hover:bg-[#E4E4E7] transition-colors shadow-sm"
                     >
                        Redeploy
                     </button>
                  </div>
               </div>

               <div className="flex border-b border-[#27272A] space-x-6">
                  <button
                     onClick={() => setActiveTab("deployments")}
                     className={`pb-3 text-sm font-medium transition-colors border-b-2 flex items-center gap-2 ${
                        activeTab === "deployments"
                           ? "border-[#FAFAFA] text-[#FAFAFA]"
                           : "border-transparent text-[#A1A1AA] hover:text-[#FAFAFA]"
                     }`}
                  >
                     <Activity className="w-4 h-4" />
                     Deployments
                  </button>
                  <button
                     onClick={() => setActiveTab("variables")}
                     className={`pb-3 text-sm font-medium transition-colors border-b-2 flex items-center gap-2 ${
                        activeTab === "variables"
                           ? "border-[#FAFAFA] text-[#FAFAFA]"
                           : "border-transparent text-[#A1A1AA] hover:text-[#FAFAFA]"
                     }`}
                  >
                     <Key className="w-4 h-4" />
                     Environment Variables
                     {envs.length > 0 && (
                        <span className="bg-[#27272A] text-[#FAFAFA] px-1.5 py-0.5 rounded-full text-[10px]">
                           {envs.length}
                        </span>
                     )}
                  </button>
                  <button
                     onClick={() => setActiveTab("settings")}
                     className={`pb-3 text-sm font-medium transition-colors border-b-2 flex items-center gap-2 ${
                        activeTab === "settings"
                           ? "border-[#FAFAFA] text-[#FAFAFA]"
                           : "border-transparent text-[#A1A1AA] hover:text-[#FAFAFA]"
                     }`}
                  >
                     <Settings className="w-4 h-4" />
                     Settings
                  </button>
               </div>

               {activeTab === "deployments" && (
                  <div className="space-y-8 animate-in fade-in duration-300">
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="bg-[#111113] border border-[#27272A] rounded-md p-6 space-y-6">
                           <h2 className="text-lg font-semibold text-[#FAFAFA] flex items-center gap-2">
                              <Activity className="w-4 h-4 text-[#A1A1AA]" />
                              Current Deployment
                           </h2>

                           <div className="space-y-4">
                              <div className="grid grid-cols-3 text-sm">
                                 <span className="text-[#A1A1AA]">Status</span>
                                 <span className="col-span-2 text-[#FAFAFA] capitalize">
                                    {status}
                                 </span>
                              </div>
                              <div className="grid grid-cols-3 text-sm">
                                 <span className="text-[#A1A1AA]">Created</span>
                                 <span className="col-span-2 text-[#FAFAFA]">
                                    {formatDate(createdAt)}
                                 </span>
                              </div>
                              <div className="grid grid-cols-3 text-sm">
                                 <span className="text-[#A1A1AA]">
                                    Framework
                                 </span>
                                 <div className="col-span-2 flex items-center gap-2">
                                    <Box className="w-4 h-4 text-[#FAFAFA]" />
                                    <span className="text-[#FAFAFA] capitalize">
                                       {framework}
                                    </span>
                                 </div>
                              </div>
                              <div className="grid grid-cols-3 text-sm">
                                 <span className="text-[#A1A1AA]">
                                    Deployment ID
                                 </span>
                                 <span
                                    className="col-span-2 text-[#FAFAFA] font-mono text-xs truncate"
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

                        <div className="bg-[#111113] border border-[#27272A] rounded-md p-6 space-y-6">
                           <h2 className="text-lg font-semibold text-[#FAFAFA] flex items-center gap-2">
                              <Terminal className="w-4 h-4 text-[#A1A1AA]" />
                              Build Configuration
                           </h2>

                           <div className="space-y-5">
                              <div className="space-y-2">
                                 <span className="text-[#A1A1AA] text-sm">
                                    Build Command
                                 </span>
                                 <div className="bg-[#09090B] border border-[#27272A] rounded p-2.5 font-mono text-xs text-[#FAFAFA] overflow-x-auto whitespace-nowrap">
                                    {buildCmd}
                                 </div>
                              </div>

                              <div className="space-y-2">
                                 <span className="text-[#A1A1AA] text-sm">
                                    Run Command
                                 </span>
                                 <div className="bg-[#09090B] border border-[#27272A] rounded p-2.5 font-mono text-xs text-[#FAFAFA] overflow-x-auto whitespace-nowrap">
                                    {runCmd}
                                 </div>
                              </div>
                           </div>
                        </div>
                     </div>

                     <div className="bg-[#111113] border border-[#27272A] rounded-md overflow-visible relative z-0">
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
                                       className={`group flex items-center justify-between p-4 hover:bg-[#27272A]/30 transition-colors cursor-pointer relative ${openMenuId === depId ? "z-50" : "z-0"}`}
                                    >
                                       <div className="flex items-center gap-4">
                                          <div
                                             className={`flex items-center gap-2 w-28 px-2 py-1 rounded-md border text-xs font-medium capitalize ${getStatusColor(depStatus)}`}
                                          >
                                             {getStatusIcon(depStatus)}
                                             {depStatus}
                                          </div>

                                          <div className="flex items-center gap-2 text-sm">
                                             <GitCommit className="w-4 h-4 text-[#A1A1AA]" />
                                             <span className="font-mono text-[#FAFAFA]">
                                                {depCommit.substring(0, 7)}
                                             </span>
                                          </div>

                                          {isActive && (
                                             <div className="hidden md:flex items-center gap-1.5 px-2 py-0.5 rounded bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[10px] font-bold uppercase tracking-wider ml-2">
                                                <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                                                Active
                                             </div>
                                          )}
                                       </div>

                                       <div className="flex items-center gap-4 md:gap-6">
                                          <span className="text-sm text-[#A1A1AA] hidden sm:block">
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
                                                      className="rollback-menu-btn p-1 rounded text-[#A1A1AA] hover:text-[#FAFAFA] hover:bg-[#27272A] transition-colors"
                                                   >
                                                      {isRollingBack ===
                                                      depId ? (
                                                         <Loader2 className="w-4 h-4 animate-spin" />
                                                      ) : (
                                                         <MoreVertical className="w-4 h-4" />
                                                      )}
                                                   </button>

                                                   {openMenuId === depId && (
                                                      <div className="absolute right-0 mt-1 w-40 bg-[#111113] border border-[#27272A] rounded-md shadow-xl overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-100">
                                                         <button
                                                            onClick={(e) => {
                                                               e.preventDefault();
                                                               handleRollback(
                                                                  e,
                                                                  depId,
                                                               );
                                                            }}
                                                            className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-[#FAFAFA] hover:bg-[#27272A] transition-colors text-left"
                                                         >
                                                            <RotateCcw className="w-4 h-4" />
                                                            Rollback Here
                                                         </button>
                                                      </div>
                                                   )}
                                                </div>
                                             )}
                                             <ChevronRight className="w-4 h-4 text-[#52525B] group-hover:text-[#FAFAFA] transition-colors" />
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

               {activeTab === "variables" && (
                  <div className="space-y-6 animate-in fade-in duration-300">
                     <div className="bg-[#111113] border border-[#27272A] rounded-md p-6 space-y-6">
                        <div>
                           <h2 className="text-lg font-semibold text-[#FAFAFA]">
                              Environment Variables
                           </h2>
                           <p className="text-sm text-[#A1A1AA] mt-1">
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
                              className="w-full sm:w-1/3 bg-[#09090B] border border-[#27272A] rounded-md px-3 py-2 text-sm text-[#FAFAFA] font-mono placeholder:text-[#52525B] focus:outline-none focus:border-[#FAFAFA]"
                           />
                           <input
                              type="text"
                              placeholder="VALUE"
                              value={newValue}
                              onChange={(e) => setNewValue(e.target.value)}
                              disabled={isAddingEnv}
                              className="w-full sm:flex-1 bg-[#09090B] border border-[#27272A] rounded-md px-3 py-2 text-sm text-[#FAFAFA] font-mono placeholder:text-[#52525B] focus:outline-none focus:border-[#FAFAFA]"
                           />
                           <button
                              type="submit"
                              disabled={
                                 isAddingEnv ||
                                 !newKey.trim() ||
                                 !newValue.trim()
                              }
                              className="w-full sm:w-auto flex items-center justify-center gap-1.5 bg-[#FAFAFA] text-[#09090B] px-4 py-2 rounded-md text-sm font-medium hover:bg-[#E4E4E7] transition-colors disabled:opacity-50 shrink-0"
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

                     <div className="bg-[#111113] border border-[#27272A] rounded-md overflow-hidden divide-y divide-[#27272A]">
                        {envs.length === 0 ? (
                           <div className="p-8 text-center text-[#A1A1AA] text-sm">
                              No environment variables added yet.
                           </div>
                        ) : (
                           envs.map((env: any) => {
                              const envId = env.ID || env.id;
                              const isVisible = visibleValues[envId];

                              return (
                                 <div
                                    key={envId}
                                    className="p-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-[#111113]/50"
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
                                          className="bg-[#09090B] border border-[#27272A] rounded px-3 py-1.5 text-sm text-[#FAFAFA] font-mono focus:outline-none focus:border-[#FAFAFA]"
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
                                             className="w-full bg-[#09090B] border border-[#27272A] rounded px-3 py-1.5 pr-10 text-sm text-[#FAFAFA] font-mono focus:outline-none focus:border-[#FAFAFA]"
                                          />
                                          <button
                                             type="button"
                                             onClick={() =>
                                                setVisibleValues({
                                                   ...visibleValues,
                                                   [envId]: !isVisible,
                                                })
                                             }
                                             className="absolute right-2.5 text-[#A1A1AA] hover:text-[#FAFAFA]"
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
                                       className="self-end sm:self-center p-2 text-[#A1A1AA] hover:text-red-400 hover:bg-red-400/10 rounded transition-colors"
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
                     <div className="bg-[#111113] border border-red-500/20 rounded-md p-6 space-y-6">
                        <div>
                           <h2 className="text-lg font-semibold text-red-400">
                              Danger Zone
                           </h2>
                           <p className="text-sm text-[#A1A1AA] mt-1">
                              Permanently delete this project, its
                              configuration, environment variables, and all
                              associated deployment containers.
                           </p>
                        </div>

                        <div className="pt-4 border-t border-[#27272A] space-y-4">
                           <div className="space-y-2">
                              <label className="block text-xs font-medium text-[#A1A1AA]">
                                 Type{" "}
                                 <strong className="text-[#FAFAFA] font-mono">
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
                                 className="w-full sm:w-80 bg-[#09090B] border border-[#27272A] rounded-md px-3 py-2 text-sm text-[#FAFAFA] font-mono focus:outline-none focus:border-red-500"
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
