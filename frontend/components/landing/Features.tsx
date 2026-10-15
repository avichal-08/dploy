"use client";

import { useEffect, useState, type MouseEvent, type ReactNode } from "react";
import { Lock, RotateCcw } from "lucide-react";
import { Eyebrow, FrameCrosses, Reveal } from "./primitives";

/* ---------------- mini visuals ---------------- */

function LeastConnViz() {
  const [loads, setLoads] = useState([9, 4, 7, 6]);
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = setInterval(() => {
      setLoads((prev) => {
        const next = prev.map((v) => Math.max(1, Math.min(14, v + Math.round(Math.random() * 4 - 2.2))));
        const min = next.indexOf(Math.min(...next));
        next[min] += 1; // the request we just routed
        return next;
      });
    }, 900);
    return () => clearInterval(id);
  }, []);
  const min = Math.min(...loads);
  return (
    <div className="flex h-full items-end gap-2.5">
      {loads.map((v, i) => {
        const best = v === min && loads.indexOf(min) === i;
        return (
          <div key={i} className="flex flex-1 flex-col items-center gap-1.5">
            <span className={`font-mono text-[10px] tabular-nums ${best ? "text-signal" : "text-faint"}`}>{v}</span>
            <div className="relative h-16 w-full overflow-hidden rounded-md bg-white/[0.04]">
              <div
                className={`absolute inset-x-0 bottom-0 rounded-md transition-all duration-700 ${best ? "bg-signal" : "bg-white/15"}`}
                style={{ height: `${(v / 14) * 100}%` }}
              />
            </div>
            <span className="font-mono text-[9px] text-faint">r{i + 1}</span>
          </div>
        );
      })}
    </div>
  );
}

function RolloutViz() {
  return (
    <div className="flex h-full flex-col justify-center gap-3 font-mono text-[10px]">
      <div className="flex items-center gap-3">
        <span className="w-6 text-faint">v13</span>
        <div className="h-2 flex-1 overflow-hidden rounded-full bg-white/[0.04]">
          <div className="rollout-old h-full rounded-full bg-white/30" />
        </div>
      </div>
      <div className="flex items-center gap-3">
        <span className="w-6 text-signal">v14</span>
        <div className="h-2 flex-1 overflow-hidden rounded-full bg-white/[0.04]">
          <div className="rollout-new h-full rounded-full bg-signal" />
        </div>
      </div>
      <div className="flex justify-between pl-9 text-faint">
        <span>boot</span>
        <span>cut over</span>
        <span>drain → 0</span>
      </div>
    </div>
  );
}

function AutoscaleViz() {
  return (
    <div className="flex h-full flex-col justify-center gap-3">
      <div className="flex gap-2">
        {Array.from({ length: 5 }, (_, i) => (
          <div
            key={i}
            className={`h-9 flex-1 rounded-md border ${
              i < 2 ? "border-hair-strong bg-white/[0.06]" : "scale-pop border-signal/40 bg-signal/10"
            }`}
            style={i >= 2 ? { ["--d" as string]: `${(i - 2) * 0.25}s` } : undefined}
          />
        ))}
      </div>
      <div className="flex justify-between font-mono text-[10px] text-faint">
        <span>1 → 5 replicas · target 50</span>
        <span>
          <span className="text-mute">↑</span> 10s · <span className="text-mute">↓</span> 30s
        </span>
      </div>
    </div>
  );
}

function HealViz() {
  return (
    <div className="flex h-full flex-col justify-center gap-2 font-mono text-[11px]">
      {["replica-1", "replica-2", "replica-3"].map((r, i) => (
        <div key={r} className="flex items-center gap-3 rounded-md border border-hair bg-white/[0.02] px-3 py-1.5">
          <span className={`h-1.5 w-1.5 rounded-full ${i === 1 ? "heal-dot" : "bg-ok"}`} />
          <span className="text-mute">{r}</span>
          <span className="ml-auto text-faint">{i === 1 ? "restart #1" : "healthy"}</span>
        </div>
      ))}
    </div>
  );
}

function RollbackViz() {
  return (
    <div className="flex h-full flex-col justify-center gap-1.5 font-mono text-[11px]">
      {[
        { v: "v14", msg: "feat: new checkout", tag: "live" },
        { v: "v13", msg: "fix: cart rounding", tag: "" },
        { v: "v12", msg: "chore: bump deps", tag: "" },
      ].map((d, i) => (
        <div
          key={d.v}
          className={`group/row flex items-center gap-3 rounded-md px-3 py-1.5 ${
            i === 0 ? "border border-signal/30 bg-signal/[0.06]" : "border border-transparent"
          }`}
        >
          <span className={i === 0 ? "text-signal" : "text-faint"}>{d.v}</span>
          <span className="truncate text-mute">{d.msg}</span>
          {d.tag ? (
            <span className="ml-auto text-[10px] text-signal">● {d.tag}</span>
          ) : (
            <span className="ml-auto inline-flex items-center gap-1 text-[10px] text-faint transition-colors group-hover:text-fg">
              <RotateCcw className="h-3 w-3" /> rollback
            </span>
          )}
        </div>
      ))}
    </div>
  );
}

function DetectViz() {
  const stacks = ["Next.js", "Vite", "Go", "Bun", "Node", "Python", "HTML", "Dockerfile"];
  return (
    <div className="flex h-full flex-wrap content-center gap-1.5">
      {stacks.map((s) => (
        <span
          key={s}
          className={`rounded-md border px-2 py-1 font-mono text-[11px] ${
            s === "Dockerfile" ? "border-signal/40 text-signal" : "border-hair-strong text-mute"
          }`}
        >
          {s}
        </span>
      ))}
    </div>
  );
}

function StaticViz() {
  return (
    <div className="flex h-full items-center gap-3 font-mono text-[11px]">
      <div className="rounded-md border border-hair-strong bg-white/[0.03] px-2.5 py-2 leading-5 text-mute">
        dist/
        <br />
        <span className="text-faint">├ index.html</span>
        <br />
        <span className="text-faint">└ assets/</span>
      </div>
      <div className="flow-x h-px flex-1" />
      <div className="rounded-md border border-signal/40 bg-signal/[0.06] px-2.5 py-2 leading-5 text-signal">
        s3://
        <br />
        <span className="text-mute">no container</span>
      </div>
    </div>
  );
}

function DomainViz() {
  return (
    <div className="flex h-full flex-col justify-center gap-2 font-mono text-[11px]">
      <div className="flex items-center gap-2 rounded-md border border-hair-strong bg-white/[0.03] px-3 py-2">
        <Lock className="h-3 w-3 text-ok" />
        <span className="text-fg">shop.acme.com</span>
        <span className="ml-auto text-[10px] text-ok">TLS issued</span>
      </div>
      <div className="flex items-center gap-2 rounded-md border border-hair px-3 py-2">
        <Lock className="h-3 w-3 text-faint" />
        <span className="text-mute">storefront.dploy.app</span>
        <span className="ml-auto text-[10px] text-faint">subdomain</span>
      </div>
    </div>
  );
}

function LogsViz() {
  const lines = [
    ["GET", "/api/orders", "200", "12ms"],
    ["POST", "/api/checkout", "201", "48ms"],
    ["GET", "/", "200", "4ms"],
    ["WS", "/live", "101", "—"],
    ["GET", "/products/42", "200", "9ms"],
    ["PUT", "/api/cart", "200", "17ms"],
  ];
  const doubled = [...lines, ...lines];
  return (
    <div className="relative h-full overflow-hidden [mask-image:linear-gradient(to_bottom,transparent,black_25%,black_75%,transparent)]">
      <div className="log-scroll font-mono text-[11px] leading-6">
        {doubled.map(([m, p, s, t], i) => (
          <div key={i} className="flex gap-3">
            <span className="w-9 text-faint">{m}</span>
            <span className="flex-1 truncate text-mute">{p}</span>
            <span className={s === "201" || s === "101" ? "text-signal" : "text-ok"}>{s}</span>
            <span className="w-9 text-right text-faint">{t}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---------------- grid ---------------- */

const FEATURES: { title: string; body: string; viz: ReactNode }[] = [
  {
    title: "Least-connections proxy",
    body: "A custom Go reverse proxy tracks open HTTP and WebSocket connections per replica and sends each request to the quietest one.",
    viz: <LeastConnViz />,
  },
  {
    title: "Zero-downtime rollouts",
    body: "New replicas take new traffic the moment they're healthy. In-flight requests finish on the old version before it's removed.",
    viz: <RolloutViz />,
  },
  {
    title: "Concurrency autoscaling",
    body: "Set a target concurrency per replica. dploy adds replicas at 80% of it and scales back down when traffic settles — with cooldowns so it never flaps.",
    viz: <AutoscaleViz />,
  },
  {
    title: "Self-healing replicas",
    body: "A reconciliation loop watches every container and respawns crashed ones with exponential backoff — a bad night doesn't need you awake.",
    viz: <HealViz />,
  },
  {
    title: "One-click rollback",
    body: "Every deployment is kept with its commit message. Roll back to a previous version by reusing the image that was already built.",
    viz: <RollbackViz />,
  },
  {
    title: "Zero-config builds",
    body: "Framework detection writes the Dockerfile for you. Need full control? Commit your own and dploy steps aside.",
    viz: <DetectViz />,
  },
  {
    title: "Static sites on S3",
    body: "Vite and plain-HTML projects are built once and served from S3 — no idle containers burning memory.",
    viz: <StaticViz />,
  },
  {
    title: "Custom domains, automatic TLS",
    body: "Every project gets a subdomain. Bring your own domain and Caddy issues and renews the certificate on demand.",
    viz: <DomainViz />,
  },
  {
    title: "Live logs & metrics",
    body: "Build logs stream over WebSockets as they happen; runtime logs and live connection metrics sit one tab away.",
    viz: <LogsViz />,
  },
];

function spotlight(e: MouseEvent<HTMLElement>) {
  const r = e.currentTarget.getBoundingClientRect();
  e.currentTarget.style.setProperty("--mx", `${e.clientX - r.left}px`);
  e.currentTarget.style.setProperty("--my", `${e.clientY - r.top}px`);
}

export default function Features() {
  return (
    <section id="features" className="relative scroll-mt-24 border-t border-hair">
      <FrameCrosses />
      <div className="px-5 pt-24 sm:px-10 sm:pt-32">
        <Reveal className="flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
          <div>
            <Eyebrow index="02">Features</Eyebrow>
            <h2 className="max-w-xl text-balance text-[34px] font-semibold leading-[1.05] tracking-[-0.035em] text-fg sm:text-[48px]">
              Everything a deploy needs.{" "}
              <span className="font-serif font-normal italic text-white/60">Nothing it doesn&apos;t.</span>
            </h2>
          </div>
          <p className="max-w-sm text-[15px] leading-relaxed text-mute">
            The production plumbing you&apos;d otherwise glue together yourself — built into one small Go binary pair.
          </p>
        </Reveal>
      </div>

      <div className="mt-14 grid gap-px border-t border-hair bg-hair sm:grid-cols-2 lg:grid-cols-3">
        {FEATURES.map((f, i) => (
          <article
            key={f.title}
            onMouseMove={spotlight}
            className="group relative overflow-hidden bg-ink p-6 sm:p-8"
          >
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100"
              style={{
                background:
                  "radial-gradient(380px circle at var(--mx, 50%) var(--my, 50%), rgba(255,107,44,0.08), transparent 70%)",
              }}
            />
            <Reveal delay={(i % 3) * 90} className="relative">
              <div className="mb-7 h-28">{f.viz}</div>
              <h3 className="text-[16px] font-medium tracking-tight text-fg">{f.title}</h3>
              <p className="mt-2 text-[14px] leading-relaxed text-mute">{f.body}</p>
            </Reveal>
          </article>
        ))}
      </div>
    </section>
  );
}
