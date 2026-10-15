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

         if (res.status === 401) {
            window.location.href = "/auth/login";
            return;
         }

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
      <div className="bg-panel border border-hair-strong rounded-xl p-6 text-fg w-full">
         <div className="flex items-center gap-2 mb-2">
            <Globe className="w-5 h-5 text-mute" />
            <h2 className="text-xl font-semibold">Custom Domain</h2>
         </div>
         <p className="text-mute text-sm mb-6">
            Bring your own domain. Users will be able to access your project
            using this address.
         </p>

         <form onSubmit={handleUpdate} className="space-y-4">
            <div className="flex flex-col space-y-2">
               <label className="text-xs font-medium text-mute">
                  Domain Name
               </label>
               <input
                  type="text"
                  value={domain}
                  onChange={(e) => setDomain(e.target.value)}
                  className="w-full bg-ink border border-hair-strong rounded px-3 py-2 text-fg focus:outline-none focus:border-signal/60 transition-colors placeholder:text-faint"
                  placeholder="www.my-startup.com"
               />
            </div>

            {message && (
               <div
                  className={`p-3 rounded text-sm ${message.type === "error" ? "bg-red-900/10 text-red-400 border border-red-900/50" : "bg-ok/10 text-ok border border-ok/25"}`}
               >
                  {message.text}
               </div>
            )}

            <div className="bg-ink p-4 rounded-md border border-hair-strong space-y-4">
               <div>
                  <h3 className="text-sm font-medium mb-1 text-fg">
                     DNS Configuration
                  </h3>
                  <p className="text-xs text-mute">
                     Set one of the following records on your DNS provider to
                     point your domain to our servers.
                  </p>
               </div>

               <div className="space-y-3">
                  <div>
                     <span className="text-xs font-medium text-mute mb-1 block">
                        For Subdomains (e.g., www, app, api)
                     </span>
                     <div className="grid grid-cols-3 text-xs text-mute font-mono bg-panel p-2 rounded border border-hair-strong">
                        <span>
                           Type:{" "}
                           <strong className="text-fg">CNAME</strong>
                        </span>
                        <span>
                           Name: <strong className="text-fg">www</strong>
                        </span>
                        <span>
                           Value:{" "}
                           <strong className="text-fg">
                              dploy.avichal.me
                           </strong>
                        </span>
                     </div>
                  </div>

                  <div>
                     <span className="text-xs font-medium text-mute mb-1 block">
                        For Apex/Root Domains (e.g., example.com)
                     </span>
                     <div className="grid grid-cols-3 text-xs text-mute font-mono bg-panel p-2 rounded border border-hair-strong">
                        <span>
                           Type:{" "}
                           <strong className="text-fg">A Record</strong>
                        </span>
                        <span>
                           Name: <strong className="text-fg">@</strong>
                        </span>
                        <span>
                           Value:{" "}
                           <strong className="text-fg">
                              20.198.90.3
                           </strong>
                        </span>
                     </div>
                  </div>
               </div>
            </div>
            <div className="flex justify-end items-center pt-4 border-t border-hair-strong mt-6">
               <button
                  type="submit"
                  disabled={
                     loading ||
                     (domain === (currentCustomDomain || "") && domain === "")
                  }
                  className="bg-fg text-ink px-4 py-2 rounded font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-white transition-colors flex items-center gap-2 text-sm"
               >
                  {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                  {loading ? "Saving..." : "Save Domain"}
               </button>
            </div>
         </form>
      </div>
   );
}
