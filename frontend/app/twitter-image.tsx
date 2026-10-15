import { renderSocialCard } from "@/components/og/SocialCard";

export const alt = "dploy — Deploy all day. Drop zero requests. A self-hosted PaaS in Go.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function TwitterImage() {
  return renderSocialCard();
}
