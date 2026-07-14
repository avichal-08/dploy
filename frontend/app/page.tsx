import { TerminalSquare, ArrowRight, Terminal, Zap } from "lucide-react";

export default function Home() {
   return (
      <div className="min-h-screen bg-[#09090B] text-[#FAFAFA] font-sans selection:bg-blue-500/30 flex flex-col relative">

         <div className="absolute inset-0 bg-[linear-gradient(to_right,#27272A_1px,transparent_1px),linear-gradient(to_bottom,#27272A_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-20 pointer-events-none" />

         <nav className="h-14 border-b border-[#27272A] bg-[#09090B] relative z-10 flex items-center px-6">
            <div className="max-w-6xl w-full mx-auto flex items-center justify-between">
               <div className="flex items-center gap-2">
                  <TerminalSquare className="w-5 h-5 text-[#FAFAFA]" />
                  <span className="font-bold tracking-tight text-sm">DPLOY</span>
               </div>

               <div className="flex items-center gap-6">
                  <a
                     href="https://github.com"
                     target="_blank"
                     rel="noreferrer"
                     className="text-sm font-medium text-[#A1A1AA] hover:text-[#FAFAFA] transition-colors"
                  >
                     GitHub
                  </a>
                  <a
                     href="/project"
                     className="text-sm font-medium bg-[#FAFAFA] text-[#09090B] px-3.5 py-1.5 rounded-md hover:bg-[#E4E4E7] transition-colors"
                  >
                     Dashboard
                  </a>
               </div>
            </div>
         </nav>

         <main className="flex-1 flex flex-col items-center justify-center px-4 relative z-10">
            <div className="max-w-4xl mx-auto text-center space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 mt-[-4rem]">

               <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-[#111113] text-[#A1A1AA] text-xs font-medium border border-[#27272A] mb-4">
                  <Zap className="w-3.5 h-3.5 text-blue-500" />
                  <span>Dploy Engine v1.0 is now live</span>
               </div>

               <h1 className="text-5xl sm:text-7xl font-bold tracking-tight text-[#FAFAFA] leading-[1.1]">
                  Ship your code. <br className="hidden sm:block" />
                  Control your infrastructure.
               </h1>

               <p className="text-lg text-[#A1A1AA] max-w-2xl mx-auto leading-relaxed">
                  The self-hosted Platform as a Service built for engineers. Connect your repository, let our engine handle the orchestration, and go live instantly in isolated containers.
               </p>

               <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-6">
                  <a
                     href="/home"
                     className="w-full sm:w-auto flex items-center justify-center gap-2 bg-[#FAFAFA] text-[#09090B] px-6 py-2.5 rounded-md font-medium text-sm hover:bg-[#E4E4E7] transition-colors"
                  >
                     Create Project
                     <ArrowRight className="w-4 h-4" />
                  </a>
                  <a
                     href="#features"
                     className="w-full sm:w-auto flex items-center justify-center gap-2 bg-[#111113] border border-[#27272A] text-[#FAFAFA] px-6 py-2.5 rounded-md font-medium text-sm hover:border-[#52525B] transition-colors"
                  >
                     <Terminal className="w-4 h-4 text-[#A1A1AA]" />
                     View Documentation
                  </a>
               </div>
            </div>
         </main>

         <footer className="border-t border-[#27272A] py-6 text-center text-[#52525B] text-xs font-medium relative z-10 bg-[#09090B]">
            <p>Engineered with Go, Docker, and React.</p>
         </footer>
      </div>
   );
}
