import { ImageResponse } from "next/og";
import { LogoMark } from "@/components/og/brand";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  // iOS rounds the corners itself, so fill the full square edge to edge.
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#0e0e11",
        }}
      >
        <LogoMark size={180} framed={false} />
      </div>
    ),
    size
  );
}
