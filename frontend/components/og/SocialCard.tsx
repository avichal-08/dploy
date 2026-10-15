import { ImageResponse } from "next/og";
import { FAINT, FG, INK, LogoMark, MUTE, OK, SIGNAL, loadOgFonts } from "./brand";

export const OG_SIZE = { width: 1200, height: 630 };

const REPLICAS = [
  { name: "replica-1", load: 0.55, conns: 7 },
  { name: "replica-2", load: 0.42, conns: 6 },
  { name: "replica-3", load: 0.62, conns: 8 },
];

/** The 1200×630 share card used for both Open Graph and Twitter. */
export async function renderSocialCard() {
  const fonts = await loadOgFonts();

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "64px 72px",
          backgroundColor: INK,
          backgroundImage: [
            "radial-gradient(ellipse 900px 420px at 50% -120px, rgba(255,107,44,0.22), rgba(255,107,44,0.05) 55%, transparent 75%)",
            "radial-gradient(rgba(255,255,255,0.07) 1.2px, transparent 1.2px)",
          ].join(", "),
          backgroundSize: "100% 100%, 24px 24px",
          fontFamily: "Geist",
          color: FG,
        }}
      >
        {/* Top row */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <LogoMark size={52} />
            <span style={{ fontSize: 38, letterSpacing: -1.2 }}>dploy</span>
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              padding: "10px 18px",
              borderRadius: 999,
              border: "1px solid rgba(255,255,255,0.14)",
              backgroundColor: "rgba(255,255,255,0.03)",
              fontFamily: "Geist Mono",
              fontSize: 20,
              color: MUTE,
            }}
          >
            <span style={{ color: SIGNAL }}>OPEN SOURCE</span>
            <span style={{ color: FAINT }}>·</span>
            <span>self-hosted PaaS in Go</span>
          </div>
        </div>

        {/* Headline */}
        <div style={{ display: "flex", flexDirection: "column", marginTop: 8 }}>
          <div style={{ fontSize: 100, lineHeight: 1, letterSpacing: -4.5 }}>Deploy all day.</div>
          <div style={{ display: "flex", alignItems: "baseline", fontSize: 100, lineHeight: 1.08, letterSpacing: -4.5 }}>
            <span style={{ color: "rgba(255,255,255,0.45)" }}>Drop</span>
            <span
              style={{
                fontFamily: "Instrument Serif",
                fontStyle: "italic",
                fontSize: 116,
                letterSpacing: -2,
                color: SIGNAL,
                margin: "0 26px 0 24px",
              }}
            >
              zero
            </span>
            <span style={{ color: "rgba(255,255,255,0.45)" }}>requests.</span>
          </div>
        </div>

        {/* Routing strip: proxy → least-loaded replicas */}
        <div style={{ display: "flex", alignItems: "center" }}>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              padding: "16px 22px",
              borderRadius: 16,
              border: `1.5px solid rgba(255,107,44,0.6)`,
              backgroundColor: "#16161a",
            }}
          >
            <span style={{ fontFamily: "Geist Mono", fontSize: 15, letterSpacing: 2, color: SIGNAL }}>DPLOY PROXY</span>
            <span style={{ fontSize: 24, marginTop: 4, letterSpacing: -0.6 }}>least-connections</span>
          </div>

          <div style={{ display: "flex", width: 56, height: 2, backgroundColor: "rgba(255,107,44,0.55)" }} />

          <div style={{ display: "flex", gap: 14, flex: 1 }}>
            {REPLICAS.map((r) => (
              <div
                key={r.name}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  flex: 1,
                  gap: 12,
                  padding: "14px 18px",
                  borderRadius: 14,
                  border: "1px solid rgba(255,255,255,0.13)",
                  backgroundColor: "#121215",
                  fontFamily: "Geist Mono",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 16, whiteSpace: "nowrap" }}>
                  <div style={{ display: "flex", width: 9, height: 9, borderRadius: 9, backgroundColor: OK }} />
                  <span style={{ color: FG }}>{r.name}</span>
                  <span style={{ marginLeft: "auto", color: MUTE }}>{r.conns} conns</span>
                </div>
                <div style={{ display: "flex", height: 6, borderRadius: 6, backgroundColor: "rgba(255,255,255,0.07)" }}>
                  <div
                    style={{ display: "flex", width: `${r.load * 100}%`, height: 6, borderRadius: 6, backgroundColor: SIGNAL }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    ),
    { ...OG_SIZE, fonts }
  );
}
