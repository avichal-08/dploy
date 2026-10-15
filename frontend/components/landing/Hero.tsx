import Link from "next/link";
import { ArrowRight } from "lucide-react";
import TrafficSimulator from "./TrafficSimulator";
import { GITHUB_URL, GithubIcon } from "./primitives";

export default function Hero() {
  return (
    <section className="relative overflow-clip pt-32 sm:pt-40">
      {/* Atmosphere: one warm light source above the simulator, a horizon line, a faint floor grid */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-[-260px] h-[620px] w-[1100px] -translate-x-1/2 rounded-[50%] bg-[radial-gradient(closest-side,rgba(255,107,44,0.16),rgba(255,107,44,0.04)_55%,transparent)]" />
        <div className="absolute inset-x-0 top-[520px] h-[700px] [mask-image:linear-gradient(to_bottom,transparent,black_30%,black_60%,transparent)] sm:top-[560px]">
          <div
            className="absolute inset-0 opacity-[0.07] [transform:perspective(600px)_rotateX(62deg)] [transform-origin:top]"
            style={{
              backgroundImage:
                "linear-gradient(to right, #fff 1px, transparent 1px), linear-gradient(to bottom, #fff 1px, transparent 1px)",
              backgroundSize: "56px 56px",
            }}
          />
        </div>
      </div>

      <div className="relative mx-auto max-w-6xl px-4 sm:px-6">
        <div className="mx-auto max-w-3xl text-center">
          <a
            href={GITHUB_URL}
            target="_blank"
            rel="noreferrer"
            className="rise group inline-flex items-center gap-2 rounded-full border border-hair-strong bg-white/[0.03] py-1 pl-1 pr-3 text-[12px] text-mute backdrop-blur transition-colors hover:border-white/25 hover:text-fg"
          >
            <span className="rounded-full bg-signal/15 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-signal">
              Open source
            </span>
            Self-hosted PaaS in Go<span className="hidden sm:inline"> — no Kubernetes required</span>
            <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
          </a>

          <h1
            className="rise mt-7 text-balance text-[44px] font-semibold leading-[0.98] tracking-[-0.045em] text-fg sm:text-[76px]"
            style={{ ["--rise-delay" as string]: "80ms" }}
          >
            Deploy all day.
            <br />
            <span className="text-white/45">Drop </span>
            <span className="font-serif text-[1.12em] font-normal italic tracking-[-0.02em] text-signal">zero</span>
            <span className="text-white/45"> requests.</span>
          </h1>

          <p
            className="rise mx-auto mt-6 max-w-xl text-pretty text-[16px] leading-relaxed text-mute sm:text-[18px]"
            style={{ ["--rise-delay" as string]: "160ms" }}
          >
            dploy turns a Git repo into running containers on your own server. It builds your app, rolls it out
            replica by replica, and routes every request to the{" "}
            <span className="text-fg">least-loaded container</span> — while the old version finishes what it started.
          </p>

          <div
            className="rise mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row"
            style={{ ["--rise-delay" as string]: "240ms" }}
          >
            <Link
              href="/auth/register"
              className="group relative inline-flex w-full items-center justify-center gap-2 overflow-hidden rounded-xl bg-signal px-5 py-3 text-[14px] font-medium text-black shadow-[0_0_0_1px_rgba(255,107,44,0.6),0_12px_40px_-8px_rgba(255,107,44,0.55),inset_0_1px_0_rgba(255,255,255,0.35)] transition hover:brightness-110 sm:w-auto"
            >
              Start deploying
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
            <a
              href={GITHUB_URL}
              target="_blank"
              rel="noreferrer"
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-hair-strong bg-white/[0.03] px-5 py-3 text-[14px] font-medium text-fg transition hover:bg-white/[0.07] sm:w-auto"
            >
              <GithubIcon className="h-4 w-4" />
              Self-host from GitHub
            </a>
          </div>
          <p
            className="rise mt-4 font-mono text-[11px] text-faint"
            style={{ ["--rise-delay" as string]: "300ms" }}
          >
            Hosted beta is invite-only · Self-hosting is free, MIT licensed
          </p>
        </div>

        <div className="rise relative mx-auto mt-16 max-w-5xl sm:mt-20" style={{ ["--rise-delay" as string]: "380ms" }}>
          <div className="mb-3 flex items-end justify-between gap-4 px-1">
            <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-faint">
              <span className="text-signal">●</span> Live simulation
            </p>
            <p className="hidden font-mono text-[11px] text-faint sm:block">
              Hit <span className="text-mute">Deploy</span> — the old version drains while the new one takes over
            </p>
          </div>
          <TrafficSimulator />
        </div>
      </div>
    </section>
  );
}
