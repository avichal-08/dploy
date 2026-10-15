import type { Metadata } from "next";
import { Geist, Geist_Mono, Instrument_Serif } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const instrumentSerif = Instrument_Serif({
  variable: "--font-instrument-serif",
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://dploy.avichal.me"),
  title: {
    default: "Dploy | Zero-Config PaaS",
    template: "%s | Dploy",
  },
  description: "dploy is a self-hosted PaaS written in Go. It builds your Git repo into containers, rolls out new versions with zero downtime, and routes every request to the least-loaded replica.",
  openGraph: {
    title: "Dploy | Zero-Config PaaS",
    description: "Deploy all day. Drop zero requests. A self-hosted PaaS in Go with zero-downtime rollouts and least-connections routing.",
    url: "https://dploy.avichal.me",
    siteName: "Dploy",
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Dploy | Zero-Config PaaS",
    description: "Deploy all day. Drop zero requests. A self-hosted PaaS in Go with zero-downtime rollouts and least-connections routing.",
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
      className={`${geistSans.variable} ${geistMono.variable} ${instrumentSerif.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
