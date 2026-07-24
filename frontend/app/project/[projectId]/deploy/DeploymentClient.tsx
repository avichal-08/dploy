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
  XCircle,
  Clock,
  Box,
  RotateCcw
} from "lucide-react";

const API_BASE = "http://localhost:8080/api";
const WS_BASE = "ws://localhost:8080/api";

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
          const currentStatus = (parsed.status || parsed.Status || "").toLowerCase();

          if (currentStatus) setBuildPhase(currentStatus);
          if (parsed.log || parsed.Log) setLogs((prev) => [...prev, parsed.log || parsed.Log]);

          if (currentStatus === "failed" || currentStatus === "error") {
              ws.close(4000, "Deployment Failed");
          }

        } catch (e) {
          setLogs((prev) => [...prev, rawData]);
          const text = rawData.toLowerCase();

          if (text.includes("clone") || text.includes("cloning")) setBuildPhase("cloning");
          else if (text.includes("dockerfile") || text.includes("generating")) setBuildPhase("dockerfile");
          else if (text.includes("build") || text.includes("step 1/") || text.includes("npm install")) setBuildPhase("building");
          else if (text.includes("starting container") || text.includes("provision") || text.includes("port")) setBuildPhase("provisioning");
          else if (text.includes("error") || text.includes("failed") || text.includes("exit status")) {

          }
        }
      };

      ws.onclose = (event) => {
        if (event.reason === "Deployment Complete" || event.code === 1000) {
            setStep(4);
        } else if (event.reason === "Deployment Failed" || event.code === 4000) {
            setStep(5);
        } else {
            setLogs((prev) => [
              ...prev,
              `\n[Connection closed. Code: ${event.code}. Process ended.]`,
            ]);
            setTimeout(() => setStep(5), 2000);
        }
      };

      ws.onerror = () => {
        setLogs((prev) => [...prev, "\n[WebSocket Connection Error. Polling for final status...]"]);
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
      });

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
        "--> Initializing deployment pipeline...",
        `--> Target Deployment ID: ${data.id || data.ID}`,
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

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className="min-h-screen bg-[#09090B] text-[#FAFAFA] font-sans antialiased selection:bg-blue-500/30 flex flex-col">
      <nav className="h-14 border-b border-[#27272A] bg-[#09090B] shrink-0 px-6 flex items-center justify-between sticky top-0 z-10">
        <div
          className="flex items-center gap-2 cursor-pointer group"
          onClick={() => (window.location.href = "/")}
        >
          <TerminalSquare className="w-5 h-5 text-[#FAFAFA] group-hover:text-blue-400 transition-colors" />
          <span className="text-sm font-bold tracking-tight">DPLOY</span>
        </div>

        {step > 1 && project && (
          <div className="text-sm font-medium text-[#A1A1AA] flex items-center gap-2">
            {step === 3 && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            Deploying <span className="text-[#FAFAFA]">{projectName}</span>
          </div>
        )}
      </nav>

      <main className="flex-1 flex flex-col max-w-4xl w-full mx-auto px-4 sm:px-6 py-10 lg:py-16">

        {step === 1 && (
          <div className="flex-1 flex flex-col items-center justify-center space-y-6 animate-in fade-in zoom-in duration-500">
            <div className="w-16 h-16 bg-[#111113] border border-[#27272A] rounded-2xl flex items-center justify-center shadow-lg shadow-black/50 relative">
              <div className="absolute inset-0 rounded-2xl border border-blue-500/20 animate-pulse"></div>
              <Loader2 className="w-6 h-6 text-blue-400 animate-spin" />
            </div>
            <div className="text-center space-y-2">
              <h2 className="text-xl font-semibold text-[#FAFAFA] tracking-tight">
                Inspecting Repository
              </h2>
              <p className="text-sm text-[#A1A1AA] max-w-sm mx-auto">
                Our engine is analyzing your codebase and determining the optimal build environment.
              </p>
            </div>
          </div>
        )}

        {step === 2 && project && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 w-full max-w-2xl mx-auto">
            <div className="flex flex-col space-y-1">
              <h2 className="text-2xl font-bold text-[#FAFAFA] tracking-tight">
                Configure Deployment
              </h2>
              <p className="text-[#A1A1AA] text-sm">Review your build settings before initiating the pipeline.</p>
            </div>

            <div className="bg-[#111113] border border-[#27272A] rounded-xl overflow-hidden shadow-xl shadow-black/40">
              <div className="p-6 border-b border-[#27272A] bg-[#0A0A0A] flex items-center gap-4">
                 <div className="w-10 h-10 rounded-lg bg-[#27272A] flex items-center justify-center shrink-0">
                    <Box className="w-5 h-5 text-[#FAFAFA]" />
                 </div>
                 <div className="min-w-0">
                    <h3 className="font-semibold text-base truncate text-[#FAFAFA]">
                        {project.repository_url || project.RepositoryURL}
                    </h3>
                    <p className="text-[#A1A1AA] text-xs font-mono mt-1 flex items-center gap-1.5">
                        Target: <span className="text-blue-400">{projectName}.localhost</span>
                    </p>
                 </div>
              </div>

              <div className="p-6 space-y-8">
                <div className="bg-[#0A0A0A] border border-[#27272A] rounded-lg p-4 flex items-start gap-3 relative overflow-hidden">
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-500"></div>
                  <div>
                    <div className="text-xs font-semibold text-blue-400 tracking-wider uppercase mb-1">
                        Framework Auto-Detected
                    </div>
                    <div className="text-sm text-[#FAFAFA] leading-relaxed">
                        We detected a <strong className="font-semibold text-white capitalize">{project.framework || project.Framework || "Generic Docker"}</strong> setup.
                        The engine has pre-filled the optimal build and run commands.
                    </div>
                  </div>
                </div>

                <div className="space-y-5">
                  <div className="space-y-2">
                    <label className="block text-xs font-semibold text-[#A1A1AA] uppercase tracking-wider">
                        Build Command
                    </label>
                    <input
                      type="text"
                      value={buildCommand}
                      onChange={(e) =>
                        setBuildCommand(e.target.value)
                      }
                      placeholder="e.g. npm run build"
                      className="block w-full px-3 py-2.5 border border-[#27272A] rounded-lg bg-[#0A0A0A] font-mono text-sm text-[#FAFAFA] placeholder-[#52525B] focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="block text-xs font-semibold text-[#A1A1AA] uppercase tracking-wider">
                        Run Command
                    </label>
                    <input
                      type="text"
                      value={runCommand}
                      onChange={(e) => setRunCommand(e.target.value)}
                      placeholder="e.g. npm start"
                      className="block w-full px-3 py-2.5 border border-[#27272A] rounded-lg bg-[#0A0A0A] font-mono text-sm text-[#FAFAFA] placeholder-[#52525B] focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                    />
                  </div>
                </div>

                {error && (
                  <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                    <p className="text-sm text-red-200 leading-relaxed">{error}</p>
                  </div>
                )}

                <button
                  onClick={handleDeploy}
                  disabled={isDeploying}
                  className="w-full flex items-center justify-center gap-2 bg-[#FAFAFA] hover:bg-[#E4E4E7] text-[#09090B] py-3 rounded-lg font-semibold text-sm transition-all disabled:opacity-50 active:scale-[0.98]"
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

        {(step === 3 || step === 5) && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 w-full">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <div>
                    <h2 className="text-xl font-bold text-[#FAFAFA] flex items-center gap-2">
                        {step === 5 ? (
                            <><XCircle className="w-5 h-5 text-red-500" /> Deployment Failed</>
                        ) : (
                            <><Loader2 className="w-5 h-5 text-blue-400 animate-spin" /> Deploying Application</>
                        )}
                    </h2>
                </div>
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#111113] border border-[#27272A] text-xs font-medium text-[#A1A1AA]">
                    <Clock className="w-3.5 h-3.5" />
                    Elapsed: {formatTime(elapsedTime)}
                </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {BUILD_PHASES.map((phase, idx) => {
                const isActive = idx === activePhaseIndex && step === 3;
                const isPast = activePhaseIndex > idx || step === 4;
                const isErrorPhase = idx === activePhaseIndex && step === 5;

                let stateClass = "bg-[#0A0A0A] border-[#27272A] opacity-50";
                if (isActive) stateClass = "bg-[#111113] border-blue-500/50 shadow-[0_0_15px_rgba(59,130,246,0.1)]";
                if (isPast) stateClass = "bg-[#0A0A0A] border-green-500/30";
                if (isErrorPhase) stateClass = "bg-[#111113] border-red-500/50";

                return (
                  <div
                    key={phase.id}
                    className={`flex items-center gap-3 p-3.5 rounded-xl border transition-all duration-500 ${stateClass}`}
                  >
                    {isActive ? (
                      <Loader2 className="w-4 h-4 animate-spin text-blue-400 shrink-0" />
                    ) : isPast ? (
                      <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
                    ) : isErrorPhase ? (
                      <XCircle className="w-4 h-4 text-red-500 shrink-0" />
                    ) : (
                      <div className="w-4 h-4 rounded-full border-2 border-[#52525B] shrink-0" />
                    )}
                    <span
                      className={`text-xs font-semibold whitespace-nowrap ${
                        isActive || isPast || isErrorPhase
                          ? "text-[#FAFAFA]"
                          : "text-[#52525B]"
                      }`}
                    >
                      {phase.label}
                    </span>
                  </div>
                );
              })}
            </div>

            <div className={`bg-[#0A0A0A] border rounded-xl overflow-hidden flex flex-col h-[500px] shadow-xl ${step === 5 ? 'border-red-500/30' : 'border-[#27272A]'}`}>
              <div className="bg-[#111113] border-b border-[#27272A] px-5 py-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Terminal className="w-4 h-4 text-[#A1A1AA]" />
                    <span className="text-xs font-mono text-[#A1A1AA] uppercase tracking-wider font-semibold">
                    Build Output
                    </span>
                </div>
                {step === 5 && (
                    <button
                        onClick={() => window.location.reload()}
                        className="flex items-center gap-1.5 text-xs font-medium text-[#FAFAFA] bg-[#27272A] hover:bg-[#3F3F46] px-2.5 py-1 rounded transition-colors"
                    >
                        <RotateCcw className="w-3.5 h-3.5" /> Retry
                    </button>
                )}
              </div>
              <div className="p-5 overflow-y-auto font-mono text-[13px] flex-1 custom-scrollbar">
                {logs.map((log, index) => (
                  <div
                    key={index}
                    className={`${log.toLowerCase().includes('error') ? 'text-red-400' : 'text-[#A1A1AA]'} leading-relaxed break-all whitespace-pre-wrap mb-1.5`}
                  >
                    {log}
                  </div>
                ))}
                <div ref={terminalEndRef} />
              </div>
            </div>
          </div>
        )}

        {step === 4 && project && (
          <div className="flex-1 flex flex-col items-center justify-center space-y-8 animate-in fade-in zoom-in duration-500 mt-8">
            <div className="w-20 h-20 bg-green-500/10 border border-green-500/20 text-green-500 rounded-2xl flex items-center justify-center shadow-[0_0_30px_rgba(34,197,94,0.2)]">
              <CheckCircle2 className="w-10 h-10" />
            </div>

            <div className="text-center space-y-3">
              <h1 className="text-3xl font-bold text-[#FAFAFA] tracking-tight">
                Deployment Successful
              </h1>
              <p className="text-[#A1A1AA] text-sm max-w-md mx-auto leading-relaxed">
                Your application has been built and provisioned successfully. It is now serving traffic.
              </p>
            </div>

            <div className="w-full max-w-md p-6 bg-[#111113] border border-[#27272A] rounded-xl space-y-4 shadow-xl">
              <div className="text-xs font-semibold text-[#A1A1AA] uppercase tracking-wider flex items-center gap-2">
                Production URL
              </div>
              <a
                href={`http://${projectName}.localhost:8000`}
                target="_blank"
                rel="noreferrer"
                className="group flex items-center justify-between text-[#FAFAFA] hover:text-blue-400 text-sm font-medium transition-all p-4 bg-[#0A0A0A] border border-[#27272A] hover:border-blue-500/30 rounded-lg"
              >
                <span className="truncate pr-4">{projectName}.localhost:8000</span>
                <ExternalLink className="w-4 h-4 shrink-0 text-[#52525B] group-hover:text-blue-400 transition-colors" />
              </a>
            </div>

            <button
              onClick={() => (window.location.href = `/project/${projectId}`)}
              className="bg-[#FAFAFA] text-[#09090B] px-8 py-3 rounded-lg font-semibold text-sm hover:bg-[#E4E4E7] hover:scale-[1.02] active:scale-[0.98] transition-all shadow-sm"
            >
              Continue to Dashboard
            </button>
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
