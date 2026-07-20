"use client";

import { useState, useEffect, useRef } from "react";
import { Terminal, Clock, Copy, Check, RefreshCw } from "lucide-react";
const API_BASE = "http://localhost:8080/api";

export function RuntimeLogsTerminal({ deploymentId }: { deploymentId: string }) {
   const [logs, setLogs] = useState<string[]>([]);
   const [isRefreshing, setIsRefreshing] = useState(false);
   const [lastFetchedAt, setLastFetchedAt] = useState<Date | null>(null);
   const [isCopied, setIsCopied] = useState(false);
   const terminalEndRef = useRef<HTMLDivElement>(null);

   const fetchLogs = async () => {
      if (!deploymentId) return;

      setIsRefreshing(true);
      setLogs((prev) => [...prev, "--> Fetching latest runtime logs..."]);

      try {
         const res = await fetch(
            `${API_BASE}/deployments/${deploymentId}/logs/runtime`,
         );
         if (!res.ok) throw new Error("Failed to fetch runtime logs");

         const data = await res.json();
         if (data.logs) {
            setLogs([data.logs]);
         } else {
            setLogs(["[No logs output by container yet]"]);
         }

         if (data.fetched_at) {
            setLastFetchedAt(new Date(data.fetched_at));
         }
      } catch (err) {
         setLogs((prev) => [
            ...prev,
            "\n[Error fetching runtime logs. The container might be stopped.]",
         ]);
      } finally {
         setIsRefreshing(false);
      }
   };

   useEffect(() => {
      fetchLogs();
   }, [deploymentId]);

   useEffect(() => {
      if (terminalEndRef.current) {
         terminalEndRef.current.scrollIntoView({ behavior: "smooth" });
      }
   }, [logs]);

   const handleCopy = () => {
      navigator.clipboard.writeText(logs.join("\n"));
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
   };

   return (
      <div className="bg-[#0A0A0A] border border-[#27272A] rounded-md overflow-hidden flex flex-col h-[600px] shadow-sm">
         <div className="bg-[#111113] border-b border-[#27272A] px-4 py-2.5 flex items-center justify-between">
            <div className="flex items-center gap-4">
               <div className="flex items-center gap-2">
                  <Terminal className="w-4 h-4 text-blue-400" />
                  <span className="text-xs font-mono text-[#A1A1AA] uppercase tracking-wider font-medium">
                     Runtime Logs
                  </span>
               </div>

               <button
                  onClick={fetchLogs}
                  disabled={isRefreshing}
                  className="flex items-center gap-1.5 px-2 py-1 text-xs font-medium rounded-sm text-[#A1A1AA] hover:text-[#FAFAFA] hover:bg-[#27272A] transition-colors disabled:opacity-50"
               >
                  <RefreshCw
                     className={`w-3 h-3 ${isRefreshing ? "animate-spin text-[#FAFAFA]" : ""}`}
                  />
                  Refresh
               </button>
            </div>

            <div className="flex items-center gap-3">
               {lastFetchedAt && (
                  <div className="text-[10px] text-[#A1A1AA] hidden sm:flex items-center gap-1.5 font-medium">
                     <Clock className="w-3 h-3" />
                     Fetched: {lastFetchedAt.toLocaleTimeString()}
                  </div>
               )}
               <button
                  onClick={handleCopy}
                  className="flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded text-[#A1A1AA] hover:text-[#FAFAFA] hover:bg-[#27272A] transition-colors"
               >
                  {isCopied ? (
                     <>
                        <Check className="w-3.5 h-3.5 text-green-500" />
                        <span className="text-green-500">Copied!</span>
                     </>
                  ) : (
                     <>
                        <Copy className="w-3.5 h-3.5" />
                        Copy
                     </>
                  )}
               </button>
            </div>
         </div>

         <div className="p-5 overflow-y-auto font-mono text-xs sm:text-sm flex-1 custom-scrollbar">
            <pre className="text-blue-100 leading-relaxed break-all whitespace-pre-wrap font-mono">
               {logs.join("\n")}
            </pre>
            <div ref={terminalEndRef} />
         </div>
      </div>
   );
}
