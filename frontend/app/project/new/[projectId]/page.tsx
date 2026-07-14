"use client";

import { useState, useEffect, useRef } from "react";
import {
   Terminal,
   TerminalSquare,
   CheckCircle2,
   ExternalLink,
   Loader2,
   ArrowRight,
   Settings,
   AlertCircle,
   Box
} from "lucide-react";

const API_BASE = "http://localhost:8080/api";
const WS_BASE = "ws://localhost:8080/api";

const BUILD_PHASES = [
   { id: "cloning", label: "Cloning Repo" },
   { id: "dockerfile", label: "Configuration" },
   { id: "building", label: "Building Image" },
   { id: "provisioning", label: "Provisioning" },
];

export default function ProjectDeploymentPage({ params }: { params?: { id: string } }) {
   const [projectId, setProjectId] = useState<string>("");

   const [step, setStep] = useState(1);
   const [project, setProject] = useState<any>(null);
   const [error, setError] = useState<string | null>(null);

   const [buildCommand, setBuildCommand] = useState("");
   const [runCommand, setRunCommand] = useState("");

   const [deployment, setDeployment] = useState<any>(null);
   const [buildPhase, setBuildPhase] = useState("cloning");
   const [logs, setLogs] = useState<string[]>([]);
   const [isDeploying, setIsDeploying] = useState(false);

   const terminalEndRef = useRef<HTMLDivElement>(null);

   useEffect(() => {
      if (params?.id) {
         setProjectId(params.id);
      } else if (typeof window !== "undefined") {
         const pathParts = window.location.pathname.split("/");
         const idIndex = pathParts.indexOf("project") + 1;
         if (idIndex > 0 && pathParts[idIndex]) {
            setProjectId(pathParts[idIndex]);
         }
      }
   }, [params]);

   useEffect(() => {
      if (!projectId || step !== 1) return;

      const pollProject = async () => {
         try {
            const res = await fetch(`${API_BASE}/project/${projectId}`);
            if (!res.ok) throw new Error("Failed to fetch project");

            const data = await res.json();

            const framework = data.framework || data.Framework;
            const status = data.status || data.Status;

            if (framework || status !== "cloning") {
               setProject(data);
               setBuildCommand(data.build_command || data.BuildCommand || "");
               setRunCommand(data.run_command || data.RunCommand || "");
               setStep(2);
            }
         } catch (err: any) {
            console.error("Polling error:", err);
         }
      };

      pollProject();
      const interval = setInterval(pollProject, 1000);

      return () => clearInterval(interval);
   }, [projectId, step]);

   useEffect(() => {
      let ws: WebSocket;
      const targetDeploymentId = deployment?.id || deployment?.ID;

      if (step === 3 && targetDeploymentId) {
         setLogs([
            "--> Connecting to Dploy build cluster...",
            `--> Subscribing to logs for deployment: ${targetDeploymentId}`,
         ]);

         setBuildPhase("cloning");

         ws = new WebSocket(`${WS_BASE}/deployments/${targetDeploymentId}/logs`);

         ws.onmessage = (event) => {
            const rawData = event.data;
            try {
               const parsed = JSON.parse(rawData);
               if (parsed.status || parsed.Status) setBuildPhase(parsed.status || parsed.Status);
               if (parsed.log || parsed.Log) setLogs((prev) => [...prev, parsed.log || parsed.Log]);
            } catch (e) {
               setLogs((prev) => [...prev, rawData]);
               const text = rawData.toLowerCase();
               if (text.includes("clone") || text.includes("cloning")) setBuildPhase("cloning");
               else if (text.includes("dockerfile") || text.includes("generating")) setBuildPhase("dockerfile");
               else if (text.includes("build") || text.includes("step 1/") || text.includes("npm install")) setBuildPhase("building");
               else if (text.includes("starting container") || text.includes("provision") || text.includes("port")) setBuildPhase("provisioning");
            }
         };

         ws.onclose = (event) => {
            if (event.reason === "Deployment Complete") setStep(4);
            else {
               setLogs((prev) => [...prev, "\n[Connection closed. Build process ended.]"]);
               setTimeout(() => setStep(4), 2000);
            }
         };

         ws.onerror = () => {
            setLogs((prev) => [...prev, "\n[WebSocket Connection Error]"]);
         };
      }
      return () => {
         if (ws) ws.close();
      };
   }, [step, deployment]);

   useEffect(() => {
      if (terminalEndRef.current) {
         terminalEndRef.current.scrollIntoView({ behavior: "smooth" });
      }
   }, [logs]);

   const handleDeploy = async () => {
      setIsDeploying(true);
      setError(null);

      try {
         const payload = {
            project_id: projectId,
            build_command: buildCommand,
            run_command: runCommand
         };

         const res = await fetch(`${API_BASE}/deployments`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
         });

         const text = await res.text();
         let data;
         try {
            data = text ? JSON.parse(text) : {};
         } catch (e) {
            throw new Error(`Server returned non-JSON (${res.status}): ${text.slice(0, 50)}`);
         }

         if (!res.ok) throw new Error(data.error || data.Error || "Failed to start deployment");

         setDeployment(data);
         setStep(3);
      } catch (err: any) {
         setError(err.message);
      } finally {
         setIsDeploying(false);
      }
   };

   const activePhaseIndex = BUILD_PHASES.findIndex((p) => p.id === buildPhase);
   const projectName = project?.Name || project?.name || "Project";

   return (
      <div className="min-h-screen bg-[#09090B] text-[#FAFAFA] font-sans antialiased selection:bg-blue-500/30 flex flex-col">

         <nav className="h-14 border-b border-[#27272A] bg-[#09090B] shrink-0 px-6 flex items-center justify-between sticky top-0 z-10">
            <div
               className="flex items-center gap-2 cursor-pointer"
               onClick={() => window.location.href = "/"}
            >
               <TerminalSquare className="w-5 h-5 text-[#FAFAFA]" />
               <span className="text-sm font-bold tracking-tight">DPLOY</span>
            </div>

            {step > 1 && project && (
               <div className="text-sm font-medium text-[#A1A1AA]">
                  Deploying <span className="text-[#FAFAFA]">{projectName}</span>
               </div>
            )}
         </nav>

         <main className="flex-1 flex flex-col max-w-3xl w-full mx-auto px-4 sm:px-6 py-12">

            {step === 1 && (
               <div className="flex-1 flex flex-col items-center justify-center space-y-6 animate-in fade-in zoom-in duration-500">
                  <div className="w-16 h-16 bg-[#111113] border border-[#27272A] rounded-md flex items-center justify-center shadow-sm">
                     <Loader2 className="w-6 h-6 text-[#FAFAFA] animate-spin" />
                  </div>
                  <div className="text-center space-y-1.5">
                     <h2 className="text-lg font-semibold text-[#FAFAFA]">Inspecting Repository</h2>
                     <p className="text-sm text-[#A1A1AA]">Our engine is cloning the code and detecting your framework...</p>
                  </div>
               </div>
            )}

            {step === 2 && project && (
               <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 w-full mt-8">
                  <div className="flex items-center gap-3">
                     <Settings className="w-5 h-5 text-[#A1A1AA]" />
                     <h2 className="text-xl font-semibold text-[#FAFAFA]">Configure Deployment</h2>
                  </div>

                  <div className="bg-[#111113] border border-[#27272A] rounded-md overflow-hidden shadow-sm">
                     <div className="p-5 border-b border-[#27272A] bg-[#09090B]">
                        <h3 className="font-medium text-base truncate text-[#FAFAFA]">
                           {project.repository_url || project.RepositoryURL}
                        </h3>
                        <p className="text-[#A1A1AA] text-xs font-mono mt-1.5">
                           Target Subdomain: <span className="text-[#FAFAFA]">{projectName}.localhost</span>
                        </p>
                     </div>

                     <div className="p-5 space-y-6">
                        <div className="bg-[#09090B] border border-[#27272A] rounded-md p-4 flex items-start gap-3">
                           <div className="w-2 h-2 rounded-full bg-blue-500 mt-1.5 shrink-0" />
                           <div>
                              <div className="text-xs font-medium text-[#A1A1AA] mb-1">Framework Auto-Detected</div>
                              <div className="text-sm text-[#FAFAFA]">
                                 We detected a <strong className="capitalize">{project.framework || project.Framework || 'Generic Docker'}</strong> setup. Review the commands below.
                              </div>
                           </div>
                        </div>

                        <div className="space-y-5">
                           <div className="space-y-2">
                              <label className="block text-xs font-medium text-[#A1A1AA]">Build Command</label>
                              <input
                                 type="text"
                                 value={buildCommand}
                                 onChange={(e) => setBuildCommand(e.target.value)}
                                 placeholder="e.g. npm run build"
                                 className="block w-full px-3 py-2 border border-[#27272A] rounded-md bg-[#09090B] font-mono text-sm text-[#FAFAFA] placeholder-[#52525B] focus:outline-none focus:border-[#FAFAFA] focus:ring-1 focus:ring-[#FAFAFA] transition-all"
                              />
                           </div>

                           <div className="space-y-2">
                              <label className="block text-xs font-medium text-[#A1A1AA]">Run Command</label>
                              <input
                                 type="text"
                                 value={runCommand}
                                 onChange={(e) => setRunCommand(e.target.value)}
                                 placeholder="e.g. npm start"
                                 className="block w-full px-3 py-2 border border-[#27272A] rounded-md bg-[#09090B] font-mono text-sm text-[#FAFAFA] placeholder-[#52525B] focus:outline-none focus:border-[#FAFAFA] focus:ring-1 focus:ring-[#FAFAFA] transition-all"
                              />
                           </div>
                        </div>

                        {error && (
                           <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-md flex items-start gap-2.5">
                              <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                              <p className="text-sm text-red-500">{error}</p>
                           </div>
                        )}

                        <button
                           onClick={handleDeploy}
                           disabled={isDeploying}
                           className="w-full flex items-center justify-center gap-2 bg-[#FAFAFA] hover:bg-[#E4E4E7] text-[#09090B] py-2.5 rounded-md font-medium text-sm transition-colors disabled:opacity-50"
                        >
                           {isDeploying ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                           ) : (
                              "Deploy Project"
                           )}
                           {!isDeploying && <ArrowRight className="w-4 h-4" />}
                        </button>
                     </div>
                  </div>
               </div>
            )}

            {step === 3 && (
               <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 w-full mt-8">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                     {BUILD_PHASES.map((phase, idx) => {
                        const isActive = idx === activePhaseIndex;
                        const isPast = activePhaseIndex > idx;

                        return (
                           <div
                              key={phase.id}
                              className={`flex items-center gap-2.5 p-3 rounded-md border transition-all duration-300 ${
                                 isActive ? 'bg-[#111113] border-[#FAFAFA]' :
                                 isPast ? 'bg-[#09090B] border-[#27272A]' :
                                 'bg-[#09090B] border-[#27272A] opacity-50'
                              }`}
                           >
                              {isActive ? (
                                 <Loader2 className="w-3.5 h-3.5 animate-spin text-[#FAFAFA] shrink-0" />
                              ) : isPast ? (
                                 <CheckCircle2 className="w-3.5 h-3.5 text-[#FAFAFA] shrink-0" />
                              ) : (
                                 <div className="w-3.5 h-3.5 rounded-full border border-[#52525B] shrink-0" />
                              )}
                              <span className={`text-xs font-medium whitespace-nowrap ${
                                 isActive || isPast ? 'text-[#FAFAFA]' : 'text-[#A1A1AA]'
                              }`}>
                                 {phase.label}
                              </span>
                           </div>
                        );
                     })}
                  </div>

                  <div className="bg-[#09090B] border border-[#27272A] rounded-md overflow-hidden flex flex-col h-[500px] shadow-sm">
                     <div className="bg-[#111113] border-b border-[#27272A] px-4 py-2.5 flex items-center gap-2">
                        <Terminal className="w-4 h-4 text-[#A1A1AA]" />
                        <span className="text-xs font-mono text-[#A1A1AA] uppercase tracking-wider font-medium">Build Logs</span>
                     </div>
                     <div className="p-5 overflow-y-auto font-mono text-xs sm:text-sm flex-1 custom-scrollbar">
                        {logs.map((log, index) => (
                           <div key={index} className="text-[#A1A1AA] leading-relaxed break-all whitespace-pre-wrap mb-1">
                              {log}
                           </div>
                        ))}
                        <div ref={terminalEndRef} />
                     </div>
                  </div>
               </div>
            )}

            {step === 4 && project && (
               <div className="flex-1 flex flex-col items-center justify-center space-y-8 animate-in fade-in zoom-in duration-500 mt-12">
                  <div className="w-16 h-16 bg-[#111113] border border-[#27272A] text-[#FAFAFA] rounded-md flex items-center justify-center shadow-sm">
                     <CheckCircle2 className="w-8 h-8" />
                  </div>

                  <div className="text-center space-y-2">
                     <h1 className="text-2xl font-bold text-[#FAFAFA] tracking-tight">Deployment Complete</h1>
                     <p className="text-[#A1A1AA] text-sm max-w-md mx-auto">
                        Your application was successfully built and is now serving traffic.
                     </p>
                  </div>

                  <div className="w-full max-w-sm p-5 bg-[#111113] border border-[#27272A] rounded-md space-y-3 shadow-sm">
                     <div className="text-xs font-medium text-[#A1A1AA] uppercase tracking-wider flex items-center gap-2">
                        <Globe className="w-3.5 h-3.5" /> Production URL
                     </div>
                     <a
                        href={`http://${projectName}.localhost:8000`}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center justify-between text-[#FAFAFA] hover:text-[#A1A1AA] text-sm font-medium transition-colors p-3 bg-[#09090B] border border-[#27272A] rounded"
                     >
                        {projectName}.localhost:8000
                        <ExternalLink className="w-4 h-4 shrink-0" />
                     </a>
                  </div>

                  <button
                     onClick={() => window.location.href = `/project/${projectId}`}
                     className="bg-[#FAFAFA] text-[#09090B] px-6 py-2.5 rounded-md font-medium text-sm hover:bg-[#E4E4E7] transition-colors shadow-sm"
                  >
                     Go to Project Overview
                  </button>
               </div>
            )}
         </main>

         <style dangerouslySetInnerHTML={{
            __html: `
               .custom-scrollbar::-webkit-scrollbar { width: 8px; height: 8px; }
               .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
               .custom-scrollbar::-webkit-scrollbar-thumb { background: #27272a; border-radius: 4px; }
               .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #52525b; }
            `
         }} />
      </div>
   );
}
