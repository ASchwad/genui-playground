import { type Metadata } from "next";
import { Geist_Sans, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist_Sans({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "GenUI Playground",
    template: "%s | GenUI Playground",
  },
  description:
    "GenUI Playground – explore AI-powered user interfaces built with CopilotKit and Next.js.",
  keywords: [
    "CopilotKit",
    "GenUI",
    "AI",
    "Next.js",
    "TypeScript",
    "OpenAI",
    "Generative UI",
    "AI agents",
  ],
  metadataBase: new URL(
    (typeof process !== "undefined" && process.env.NEXT_PUBLIC_SITE_URL) ||
      "http://localhost:3000"
  ),
  openGraph: {
    title: "GenUI Playground",
    description:
      "GenUI Playground – explore AI-powered user interfaces built with CopilotKit and Next.js.",
    url:
      (typeof process !== "undefined" && process.env.NEXT_PUBLIC_SITE_URL) ||
      "http://localhost:3000",
    siteName: "GenUI Playground",
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "GenUI Playground",
    description:
      "GenUI Playground – explore AI-powered user interfaces built with CopilotKit and Next.js.",
    creator:
      (typeof process !== "undefined" && process.env.NEXT_PUBLIC_TWITTER_HANDLE) ||
      "",
  },
  alternates: {
    canonical:
      (typeof process !== "undefined" && process.env.NEXT_PUBLIC_SITE_URL) ||
      "http://localhost:3000",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
