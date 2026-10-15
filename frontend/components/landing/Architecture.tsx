import { Eyebrow, FrameCrosses, Reveal } from "./primitives";

type Node = { kind: string; name: string; note: string; hot?: boolean };

const CONTROL: Node[] = [
  { kind: "ui", name: "Dashboard", note: "Next.js" },
  { kind: "api", name: "Control plane", note: "Go · Postgres" },
  { kind: "queue", name: "Task queue", note: "Redis · Asynq" },
  { kind: "worker", name: "Builder", note: "Go · Docker CLI" },
];

const DATA: Node[] = [
  { kind: "edge", name: "Internet", note: "HTTP · WS" },
  { kind: "tls", name: "Caddy", note: "on-demand TLS" },
  { kind: "route", name: "dploy proxy", note: "least-connections", hot: true },
];

function NodeCard({ n }: { n: Node }) {
  return (
    <div
      className={`relative shrink-0 rounded-xl border px-4 py-3 lg:min-w-[132px] ${
        n.hot ? "border-signal/50 bg-signal/[0.06]" : "border-hair-strong bg-panel"
      }`}
    >
      <div className={`font-mono text-[10px] uppercase tracking-[0.14em] ${n.hot ? "text-signal" : "text-faint"}`}>
        {n.kind}
      </div>
      <div className="mt-1 text-[14px] font-medium tracking-tight text-fg">{n.name}</div>
      <div className="font-mono text-[11px] text-mute">{n.note}</div>
    </div>
  );
}

function Wire() {
  return (
    <>
      <div className="flow-x hidden h-px min-w-6 flex-1 self-center opacity-70 lg:block" />
      <div className="flow-y mx-auto h-6 w-px opacity-70 lg:hidden" />
    </>
  );
}

function Lane({ title, caption, nodes }: { title: string; caption: string; nodes: Node[] }) {
  return (
    <div className="rounded-2xl border border-hair bg-white/[0.012] p-4 sm:p-5">
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
        <span className="font-mono text-[11px] uppercase tracking-[0.16em] text-mute">{title}</span>
        <span className="text-[12px] text-faint">{caption}</span>
      </div>
      <div className="flex flex-col lg:flex-row lg:items-stretch">
        {nodes.map((n, i) => (
          <div key={n.name} className="contents">
            {i > 0 && <Wire />}
            <NodeCard n={n} />
          </div>
        ))}
      </div>
    </div>
  );
}

const PRINCIPLES = [
  {
    title: "Keep the control plane light",
    body: "The API coordinates and records state. It never clones, builds or uploads on the request path.",
  },
  {
    title: "Push heavy work to workers",
    body: "Builds, image pulls and S3 uploads run asynchronously. Scale workers independently of the API.",
  },
  {
    title: "Keep routing dynamic",
    body: "Replicas come and go. The proxy reads live state on every request instead of a static upstream list.",
  },
];

export default function Architecture() {
  return (
    <section id="architecture" className="relative scroll-mt-24 border-t border-hair">
      <FrameCrosses />
      <div className="px-5 py-24 sm:px-10 sm:py-32">
        <Reveal>
          <Eyebrow index="03">Architecture</Eyebrow>
          <h2 className="max-w-2xl text-balance text-[34px] font-semibold leading-[1.05] tracking-[-0.035em] text-fg sm:text-[48px]">
            No Kubernetes.{" "}
            <span className="font-serif font-normal italic text-white/60">Just a few boring, reliable parts.</span>
          </h2>
          <p className="mt-5 max-w-xl text-[16px] leading-relaxed text-mute">
            Go, Docker, Postgres, Redis and Caddy — split into a control plane that turns code into containers and a
            data plane that gets requests to them. Each side can fail, restart or scale without taking the other down.
          </p>
        </Reveal>

        <Reveal delay={100} className="mt-14">
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto_200px] lg:items-stretch">
            <div className="flex flex-col gap-4">
              <Lane title="Control plane" caption="how code becomes containers" nodes={CONTROL} />
              <Lane title="Data plane" caption="how requests reach them" nodes={DATA} />
            </div>

            {/* Joiners: both lanes converge on the replicas */}
            <div className="hidden w-10 flex-col lg:flex" aria-hidden>
              <div className="flex flex-1 items-center">
                <div className="flow-x h-px w-full opacity-70" />
              </div>
              <div className="flex flex-1 items-center">
                <div className="flow-x h-px w-full opacity-70" />
              </div>
            </div>
            <div className="flow-y mx-auto h-6 w-px opacity-70 lg:hidden" aria-hidden />

            <div className="relative flex flex-col justify-center overflow-hidden rounded-2xl border border-signal/40 bg-[linear-gradient(180deg,rgba(255,107,44,0.08),rgba(255,107,44,0.02))] p-5">
              <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-signal">docker engine</div>
              <div className="mt-1 text-[16px] font-medium tracking-tight text-fg">Your app</div>
              <div className="mt-4 grid grid-cols-3 gap-1.5 lg:grid-cols-1">
                {["replica-1", "replica-2", "replica-3"].map((r) => (
                  <div
                    key={r}
                    className="flex items-center gap-2 rounded-md border border-hair-strong bg-ink/70 px-2.5 py-1.5 font-mono text-[11px] text-mute"
                  >
                    <span className="h-1.5 w-1.5 rounded-full bg-ok" />
                    {r}
                  </div>
                ))}
              </div>
              <div className="mt-3 font-mono text-[11px] text-faint">or static assets on S3</div>
            </div>
          </div>
        </Reveal>

        <div className="mt-16 grid gap-px overflow-hidden rounded-2xl border border-hair bg-hair md:grid-cols-3">
          {PRINCIPLES.map((p, i) => (
            <Reveal key={p.title} delay={i * 90} className="bg-ink p-6 sm:p-7">
              <div className="font-mono text-[11px] text-signal">0{i + 1}</div>
              <h3 className="mt-3 text-[15px] font-medium tracking-tight text-fg">{p.title}</h3>
              <p className="mt-2 text-[14px] leading-relaxed text-mute">{p.body}</p>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
