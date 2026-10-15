"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight } from "lucide-react";
import { GITHUB_URL, GithubIcon, Logo } from "./primitives";

const LINKS = [
  { href: "#how", label: "How it works" },
  { href: "#features", label: "Features" },
  { href: "#architecture", label: "Architecture" },
];

export default function Nav() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header className="fixed inset-x-0 top-0 z-50 px-3 pt-3 sm:px-4">
      <nav
        className={`mx-auto flex h-12 max-w-6xl items-center justify-between rounded-xl border px-3 transition-all duration-300 sm:px-4 ${
          scrolled
            ? "border-hair-strong bg-ink/70 shadow-[0_10px_40px_-10px_rgba(0,0,0,0.8)] backdrop-blur-xl"
            : "border-transparent bg-transparent"
        }`}
      >
        <Link href="/" aria-label="dploy home">
          <Logo />
        </Link>

        <div className="hidden items-center gap-1 md:flex">
          {LINKS.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="rounded-md px-3 py-1.5 text-[13px] text-mute transition-colors hover:bg-white/[0.04] hover:text-fg"
            >
              {l.label}
            </a>
          ))}
          <a
            href={GITHUB_URL}
            target="_blank"
            rel="noreferrer"
            className="rounded-md px-3 py-1.5 text-[13px] text-mute transition-colors hover:bg-white/[0.04] hover:text-fg"
          >
            Docs
          </a>
        </div>

        <div className="flex items-center gap-1.5">
          <a
            href={GITHUB_URL}
            target="_blank"
            rel="noreferrer"
            aria-label="dploy on GitHub"
            className="rounded-md p-2 text-mute transition-colors hover:bg-white/[0.04] hover:text-fg"
          >
            <GithubIcon className="h-4 w-4" />
          </a>
          <Link
            href="/auth/login"
            className="hidden rounded-md px-3 py-1.5 text-[13px] text-mute transition-colors hover:text-fg sm:block"
          >
            Log in
          </Link>
          <Link
            href="/auth/register"
            className="group inline-flex items-center gap-1 rounded-lg bg-fg px-3 py-1.5 text-[13px] font-medium text-ink transition hover:bg-white"
          >
            Get started
            <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>
      </nav>
    </header>
  );
}
