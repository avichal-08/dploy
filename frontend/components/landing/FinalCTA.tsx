"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowRight, Check, Copy } from "lucide-react";
import { FrameCrosses, GITHUB_URL, GithubIcon, Logo } from "./primitives";

const COMMANDS = [
  "git clone https://github.com/avichal-08/dploy.git && cd dploy",
  "cp .env.example .env",
  "docker-compose up -d",
];

export default function FinalCTA() {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(COMMANDS.join("\n"));
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // Clipboard can be unavailable (insecure context); the commands stay selectable.
    }
  };

  return (
    <>
      <section className="relative overflow-clip border-t border-hair">
        <FrameCrosses />
        <div
          aria-hidden
          className="pointer-events-none absolute bottom-[-340px] left-1/2 h-[600px] w-[900px] -translate-x-1/2 rounded-[50%] bg-[radial-gradient(closest-side,rgba(255,107,44,0.2),transparent)]"
        />
        <div className="relative grid gap-12 px-5 py-24 sm:px-10 sm:py-32 lg:grid-cols-2 lg:items-center">
          <div>
            <h2 className="text-balance text-[40px] font-semibold leading-[1] tracking-[-0.045em] text-fg sm:text-[64px]">
              Own your platform.
              <br />
              <span className="font-serif font-normal italic text-signal">By lunch.</span>
            </h2>
            <p className="mt-6 max-w-md text-[16px] leading-relaxed text-mute">
              dploy runs on a single machine with Docker. Clone it, fill in a few environment variables, and you have
              your own deploy platform — no per-seat pricing, no vendor between you and your servers.
            </p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/auth/register"
                className="group inline-flex items-center justify-center gap-2 rounded-xl bg-fg px-5 py-3 text-[14px] font-medium text-ink transition hover:bg-white"
              >
                Try the hosted beta
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
              <a
                href={GITHUB_URL}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-hair-strong bg-white/[0.03] px-5 py-3 text-[14px] font-medium text-fg transition hover:bg-white/[0.07]"
              >
                <GithubIcon className="h-4 w-4" />
                Read the source
              </a>
            </div>
          </div>

          <div className="overflow-hidden rounded-2xl border border-hair-strong bg-[#0b0b0d] shadow-[0_30px_80px_-30px_rgba(0,0,0,0.9)]">
            <div className="flex items-center justify-between border-b border-hair px-4 py-2.5">
              <span className="font-mono text-[11px] text-faint">~/servers — self-host in three commands</span>
              <button
                onClick={copy}
                className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 font-mono text-[11px] text-mute transition hover:bg-white/[0.06] hover:text-fg"
              >
                {copied ? <Check className="h-3.5 w-3.5 text-ok" /> : <Copy className="h-3.5 w-3.5" />}
                {copied ? "copied" : "copy"}
              </button>
            </div>
            <div className="overflow-x-auto p-5 font-mono text-[12.5px] leading-[2.1]">
              {COMMANDS.map((c) => (
                <div key={c} className="whitespace-nowrap">
                  <span className="select-none text-signal">$ </span>
                  <span className="text-fg">{c}</span>
                </div>
              ))}
              <div className="mt-2 whitespace-nowrap text-faint">
                <span className="text-ok">✓</span> postgres, redis, caddy up
              </div>
              <div className="whitespace-nowrap text-faint">
                <span className="text-ok">✓</span> go run ./cmd/api &amp; go run ./cmd/worker
                <span className="caret ml-1 inline-block h-[14px] w-[7px] translate-y-[2px] bg-signal" />
              </div>
            </div>
          </div>
        </div>
      </section>

      <footer className="relative border-t border-hair">
        <FrameCrosses />
        <div className="flex flex-col gap-8 px-5 py-10 sm:px-10 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-col gap-2">
            <Logo />
            <p className="font-mono text-[11px] text-faint">Built with Go. Deployed with dploy.</p>
          </div>
          <nav className="flex flex-wrap gap-x-7 gap-y-3 text-[13px] text-mute">
            <a href="#how" className="transition-colors hover:text-fg">How it works</a>
            <a href="#features" className="transition-colors hover:text-fg">Features</a>
            <a href="#architecture" className="transition-colors hover:text-fg">Architecture</a>
            <a href={GITHUB_URL} target="_blank" rel="noreferrer" className="transition-colors hover:text-fg">GitHub</a>
            <Link href="/auth/login" className="transition-colors hover:text-fg">Log in</Link>
          </nav>
          <p className="font-mono text-[11px] text-faint">© 2026 dploy · MIT License</p>
        </div>
        <div aria-hidden className="pointer-events-none select-none overflow-hidden px-5 sm:px-10">
          <div className="translate-y-[18%] bg-gradient-to-b from-white/[0.07] to-transparent bg-clip-text text-center text-[26vw] font-semibold leading-[0.8] tracking-[-0.07em] text-transparent lg:text-[260px]">
            dploy
          </div>
        </div>
      </footer>
    </>
  );
}
