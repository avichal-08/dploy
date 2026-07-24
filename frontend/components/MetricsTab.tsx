"use client";

import { useState, useEffect } from "react";
import {
  Activity,
  Server,
  Zap,
  Loader2,
} from "lucide-react";

const API_BASE = "http://localhost:8080/api";

export function MetricsTab({ projectId }: { projectId: string }) {
  const [metrics, setMetrics] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        const res = await fetch(`${API_BASE}/projects/${projectId}/metrics`);
        if (res.ok) {
          const data = await res.json();
          setMetrics(data);

          setHistory(prev => {
            const newHistory = [...prev, {
              time: new Date().toLocaleTimeString([], { hour12: false, minute: '2-digit', second: '2-digit' }),
              conns: data.active_connections,
              reps: data.replicas
            }];
            return newHistory.slice(-20);
          });
        }
      } catch (err) {
        console.error("Failed to fetch metrics", err);
      }
    };

    fetchMetrics();
    const interval = setInterval(fetchMetrics, 2000);
    return () => clearInterval(interval);
  }, [projectId]);

  if (!metrics) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-[#A1A1AA]">
        <Loader2 className="w-6 h-6 animate-spin mb-4" />
        <p className="text-sm font-medium">Connecting to metrics stream...</p>
      </div>
    );
  }

  const totalCapacity = metrics.replicas * metrics.target_concurrency;
  const loadPercentage = totalCapacity === 0 ? 0 : Math.min(100, Math.round((metrics.active_connections / totalCapacity) * 100));

  const getScaleColor = () => {
    if (loadPercentage > 80) return "text-amber-500";
    if (loadPercentage > 95) return "text-red-500";
    return "text-green-500";
  };

  const getLoadBg = () => {
    if (loadPercentage > 80) return "bg-amber-500";
    if (loadPercentage > 95) return "bg-red-500";
    return "bg-green-500";
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

        <div className="bg-[#111113] border border-[#27272A] rounded-md p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-medium text-[#A1A1AA] flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-400" />
              In-flight Requests
            </span>
            <span className="relative flex h-2 w-2">
              {metrics.active_connections > 0 && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>}
              <span className={`relative inline-flex rounded-full h-2 w-2 ${metrics.active_connections > 0 ? "bg-amber-500" : "bg-[#27272A]"}`}></span>
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <h3 className="text-4xl font-bold text-[#FAFAFA]">{metrics.active_connections}</h3>
            <span className="text-xs text-[#52525B]">req/s</span>
          </div>
        </div>

        <div className="bg-[#111113] border border-[#27272A] rounded-md p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-medium text-[#A1A1AA] flex items-center gap-2">
              <Server className="w-4 h-4 text-blue-400" />
              Active Replicas
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <h3 className="text-4xl font-bold text-[#FAFAFA]">{metrics.replicas}</h3>
            <span className="text-xs text-[#52525B]">/ 5 max</span>
          </div>
        </div>

        <div className="bg-[#111113] border border-[#27272A] rounded-md p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-medium text-[#A1A1AA] flex items-center gap-2">
              <Activity className="w-4 h-4 text-purple-400" />
              System Load
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <h3 className={`text-4xl font-bold ${getScaleColor()}`}>{loadPercentage}%</h3>
            <span className="text-xs text-[#52525B]">capacity</span>
          </div>
          <div className="w-full h-1.5 bg-[#27272A] rounded-full mt-3 overflow-hidden">
            <div className={`h-full ${getLoadBg()} transition-all duration-500`} style={{ width: `${loadPercentage}%` }} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

        <div className="md:col-span-2 bg-[#111113] border border-[#27272A] rounded-md p-5 h-80 flex flex-col">
          <h3 className="text-sm font-medium text-[#FAFAFA] mb-4">Traffic History</h3>
          <div className="flex-1 relative flex items-end justify-between gap-1 overflow-hidden pt-4">
            <div className="absolute inset-0 flex flex-col justify-between pointer-events-none opacity-20">
               <div className="border-b border-[#52525B] w-full" />
               <div className="border-b border-[#52525B] w-full" />
               <div className="border-b border-[#52525B] w-full" />
               <div className="border-b border-[#52525B] w-full" />
            </div>

            {history.map((tick, i) => {
               const maxConnsInHistory = Math.max(...history.map(h => h.conns), 10);
               const heightPercent = Math.max(2, (tick.conns / maxConnsInHistory) * 100);
               return (
                 <div key={i} className="flex flex-col items-center flex-1 group">
                    <div className="w-full bg-[#27272A] rounded-t-sm relative transition-all duration-500 ease-out group-hover:bg-amber-400" style={{ height: `${heightPercent}%` }}>
                       <div className="opacity-0 group-hover:opacity-100 absolute -top-8 left-1/2 -translate-x-1/2 bg-[#FAFAFA] text-[#09090B] text-[10px] font-bold py-1 px-2 rounded pointer-events-none transition-opacity">
                         {tick.conns}
                       </div>
                    </div>
                    <span className="text-[9px] text-[#52525B] mt-2 truncate w-full text-center">
                       {i % 4 === 0 ? tick.time : ''}
                    </span>
                 </div>
               )
            })}
          </div>
        </div>

        <div className="bg-[#111113] border border-[#27272A] rounded-md p-5 flex flex-col h-80">
          <h3 className="text-sm font-medium text-[#FAFAFA] mb-4">Replica Nodes</h3>

          <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-3">
             {metrics.replica_stats.length === 0 ? (
               <div className="text-sm text-[#A1A1AA] h-full flex items-center justify-center">No active nodes</div>
             ) : (
               metrics.replica_stats.map((node: any) => {
                 const nodeLoad = Math.min(100, (node.connections / metrics.target_concurrency) * 100);
                 return (
                   <div key={node.id} className="p-3 bg-[#09090B] border border-[#27272A] rounded-md">
                     <div className="flex items-center justify-between mb-2">
                       <span className="text-xs font-mono text-[#FAFAFA] truncate" title={node.id}>
                         {node.id.substring(0, 8)}...
                       </span>
                       <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${nodeLoad > 80 ? 'bg-amber-500/20 text-amber-500' : 'bg-green-500/20 text-green-500'}`}>
                         {node.connections} req
                       </span>
                     </div>
                     <div className="w-full h-1 bg-[#27272A] rounded-full overflow-hidden">
                        <div
                          className="h-full bg-blue-500 transition-all duration-500"
                          style={{ width: `${nodeLoad}%` }}
                        />
                     </div>
                   </div>
                 )
               })
             )}
          </div>
        </div>

      </div>
    </div>
  );
}
