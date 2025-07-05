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
  metadataBase: new URL("https://example.com"),
  openGraph: {
    title: "GenUI Playground",
    description:
      "GenUI Playground – explore AI-powered user interfaces built with CopilotKit and Next.js.",
    url: "https://example.com",
    siteName: "GenUI Playground",
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "GenUI Playground",
    description:
      "GenUI Playground – explore AI-powered user interfaces built with CopilotKit and Next.js.",
    creator: "@genui",
  },
  alternates: {
    canonical: "https://example.com",
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
