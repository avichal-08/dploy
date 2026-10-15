"use client";

import { useEffect, useRef, useState } from "react";
import { Boxes, GitBranch, Hammer, Send } from "lucide-react";
import { Eyebrow, FrameCrosses, Reveal } from "./primitives";

const STEPS = [
  {
    icon: Send,
    title: "Queue",
    body: "Hit deploy. The API records the deployment in Postgres, enqueues a task on Redis and answers in milliseconds — it never waits on a build.",
  },
  {
    icon: GitBranch,
    title: "Detect",
    body: "A worker clones the repo and recognises Next.js, Vite, Go, Bun, Node, Python or plain HTML. Ship your own Dockerfile and it's used as-is.",
  },
  {
    icon: Hammer,
    title: "Build",
    body: "Apps become Docker images with your build and run commands baked in. Static sites skip containers and go straight to S3.",
  },
  {
    icon: Boxes,
    title: "Roll out",
    body: "Fresh replicas boot, the proxy sends them all new traffic, and the previous version drains connection by connection before it's removed.",
  },
];

type Line = { step: number; src: string; text: string; tone?: "ok" | "dim" | "hi" };

const SCRIPT: Line[] = [
  { step: 0, src: "api", text: "POST /api/deployments → 202 Accepted" },
  { step: 0, src: "api", text: "task enqueued type=pipeline:deploy queue=default", tone: "dim" },
  { step: 1, src: "worker", text: "starting git clone repo_url=github.com/acme/storefront" },
  { step: 1, src: "worker", text: "git clone completed successfully commit=3f9a1c2", tone: "dim" },
  { step: 1, src: "worker", text: "framework detected framework=nextjs-bun", tone: "hi" },
  { step: 2, src: "worker", text: "generating dockerfile framework=nextjs-bun" },
  { step: 2, src: "docker", text: "[4/6] RUN bun install --frozen-lockfile", tone: "dim" },
  { step: 2, src: "docker", text: "[6/6] RUN bun run build", tone: "dim" },
  { step: 2, src: "worker", text: "image built successfully image=storefront:3f9a1c2", tone: "hi" },
  { step: 3, src: "worker", text: "starting replica container storefront-3f9a1c2-1" },
  { step: 3, src: "proxy", text: "traffic safely routed to new deployment", tone: "hi" },
  { step: 3, src: "proxy", text: "old replica draining open_conns=7 → 0", tone: "dim" },
  { step: 3, src: "worker", text: "gracefully destroyed old replica", tone: "dim" },
  { step: 3, src: "✓ live", text: "https://storefront.dploy.app", tone: "ok" },
];

const firstLineOf = (step: number) => SCRIPT.findIndex((l) => l.step === step);

export default function Pipeline() {
  const [count, setCount] = useState(0);
  const [running, setRunning] = useState(false);
  const termRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = termRef.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setRunning(e.isIntersecting), { threshold: 0.3 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (!running) return;
    const done = count >= SCRIPT.length;
    const id = setTimeout(
      () => setCount((c) => (c >= SCRIPT.length ? 1 : c + 1)),
      done ? 3200 : count === 0 ? 300 : 520
    );
    return () => clearTimeout(id);
  }, [running, count]);

  const active = count === 0 ? 0 : SCRIPT[Math.min(count, SCRIPT.length) - 1].step;
  const shown = SCRIPT.slice(0, count);

  return (
    <section id="how" className="relative scroll-mt-24 border-t border-hair">
      <FrameCrosses />
      <div className="px-5 py-24 sm:px-10 sm:py-32">
        <Reveal>
          <Eyebrow index="01">How it works</Eyebrow>
          <h2 className="max-w-2xl text-balance text-[34px] font-semibold leading-[1.05] tracking-[-0.035em] text-fg sm:text-[48px]">
            Repo in. <span className="font-serif font-normal italic text-white/60">Replicas out.</span>
          </h2>
          <p className="mt-5 max-w-xl text-[16px] leading-relaxed text-mute">
            Every deployment runs the same four-stage pipeline. The control plane only records intent — workers do the
            heavy lifting, so nothing you click ever waits on a Docker build.
          </p>
        </Reveal>

        <div className="mt-14 grid gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-10">
          <ol className="flex flex-col gap-1">
            {STEPS.map((s, i) => {
              const on = i === active;
              const past = i < active;
              return (
                <li key={s.title}>
                  <button
                    onClick={() => setCount(firstLineOf(i) + 1)}
                    className={`group relative w-full overflow-hidden rounded-xl border p-4 text-left transition-all duration-300 sm:p-5 ${
                      on
                        ? "border-hair-strong bg-panel-2"
                        : "border-transparent hover:border-hair hover:bg-white/[0.02]"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border transition-colors ${
                          on
                            ? "border-signal/50 bg-signal/10 text-signal"
                            : past
                              ? "border-hair-strong text-fg"
                              : "border-hair text-faint"
                        }`}
                      >
                        <s.icon className="h-4 w-4" />
                      </span>
                      <span className="font-mono text-[11px] text-faint">0{i + 1}</span>
                      <span className={`text-[16px] font-medium tracking-tight ${on || past ? "text-fg" : "text-mute"}`}>
                        {s.title}
                      </span>
                    </div>
                    <div
                      className={`grid transition-all duration-500 ${on ? "mt-3 grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}
                    >
                      <p className="overflow-hidden pl-11 text-[14px] leading-relaxed text-mute">{s.body}</p>
                    </div>
                    {on && (
                      <span className="absolute inset-x-0 bottom-0 h-px overflow-hidden bg-hair">
                        <span className="sheen block h-full w-1/3 bg-gradient-to-r from-transparent via-signal to-transparent" />
                      </span>
                    )}
                  </button>
                </li>
              );
            })}
          </ol>

          <Reveal delay={120}>
            <div
              ref={termRef}
              className="overflow-hidden rounded-2xl border border-hair-strong bg-[#0b0b0d] shadow-[0_30px_80px_-30px_rgba(0,0,0,0.9)]"
            >
              <div className="flex items-center justify-between border-b border-hair px-4 py-2.5">
                <div className="flex items-center gap-2 font-mono text-[11px] text-faint">
                  <span className="h-1.5 w-1.5 rounded-full bg-ok" />
                  deployment d-7f3a · logs streamed over WebSocket
                </div>
                <span className="hidden font-mono text-[11px] text-faint sm:inline">tail -f</span>
              </div>
              <div className="h-[380px] overflow-hidden p-4 font-mono text-[12px] leading-[1.9] sm:p-5 sm:text-[12.5px]">
                {shown.map((l, i) => (
                  <div key={i} className="flex gap-3 whitespace-nowrap">
                    <span className="w-14 shrink-0 text-faint">{l.src}</span>
                    <span
                      className={`truncate ${
                        l.tone === "ok"
                          ? "text-ok"
                          : l.tone === "hi"
                            ? "text-fg"
                            : l.tone === "dim"
                              ? "text-faint"
                              : "text-mute"
                      }`}
                    >
                      {l.text}
                    </span>
                  </div>
                ))}
                {count < SCRIPT.length && (
                  <div className="flex gap-3">
                    <span className="w-14 shrink-0 text-faint">&nbsp;</span>
                    <span className="caret inline-block h-[15px] w-[7px] translate-y-[3px] bg-signal" />
                  </div>
                )}
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
