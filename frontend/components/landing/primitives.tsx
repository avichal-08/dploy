"use client";

import { useEffect, useRef, type ReactNode } from "react";

export const GITHUB_URL = "https://github.com/avichal-08/dploy";

export function Reveal({
  children,
  delay = 0,
  className = "",
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.dataset.shown = "true";
          io.disconnect();
        }
      },
      { rootMargin: "0px 0px -10% 0px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={`reveal ${className}`}
      style={{ ["--reveal-delay" as string]: `${delay}ms` }}
    >
      {children}
    </div>
  );
}

/** Small "+" registration mark placed on frame intersections. */
export function Cross({ className = "" }: { className?: string }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 11 11"
      className={`pointer-events-none absolute h-[11px] w-[11px] text-white/25 ${className}`}
    >
      <path d="M5.5 0v11M0 5.5h11" stroke="currentColor" strokeWidth="1" />
    </svg>
  );
}

export function FrameCrosses() {
  return (
    <>
      <Cross className="-left-[6px] -top-[6px]" />
      <Cross className="-right-[6px] -top-[6px]" />
    </>
  );
}

export function Logo({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <svg viewBox="0 0 24 24" className="h-[22px] w-[22px]" aria-hidden>
        <rect x="0.5" y="0.5" width="23" height="23" rx="6.5" fill="#16161a" stroke="rgb(255 255 255 / 0.14)" />
        <path d="M7 7.5h4.2a4.5 4.5 0 0 1 0 9H7z" fill="none" stroke="#f3f2ee" strokeWidth="1.8" strokeLinejoin="round" />
        <circle cx="17.2" cy="12" r="1.8" fill="#ff6b2c" />
      </svg>
      <span className="text-[15px] font-semibold tracking-[-0.02em] text-fg">dploy</span>
    </span>
  );
}

export function GithubIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M12 .5C5.65.5.5 5.65.5 12a11.5 11.5 0 0 0 7.86 10.92c.58.1.79-.25.79-.56v-2c-3.2.7-3.88-1.37-3.88-1.37-.52-1.33-1.28-1.69-1.28-1.69-1.05-.71.08-.7.08-.7 1.16.08 1.77 1.19 1.77 1.19 1.03 1.77 2.7 1.26 3.36.96.1-.75.4-1.26.73-1.55-2.55-.29-5.24-1.28-5.24-5.68 0-1.26.45-2.28 1.19-3.09-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.17 1.18a11 11 0 0 1 5.77 0c2.2-1.49 3.17-1.18 3.17-1.18.63 1.59.23 2.76.11 3.05.74.81 1.19 1.83 1.19 3.09 0 4.41-2.69 5.38-5.26 5.67.41.36.78 1.06.78 2.14v3.17c0 .31.21.67.8.56A11.5 11.5 0 0 0 23.5 12C23.5 5.65 18.35.5 12 .5Z" />
    </svg>
  );
}

export function Eyebrow({ index, children }: { index: string; children: ReactNode }) {
  return (
    <div className="mb-5 flex items-center gap-3 font-mono text-[11px] uppercase tracking-[0.18em] text-mute">
      <span className="text-signal">{index}</span>
      <span className="h-px w-6 bg-hair-strong" />
      <span>{children}</span>
    </div>
  );
}
