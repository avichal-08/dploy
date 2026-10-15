"use client";

import { useCallback, useEffect, useState } from "react";
import { Check, Copy, Eye, EyeOff, GitBranch, Loader2, RefreshCw } from "lucide-react";

interface GitHubWebhookSettingsProps {
   projectId: string;
   repositoryUrl: string;
}

type Webhook = { path: string; secret: string };

const API_BASE = process.env.NEXT_PUBLIC_API_BASE;

function CopyField({ label, value, secret }: { label: string; value: string; secret?: boolean }) {
   const [copied, setCopied] = useState(false);
   const [revealed, setRevealed] = useState(!secret);

   const copy = async () => {
      try {
         await navigator.clipboard.writeText(value);
         setCopied(true);
         setTimeout(() => setCopied(false), 1500);
      } catch {
         setRevealed(true);
      }
   };

   return (
      <div className="flex flex-col space-y-2">
         <label className="text-xs font-medium text-[#A1A1AA]">{label}</label>
         <div className="flex items-center gap-2">
            <code className="flex-1 min-w-0 truncate bg-[#09090B] border border-[#27272A] rounded px-3 py-2 text-sm text-[#FAFAFA] font-mono">
               {revealed ? value : "•".repeat(32)}
            </code>
            {secret && (
               <button
                  type="button"
                  onClick={() => setRevealed((r) => !r)}
                  className="p-2 rounded border border-[#27272A] text-[#A1A1AA] hover:text-[#FAFAFA] hover:bg-[#18181B] transition-colors"
                  aria-label={revealed ? "Hide secret" : "Show secret"}
               >
                  {revealed ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
               </button>
            )}
            <button
               type="button"
               onClick={copy}
               className="p-2 rounded border border-[#27272A] text-[#A1A1AA] hover:text-[#FAFAFA] hover:bg-[#18181B] transition-colors"
               aria-label={`Copy ${label}`}
            >
               {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
            </button>
         </div>
      </div>
   );
}

export function GitHubWebhookSettings({ projectId, repositoryUrl }: GitHubWebhookSettingsProps) {
   const [webhook, setWebhook] = useState<Webhook | null>(null);
   const [loading, setLoading] = useState(true);
   const [rotating, setRotating] = useState(false);
   const [error, setError] = useState<string | null>(null);

   const request = useCallback(
      async (path: string, method: "GET" | "POST") => {
         const res = await fetch(`${API_BASE}/projects/${projectId}${path}`, {
            method,
            credentials: "include",
         });
         if (res.status === 401) {
            window.location.href = "/auth/login";
            return null;
         }
         const data = await res.json();
         if (!res.ok) throw new Error(data.error || "Request failed");
         return data as Webhook;
      },
      [projectId],
   );

   useEffect(() => {
      let cancelled = false;
      request("/webhook", "GET")
         .then((data) => {
            if (!cancelled && data) setWebhook(data);
         })
         .catch((err: Error) => {
            if (!cancelled) setError(err.message);
         })
         .finally(() => {
            if (!cancelled) setLoading(false);
         });
      return () => {
         cancelled = true;
      };
   }, [request]);

   const rotate = async () => {
      if (!window.confirm("Generate a new secret? GitHub deliveries will fail until you paste the new secret into the webhook settings.")) {
         return;
      }
      setRotating(true);
      setError(null);
      try {
         const data = await request("/webhook/rotate", "POST");
         if (data) setWebhook(data);
      } catch (err) {
         setError(err instanceof Error ? err.message : "Failed to rotate secret");
      } finally {
         setRotating(false);
      }
   };

   const repoSettingsUrl = repositoryUrl
      .replace(/\.git$/, "")
      .replace(/\/$/, "")
      .concat("/settings/hooks/new");
   const isGitHub = /github\.com/i.test(repositoryUrl);

   return (
      <div className="bg-[#111113] border border-[#27272A] rounded-md p-6 text-[#FAFAFA] w-full">
         <div className="flex items-center gap-2 mb-2">
            <GitBranch className="w-5 h-5 text-[#A1A1AA]" />
            <h2 className="text-xl font-semibold">Deploy on Push</h2>
         </div>
         <p className="text-[#A1A1AA] text-sm mb-6">
            Add a GitHub webhook and every push to your repository&apos;s default branch deploys automatically.
            Pushes to other branches and tags are ignored.
         </p>

         {loading && (
            <div className="flex items-center gap-2 text-sm text-[#A1A1AA]">
               <Loader2 className="w-4 h-4 animate-spin" /> Loading webhook settings...
            </div>
         )}

         {error && (
            <div className="p-3 rounded text-sm bg-red-900/10 text-red-400 border border-red-900/50 mb-4">{error}</div>
         )}

         {webhook && (
            <div className="space-y-4">
               <CopyField label="Payload URL" value={`${API_BASE}${webhook.path}`} />
               <CopyField label="Secret" value={webhook.secret} secret />

               <div className="bg-[#09090B] p-4 rounded-md border border-[#27272A] space-y-2">
                  <h3 className="text-sm font-medium text-[#FAFAFA]">Set it up on GitHub</h3>
                  <ol className="list-decimal pl-5 space-y-1 text-xs text-[#A1A1AA]">
                     <li>
                        Open{" "}
                        {isGitHub ? (
                           <a
                              href={repoSettingsUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="text-[#FAFAFA] underline underline-offset-2 hover:text-white"
                           >
                              Settings → Webhooks → Add webhook
                           </a>
                        ) : (
                           <span className="text-[#FAFAFA]">Settings → Webhooks → Add webhook</span>
                        )}{" "}
                        in your repository.
                     </li>
                     <li>Paste the Payload URL and Secret above.</li>
                     <li>
                        Set Content type to <code className="text-[#FAFAFA]">application/json</code>.
                     </li>
                     <li>
                        Choose <span className="text-[#FAFAFA]">Just the push event</span> and save. GitHub sends a
                        ping, which should show a green check.
                     </li>
                  </ol>
               </div>

               <div className="flex justify-end items-center pt-4 border-t border-[#27272A] mt-6">
                  <button
                     type="button"
                     onClick={rotate}
                     disabled={rotating}
                     className="border border-[#27272A] text-[#FAFAFA] px-4 py-2 rounded font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[#18181B] transition-colors flex items-center gap-2 text-sm"
                  >
                     {rotating ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                     {rotating ? "Rotating..." : "Rotate secret"}
                  </button>
               </div>
            </div>
         )}
      </div>
   );
}
