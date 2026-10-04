"use client";

import React, { useState } from "react";
import {
  Terminal,
  Copy,
  Check,
  ArrowRight,
  Cpu,
  Activity,
  ShieldCheck,
  Layers
} from "lucide-react";

export default function Hero() {
  const [copied, setCopied] = useState(false);
  const cliCommand = "curl -fsSL https://dploy.io/install.sh | sh";

  const handleCopy = () => {
    navigator.clipboard.writeText(cliCommand);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <section className="relative min-h-screen w-full bg-[#050505] text-white overflow-hidden flex flex-col items-center justify-start pt-32 px-4 sm:px-6">

      {/* 1. Atmospheric Background Artwork */}
      <div className="absolute inset-0 pointer-events-none">
        {/* Iridescent Aurora Beam (Dreamer / Neon Style) */}
        <div className="absolute -top-[20%] left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-gradient-to-tr from-cyan-500/20 via-fuchsia-500/20 to-emerald-500/20 blur-[130px] rounded-full opacity-60 mix-blend-screen" />

        {/* Subtle Tech Grid Texture */}
        <div
          className="absolute inset-0 opacity-[0.03] [mask-image:radial-gradient(ellipse_at_center,white,transparent_75%)]"
          style={{
            backgroundImage: `linear-gradient(to right, #ffffff 1px, transparent 1px), linear-gradient(to bottom, #ffffff 1px, transparent 1px)`,
            backgroundSize: "40px 40px"
          }}
        />
      </div>

      {/* 2. Top Pill Badge (Linear Style) */}
      <div className="relative z-10 inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-white/[0.1] bg-white/[0.03] backdrop-blur-md mb-8 hover:border-white/[0.2] transition-colors cursor-pointer group">
        <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
        <span className="text-xs font-medium text-neutral-300">dploy v1.0 is live</span>
        <span className="text-neutral-500 text-xs">|</span>
        <span className="text-xs font-medium text-neutral-400 group-hover:text-white transition-colors flex items-center gap-1">
          Self-host or Cloud <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
        </span>
      </div>

      {/* 3. Hero Typography */}
      <div className="relative z-10 max-w-4xl text-center space-y-6">
        <h1 className="text-5xl sm:text-7xl font-semibold tracking-[-0.04em] text-transparent bg-clip-text bg-gradient-to-b from-white via-white to-white/50 leading-[1.08]">
          Deploy containers. <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 via-neutral-100 to-fuchsia-300">
            Scale without the bloat.
          </span>
        </h1>

        <p className="max-w-2xl mx-auto text-base sm:text-lg text-neutral-400 font-normal leading-relaxed">
          Connect your GitHub repo and let <span className="text-neutral-200 font-medium">dploy</span> orchestrate high-concurrency containers, instant SSL, and smart least-loaded proxy routing.
        </p>
      </div>

      {/* 4. Interactive CLI Install Bar (Russel Style) */}
      <div className="relative z-10 mt-8 flex flex-col sm:flex-row items-center gap-3">
        <div className="flex items-center gap-3 px-4 py-2.5 rounded-xl border border-white/[0.1] bg-neutral-900/80 backdrop-blur-md shadow-2xl font-mono text-xs sm:text-sm text-neutral-300">
          <Terminal className="w-4 h-4 text-cyan-400" />
          <span className="text-neutral-500">$</span>
          <span>{cliCommand}</span>
          <button
            onClick={handleCopy}
            className="ml-3 p-1.5 rounded-lg hover:bg-white/[0.08] text-neutral-400 hover:text-white transition-colors"
            title="Copy command"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          </button>
        </div>

        <button className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-white text-black font-medium text-sm hover:bg-neutral-200 transition-colors flex items-center justify-center gap-2 shadow-[0_0_24px_rgba(255,255,255,0.2)]">
          Get Started Free <ArrowRight className="w-4 h-4" />
        </button>
      </div>

      {/* 5. Anchored Live PaaS Dashboard Window (Linear / Russel Style) */}
      <div className="relative z-10 mt-16 w-full max-w-5xl rounded-2xl border border-white/[0.08] bg-[#0c0c0e]/90 backdrop-blur-xl p-4 sm:p-6 shadow-[0_0_80px_rgba(0,0,0,0.8)]">
        {/* Window Top Controls */}
        <div className="flex items-center justify-between pb-4 border-b border-white/[0.06] mb-6">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-neutral-700/60" />
            <div className="w-3 h-3 rounded-full bg-neutral-700/60" />
            <div className="w-3 h-3 rounded-full bg-neutral-700/60" />
            <span className="ml-3 font-mono text-xs text-neutral-500">dploy-control-plane // prod-cluster-01</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-mono">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
              All Systems Operational
            </span>
          </div>
        </div>

        {/* Live Metrics Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="p-4 rounded-xl border border-white/[0.04] bg-white/[0.02]">
            <div className="flex items-center gap-2 text-neutral-400 text-xs font-medium mb-1">
              <Activity className="w-3.5 h-3.5 text-cyan-400" /> Go Proxy Latency
            </div>
            <div className="text-xl font-semibold text-white tracking-tight">0.29 ms</div>
            <div className="text-[11px] text-neutral-500 mt-1">p99 across 40k req/s</div>
          </div>

          <div className="p-4 rounded-xl border border-white/[0.04] bg-white/[0.02]">
            <div className="flex items-center gap-2 text-neutral-400 text-xs font-medium mb-1">
              <Layers className="w-3.5 h-3.5 text-fuchsia-400" /> Active Replicas
            </div>
            <div className="text-xl font-semibold text-white tracking-tight">12 / 12</div>
            <div className="text-[11px] text-emerald-400 mt-1">Least-loaded balanced</div>
          </div>

          <div className="p-4 rounded-xl border border-white/[0.04] bg-white/[0.02]">
            <div className="flex items-center gap-2 text-neutral-400 text-xs font-medium mb-1">
              <Cpu className="w-3.5 h-3.5 text-amber-400" /> Build Queue
            </div>
            <div className="text-xl font-semibold text-white tracking-tight">0 Pending</div>
            <div className="text-[11px] text-neutral-500 mt-1">Redis Asynq active</div>
          </div>

          <div className="p-4 rounded-xl border border-white/[0.04] bg-white/[0.02]">
            <div className="flex items-center gap-2 text-neutral-400 text-xs font-medium mb-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> Edge SSL & DNS
            </div>
            <div className="text-xl font-semibold text-white tracking-tight">Auto-Issued</div>
            <div className="text-[11px] text-neutral-500 mt-1">Caddy wildcard proxy</div>
          </div>
        </div>
      </div>
    </section>
  );
}
