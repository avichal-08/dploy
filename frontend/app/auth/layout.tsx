import Link from "next/link";
import { Logo } from "@/components/landing/primitives";

const POINTS = [
   "Least-connections routing across replicas",
   "Health-checked, zero-downtime rollouts",
   "Deploy on every push to your default branch",
];

export default function AuthLayout({
   children,
}: {
   children: React.ReactNode;
}) {
   return (
      <div className="grid min-h-screen bg-ink text-fg lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
         <aside className="dot-grid relative hidden overflow-clip border-r border-hair lg:flex lg:flex-col lg:justify-between lg:p-12">
            <div
               aria-hidden
               className="pointer-events-none absolute left-1/2 top-[-220px] h-[520px] w-[820px] -translate-x-1/2 rounded-[50%] bg-[radial-gradient(closest-side,rgba(255,107,44,0.18),transparent)]"
            />
            <Link href="/" className="relative w-fit">
               <Logo />
            </Link>

            <div className="relative">
               <h1 className="text-[52px] font-semibold leading-[0.98] tracking-[-0.045em]">
                  Deploy all day.
                  <br />
                  <span className="text-white/45">Drop </span>
                  <span className="font-serif text-[1.12em] font-normal italic tracking-[-0.02em] text-signal">zero</span>
                  <span className="text-white/45"> requests.</span>
               </h1>
               <ul className="mt-10 space-y-3">
                  {POINTS.map((p) => (
                     <li key={p} className="flex items-center gap-3 text-[15px] text-mute">
                        <span className="h-1.5 w-1.5 rounded-full bg-signal shadow-[0_0_10px_var(--color-signal)]" />
                        {p}
                     </li>
                  ))}
               </ul>
            </div>

            <p className="relative font-mono text-[11px] text-faint">Self-hosted PaaS in Go · MIT licensed</p>
         </aside>

         <main className="flex flex-col items-center justify-center px-4 py-12 sm:px-6">
            <Link href="/" className="mb-10 lg:hidden">
               <Logo />
            </Link>
            {children}
         </main>
      </div>
   );
}
