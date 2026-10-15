import { readFile } from "node:fs/promises";

/** Shared brand pieces for images rendered with next/og (Satori). */

export const INK = "#09090b";
export const FG = "#f3f2ee";
export const MUTE = "#9b9ba4";
export const FAINT = "#5f5f69";
export const SIGNAL = "#ff6b2c";
export const OK = "#3ddc97";

export function LogoMark({ size, framed = true }: { size: number; framed?: boolean }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32">
      <rect width="32" height="32" rx={framed ? 8 : 0} fill="#0e0e11" />
      {framed && (
        <rect x="0.5" y="0.5" width="31" height="31" rx="7.5" fill="none" stroke="rgba(255,255,255,0.16)" />
      )}
      <path d="M7.5 9.5h5a6.5 6.5 0 0 1 0 13h-5z" fill="none" stroke={FG} strokeWidth="3" strokeLinejoin="round" />
      <circle cx="24.6" cy="16" r="2.7" fill={SIGNAL} />
    </svg>
  );
}

export async function loadOgFonts() {
  // Module-relative URLs let the bundler trace and ship the font files,
  // independent of the directory the server was started from.
  const [sans, mono, serif] = await Promise.all([
    readFile(new URL("../../assets/og/geist-sans-latin-600-normal.woff", import.meta.url)),
    readFile(new URL("../../assets/og/geist-mono-latin-400-normal.woff", import.meta.url)),
    readFile(new URL("../../assets/og/instrument-serif-latin-400-italic.woff", import.meta.url)),
  ]);
  return [
    { name: "Geist", data: sans, weight: 600 as const, style: "normal" as const },
    { name: "Geist Mono", data: mono, weight: 400 as const, style: "normal" as const },
    { name: "Instrument Serif", data: serif, weight: 400 as const, style: "italic" as const },
  ];
}
