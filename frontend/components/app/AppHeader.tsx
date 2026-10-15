"use client";

import Link from "next/link";
import { Fragment, useEffect, useRef, useState, type ReactNode } from "react";
import { ChevronDown, LogOut } from "lucide-react";
import { Logo } from "@/components/landing/primitives";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE;

export type Crumb = { label: ReactNode; href?: string };

function UserMenu() {
   const [email, setEmail] = useState<string | null>(null);
   const [open, setOpen] = useState(false);
   const ref = useRef<HTMLDivElement>(null);

   useEffect(() => {
      let cancelled = false;
      fetch(`${API_BASE}/user`, { credentials: "include" })
         .then((res) => (res.ok ? res.json() : null))
         .then((data) => {
            if (!cancelled && data) setEmail(data.Email || data.email || null);
         })
         .catch(() => {});
      return () => {
         cancelled = true;
      };
   }, []);

   useEffect(() => {
      if (!open) return;
      const onDown = (e: MouseEvent) => {
         if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
      };
      const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
      document.addEventListener("mousedown", onDown);
      document.addEventListener("keydown", onKey);
      return () => {
         document.removeEventListener("mousedown", onDown);
         document.removeEventListener("keydown", onKey);
      };
   }, [open]);

   const logout = async () => {
      try {
         await fetch(`${API_BASE}/auth/logout`, { method: "POST", credentials: "include" });
      } finally {
         window.location.href = "/auth/login";
      }
   };

   return (
      <div ref={ref} className="relative">
         <button
            onClick={() => setOpen((o) => !o)}
            aria-haspopup="menu"
            aria-expanded={open}
            className="flex items-center gap-2 rounded-lg border border-transparent py-1 pl-1 pr-2 text-mute transition hover:border-hair-strong hover:bg-white/[0.03] hover:text-fg"
         >
            <span className="flex h-7 w-7 items-center justify-center rounded-md border border-hair-strong bg-panel-2 text-xs font-semibold text-fg">
               {email ? email[0].toUpperCase() : ""}
            </span>
            <span className="hidden max-w-[180px] truncate text-[13px] sm:block">
               {email ?? <span className="inline-block h-3 w-24 animate-pulse rounded bg-white/10 align-middle" />}
            </span>
            <ChevronDown className="h-3.5 w-3.5" />
         </button>
         {open && (
            <div
               role="menu"
               className="absolute right-0 top-[calc(100%+6px)] z-50 w-56 overflow-hidden rounded-xl border border-hair-strong bg-panel shadow-[0_20px_60px_-20px_rgba(0,0,0,0.9)]"
            >
               {email && (
                  <div className="border-b border-hair px-3.5 py-3">
                     <p className="text-[11px] uppercase tracking-wider text-faint">Signed in as</p>
                     <p className="mt-0.5 truncate text-[13px] text-fg">{email}</p>
                  </div>
               )}
               <button
                  role="menuitem"
                  onClick={logout}
                  className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left text-[13px] text-red-400 transition hover:bg-red-500/10"
               >
                  <LogOut className="h-3.5 w-3.5" />
                  Sign out
               </button>
            </div>
         )}
      </div>
   );
}

export function AppHeader({ crumbs = [], actions }: { crumbs?: Crumb[]; actions?: ReactNode }) {
   return (
      <header className="sticky top-0 z-40 border-b border-hair bg-ink/75 backdrop-blur-xl">
         <div className="mx-auto flex h-14 max-w-6xl items-center gap-3 px-4 sm:px-6">
            <Link href="/home" aria-label="Projects" className="shrink-0">
               <Logo />
            </Link>
            {crumbs.length > 0 && (
               <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-2 text-[13px]">
                  {crumbs.map((c, i) => {
                     const last = i === crumbs.length - 1;
                     return (
                        <Fragment key={i}>
                           <span className="select-none text-faint">/</span>
                           {c.href && !last ? (
                              <Link href={c.href} className="truncate text-mute transition-colors hover:text-fg">
                                 {c.label}
                              </Link>
                           ) : (
                              <span className={`truncate ${last ? "text-fg" : "text-mute"}`}>{c.label}</span>
                           )}
                        </Fragment>
                     );
                  })}
               </nav>
            )}
            <div className="ml-auto flex shrink-0 items-center gap-2">
               {actions}
               <UserMenu />
            </div>
         </div>
      </header>
   );
}
