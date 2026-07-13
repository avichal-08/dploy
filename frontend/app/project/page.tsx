"use client";

import React, { useState } from "react";
import { Rocket, Loader2, ArrowRight, AlertCircle } from "lucide-react";

const API_BASE = "http://localhost:8080/api";
const user_id = "44232737-74be-4fd0-8b5c-ddb1cd467a53";//just for testing

export default function CreateProjectPage() {
   const router = { push: (path: string) => { window.location.href = path; } };

   const [repoUrl, setRepoUrl] = useState("");
   const [projectName, setProjectName] = useState("");
   const [isLoading, setIsLoading] = useState(false);
   const [error, setError] = useState<string | null>(null);

   const handleCreateProject = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!repoUrl) return;

      setIsLoading(true);
      setError(null);

      try {
         const res = await fetch(`${API_BASE}/projects`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
               user_id,
               name: projectName,
               repository_url: repoUrl,
            }),
         });

         const text = await res.text();
         let data;
         try {
            data = text ? JSON.parse(text) : {};
         } catch (parseError) {
            throw new Error(
               `Server returned non-JSON (${res.status}): ${text.slice(0, 50)}`
            );
         }

         if (!res.ok) {
            throw new Error(data.error || "Failed to create project");
         }

         const targetId = data.id || data.ID || data.project?.id || data.Project?.ID;

         if (!targetId) {
            console.error("Backend Response:", data);
            throw new Error("Project was created, but no ID was returned in the JSON response.");
         }

         router.push(`/project/${targetId}`);

      } catch (err: any) {
         setError(err.message);
         setIsLoading(false);
      }
   };

   return (
      <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans selection:bg-zinc-800 flex flex-col">
         <nav className="border-b border-zinc-800/50 bg-zinc-950/50 backdrop-blur-md sticky top-0 z-10">
            <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
               <div
                  className="flex items-center gap-2 cursor-pointer"
                  onClick={() => router.push("/")}
               >
                  <div className="w-8 h-8 bg-white rounded flex items-center justify-center">
                     <Rocket className="w-5 h-5 text-black" />
                  </div>
                  <span className="text-xl font-bold tracking-tight">Dploy.</span>
               </div>

               <div className="flex items-center gap-4">
                  <a
                     href="https://github.com"
                     target="_blank"
                     rel="noreferrer"
                     className="text-zinc-400 hover:text-white transition-colors"
                  >
                  </a>
               </div>
            </div>
         </nav>

         <main className="flex-1 flex flex-col items-center justify-center px-4 py-12">
            <div className="w-full max-w-lg space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">

               <div className="text-center space-y-2">
                  <h1 className="text-3xl font-bold tracking-tight text-white">
                     build something new.
                  </h1>
                  <p className="text-zinc-400">
                     Import a GitHub repository to begin deploying.
                  </p>
               </div>

               <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 sm:p-8 shadow-2xl">
                  <form onSubmit={handleCreateProject} className="space-y-6">

                     <div className="space-y-2">
                        <label className="block text-sm font-medium text-zinc-300">
                           GitHub Repository URL
                        </label>
                        <div className="relative flex flex-col gap-2">
                           <input
                              type="url"
                              required
                              value={repoUrl}
                              onChange={(e) => setRepoUrl(e.target.value)}
                              placeholder="https://github.com/username/repo"
                              disabled={isLoading}
                              className="block w-full px-4 py-3 border border-zinc-700 rounded-xl bg-zinc-950 text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all disabled:opacity-50"
                           />
                           <input
                              type="text"
                              required
                              value={projectName}
                              onChange={(e) => setProjectName(e.target.value)}
                              placeholder="Project Name"
                              disabled={isLoading}
                              className="block w-full px-4 py-3 border border-zinc-700 rounded-xl bg-zinc-950 text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all disabled:opacity-50"
                           />
                        </div>
                        <p className="text-xs text-zinc-500">
                           Must be a public repository containing a web application.
                        </p>
                     </div>

                     {error && (
                        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start gap-3">
                           <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                           <p className="text-sm text-red-400 leading-relaxed">{error}</p>
                        </div>
                     )}

                     <button
                        type="submit"
                        disabled={isLoading || !repoUrl}
                        className="w-full flex items-center justify-center gap-2 bg-white text-black py-3 rounded-xl font-medium hover:bg-zinc-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed group"
                     >
                        {isLoading ? (
                           <>
                              <Loader2 className="w-5 h-5 animate-spin" />
                              <span>Inspecting Repository...</span>
                           </>
                        ) : (
                           <>
                              <span>Import and Continue</span>
                              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                           </>
                        )}
                     </button>

                  </form>
               </div>

            </div>
         </main>
      </div>
   );
}
