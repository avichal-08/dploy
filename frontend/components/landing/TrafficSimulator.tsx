"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { GitCommitHorizontal, Rocket } from "lucide-react";

/* ------------------------------------------------------------------ */
/* Geometry                                                            */
/* ------------------------------------------------------------------ */

type Pt = [number, number];
type Box = { x: number; y: number; w: number; h: number };
type Path = { pts: Pt[]; cum: number[]; len: number; d: string };

type Layout = {
  w: number;
  h: number;
  src: Box;
  proxy: Box;
  slots: Box[];
  inPath: Path;
  outPaths: Path[];
  compact: boolean;
};

const SLOT_COUNT = 6;
const GROUP = 3;

function rounded(points: Pt[], r: number): Pt[] {
  const out: Pt[] = [points[0]];
  for (let i = 1; i < points.length - 1; i++) {
    const [px, py] = points[i - 1];
    const [cx, cy] = points[i];
    const [nx, ny] = points[i + 1];
    const d1 = Math.hypot(cx - px, cy - py);
    const d2 = Math.hypot(nx - cx, ny - cy);
    if (d1 < 1 || d2 < 1) {
      out.push(points[i]);
      continue;
    }
    const rr = Math.min(r, d1 / 2, d2 / 2);
    const a: Pt = [cx - ((cx - px) / d1) * rr, cy - ((cy - py) / d1) * rr];
    const b: Pt = [cx + ((nx - cx) / d2) * rr, cy + ((ny - cy) / d2) * rr];
    for (let s = 0; s <= 8; s++) {
      const t = s / 8;
      const u = 1 - t;
      out.push([u * u * a[0] + 2 * u * t * cx + t * t * b[0], u * u * a[1] + 2 * u * t * cy + t * t * b[1]]);
    }
  }
  out.push(points[points.length - 1]);
  return out;
}

function makePath(points: Pt[], r = 14): Path {
  const pts = rounded(points, r);
  const cum = [0];
  for (let i = 1; i < pts.length; i++) {
    cum.push(cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
  }
  const d = pts.map((p, i) => `${i ? "L" : "M"}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(" ");
  return { pts, cum, len: cum[cum.length - 1], d };
}

function pointAt(path: Path, f: number): Pt {
  const target = Math.max(0, Math.min(1, f)) * path.len;
  let i = 1;
  while (i < path.cum.length - 1 && path.cum[i] < target) i++;
  const seg = path.cum[i] - path.cum[i - 1] || 1;
  const t = (target - path.cum[i - 1]) / seg;
  const [ax, ay] = path.pts[i - 1];
  const [bx, by] = path.pts[i];
  return [ax + (bx - ax) * t, ay + (by - ay) * t];
}

function desktopLayout(): Layout {
  const src = { x: 20, y: 178, w: 178, h: 84 };
  const proxy = { x: 296, y: 158, w: 210, h: 124 };
  const slots = Array.from({ length: SLOT_COUNT }, (_, i) => ({
    x: 640,
    y: 18 + i * 66 + (i >= GROUP ? 18 : 0),
    w: 340,
    h: 50,
  }));
  const midY = proxy.y + proxy.h / 2;
  return {
    w: 1000,
    h: 440,
    src,
    proxy,
    slots,
    inPath: makePath([
      [src.x + src.w, midY],
      [proxy.x, midY],
    ]),
    outPaths: slots.map((s) =>
      makePath([
        [proxy.x + proxy.w, midY],
        [574, midY],
        [574, s.y + s.h / 2],
        [s.x, s.y + s.h / 2],
      ])
    ),
    compact: false,
  };
}

function mobileLayout(): Layout {
  const src = { x: 60, y: 8, w: 240, h: 58 };
  const proxy = { x: 40, y: 112, w: 280, h: 88 };
  const slots = Array.from({ length: SLOT_COUNT }, (_, i) => ({
    x: 42,
    y: 256 + i * 56 + (i >= GROUP ? 16 : 0),
    w: 304,
    h: 46,
  }));
  return {
    w: 360,
    h: 604,
    src,
    proxy,
    slots,
    inPath: makePath([
      [180, src.y + src.h],
      [180, proxy.y],
    ]),
    outPaths: slots.map((s) =>
      makePath(
        [
          [180, proxy.y + proxy.h],
          [180, 228],
          [16, 228],
          [16, s.y + s.h / 2],
          [s.x, s.y + s.h / 2],
        ],
        12
      )
    ),
    compact: true,
  };
}

/* ------------------------------------------------------------------ */
/* Simulation                                                          */
/* ------------------------------------------------------------------ */

type ReplicaState = "booting" | "active" | "draining" | "leaving";
type Replica = { version: number; index: number; state: ReplicaState; conns: number[]; since: number };
type Phase = "idle" | "building" | "booting" | "draining";

type Particle = { live: boolean; leg: 1 | 2; t0: number; slot: number };

type Sim = {
  now: number;
  slots: (Replica | null)[];
  inflight: number[];
  particles: Particle[];
  nextSpawn: number;
  phase: Phase;
  phaseAt: number;
  nextAutoDeploy: number;
  version: number;
  group: 0 | 1;
  served: number;
  deploys: number;
  lastRequest: string;
};

const POOL = 72;
const LEG1 = 480;
const LEG2 = 640;
const BUILD_MS = 1900;
const BOOT_MS = 1000;
const AUTO_DEPLOY_MS = 9500;
const MAX_LOAD = 14;

const ROUTES = [
  "GET  /",
  "GET  /api/orders",
  "POST /api/checkout",
  "GET  /assets/app.js",
  "GET  /api/session",
  "WS   /live",
  "GET  /products/42",
  "PUT  /api/cart",
];
const SHAS = ["3f9a1c2", "b81e07d", "4c2d9aa", "e0f5b31", "9a7c46e", "71d3f08"];

function rand(a: number, b: number) {
  return a + Math.random() * (b - a);
}

function initialSim(): Sim {
  const slots: (Replica | null)[] = Array(SLOT_COUNT).fill(null);
  for (let i = 0; i < GROUP; i++) slots[i] = { version: 12, index: i, state: "active", conns: [], since: 0 };
  return {
    now: 0,
    slots,
    inflight: Array(SLOT_COUNT).fill(0),
    particles: Array.from({ length: POOL }, () => ({ live: false, leg: 1, t0: 0, slot: -1 })),
    nextSpawn: 0,
    phase: "idle",
    phaseAt: 0,
    nextAutoDeploy: 5200,
    version: 12,
    group: 0,
    served: 0,
    deploys: 0,
    lastRequest: ROUTES[0],
  };
}

function pickReplica(sim: Sim): number {
  let best: number[] = [];
  let min = Infinity;
  sim.slots.forEach((r, i) => {
    if (!r || r.state !== "active") return;
    const load = r.conns.length + sim.inflight[i];
    if (load < min) {
      min = load;
      best = [i];
    } else if (load === min) {
      best.push(i);
    }
  });
  return best.length ? best[Math.floor(Math.random() * best.length)] : -1;
}

function startDeploy(sim: Sim) {
  if (sim.phase !== "idle") return;
  sim.phase = "building";
  sim.phaseAt = sim.now;
}

function step(sim: Sim, dt: number) {
  sim.now += dt;
  const now = sim.now;

  // Expire finished connections.
  for (const r of sim.slots) {
    if (r && r.conns.length) r.conns = r.conns.filter((t) => t > now);
  }

  // Spawn incoming requests.
  if (now >= sim.nextSpawn) {
    const p = sim.particles.find((x) => !x.live);
    if (p) {
      p.live = true;
      p.leg = 1;
      p.t0 = now;
      p.slot = -1;
      sim.lastRequest = ROUTES[Math.floor(Math.random() * ROUTES.length)];
    }
    sim.nextSpawn = now + rand(60, 150);
  }

  // Advance packets.
  for (const p of sim.particles) {
    if (!p.live) continue;
    if (p.leg === 1 && now - p.t0 >= LEG1) {
      const target = pickReplica(sim);
      if (target < 0) continue;
      p.leg = 2;
      p.t0 = now;
      p.slot = target;
      sim.inflight[target]++;
    } else if (p.leg === 2 && now - p.t0 >= LEG2) {
      p.live = false;
      sim.inflight[p.slot]--;
      const r = sim.slots[p.slot];
      if (r) r.conns.push(now + rand(1300, 4200));
      sim.served++;
    }
  }

  // Rollout state machine.
  if (sim.phase === "idle" && now >= sim.nextAutoDeploy) startDeploy(sim);

  if (sim.phase === "building" && now - sim.phaseAt >= BUILD_MS) {
    const next = (sim.group === 0 ? 1 : 0) as 0 | 1;
    for (let i = 0; i < GROUP; i++) {
      sim.slots[next * GROUP + i] = { version: sim.version + 1, index: i, state: "booting", conns: [], since: now };
    }
    sim.phase = "booting";
    sim.phaseAt = now;
  } else if (sim.phase === "booting" && now - sim.phaseAt >= BOOT_MS) {
    const next = (sim.group === 0 ? 1 : 0) as 0 | 1;
    for (let i = 0; i < GROUP; i++) {
      const fresh = sim.slots[next * GROUP + i];
      const old = sim.slots[sim.group * GROUP + i];
      if (fresh) fresh.state = "active";
      if (old) {
        old.state = "draining";
        old.since = now;
      }
    }
    sim.group = next;
    sim.version += 1;
    sim.phase = "draining";
    sim.phaseAt = now;
  } else if (sim.phase === "draining") {
    const oldGroup = sim.group === 0 ? 1 : 0;
    let open = 0;
    for (let i = 0; i < GROUP; i++) {
      const idx = oldGroup * GROUP + i;
      const r = sim.slots[idx];
      if (!r) continue;
      if (r.state === "draining" && r.conns.length === 0 && sim.inflight[idx] === 0) {
        r.state = "leaving";
        r.since = now;
      } else if (r.state === "leaving" && now - r.since > 550) {
        sim.slots[idx] = null;
        continue;
      }
      open++;
    }
    if (open === 0) {
      sim.phase = "idle";
      sim.phaseAt = now;
      sim.deploys++;
      sim.nextAutoDeploy = now + AUTO_DEPLOY_MS;
    }
  }
}

/* ------------------------------------------------------------------ */
/* Component                                                           */
/* ------------------------------------------------------------------ */

/** Immutable copy of the simulation that React renders from. */
type SlotView = { version: number; index: number; state: ReplicaState; load: number; since: number };
type View = {
  now: number;
  slots: (SlotView | null)[];
  phase: Phase;
  phaseAt: number;
  version: number;
  group: 0 | 1;
  served: number;
  deploys: number;
  lastRequest: string;
};

function snapshot(sim: Sim): View {
  return {
    now: sim.now,
    slots: sim.slots.map((r) =>
      r ? { version: r.version, index: r.index, state: r.state, load: r.conns.length, since: r.since } : null
    ),
    phase: sim.phase,
    phaseAt: sim.phaseAt,
    version: sim.version,
    group: sim.group,
    served: sim.served,
    deploys: sim.deploys,
    lastRequest: sim.lastRequest,
  };
}

const COMPACT_QUERY = "(max-width: 639px)";

function subscribeCompact(cb: () => void) {
  const mq = window.matchMedia(COMPACT_QUERY);
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
}

export default function TrafficSimulator() {
  // The simulation is a mutable object advanced by the animation loop. Packets
  // are moved directly on the DOM every frame; React re-renders from a snapshot
  // of the rest of the state at ~11fps.
  const simRef = useRef<Sim | null>(null);
  const [view, setView] = useState<View>(() => snapshot(initialSim()));
  const svgRef = useRef<SVGSVGElement>(null);
  const dotRefs = useRef<(SVGGElement | null)[]>([]);
  const compact = useSyncExternalStore(
    subscribeCompact,
    () => window.matchMedia(COMPACT_QUERY).matches,
    () => false
  );
  const layout = useMemo(() => (compact ? mobileLayout() : desktopLayout()), [compact]);
  const layoutRef = useRef(layout);

  useEffect(() => {
    layoutRef.current = layout;
  }, [layout]);

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const sim = initialSim();
    simRef.current = sim;

    // Warm up so the first painted frame already looks like live traffic.
    for (let i = 0; i < 260; i++) step(sim, 16);
    sim.nextAutoDeploy = sim.now + 3200;

    if (reduced) {
      for (const r of sim.slots) if (r) r.conns = r.conns.map(() => Infinity);
      for (const p of sim.particles) p.live = false;
      const id = requestAnimationFrame(() => setView(snapshot(sim)));
      return () => cancelAnimationFrame(id);
    }

    let raf = 0;
    let last = 0;
    let lastPaint = 0;

    const start = () => {
      if (raf) return;
      last = performance.now();
      raf = requestAnimationFrame(loop);
    };
    const stop = () => {
      cancelAnimationFrame(raf);
      raf = 0;
    };

    const io = new IntersectionObserver(([e]) => (e.isIntersecting ? start() : stop()));
    if (svgRef.current) io.observe(svgRef.current);

    function loop(t: number) {
      const dt = Math.min(48, t - last);
      last = t;
      step(sim, dt);

      const L = layoutRef.current;
      sim.particles.forEach((p, i) => {
        const g = dotRefs.current[i];
        if (!g) return;
        if (!p.live) {
          g.setAttribute("opacity", "0");
          return;
        }
        const f = p.leg === 1 ? (sim.now - p.t0) / LEG1 : (sim.now - p.t0) / LEG2;
        const eased = p.leg === 2 ? 1 - Math.pow(1 - Math.min(1, f), 1.6) : f;
        const path = p.leg === 1 ? L.inPath : L.outPaths[p.slot];
        const [x, y] = pointAt(path, eased);
        g.setAttribute("transform", `translate(${x.toFixed(1)} ${y.toFixed(1)})`);
        g.setAttribute("opacity", "1");
      });

      if (t - lastPaint > 90) {
        lastPaint = t;
        setView(snapshot(sim));
      }
      raf = requestAnimationFrame(loop);
    }

    start();
    return () => {
      stop();
      io.disconnect();
    };
  }, []);

  const deploy = useCallback(() => {
    if (simRef.current) startDeploy(simRef.current);
  }, []);

  const sim = view;

  const L = layout;
  const oldGroup = sim.group === 0 ? 1 : 0;
  const draining = sim.slots
    .slice(oldGroup * GROUP, oldGroup * GROUP + GROUP)
    .reduce((n, r) => n + (r ? r.load : 0), 0);
  const sha = SHAS[sim.deploys % SHAS.length];
  const buildProgress = sim.phase === "building" ? Math.min(1, (sim.now - sim.phaseAt) / BUILD_MS) : 0;
  const totalConns = sim.slots.reduce((n, r) => n + (r ? r.load : 0), 0);

  let status: React.ReactNode;
  if (sim.phase === "building") {
    status = (
      <>
        Building <b className="font-medium text-fg">v{sim.version + 1}</b>
        <span className="hidden sm:inline"> · commit {sha}</span>
      </>
    );
  } else if (sim.phase === "booting") {
    status = (
      <>
        Health-checking <b className="font-medium text-fg">v{sim.version + 1}</b> replicas
      </>
    );
  } else if (sim.phase === "draining") {
    status = (
      <>
        New traffic → <b className="font-medium text-fg">v{sim.version}</b> · draining v{sim.version - 1}
        <span className="text-mute"> ({draining} open)</span>
      </>
    );
  } else {
    status = (
      <>
        <b className="font-medium text-fg">v{sim.version}</b> serving · 3 replicas healthy
      </>
    );
  }

  const fs = L.compact ? 1 : 1.05;

  return (
    <div className="relative overflow-hidden rounded-2xl border border-hair-strong bg-panel/80 shadow-[0_40px_120px_-30px_rgba(0,0,0,0.9),0_0_0_1px_rgba(0,0,0,0.6)] backdrop-blur-xl">
      {/* Title bar */}
      <div className="flex items-center gap-3 border-b border-hair px-3 py-2.5 sm:px-4">
        <div className="hidden items-center gap-1.5 sm:flex" aria-hidden>
          <span className="h-2.5 w-2.5 rounded-full bg-white/10" />
          <span className="h-2.5 w-2.5 rounded-full bg-white/10" />
          <span className="h-2.5 w-2.5 rounded-full bg-white/10" />
        </div>
        <span className="hidden font-mono text-[11px] text-faint md:inline">proxy · storefront.dploy.app</span>

        <div
          className="relative flex min-w-0 flex-1 items-center gap-2 overflow-hidden rounded-md border border-hair bg-ink/60 px-2.5 py-1 font-mono text-[11px] text-mute sm:mx-auto sm:max-w-md sm:flex-none"
          aria-live="polite"
        >
          <span
            className={`h-1.5 w-1.5 shrink-0 rounded-full ${
              sim.phase === "idle" ? "bg-ok" : "bg-signal shadow-[0_0_8px_var(--color-signal)]"
            }`}
          />
          <span className="truncate">{status}</span>
          {sim.phase === "building" && (
            <span
              className="absolute inset-x-0 bottom-0 h-px bg-signal transition-[width]"
              style={{ width: `${buildProgress * 100}%` }}
            />
          )}
        </div>

        <button
          onClick={deploy}
          disabled={sim.phase !== "idle"}
          className="group inline-flex shrink-0 items-center gap-1.5 rounded-md border border-hair-strong bg-white/[0.04] px-2.5 py-1 text-[12px] font-medium text-fg transition hover:border-signal/60 hover:bg-signal/10 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-hair-strong disabled:hover:bg-white/[0.04]"
        >
          <Rocket className="h-3.5 w-3.5 text-signal transition group-hover:-translate-y-px group-hover:translate-x-px" />
          Deploy
        </button>
      </div>

      {/* Diagram */}
      <div className="dot-grid relative">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${L.w} ${L.h}`}
          className="block h-auto w-full"
          role="img"
          aria-label="Live simulation: incoming requests pass through the dploy proxy and are routed to the replica with the fewest open connections. On each deploy, new replicas boot, take all new traffic, and old replicas drain to zero before they are removed."
        >
          <defs>
            <radialGradient id="pkt" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#ff6b2c" stopOpacity="0.55" />
              <stop offset="100%" stopColor="#ff6b2c" stopOpacity="0" />
            </radialGradient>
            <linearGradient id="proxyFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#1d1d22" />
              <stop offset="100%" stopColor="#121215" />
            </linearGradient>
          </defs>

          {/* Wires */}
          <path d={L.inPath.d} fill="none" stroke="rgb(255 255 255 / 0.16)" strokeWidth="1.25" />
          {L.outPaths.map((p, i) => {
            const r = sim.slots[i];
            const on = r?.state === "active";
            return (
              <path
                key={i}
                d={p.d}
                fill="none"
                stroke={on ? "rgb(255 107 44 / 0.42)" : r ? "rgb(255 255 255 / 0.14)" : "rgb(255 255 255 / 0.06)"}
                strokeWidth={on ? 1.4 : 1}
                strokeDasharray={r ? undefined : "3 5"}
                style={{ transition: "stroke 400ms" }}
              />
            );
          })}

          {/* Source */}
          <g transform={`translate(${L.src.x} ${L.src.y})`}>
            <rect width={L.src.w} height={L.src.h} rx="12" fill="#121215" stroke="rgb(255 255 255 / 0.12)" />
            {L.compact ? (
              <>
                <text x="14" y="24" fill="#f3f2ee" fontSize={13 * fs} fontWeight="500">Internet</text>
                <text x="14" y="43" fill="#9b9ba4" fontSize={11 * fs} fontFamily="var(--font-geist-mono)">
                  {sim.lastRequest}
                </text>
                <text x={L.src.w - 14} y="24" textAnchor="end" fill="#5f5f69" fontSize={11 * fs} fontFamily="var(--font-geist-mono)">
                  ~9 req/s
                </text>
              </>
            ) : (
              <>
                <text x="16" y="28" fill="#f3f2ee" fontSize={14 * fs} fontWeight="500">Internet</text>
                <text x="16" y="48" fill="#5f5f69" fontSize={11 * fs} fontFamily="var(--font-geist-mono)">
                  ~9 req/s · HTTPS
                </text>
                <text x="16" y="68" fill="#9b9ba4" fontSize={11 * fs} fontFamily="var(--font-geist-mono)">
                  {sim.lastRequest}
                </text>
              </>
            )}
          </g>

          {/* Proxy */}
          <g transform={`translate(${L.proxy.x} ${L.proxy.y})`}>
            <rect
              x="-6"
              y="-6"
              width={L.proxy.w + 12}
              height={L.proxy.h + 12}
              rx="18"
              fill="none"
              stroke="rgb(255 107 44 / 0.18)"
            />
            <rect width={L.proxy.w} height={L.proxy.h} rx="13" fill="url(#proxyFill)" stroke="rgb(255 107 44 / 0.55)" />
            <text x="16" y={L.compact ? 26 : 30} fill="#ff6b2c" fontSize={10.5 * fs} fontFamily="var(--font-geist-mono)" letterSpacing="1.2">
              DPLOY PROXY
            </text>
            <text x="16" y={L.compact ? 48 : 56} fill="#f3f2ee" fontSize={(L.compact ? 14 : 16) * fs} fontWeight="500">
              least-connections
            </text>
            <text x="16" y={L.compact ? 70 : 82} fill="#9b9ba4" fontSize={11 * fs} fontFamily="var(--font-geist-mono)">
              {totalConns} open conns
            </text>
            {!L.compact && (
              <text x="16" y="104" fill="#5f5f69" fontSize={11 * fs} fontFamily="var(--font-geist-mono)">
                {sim.served.toLocaleString("en-US")} routed
              </text>
            )}
            {L.compact && (
              <text x={L.proxy.w - 16} y="70" textAnchor="end" fill="#5f5f69" fontSize={11 * fs} fontFamily="var(--font-geist-mono)">
                {sim.served.toLocaleString("en-US")} routed
              </text>
            )}
          </g>

          {/* Replica slots */}
          {L.slots.map((b, i) => {
            const r = sim.slots[i];
            return <Slot key={i} box={b} replica={r} now={sim.now} compact={L.compact} fs={fs} />;
          })}

          {/* Packets */}
          {Array.from({ length: POOL }, (_, i) => (
            <g
              key={i}
              ref={(el) => {
                dotRefs.current[i] = el;
              }}
              opacity="0"
            >
              <circle r="9" fill="url(#pkt)" />
              <circle r="2.6" fill="#ffd2bd" />
            </g>
          ))}
        </svg>
      </div>

      {/* Stat strip */}
      <div className="grid grid-cols-2 border-t border-hair sm:grid-cols-4">
        <Stat label="Requests routed" value={sim.served.toLocaleString("en-US")} />
        <Stat label="Dropped" value="0" accent />
        <Stat label="Live version" value={`v${sim.version}`} />
        <Stat
          label="Rollouts"
          value={
            <span className="inline-flex items-center gap-1.5">
              <GitCommitHorizontal className="h-3.5 w-3.5 text-faint" />
              {sim.deploys}
            </span>
          }
        />
      </div>
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: React.ReactNode; accent?: boolean }) {
  return (
    <div className="border-hair px-4 py-3 [&:not(:first-child)]:border-l max-sm:[&:nth-child(3)]:border-l-0 max-sm:[&:nth-child(n+3)]:border-t">
      <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-faint">{label}</div>
      <div className={`mt-1 font-mono text-[15px] tabular-nums ${accent ? "text-ok" : "text-fg"}`}>{value}</div>
    </div>
  );
}

function Slot({
  box,
  replica,
  now,
  compact,
  fs,
}: {
  box: Box;
  replica: SlotView | null;
  now: number;
  compact: boolean;
  fs: number;
}) {
  const { x, y, w, h } = box;
  if (!replica) {
    return (
      <g transform={`translate(${x} ${y})`}>
        <rect width={w} height={h} rx="10" fill="rgb(255 255 255 / 0.012)" stroke="rgb(255 255 255 / 0.08)" strokeDasharray="3 5" />
        <text x="16" y={h / 2 + 4} fill="#3f3f46" fontSize={11 * fs} fontFamily="var(--font-geist-mono)">
          empty slot
        </text>
      </g>
    );
  }

  const { state, version, index, load } = replica;
  const barX = compact ? 128 : 150;
  const barW = w - barX - (compact ? 62 : 78);
  const fill = Math.min(1, load / MAX_LOAD) * barW;
  const opacity = state === "leaving" ? 0 : state === "draining" ? 0.62 : 1;
  const bootP = state === "booting" ? Math.min(1, (now - replica.since) / BOOT_MS) : 1;

  const dot = state === "active" ? "#3ddc97" : state === "booting" ? "#ff6b2c" : "#71717a";
  const stroke =
    state === "active" ? "rgb(255 255 255 / 0.13)" : state === "booting" ? "rgb(255 107 44 / 0.5)" : "rgb(255 255 255 / 0.08)";

  const right =
    state === "booting" ? "booting" : state === "draining" || state === "leaving" ? `drain ${load}` : `${load} conns`;

  return (
    <g transform={`translate(${x} ${y})`} style={{ transition: "opacity 500ms" }} opacity={opacity}>
      <rect width={w} height={h} rx="10" fill="#121215" stroke={stroke} strokeDasharray={state === "booting" ? "4 4" : undefined} />
      <circle cx="17" cy={h / 2} r="3.5" fill={dot} />
      {state === "active" && <circle cx="17" cy={h / 2} r="7" fill={dot} opacity="0.15" />}
      <text x="30" y={h / 2 + 4} fill="#f3f2ee" fontSize={12 * fs} fontFamily="var(--font-geist-mono)">
        replica-{index + 1}
      </text>
      <g transform={`translate(${compact ? 100 : 116} ${h / 2 - 9})`}>
        <rect width="26" height="18" rx="5" fill={state === "active" ? "rgb(255 107 44 / 0.14)" : "rgb(255 255 255 / 0.05)"} />
        <text
          x="13"
          y="12.5"
          textAnchor="middle"
          fill={state === "active" ? "#ff8a57" : "#9b9ba4"}
          fontSize={9.5 * fs}
          fontFamily="var(--font-geist-mono)"
        >
          v{version}
        </text>
      </g>
      <g transform={`translate(${barX + (compact ? 4 : 6)} ${h / 2 - 2})`}>
        <rect width={barW} height="4" rx="2" fill="rgb(255 255 255 / 0.06)" />
        {state === "booting" ? (
          <rect width={barW * bootP} height="4" rx="2" fill="rgb(255 107 44 / 0.5)" />
        ) : (
          <rect
            width={fill}
            height="4"
            rx="2"
            fill={state === "active" ? "#ff6b2c" : "#71717a"}
            style={{ transition: "width 160ms linear" }}
          />
        )}
      </g>
      <text
        x={w - 14}
        y={h / 2 + 4}
        textAnchor="end"
        fill={state === "active" ? "#9b9ba4" : "#71717a"}
        fontSize={11 * fs}
        fontFamily="var(--font-geist-mono)"
      >
        {right}
      </text>
    </g>
  );
}
