import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://dploy.avichal.me"),
  title: {
    default: "Dploy | Zero-Config PaaS",
    template: "%s | Dploy",
  },
  description: "The self-hosted deployment engine built for high-velocity engineering teams. Push to main, automate container rollouts, and govern traffic.",
  openGraph: {
    title: "Dploy | Zero-Config PaaS",
    description: "Ship your code from GitHub to production instantly in isolated containers.",
    url: "https://dploy.avichal.me",
    siteName: "Dploy",
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Dploy | Zero-Config PaaS",
    description: "Ship your code from GitHub to production instantly in isolated containers.",
    creator: "@Avichal_08",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
