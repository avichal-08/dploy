"use client";

import React, { useState, useEffect } from "react";
import {
  LayoutDashboard,
  Globe,
  TerminalSquare,
  Settings,
  GitBranch,
  PlayCircle,
  CheckCircle2,
  Cpu,
  Box,
  ArrowUpRight
} from "lucide-react";

export default function DashboardMockup() {
  const [activeTab, setActiveTab] = useState("deployments");

  // Simulated streaming logs for that authentic "live" feel
  const [logLines, setLogLines] = useState([
    "[17:44:40] INFO starting background inspection project_id=c3f837...",
    "[17:44:40] INFO starting git clone repo_url=https://github.com/dev/my-api",
  ]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setLogLines((prev) => [
        ...prev,
        "[17:44:42] BUILD generating Dockerfile for Node.js app",
        "[17:44:45] DOCKER Step 1/6 : FROM node:18-alpine",
        "[17:44:48] ASYNQ task enqueued: orchestration_scale_up",
        "[17:44:50] PROXY updated active connections. Replica-03 healthy.",
        "[17:44:51] SUCCESS Deployment live at my-api.dploy.io",
      ]);
    }, 2500);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="relative w-full max-w-6xl mx-auto mt-24">
      {/* Outer Glow & Border Setup */}
      <div className="absolute -inset-[1px] bg-gradient-to-b from-white/[0.15] to-transparent rounded-2xl z-0" />

      {/* Application Window */}
      <div className="relative z-10 flex h-[650px] w-full rounded-2xl bg-[#0a0a0c] overflow-hidden shadow-[0_30px_100px_-20px_rgba(0,0,0,1)] border border-white/[0.05]">

        {/* Sidebar */}
        <div className="w-64 bg-[#050505] border-r border-white/[0.05] flex flex-col justify-between">
          <div className="p-4">
            {/* Project Selector */}
            <div className="flex items-center gap-3 px-3 py-2 rounded-lg bg-white/[0.03] border border-white/[0.05] cursor-pointer hover:bg-white/[0.06] transition-colors mb-6">
              <div className="w-6 h-6 rounded bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg">
                <Box className="w-3.5 h-3.5 text-white" />
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-medium text-white">my-api</span>
                <span className="text-[10px] text-neutral-500 font-mono">github.com/dev/my-api</span>
              </div>
            </div>

            {/* Nav Links */}
            <nav className="space-y-1">
              {[
                { id: "deployments", icon: LayoutDashboard, label: "Deployments" },
                { id: "domains", icon: Globe, label: "Custom Domains" },
                { id: "logs", icon: TerminalSquare, label: "Runtime Logs" },
                { id: "settings", icon: Settings, label: "Settings" },
              ].map((item) => (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-all ${
                    activeTab === item.id
                      ? "bg-white/[0.08] text-white font-medium"
                      : "text-neutral-400 hover:text-neutral-200 hover:bg-white/[0.03]"
                  }`}
                >
                  <item.icon className="w-4 h-4" />
                  {item.label}
                </button>
              ))}
            </nav>
          </div>

          {/* Bottom Resource Usage */}
          <div className="p-5 border-t border-white/[0.05]">
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs text-neutral-500 font-medium">Cluster Resources</span>
              <span className="text-xs text-neutral-300">64%</span>
            </div>
            <div className="w-full h-1.5 bg-neutral-800 rounded-full overflow-hidden">
              <div className="h-full w-[64%] bg-gradient-to-r from-emerald-400 to-cyan-400 rounded-full" />
            </div>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col bg-[#0a0a0c]">
          {/* Top Bar */}
          <div className="h-14 border-b border-white/[0.05] flex items-center justify-between px-6">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-2 text-sm text-neutral-300 font-medium">
                <GitBranch className="w-4 h-4 text-neutral-500" /> master
              </span>
              <span className="text-neutral-600">/</span>
              <span className="text-sm font-mono text-neutral-400">c3f8372a</span>
            </div>
            <div className="flex items-center gap-3">
              <a href="#" className="text-xs text-neutral-400 hover:text-white flex items-center gap-1 transition-colors">
                my-api.dploy.io <ArrowUpRight className="w-3 h-3" />
              </a>
              <button className="px-3 py-1.5 rounded-md bg-white text-black text-xs font-semibold hover:bg-neutral-200 transition-colors">
                Redeploy
              </button>
            </div>
          </div>

          {/* Content Grid */}
          <div className="p-6 flex-1 overflow-y-auto">
            <div className="grid grid-cols-3 gap-6">

              {/* Left Column: Pipeline & Replicas */}
              <div className="col-span-1 space-y-6">
                {/* Deployment Status */}
                <div className="p-5 rounded-xl border border-white/[0.05] bg-[#0c0c0e]">
                  <h3 className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-4">Current Deployment</h3>
                  <div className="space-y-4">
                    <div className="flex gap-3">
                      <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                      <div>
                        <p className="text-sm text-white font-medium">Build Image</p>
                        <p className="text-xs text-neutral-500">Completed in 14s</p>
                      </div>
                    </div>
                    <div className="w-px h-4 bg-neutral-800 ml-2.5 -my-2" />
                    <div className="flex gap-3">
                      <PlayCircle className="w-5 h-5 text-cyan-400 shrink-0 animate-pulse" />
                      <div>
                        <p className="text-sm text-cyan-400 font-medium">Starting Containers</p>
                        <p className="text-xs text-neutral-500">Orchestrator scaling to 3</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Replica Load Balancer Visualizer */}
                <div className="p-5 rounded-xl border border-white/[0.05] bg-[#0c0c0e]">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">Active Routing</h3>
                    <Cpu className="w-4 h-4 text-neutral-600" />
                  </div>
                  <div className="space-y-3">
                    {/* Simulated Load Balancer state from your proxy code */}
                    {[
                      { id: "node-1", conns: 42, active: true },
                      { id: "node-2", conns: 38, active: true },
                      { id: "node-3", conns: 0, active: false, routing: true }, // The one being routed to
                    ].map((node, i) => (
                      <div key={i} className={`flex items-center justify-between p-2 rounded border ${node.routing ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-white/[0.05] bg-white/[0.02]'}`}>
                        <div className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full ${node.active ? 'bg-cyan-500' : 'bg-emerald-400 animate-pulse'}`} />
                          <span className="text-xs font-mono text-neutral-300">{node.id}</span>
                        </div>
                        <span className="text-xs font-mono text-neutral-500">{node.conns} conns</span>
                      </div>
                    ))}
                  </div>
                  <p className="text-[10px] text-neutral-600 mt-3 font-mono">SelectLeastLoadedReplica() active</p>
                </div>
              </div>

              {/* Right Column: Terminal Logs */}
              <div className="col-span-2 rounded-xl border border-white/[0.05] bg-[#050505] flex flex-col overflow-hidden">
                <div className="h-10 border-b border-white/[0.05] flex items-center px-4 bg-[#0a0a0c]">
                  <span className="text-xs font-mono text-neutral-500">build-logs.sh</span>
                </div>
                <div className="p-4 font-mono text-xs leading-relaxed flex-1">
                  {logLines.map((line, i) => (
                    <div key={i} className="mb-1">
                      <span className="text-neutral-600">{line.substring(0, 10)}</span>
                      <span className={`ml-2 ${
                        line.includes("ERROR") ? "text-red-400" :
                        line.includes("SUCCESS") ? "text-emerald-400" :
                        line.includes("INFO") ? "text-cyan-400" :
                        line.includes("BUILD") ? "text-fuchsia-400" :
                        "text-neutral-300"
                      }`}>
                        {line.substring(10)}
                      </span>
                    </div>
                  ))}
                  <div className="flex items-center mt-2">
                    <span className="text-neutral-600">[17:44:52]</span>
                    <span className="ml-2 text-neutral-300">Awaiting traffic</span>
                    <span className="w-2 h-3 bg-white ml-1 animate-pulse" />
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
