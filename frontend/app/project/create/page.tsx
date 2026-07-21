"use client";

import React, { useState, useEffect } from "react";
import {
   Plus,
   Trash2,
   Loader2,
   ArrowRight,
   AlertCircle,
   TerminalSquare,
} from "lucide-react";

const API_BASE = "http://localhost:8080/api";
const user_id = "44232737-74be-4fd0-8b5c-ddb1cd467a53"; // just for testing

export default function CreateProjectPage() {
   const router = {
      push: (path: string) => {
         window.location.href = path;
      },
   };

   const [repoUrl, setRepoUrl] = useState("");
   const [projectName, setProjectName] = useState("");
   const [isLoading, setIsLoading] = useState(false);
   const [error, setError] = useState<string | null>(null);

   const [envs, setEnvs] = useState([{ key: "", value: "" }]);

   const handleAddEnv = () => setEnvs([...envs, { key: "", value: "" }]);

   const handleRemoveEnv = (index: number) => {
      setEnvs(envs.filter((_, i) => i !== index));
   };

   const handleEnvChange = (
      index: number,
      field: "key" | "value",
      val: string,
   ) => {
      const newEnvs = [...envs];
      newEnvs[index][field] =
         field === "key" ? val.toUpperCase().replace(/\s+/g, "_") : val;
      setEnvs(newEnvs);
   };

   useEffect(() => {
      if (repoUrl && !projectName) {
         try {
            const url = new URL(repoUrl);
            const pathParts = url.pathname.split("/").filter(Boolean);
            if (pathParts.length > 0) {
               const repoName = pathParts[pathParts.length - 1].replace(
                  ".git",
                  "",
               );
               setProjectName(repoName.toLowerCase());
            }
         } catch (e) {}
      }
   }, [repoUrl, projectName]);

   const handleCreateProject = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!repoUrl || !projectName) return;

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
               `Server returned non-JSON (${res.status}): ${text.slice(0, 50)}`,
            );
         }

         if (!res.ok) {
            throw new Error(data.error || "Failed to create project");
         }

         const targetId =
            data.id || data.ID || data.project?.id || data.Project?.ID;

         if (!targetId) {
            console.error("Backend Response:", data);
            throw new Error(
               "Project was created, but no ID was returned in the JSON response.",
            );
         }

         const validEnvs = envs
            .map((env) => ({ key: env.key.trim(), value: env.value.trim() }))
            .filter((env) => env.key !== "" && env.value !== "");

         if (validEnvs.length > 0) {
            const envRes = await fetch(
               `${API_BASE}/projects/${targetId}/envs`,
               {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify(validEnvs),
               },
            );

            if (!envRes.ok) {
               const errData = await envRes.json().catch(() => ({}));
               console.error("Failed to save environment variables:", errData);

               alert(
                  `Project created, but environment variables failed to save: ${errData.error || "Unknown error"}. Please add them manually in the Project Settings.`,
               );
               router.push(`/project/${targetId}`);
               return;
            }
         }

         router.push(`/project/${targetId}/deploy`);
      } catch (err: any) {
         setError(err.message);
         setIsLoading(false);
      }
   };

   return (
      <div className="min-h-screen bg-[#09090B] text-[#FAFAFA] font-sans selection:bg-blue-500/30 flex flex-col">
         <nav className="h-14 border-b border-[#27272A] bg-[#09090B] sticky top-0 z-10 flex items-center px-6">
            <div className="max-w-6xl w-full mx-auto flex items-center justify-between">
               <div
                  className="flex items-center gap-2 cursor-pointer transition-opacity hover:opacity-80"
                  onClick={() => router.push("/")}
               >
                  <TerminalSquare className="w-5 h-5 text-[#FAFAFA]" />
                  <span className="font-bold tracking-tight text-sm">
                     DPLOY
                  </span>
               </div>
            </div>
         </nav>

         <main className="flex-1 flex flex-col items-center justify-center px-4 py-12">
            <div className="w-full max-w-[480px] space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
               <div className="text-center space-y-2">
                  <h1 className="text-2xl font-bold tracking-tight text-[#FAFAFA]">
                     Create a new Project
                  </h1>
                  <p className="text-sm text-[#A1A1AA]">
                     Import a GitHub repository to begin deploying.
                  </p>
               </div>

               <div className="bg-[#111113] border border-[#27272A] rounded-md p-6 sm:p-8 shadow-2xl">
                  <form onSubmit={handleCreateProject} className="space-y-6">
                     <div className="space-y-4">
                        <div className="space-y-2">
                           <label
                              htmlFor="repoUrl"
                              className="block text-sm font-medium text-[#FAFAFA]"
                           >
                              GitHub Repository URL
                           </label>
                           <input
                              id="repoUrl"
                              type="url"
                              required
                              value={repoUrl}
                              onChange={(e) => setRepoUrl(e.target.value)}
                              placeholder="https://github.com/username/repo"
                              disabled={isLoading}
                              className="w-full bg-[#09090B] border border-[#27272A] rounded-md px-4 py-2 text-sm text-[#FAFAFA] placeholder:text-[#52525B] focus:outline-none focus:border-[#FAFAFA] focus:ring-1 focus:ring-[#FAFAFA] transition-all disabled:opacity-50"
                           />
                        </div>

                        <div className="space-y-2">
                           <label
                              htmlFor="projectName"
                              className="block text-sm font-medium text-[#FAFAFA]"
                           >
                              Project Name
                           </label>
                           <input
                              id="projectName"
                              type="text"
                              required
                              value={projectName}
                              onChange={(e) =>
                                 setProjectName(
                                    e.target.value
                                       .toLowerCase()
                                       .replace(/[^a-z0-9-]/g, "-"),
                                 )
                              }
                              placeholder="my-awesome-app"
                              disabled={isLoading}
                              className="w-full bg-[#09090B] border border-[#27272A] rounded-md px-4 py-2 text-sm text-[#FAFAFA] placeholder:text-[#52525B] focus:outline-none focus:border-[#FAFAFA] focus:ring-1 focus:ring-[#FAFAFA] transition-all disabled:opacity-50"
                           />
                           <p className="text-[11px] text-[#A1A1AA]">
                              This will be used to generate your subdomain
                              (e.g.,{" "}
                              <span className="text-[#FAFAFA]">
                                 {projectName || "project"}.localhost
                              </span>
                              ).
                           </p>
                        </div>
                     </div>

                     <div className="pt-4 border-t border-[#27272A] space-y-4">
                        <div className="flex items-center justify-between">
                           <div>
                              <h3 className="text-sm font-medium text-[#FAFAFA]">
                                 Environment Variables
                              </h3>
                              <p className="text-[11px] text-[#A1A1AA] mt-0.5">
                                 Securely passed to your app at build and
                                 runtime.
                              </p>
                           </div>
                        </div>

                        <div className="space-y-3">
                           {envs.map((env, index) => (
                              <div
                                 key={index}
                                 className="flex items-center gap-2"
                              >
                                 <input
                                    type="text"
                                    placeholder="KEY"
                                    value={env.key}
                                    onChange={(e) =>
                                       handleEnvChange(
                                          index,
                                          "key",
                                          e.target.value,
                                       )
                                    }
                                    disabled={isLoading}
                                    className="w-1/3 bg-[#09090B] border border-[#27272A] rounded-md px-3 py-2 text-sm text-[#FAFAFA] placeholder:text-[#52525B] focus:outline-none focus:border-[#FAFAFA] focus:ring-1 focus:ring-[#FAFAFA] font-mono transition-all disabled:opacity-50"
                                 />
                                 <input
                                    type="text"
                                    placeholder="VALUE"
                                    value={env.value}
                                    onChange={(e) =>
                                       handleEnvChange(
                                          index,
                                          "value",
                                          e.target.value,
                                       )
                                    }
                                    disabled={isLoading}
                                    className="flex-1 bg-[#09090B] border border-[#27272A] rounded-md px-3 py-2 text-sm text-[#FAFAFA] placeholder:text-[#52525B] focus:outline-none focus:border-[#FAFAFA] focus:ring-1 focus:ring-[#FAFAFA] font-mono transition-all disabled:opacity-50"
                                 />
                                 <button
                                    type="button"
                                    onClick={() => handleRemoveEnv(index)}
                                    disabled={isLoading || envs.length === 1}
                                    className="p-2 text-[#A1A1AA] hover:text-red-400 hover:bg-red-400/10 rounded-md transition-colors disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-[#A1A1AA]"
                                 >
                                    <Trash2 className="w-4 h-4" />
                                 </button>
                              </div>
                           ))}
                        </div>

                        <button
                           type="button"
                           onClick={handleAddEnv}
                           disabled={isLoading}
                           className="flex items-center gap-1.5 text-xs font-medium text-[#FAFAFA] hover:text-blue-400 transition-colors disabled:opacity-50"
                        >
                           <Plus className="w-3.5 h-3.5" /> Add Another
                        </button>
                     </div>

                     {error && (
                        <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-md flex items-start gap-2.5">
                           <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                           <p className="text-sm text-red-400 leading-relaxed">
                              {error}
                           </p>
                        </div>
                     )}

                     <button
                        type="submit"
                        disabled={isLoading || !repoUrl || !projectName}
                        className="w-full flex items-center justify-center gap-2 bg-[#FAFAFA] text-[#09090B] py-2.5 rounded-md text-sm font-medium hover:bg-[#E4E4E7] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                     >
                        {isLoading ? (
                           <>
                              <Loader2 className="w-4 h-4 animate-spin" />
                              <span>Inspecting Repository...</span>
                           </>
                        ) : (
                           <>
                              <span>Import and Continue</span>
                              <ArrowRight className="w-4 h-4" />
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
