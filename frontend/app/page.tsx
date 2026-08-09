import Link from "next/link";
import {
  TerminalSquare,
  ArrowRight,
  Terminal,
  Zap,
  GitBranch,
  Server,
  Globe
} from "lucide-react";

export default function Home() {
   return (
      <div className="min-h-screen bg-[#09090B] text-[#FAFAFA] font-sans selection:bg-blue-500/30 flex flex-col relative overflow-hidden">

         <div className="absolute inset-0 bg-[linear-gradient(to_right,#27272A_1px,transparent_1px),linear-gradient(to_bottom,#27272A_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-20 pointer-events-none" />
         <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[300px] bg-blue-500/10 blur-[120px] rounded-full pointer-events-none" />

         <nav className="h-16 border-b border-[#27272A]/80 bg-[#09090B]/80 backdrop-blur-md relative z-20 flex items-center px-6">
            <div className="max-w-6xl w-full mx-auto flex items-center justify-between">
               <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded bg-[#111113] border border-[#27272A] flex items-center justify-center">
                     <TerminalSquare className="w-4 h-4 text-[#FAFAFA]" />
                  </div>
                  <span className="font-bold tracking-tight text-sm">DPLOY</span>
               </div>

               <div className="flex items-center gap-5">
                  <Link
                     href="https://github.com/avichal-08/dploy"
                     target="_blank"
                     rel="noreferrer"
                     className="text-xs font-medium text-[#A1A1AA] hover:text-[#FAFAFA] transition-colors hidden sm:block"
                  >
                     GitHub
                  </Link>
                  <Link
                     href="/auth/login"
                     className="text-xs font-medium text-[#A1A1AA] hover:text-[#FAFAFA] transition-colors"
                  >
                     Sign In
                  </Link>
                  <Link
                     href="/auth/register"
                     className="text-xs font-medium bg-[#FAFAFA] text-[#09090B] px-3.5 py-1.5 rounded-md font-semibold hover:bg-[#E4E4E7] transition-all"
                  >
                     Sign Up
                  </Link>
               </div>
            </div>
         </nav>

         <main className="flex-1 flex flex-col items-center justify-center px-4 relative z-10 py-16">
            <div className="max-w-4xl mx-auto text-center space-y-6">

               <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#111113] text-[#A1A1AA] text-xs font-medium border border-[#27272A]">
                  <Zap className="w-3.5 h-3.5 text-blue-400" />
                  <span>Self-hosted PaaS Engine v1.0</span>
               </div>

               <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-[#FAFAFA] leading-[1.15]">
                  Ship code from GitHub to production. <br />
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-200">
                     Without Kubernetes.
                  </span>
               </h1>

               <p className="text-base sm:text-lg text-[#A1A1AA] max-w-xl mx-auto leading-relaxed">
                  Push code, paste your repo link, and let Dploy automatically build, containerize, balance traffic, and map custom domains via Caddy.
               </p>

               <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
                  <Link
                     href="/auth/register"
                     className="w-full sm:w-auto flex items-center justify-center gap-2 bg-[#FAFAFA] text-[#09090B] px-6 py-2.5 rounded-md font-semibold text-sm hover:bg-[#E4E4E7] transition-all shadow-sm"
                  >
                     Get Started
                     <ArrowRight className="w-4 h-4" />
                  </Link>
                  <Link
                     href="/home"
                     className="w-full sm:w-auto flex items-center justify-center gap-2 bg-[#111113] border border-[#27272A] text-[#FAFAFA] px-6 py-2.5 rounded-md font-semibold text-sm hover:border-[#52525B] transition-all"
                  >
                     <Terminal className="w-4 h-4 text-[#A1A1AA]" />
                     Dashboard
                  </Link>
               </div>

               <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-16 text-left">

                  <div className="bg-[#111113]/60 border border-[#27272A] p-5 rounded-lg space-y-2">
                     <div className="w-8 h-8 rounded bg-[#27272A]/50 border border-[#27272A] flex items-center justify-center text-blue-400 mb-3">
                        <GitBranch className="w-4 h-4" />
                     </div>
                     <h3 className="font-semibold text-sm text-[#FAFAFA]">GitHub to Production</h3>
                     <p className="text-xs text-[#A1A1AA] leading-relaxed">
                        Push code, paste your link, and Dploy builds and runs it in Docker automatically. Zero manual server configuration.
                     </p>
                  </div>

                  <div className="bg-[#111113]/60 border border-[#27272A] p-5 rounded-lg space-y-2">
                     <div className="w-8 h-8 rounded bg-[#27272A]/50 border border-[#27272A] flex items-center justify-center text-indigo-400 mb-3">
                        <Server className="w-4 h-4" />
                     </div>
                     <h3 className="font-semibold text-sm text-[#FAFAFA]">Custom Orchestration</h3>
                     <p className="text-xs text-[#A1A1AA] leading-relaxed">
                        Manages container lifecycles, least-connection replica routing, scaling, and load balancing natively without Kubernetes complexity.
                     </p>
                  </div>

                  <div className="bg-[#111113]/60 border border-[#27272A] p-5 rounded-lg space-y-2">
                     <div className="w-8 h-8 rounded bg-[#27272A]/50 border border-[#27272A] flex items-center justify-center text-green-400 mb-3">
                        <Globe className="w-4 h-4" />
                     </div>
                     <h3 className="font-semibold text-sm text-[#FAFAFA]">Built-in Networking</h3>
                     <p className="text-xs text-[#A1A1AA] leading-relaxed">
                        Automatic custom domains, HTTPS/SSL certificates, reverse proxying, and dynamic routing using Caddy out of the box.
                     </p>
                  </div>

               </div>

            </div>
         </main>

         <footer className="border-t border-[#27272A] py-6 px-6 text-center text-[#52525B] text-xs font-mono relative z-10 bg-[#09090B]">
            <p>Engineered with Go, Docker, and React.</p>
         </footer>

      </div>
   );
}
