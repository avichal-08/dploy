"use client";

import { useState } from "react";
import { Loader2, Globe } from "lucide-react";

interface CustomDomainSettingsProps {
   projectId: string;
   currentCustomDomain: string | null;
}

export function CustomDomainSettings({
   projectId,
   currentCustomDomain,
}: CustomDomainSettingsProps) {
   const [domain, setDomain] = useState(currentCustomDomain || "");
   const [loading, setLoading] = useState(false);
   const [message, setMessage] = useState<{
      type: "success" | "error";
      text: string;
   } | null>(null);

   const handleUpdate = async (e: React.FormEvent) => {
      e.preventDefault();
      setLoading(true);
      setMessage(null);

      const cleanedDomain = domain
         .replace(/^https?:\/\//, "")
         .replace(/\/$/, "")
         .toLowerCase()
         .trim();

      try {
         const res = await fetch(
            `${process.env.NEXT_PUBLIC_API_BASE}/projects/${projectId}/custom-domain`,
            {
               method: "PATCH",
               headers: {
                  "Content-Type": "application/json",
               },
               body: JSON.stringify({ custom_domain: cleanedDomain }),
               credentials: "include",
            },
         );

         const data = await res.json();

         if (!res.ok) {
            throw new Error(data.error || "Failed to update custom domain");
         }

         setDomain(cleanedDomain);
         setMessage({
            type: "success",
            text: "Custom domain linked successfully! Ensure your DNS records are configured.",
         });
      } catch (err: any) {
         setMessage({ type: "error", text: err.message });
      } finally {
         setLoading(false);
      }
   };

   return (
      <div className="bg-[#111113] border border-[#27272A] rounded-md p-6 text-[#FAFAFA] w-full">
         <div className="flex items-center gap-2 mb-2">
            <Globe className="w-5 h-5 text-[#A1A1AA]" />
            <h2 className="text-xl font-semibold">Custom Domain</h2>
         </div>
         <p className="text-[#A1A1AA] text-sm mb-6">
            Bring your own domain. Users will be able to access your project
            using this address.
         </p>

         <form onSubmit={handleUpdate} className="space-y-4">
            <div className="flex flex-col space-y-2">
               <label className="text-xs font-medium text-[#A1A1AA]">
                  Domain Name
               </label>
               <input
                  type="text"
                  value={domain}
                  onChange={(e) => setDomain(e.target.value)}
                  className="w-full bg-[#09090B] border border-[#27272A] rounded px-3 py-2 text-[#FAFAFA] focus:outline-none focus:border-blue-500 transition-colors placeholder:text-[#52525B]"
                  placeholder="www.my-startup.com"
               />
            </div>

            {message && (
               <div
                  className={`p-3 rounded text-sm ${message.type === "error" ? "bg-red-900/10 text-red-400 border border-red-900/50" : "bg-green-900/10 text-green-400 border border-green-900/50"}`}
               >
                  {message.text}
               </div>
            )}

            <div className="bg-[#09090B] p-4 rounded-md border border-[#27272A] space-y-4">
               <div>
                  <h3 className="text-sm font-medium mb-1 text-[#FAFAFA]">
                     DNS Configuration
                  </h3>
                  <p className="text-xs text-[#A1A1AA]">
                     Set one of the following records on your DNS provider to
                     point your domain to our servers.
                  </p>
               </div>

               <div className="space-y-3">
                  <div>
                     <span className="text-xs font-medium text-[#A1A1AA] mb-1 block">
                        For Subdomains (e.g., www, app, api)
                     </span>
                     <div className="grid grid-cols-3 text-xs text-[#A1A1AA] font-mono bg-[#111113] p-2 rounded border border-[#27272A]">
                        <span>
                           Type:{" "}
                           <strong className="text-[#FAFAFA]">CNAME</strong>
                        </span>
                        <span>
                           Name: <strong className="text-[#FAFAFA]">www</strong>
                        </span>
                        <span>
                           Value:{" "}
                           <strong className="text-[#FAFAFA]">
                              dploy.avichal.me
                           </strong>
                        </span>
                     </div>
                  </div>

                  <div>
                     <span className="text-xs font-medium text-[#A1A1AA] mb-1 block">
                        For Apex/Root Domains (e.g., example.com)
                     </span>
                     <div className="grid grid-cols-3 text-xs text-[#A1A1AA] font-mono bg-[#111113] p-2 rounded border border-[#27272A]">
                        <span>
                           Type:{" "}
                           <strong className="text-[#FAFAFA]">A Record</strong>
                        </span>
                        <span>
                           Name: <strong className="text-[#FAFAFA]">@</strong>
                        </span>
                        <span>
                           Value:{" "}
                           <strong className="text-[#FAFAFA]">
                              20.198.90.3
                           </strong>
                        </span>
                     </div>
                  </div>
               </div>
            </div>
            <div className="flex justify-end items-center pt-4 border-t border-[#27272A] mt-6">
               <button
                  type="submit"
                  disabled={
                     loading ||
                     (domain === (currentCustomDomain || "") && domain === "")
                  }
                  className="bg-[#FAFAFA] text-[#09090B] px-4 py-2 rounded font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[#E4E4E7] transition-colors flex items-center gap-2 text-sm"
               >
                  {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                  {loading ? "Saving..." : "Save Domain"}
               </button>
            </div>
         </form>
      </div>
   );
}
