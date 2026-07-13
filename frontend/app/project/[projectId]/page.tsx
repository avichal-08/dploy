"use client";

import React, { useState, useEffect, useRef } from "react";
import {
   Terminal,
   Rocket,
   CheckCircle,
   ExternalLink,
   Loader2,
   ArrowRight,
   Settings,
   AlertCircle
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
         setProjectId(pathParts[pathParts.length - 1]);
      }
   }, [params]);

   useEffect(() => {
      if (!projectId || step !== 1) return;

      const pollProject = async () => {
         try {
            const res = await fetch(`${API_BASE}/projects/${projectId}`);
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

   return (
      <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans selection:bg-zinc-800">
         <nav className="border-b border-zinc-800 bg-zinc-950/50 backdrop-blur-md sticky top-0 z-10">
            <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
               <div
                  className="flex items-center gap-2 cursor-pointer"
                  onClick={() => window.location.href = "/"}
               >
                  <div className="w-8 h-8 bg-white rounded flex items-center justify-center">
                     <Rocket className="w-5 h-5 text-black" />
                  </div>
                  <span className="text-xl font-bold tracking-tight">Dploy.</span>
               </div>
            </div>
         </nav>

         <main className="max-w-3xl mx-auto px-4 sm:px-6 pt-12 sm:pt-20 pb-32">

            {step === 1 && (
               <div className="flex flex-col items-center justify-center space-y-6 mt-12 animate-in fade-in zoom-in duration-500">
                  <div className="relative">
                     <div className="absolute inset-0 bg-blue-500/20 blur-xl rounded-full" />
                     <div className="w-20 h-20 bg-zinc-900 border border-zinc-800 rounded-2xl flex items-center justify-center relative z-10 shadow-2xl">
                        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
                     </div>
                  </div>
                  <div className="text-center space-y-2">
                     <h2 className="text-2xl font-bold text-white tracking-tight">Inspecting Repository</h2>
                     <p className="text-zinc-400">Our engine is cloning the code and detecting your framework...</p>
                  </div>
               </div>
            )}

            {step === 2 && project && (
               <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <div className="flex items-center gap-3">
                     <Settings className="w-6 h-6 text-zinc-400" />
                     <h2 className="text-2xl font-bold text-white">Configure Deployment</h2>
                  </div>

                  <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden shadow-2xl">
                     <div className="p-6 border-b border-zinc-800 bg-zinc-950/30">
                        <h3 className="font-medium text-lg truncate text-white">{project.repository_url || project.RepositoryURL}</h3>
                        <p className="text-zinc-500 text-sm font-mono mt-1">
                           Target Subdomain: <span className="text-blue-400">{project.name || project.Name}.localhost</span>
                        </p>
                     </div>

                     <div className="p-6 space-y-6">
                        <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4 flex items-start gap-4">
                           <div className="w-2 h-2 rounded-full bg-blue-500 mt-2 shrink-0 shadow-[0_0_8px_rgba(59,130,246,0.8)]" />
                           <div>
                              <div className="text-sm font-medium text-blue-400 mb-1">Framework Auto-Detected</div>
                              <div className="text-zinc-300">We detected a <strong className="text-white capitalize">{project.framework || project.Framework || 'Generic Docker'}</strong> setup. Review the generated commands below.</div>
                           </div>
                        </div>

                        <div className="space-y-4">
                           <div className="space-y-2">
                              <label className="block text-sm font-medium text-zinc-400">Build Command</label>
                              <input
                                 type="text"
                                 value={buildCommand}
                                 onChange={(e) => setBuildCommand(e.target.value)}
                                 placeholder="e.g. npm run build"
                                 className="block w-full px-4 py-3 border border-zinc-700 rounded-xl bg-zinc-950 font-mono text-sm text-white placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                              />
                           </div>

                           <div className="space-y-2">
                              <label className="block text-sm font-medium text-zinc-400">Run Command</label>
                              <input
                                 type="text"
                                 value={runCommand}
                                 onChange={(e) => setRunCommand(e.target.value)}
                                 placeholder="e.g. npm start"
                                 className="block w-full px-4 py-3 border border-zinc-700 rounded-xl bg-zinc-950 font-mono text-sm text-white placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                              />
                           </div>
                        </div>

                        {error && (
                           <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start gap-3">
                              <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                              <p className="text-sm text-red-400">{error}</p>
                           </div>
                        )}

                        <button
                           onClick={handleDeploy}
                           disabled={isDeploying}
                           className="w-full flex items-center justify-center gap-2 bg-white hover:bg-zinc-200 text-black py-4 rounded-xl font-bold text-lg transition-all disabled:opacity-50 hover:scale-[1.02] active:scale-[0.98]"
                        >
                           {isDeploying ? (
                              <Loader2 className="w-5 h-5 animate-spin" />
                           ) : (
                              "Deploy Project"
                           )}
                           {!isDeploying && <ArrowRight className="w-5 h-5" />}
                        </button>
                     </div>
                  </div>
               </div>
            )}

            {step === 3 && (
               <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                     {BUILD_PHASES.map((phase, idx) => {
                        const isActive = idx === activePhaseIndex;
                        const isPast = activePhaseIndex > idx;

                        return (
                           <div
                              key={phase.id}
                              className={`flex items-center gap-3 p-3 rounded-xl border transition-all duration-300 ${
                                 isActive ? 'bg-blue-500/10 border-blue-500/50' :
                                 isPast ? 'bg-green-500/10 border-green-500/30' :
                                 'bg-zinc-900/50 border-zinc-800/50'
                              }`}
                           >
                              {isActive ? (
                                 <Loader2 className="w-4 h-4 animate-spin text-blue-500 shrink-0" />
                              ) : isPast ? (
                                 <CheckCircle className="w-4 h-4 text-green-500 shrink-0" />
                              ) : (
                                 <div className="w-4 h-4 rounded-full border-2 border-zinc-700 shrink-0" />
                              )}
                              <span className={`text-xs sm:text-sm font-medium whitespace-nowrap ${
                                 isActive ? 'text-blue-400' : isPast ? 'text-green-400' : 'text-zinc-500'
                              }`}>
                                 {phase.label}
                              </span>
                           </div>
                        );
                     })}
                  </div>

                  <div className="bg-[#0A0A0A] border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col h-[500px]">
                     <div className="bg-zinc-900 border-b border-zinc-800 px-4 py-3 flex items-center gap-2">
                        <Terminal className="w-4 h-4 text-zinc-400" />
                        <span className="text-xs font-mono text-zinc-400 uppercase tracking-wider">Build Logs</span>
                     </div>
                     <div className="p-4 overflow-y-auto font-mono text-xs sm:text-sm flex-1 custom-scrollbar">
                        {logs.map((log, index) => (
                           <div key={index} className="text-zinc-300 leading-relaxed break-all whitespace-pre-wrap">
                              {log}
                           </div>
                        ))}
                        <div ref={terminalEndRef} />
                     </div>
                  </div>
               </div>
            )}

            {step === 4 && project && (
               <div className="space-y-6 sm:space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 text-center mt-8 sm:mt-12">
                  <div className="w-20 h-20 bg-green-500/10 text-green-500 rounded-full flex items-center justify-center mx-auto mb-6">
                     <CheckCircle className="w-10 h-10" />
                  </div>
                  <h1 className="text-3xl sm:text-4xl font-bold text-white tracking-tight">Deployment Complete!</h1>
                  <p className="text-zinc-400 text-lg">Your application is now live and serving traffic.</p>

                  <div className="max-w-md mx-auto mt-8 p-6 bg-zinc-900 border border-zinc-800 rounded-2xl space-y-4">
                     <div className="text-sm font-medium text-zinc-500 uppercase tracking-wider">Production URL</div>
                     <a
                        href={`http://${project.name || project.Name}.localhost:8000`}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center justify-center gap-2 text-blue-400 hover:text-blue-300 text-lg font-medium transition-colors break-all"
                     >
                        {project.name || project.Name}.localhost:8000
                        <ExternalLink className="w-5 h-5 shrink-0" />
                     </a>
                  </div>

                  <button
                     onClick={() => window.location.href = "/project"}
                     className="mt-12 text-zinc-400 hover:text-white transition-colors underline underline-offset-4"
                  >
                     Deploy another project
                  </button>
               </div>
            )}
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
