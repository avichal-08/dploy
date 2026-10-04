"use client";

import React from "react";
import { Network, Server, GitMerge, Zap } from "lucide-react";

export default function FeaturesGrid() {
  return (
    <section className="relative w-full max-w-6xl mx-auto px-4 sm:px-6 py-32">
      {/* Section Header */}
      <div className="mb-16">
        <h2 className="text-3xl sm:text-4xl font-semibold text-white tracking-tight mb-4">
          Infrastructure as <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-fuchsia-400">pure code.</span>
        </h2>
        <p className="text-neutral-400 text-lg max-w-xl leading-relaxed">
          dploy eliminates DevOps overhead. Push to your repository and let our Go-powered orchestrator handle the heavy lifting.
        </p>
      </div>

      {/* Bento Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:auto-rows-[320px]">

        {/* Feature 1: The Go Proxy (Spans 2 columns) */}
        <div className="md:col-span-2 group relative overflow-hidden rounded-3xl border border-white/[0.05] bg-[#0a0a0c] p-8 hover:bg-[#0c0c0e] transition-colors">
          <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/[0.03] to-transparent pointer-events-none" />
          <Network className="w-8 h-8 text-cyan-400 mb-6" />
          <h3 className="text-xl font-medium text-white mb-3 tracking-tight">Zero-Downtime Go Proxy</h3>
          <p className="text-neutral-400 text-sm leading-relaxed max-w-md">
            Traffic is dynamically routed using a custom Go reverse proxy. It tracks active WebSocket and HTTP connections in real-time, consistently routing incoming requests to the least-loaded container replica.
          </p>

          {/* Decorative code snippet */}
          <div className="absolute -bottom-6 -right-6 w-2/3 h-48 rounded-xl border border-white/[0.05] bg-[#050505] p-4 opacity-50 group-hover:opacity-100 transition-opacity transform group-hover:-translate-y-2 group-hover:-translate-x-2 duration-500 shadow-2xl">
            <pre className="text-[10px] font-mono text-neutral-500">
              <code className="text-fuchsia-400">func</code> <code className="text-cyan-300">SelectLeastLoadedReplica</code>(r []Replica) *Replica {'{\n'}
              {'  '}var best *Replica{'\n'}
              {'  '}min := int32(-1){'\n'}
              {'  '}for i := range r {'{\n'}
              {'    '}c := getActiveConns(r[i].ID){'\n'}
              {'    '}if min == -1 || c &lt; min {'{\n'}
              {'      '}best = &r[i]; min = c{'\n'}
              {'    }'}{'\n'}
              {'  }'}{'\n'}
              {'  '}return best{'\n'}
              {'}'}
            </pre>
          </div>
        </div>

        {/* Feature 2: Asynq Workers */}
        <div className="md:col-span-1 group relative overflow-hidden rounded-3xl border border-white/[0.05] bg-[#0a0a0c] p-8 hover:bg-[#0c0c0e] transition-colors">
          <div className="absolute inset-0 bg-gradient-to-bl from-fuchsia-500/[0.03] to-transparent pointer-events-none" />
          <Zap className="w-8 h-8 text-fuchsia-400 mb-6" />
          <h3 className="text-xl font-medium text-white mb-3 tracking-tight">Asynchronous Workers</h3>
          <p className="text-neutral-400 text-sm leading-relaxed">
            Heavy tasks never block the main thread. Git clones, Docker builds, and S3 uploads are strictly offloaded to Redis-backed Asynq worker queues for ultimate API responsiveness.
          </p>
        </div>

        {/* Feature 3: Native Git Integration */}
        <div className="md:col-span-1 group relative overflow-hidden rounded-3xl border border-white/[0.05] bg-[#0a0a0c] p-8 hover:bg-[#0c0c0e] transition-colors">
          <div className="absolute inset-0 bg-gradient-to-tr from-amber-500/[0.03] to-transparent pointer-events-none" />
          <GitMerge className="w-8 h-8 text-amber-400 mb-6" />
          <h3 className="text-xl font-medium text-white mb-3 tracking-tight">Git-Driven Deployments</h3>
          <p className="text-neutral-400 text-sm leading-relaxed">
            Connect your repository once. Every push automatically triggers a fresh, isolated build pipeline, terminating old containers only when the new image is confirmed healthy.
          </p>
        </div>

        {/* Feature 4: Docker Orchestration (Spans 2 columns) */}
        <div className="md:col-span-2 group relative overflow-hidden rounded-3xl border border-white/[0.05] bg-[#0a0a0c] p-8 hover:bg-[#0c0c0e] transition-colors flex flex-col justify-between">
          <div className="absolute inset-0 bg-gradient-to-tl from-emerald-500/[0.03] to-transparent pointer-events-none" />
          <div className="relative z-10">
            <Server className="w-8 h-8 text-emerald-400 mb-6" />
            <h3 className="text-xl font-medium text-white mb-3 tracking-tight">Bare-Metal Docker Orchestration</h3>
            <p className="text-neutral-400 text-sm leading-relaxed max-w-md">
              No bloated Kubernetes overhead. dploy interfaces directly with the Docker Engine API to spin up isolated, resource-capped microVMs. Scale horizontally with sub-second container boot times.
            </p>
          </div>

          {/* Visual container blocks */}
          <div className="relative z-10 mt-8 flex items-center gap-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex-1 h-12 rounded-lg border border-emerald-500/20 bg-emerald-500/10 flex items-center justify-center">
                <span className="text-xs font-mono text-emerald-400">replica-0{i}</span>
              </div>
            ))}
            <div className="flex-1 h-12 rounded-lg border border-dashed border-neutral-700 flex items-center justify-center bg-transparent">
              <span className="text-xs font-mono text-neutral-600">+ Auto-scale</span>
            </div>
          </div>
        </div>

      </div>
    </section>
  );
}
