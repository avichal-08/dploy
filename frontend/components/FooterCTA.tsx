"use client";

import { ArrowRight, Command } from "lucide-react";

const Github = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.2c3-.3 6-1.5 6-6.5a4.6 4.6 0 0 0-1.3-3.2 4.2 4.2 0 0 0-.1-3.2s-1.1-.3-3.5 1.3a12.3 12.3 0 0 0-6.2 0C6.5 2.8 5.4 3.1 5.4 3.1a4.2 4.2 0 0 0-.1 3.2A4.6 4.6 0 0 0 4 9.5c0 5 3 6.2 6 6.5a4.8 4.8 0 0 0-1 3.2v4"/>
    <path d="M9 18c-4.5 1.5-5-2.5-7-3"/>
  </svg>
);

const Twitter = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z"/>
  </svg>
);

export default function FooterCTA() {
  return (
    <footer className="relative w-full bg-[#050505] border-t border-white/[0.05] pt-32 pb-12 overflow-hidden flex flex-col items-center">

      {/* Subtle Background Glow for the CTA */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-gradient-to-b from-white/[0.03] to-transparent blur-[100px] pointer-events-none" />

      {/* 1. Final Call to Action */}
      <div className="relative z-10 w-full max-w-4xl mx-auto px-4 text-center mb-32">
        <h2 className="text-4xl sm:text-5xl font-semibold text-white tracking-tight mb-6">
          Ready to leave the bloat behind?
        </h2>
        <p className="text-lg text-neutral-400 max-w-xl mx-auto mb-10 leading-relaxed">
          Self-host on your own infrastructure or deploy instantly to our managed cloud. Experience bare-metal orchestration today.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <button className="w-full sm:w-auto px-6 py-3 rounded-xl bg-white text-black font-medium text-sm hover:bg-neutral-200 transition-colors flex items-center justify-center gap-2 shadow-[0_0_24px_rgba(255,255,255,0.1)]">
            Deploy your first app <ArrowRight className="w-4 h-4" />
          </button>

          <a
            href="https://github.com/avichal-08/dploy"
            target="_blank"
            rel="noreferrer"
            className="w-full sm:w-auto px-6 py-3 rounded-xl bg-transparent border border-white/[0.1] text-white font-medium text-sm hover:bg-white/[0.03] transition-colors flex items-center justify-center gap-2"
          >
            <Github className="w-4 h-4" /> View Source on GitHub
          </a>
        </div>
      </div>

      {/* 2. Minimalist Footer Links */}
      <div className="relative z-10 w-full max-w-6xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-6 pt-8 border-t border-white/[0.05]">

        {/* Brand */}
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded bg-gradient-to-tr from-cyan-400 to-fuchsia-400 flex items-center justify-center">
            <Command className="w-3.5 h-3.5 text-black" />
          </div>
          <span className="text-white font-medium tracking-tight">dploy</span>
          <span className="text-neutral-600 text-sm ml-2">© 2026</span>
        </div>

        {/* Links */}
        <div className="flex items-center gap-8 text-sm text-neutral-500">
          <a href="#" className="hover:text-white transition-colors">Documentation</a>
          <a href="#" className="hover:text-white transition-colors">API Reference</a>
          <a href="#" className="hover:text-white transition-colors">Pricing</a>
        </div>

        {/* Socials / Status */}
        <div className="flex items-center gap-4">
          <a href="#" className="text-neutral-500 hover:text-white transition-colors">
            <Twitter className="w-4 h-4" />
          </a>
          <a href="#" className="text-neutral-500 hover:text-white transition-colors">
            <Github className="w-4 h-4" />
          </a>
          <div className="h-4 w-px bg-white/[0.1] mx-2" />
          <div className="flex items-center gap-2 text-xs font-mono text-neutral-400 hover:text-white cursor-pointer transition-colors">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            System Status
          </div>
        </div>

      </div>
    </footer>
  );
}
