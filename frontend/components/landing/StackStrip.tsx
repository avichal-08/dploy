const STACK = ["Go", "Docker", "PostgreSQL", "Redis", "Asynq", "Caddy", "Amazon S3", "WebSockets", "Next.js"];

export default function StackStrip() {
  const items = [...STACK, ...STACK];
  return (
    <div className="relative border-t border-hair py-8">
      <p className="mb-6 text-center font-mono text-[11px] uppercase tracking-[0.18em] text-faint">
        Built on boring, battle-tested primitives
      </p>
      <div className="overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_15%,black_85%,transparent)]">
        <ul className="marquee flex w-max items-center">
          {items.map((s, i) => (
            <li key={i} className="flex items-center" aria-hidden={i >= STACK.length}>
              <span className="px-8 text-[18px] font-medium tracking-[-0.02em] text-white/35 transition-colors hover:text-white/80 sm:text-[20px]">
                {s}
              </span>
              <span className="h-1 w-1 rounded-full bg-white/15" />
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
