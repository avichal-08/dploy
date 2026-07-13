import { Rocket, ArrowRight, Terminal, Zap } from "lucide-react";

export default function Home() {
   return (
      <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans selection:bg-zinc-800 flex flex-col">
         {/* Navigation */}
         <nav className="border-b border-zinc-800/50 bg-zinc-950/50 backdrop-blur-md sticky top-0 z-10">
            <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
               <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-white rounded flex items-center justify-center">
                     <Rocket className="w-5 h-5 text-black" />
                  </div>
                  <span className="text-xl font-bold tracking-tight">Dploy.</span>
               </div>

               <div className="flex items-center gap-4">
                  <a
                     href="https://github.com"
                     target="_blank"
                     className="text-zinc-400 hover:text-white transition-colors"
                  >

                  </a>
                  <a
                     href="/project"
                     className="text-sm font-medium bg-white text-black px-4 py-2 rounded-lg hover:bg-zinc-200 transition-colors"
                  >
                     Dashboard
                  </a>
               </div>
            </div>
         </nav>

         <main className="flex-1 flex flex-col items-center justify-center px-4 relative overflow-hidden">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-500/10 blur-[120px] rounded-full pointer-events-none" />

            <div className="max-w-4xl mx-auto text-center space-y-8 relative z-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
               <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 text-blue-400 text-sm font-medium border border-blue-500/20 mb-4">
                  <Zap className="w-4 h-4" />
                  <span>Dploy Engine v1.0 is now live</span>
               </div>

               <h1 className="text-5xl sm:text-7xl font-extrabold tracking-tight text-white leading-tight">
                  Ship your code <br className="hidden sm:block" />
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-300">
                     in seconds.
                  </span>
               </h1>

               <p className="text-lg sm:text-xl text-zinc-400 max-w-2xl mx-auto leading-relaxed">
                  The modern Platform as a Service. Connect your GitHub repository,
                  let our engine auto-detect your framework, and go live instantly in an isolated container.
               </p>

               <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
                  <a
                     href="/project"
                     className="w-full sm:w-auto flex items-center justify-center gap-2 bg-white text-black px-8 py-4 rounded-xl font-medium text-lg hover:bg-zinc-200 transition-all hover:scale-105 active:scale-95"
                  >
                     Create Project
                     <ArrowRight className="w-5 h-5" />
                  </a>
                  <a
                     href="#features"
                     className="w-full sm:w-auto flex items-center justify-center gap-2 bg-zinc-900 border border-zinc-800 text-white px-8 py-4 rounded-xl font-medium text-lg hover:bg-zinc-800 transition-colors"
                  >
                     <Terminal className="w-5 h-5 text-zinc-400" />
                     View Documentation
                  </a>
               </div>
            </div>
         </main>

         <footer className="border-t border-zinc-800/50 py-8 text-center text-zinc-500 text-sm relative z-10 bg-zinc-950">
            <p>Built with Go, Docker, and React.</p>
         </footer>
      </div>
   );
}
