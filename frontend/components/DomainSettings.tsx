"use client";

import { useState } from "react";

interface DomainSettingsProps {
   projectId: string;
   currentName: string;
   currentUrl: string;
}

export function DomainSettings({
   projectId,
   currentName,
   currentUrl,
}: DomainSettingsProps) {
   const [newName, setNewName] = useState(currentName);
   const [loading, setLoading] = useState(false);
   const [message, setMessage] = useState<{
      type: "success" | "error";
      text: string;
   } | null>(null);

   const handleUpdate = async (e: React.FormEvent) => {
      e.preventDefault();
      setLoading(true);
      setMessage(null);

      const validNameRegex = /^[a-z0-9-]+$/;
      if (!validNameRegex.test(newName)) {
         setMessage({
            type: "error",
            text: "Name can only contain lowercase letters, numbers, and hyphens.",
         });
         setLoading(false);
         return;
      }

      try {
         const res = await fetch(
            `${process.env.NEXT_PUBLIC_API_BASE}/projects/${projectId}/domain`,
            {
               method: "PATCH",
               headers: {
                  "Content-Type": "application/json",
               },
               body: JSON.stringify({ name: newName }),
               credentials: "include",
            },
         );

         const data = await res.json();

         if (!res.ok) {
            throw new Error(data.error || "Failed to update domain");
         }

         setMessage({
            type: "success",
            text: "Domain updated successfully! Traffic is now routing to the new URL.",
         });
      } catch (err: any) {
         setMessage({ type: "error", text: err.message });
      } finally {
         setLoading(false);
      }
   };

   return (
      <div className="bg-[#111113] border border-[#27272A] rounded-md p-6 text-[#FAFAFA] w-full">
         <h2 className="text-xl font-semibold mb-2">Project Domain</h2>
         <p className="text-gray-400 text-sm mb-6">
            This is the custom subdomain where your project is currently hosted.
            Changing this will instantly update your routing.
         </p>

         <form onSubmit={handleUpdate} className="space-y-4">
            <div className="flex items-center space-x-2">
               <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value.toLowerCase())} // Force lowercase on typing
                  className="flex-1 bg-black border border-gray-700 rounded px-3 py-2 text-white focus:outline-none focus:border-blue-500 transition-colors"
                  placeholder="my-awesome-project"
                  required
               />
               <span className="text-gray-500 font-mono">
                  .dploy.avichal.me
               </span>
            </div>

            {message && (
               <div
                  className={`p-3 rounded text-sm ${message.type === "error" ? "bg-red-900/50 text-red-200 border border-red-800" : "bg-green-900/50 text-green-200 border border-green-800"}`}
               >
                  {message.text}
               </div>
            )}

            <div className="flex justify-between items-center pt-4 border-t border-gray-800 mt-6">
               <p className="text-sm text-gray-500">
                  Current URL:{" "}
                  <a
                     href={currentUrl}
                     target="_blank"
                     rel="noreferrer"
                     className="text-blue-400 hover:underline"
                  >
                     {currentUrl}
                  </a>
               </p>
               <button
                  type="submit"
                  disabled={loading || newName === currentName}
                  className="bg-white text-black px-4 py-2 rounded font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-200 transition-colors"
               >
                  {loading ? "Saving..." : "Save"}
               </button>
            </div>
         </form>
      </div>
   );
}
