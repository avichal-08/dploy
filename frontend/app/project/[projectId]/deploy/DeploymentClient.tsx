"use client";

import { useState, useEffect, useRef } from "react";
import {
   Terminal,
   Loader2,
   ArrowRight,
   AlertCircle,
   Clock,
   Box,
} from "lucide-react";
import { AppHeader } from "@/components/app/AppHeader";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE;
const WS_BASE = process.env.NEXT_PUBLIC_WS_BASE;

const BUILD_PHASES = [
   { id: "cloning", label: "Cloning Repo" },
   { id: "dockerfile", label: "Configuration" },
   { id: "building", label: "Building Image" },
   { id: "provisioning", label: "Provisioning" },
];

export default function ProjectDeploymentClient({
   projectId,
}: {
   projectId: string;
}) {
   const [step, setStep] = useState(1);
   const [project, setProject] = useState<any>(null);
   const [error, setError] = useState<string | null>(null);

   const [buildCommand, setBuildCommand] = useState("");
   const [runCommand, setRunCommand] = useState("");

   const [deployment, setDeployment] = useState<any>(null);
   const [buildPhase, setBuildPhase] = useState("cloning");
   const [logs, setLogs] = useState<string[]>([]);
   const [isDeploying, setIsDeploying] = useState(false);
   const [elapsedTime, setElapsedTime] = useState(0);

   const terminalEndRef = useRef<HTMLDivElement>(null);
   const timerRef = useRef<NodeJS.Timeout | null>(null);

   useEffect(() => {
      if (!projectId || step !== 1) return;

      const pollProject = async () => {
         try {
            const res = await fetch(`${API_BASE}/project/${projectId}`, {
               credentials: "include",
            });

            if (res.status === 401) {
               window.location.href = "/auth/login";
               return;
            }

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
      if (step === 3) {
         timerRef.current = setInterval(() => {
            setElapsedTime((prev) => prev + 1);
         }, 1000);
      } else {
         if (timerRef.current) clearInterval(timerRef.current);
      }
      return () => {
         if (timerRef.current) clearInterval(timerRef.current);
      };
   }, [step]);

   useEffect(() => {
      let ws: WebSocket;
      const targetDeploymentId = deployment?.id || deployment?.ID;

      if (step === 3 && targetDeploymentId) {
         ws = new WebSocket(
            `${WS_BASE}/deployments/${targetDeploymentId}/logs`,
         );

         ws.onmessage = (event) => {
            const rawData = event.data;
            try {
               const parsed = JSON.parse(rawData);
               const currentStatus = (
                  parsed.status ||
                  parsed.Status ||
                  ""
               ).toLowerCase();

               if (currentStatus) setBuildPhase(currentStatus);
               if (parsed.log || parsed.Log)
                  setLogs((prev) => [...prev, parsed.log || parsed.Log]);

               if (currentStatus === "failed" || currentStatus === "error") {
                  ws.close(4000, "Deployment Failed");
               }
            } catch (e) {
               setLogs((prev) => [...prev, rawData]);
               const text = rawData.toLowerCase();

               if (text.includes("clone") || text.includes("cloning"))
                  setBuildPhase("cloning");
               else if (
                  text.includes("dockerfile") ||
                  text.includes("generating")
               )
                  setBuildPhase("dockerfile");
               else if (
                  text.includes("build") ||
                  text.includes("step 1/") ||
                  text.includes("npm install")
               )
                  setBuildPhase("building");
               else if (
                  text.includes("starting container") ||
                  text.includes("provision") ||
                  text.includes("port")
               )
                  setBuildPhase("provisioning");
            }
         };

         ws.onclose = () => {
            window.location.href = `/project/${projectId}`;
         };

         ws.onerror = () => {
            setLogs((prev) => [
               ...prev,
               "\n[WebSocket Connection Error. Redirecting...]",
            ]);
         };
      }
      return () => {
         if (ws) ws.close();
      };
   }, [step, deployment, projectId]);

   useEffect(() => {
      if (terminalEndRef.current) {
         terminalEndRef.current.scrollIntoView({ behavior: "smooth" });
      }
   }, [logs]);

   const handleDeploy = async () => {
      setIsDeploying(true);
      setError(null);
      setElapsedTime(0);

      try {
         const payload = {
            project_id: projectId,
            build_command: buildCommand,
            run_command: runCommand,
         };

         const res = await fetch(`${API_BASE}/deployments`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
            credentials: "include",
         });

         if (res.status === 401) {
            window.location.href = "/auth/login";
            return;
         }

         const text = await res.text();
         let data;
         try {
            data = text ? JSON.parse(text) : {};
         } catch (e) {
            throw new Error(
               `Server returned non-JSON (${res.status}): ${text.slice(0, 50)}`,
            );
         }

         if (!res.ok)
            throw new Error(
               data.error || data.Error || "Failed to start deployment",
            );

         setDeployment(data);

         setLogs([
            "--> Initializing deployment pipeline..."
         ]);
         setBuildPhase("cloning");
         setStep(3);
      } catch (err: any) {
         setError(err.message);
      } finally {
         setIsDeploying(false);
      }
   };

   const activePhaseIndex = BUILD_PHASES.findIndex((p) => p.id === buildPhase);
   const projectName = project?.Name || project?.name || "Project";

   const productionUrl =
      project?.ProductionURL ||
      project?.production_url ||
      `https://${projectName}.dploy.avichal.me`;

   const formatTime = (seconds: number) => {
      const m = Math.floor(seconds / 60);
      const s = seconds % 60;
      return `${m}:${s < 10 ? "0" : ""}${s}`;
   };

   return (
      <div className="min-h-screen bg-ink text-fg flex flex-col">
         <AppHeader
            crumbs={[
               { label: "Projects", href: "/home" },
               { label: projectName, href: `/project/${projectId}` },
               { label: "Deploy" },
            ]}
            actions={
               step > 1 && project ? (
                  <span className="hidden sm:flex items-center gap-2 rounded-full border border-hair-strong bg-panel px-3 py-1 text-xs text-mute">
                     {step === 3 ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-signal" />
                     ) : (
                        <span className="h-1.5 w-1.5 rounded-full bg-signal" />
                     )}
                     Deploying <span className="text-fg">{projectName}</span>
                  </span>
               ) : null
            }
         />

         <main className="flex-1 flex flex-col max-w-4xl w-full mx-auto px-4 sm:px-6 py-10 lg:py-16">
            {step === 1 && (
               <div className="flex-1 flex flex-col items-center justify-center space-y-6 animate-in fade-in zoom-in duration-500">
                  <div className="w-16 h-16 bg-panel border border-hair-strong rounded-2xl flex items-center justify-center shadow-lg shadow-black/50 relative">
                     <div className="absolute inset-0 rounded-2xl border border-signal/20 animate-pulse"></div>
                     <Loader2 className="w-6 h-6 text-signal animate-spin" />
                  </div>
                  <div className="text-center space-y-2">
                     <h2 className="text-xl font-semibold text-fg tracking-tight">
                        Inspecting Repository
                     </h2>
                     <p className="text-sm text-mute max-w-sm mx-auto">
                        Our engine is analyzing your codebase and determining
                        the optimal build environment.
                     </p>
                  </div>
               </div>
            )}

            {step === 2 && project && (
               <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 w-full max-w-2xl mx-auto">
                  <div className="flex flex-col space-y-1">
                     <h2 className="text-2xl font-bold text-fg tracking-tight">
                        Configure Deployment
                     </h2>
                     <p className="text-mute text-sm">
                        Review your build settings before initiating the
                        pipeline.
                     </p>
                  </div>

                  <div className="bg-panel border border-hair-strong rounded-xl overflow-hidden shadow-xl shadow-black/40">
                     <div className="p-6 border-b border-hair-strong bg-ink flex items-center gap-4">
                        <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center shrink-0">
                           <Box className="w-5 h-5 text-fg" />
                        </div>
                        <div className="min-w-0">
                           <h3 className="font-semibold text-base truncate text-fg">
                              {project.repository_url || project.RepositoryURL}
                           </h3>
                           <p className="text-mute text-xs font-mono mt-1 flex items-center gap-1.5">
                              Target:{" "}
                              <span className="text-signal">
                                 {productionUrl.replace("https://", "")}
                              </span>
                           </p>
                        </div>
                     </div>

                     <div className="p-6 space-y-8">
                        <div className="bg-ink border border-hair-strong rounded-lg p-4 flex items-start gap-3 relative overflow-hidden">
                           <div className="absolute left-0 top-0 bottom-0 w-1 bg-signal"></div>
                           <div>
                              <div className="text-xs font-semibold text-signal tracking-wider uppercase mb-1">
                                 Framework Auto-Detected
                              </div>
                              <div className="text-sm text-fg leading-relaxed">
                                 We detected a{" "}
                                 <strong className="font-semibold text-white capitalize">
                                    {project.framework ||
                                       project.Framework ||
                                       "Generic Docker"}
                                 </strong>{" "}
                                 setup. The engine has pre-filled the optimal
                                 build and run commands.
                              </div>
                           </div>
                        </div>

                        <div className="space-y-5">
                           <div className="space-y-2">
                              <label className="block text-xs font-semibold text-mute uppercase tracking-wider">
                                 Build Command
                              </label>
                              <input
                                 type="text"
                                 value={buildCommand}
                                 onChange={(e) =>
                                    setBuildCommand(e.target.value)
                                 }
                                 placeholder="e.g. npm run build"
                                 className="block w-full px-3 py-2.5 border border-hair-strong rounded-lg bg-ink font-mono text-sm text-fg placeholder-faint focus:outline-none focus:border-signal/60 focus:ring-1 focus:ring-signal/30 transition-all"
                              />
                           </div>

                           <div className="space-y-2">
                              <label className="block text-xs font-semibold text-mute uppercase tracking-wider">
                                 Run Command
                              </label>
                              <input
                                 type="text"
                                 value={runCommand}
                                 onChange={(e) => setRunCommand(e.target.value)}
                                 placeholder="e.g. npm start"
                                 className="block w-full px-3 py-2.5 border border-hair-strong rounded-lg bg-ink font-mono text-sm text-fg placeholder-faint focus:outline-none focus:border-signal/60 focus:ring-1 focus:ring-signal/30 transition-all"
                              />
                           </div>
                        </div>

                        {error && (
                           <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg flex items-start gap-3">
                              <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                              <p className="text-sm text-red-200 leading-relaxed">
                                 {error}
                              </p>
                           </div>
                        )}

                        <button
                           onClick={handleDeploy}
                           disabled={isDeploying}
                           className="w-full flex items-center justify-center gap-2 bg-fg hover:bg-white text-ink py-3 rounded-lg font-semibold text-sm transition-all disabled:opacity-50 active:scale-[0.98]"
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
               <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 w-full">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                     <div>
                        <h2 className="text-xl font-bold text-fg flex items-center gap-2">
                           <Loader2 className="w-5 h-5 text-signal animate-spin" />{" "}
                           Deploying Application
                        </h2>
                     </div>
                     <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-panel border border-hair-strong text-xs font-medium text-mute">
                        <Clock className="w-3.5 h-3.5" />
                        Elapsed: {formatTime(elapsedTime)}
                     </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                     {BUILD_PHASES.map((phase, idx) => {
                        const isActive = idx === activePhaseIndex;
                        let stateClass =
                           "bg-ink border-hair-strong opacity-50";

                        if (isActive)
                           stateClass =
                              "bg-panel border-signal/50 shadow-[0_0_15px_rgba(59,130,246,0.1)]";

                        return (
                           <div
                              key={phase.id}
                              className={`flex items-center gap-3 p-3.5 rounded-xl border transition-all duration-500 ${stateClass}`}
                           >
                              {isActive ? (
                                 <Loader2 className="w-4 h-4 animate-spin text-signal shrink-0" />
                              ) : (
                                 <div className="w-4 h-4 rounded-full border-2 border-faint shrink-0" />
                              )}
                              <span
                                 className={`text-xs font-semibold whitespace-nowrap ${
                                    isActive
                                       ? "text-fg"
                                       : "text-faint"
                                 }`}
                              >
                                 {phase.label}
                              </span>
                           </div>
                        );
                     })}
                  </div>

                  <div
                     className={`bg-ink border border-hair-strong rounded-xl overflow-hidden flex flex-col h-[500px] shadow-xl`}
                  >
                     <div className="bg-panel border-b border-hair-strong px-5 py-3 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                           <Terminal className="w-4 h-4 text-mute" />
                           <span className="text-xs font-mono text-mute uppercase tracking-wider font-semibold">
                              Build Output
                           </span>
                        </div>
                     </div>
                     <div className="p-5 overflow-y-auto font-mono text-[13px] flex-1 custom-scrollbar">
                        {logs.map((log, index) => (
                           <div
                              key={index}
                              className={`${
                                 log.toLowerCase().includes("error")
                                    ? "text-red-400"
                                    : "text-mute"
                              } leading-relaxed break-all whitespace-pre-wrap mb-1.5`}
                           >
                              {log}
                           </div>
                        ))}
                        <div ref={terminalEndRef} />
                     </div>
                  </div>
               </div>
            )}
         </main>

         <style
            dangerouslySetInnerHTML={{
               __html: `
        .custom-scrollbar::-webkit-scrollbar { width: 8px; height: 8px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #27272a; border-radius: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #52525b; }
      `,
            }}
         />
      </div>
   );
}
