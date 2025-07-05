"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600 text-white">
      {/* Hero Section */}
      <main className="flex-1 flex flex-col items-center justify-center text-center px-6 pt-16">
        <Image
          src="/next.svg"
          alt="Next.js logo"
          width={200}
          height={42}
          className="dark:invert mb-8"
        />
        <h1 className="text-5xl sm:text-6xl font-bold mb-6 drop-shadow-lg">
          Welcome to the CopilotKit Demo
        </h1>
        <p className="max-w-2xl mb-10 text-lg sm:text-xl opacity-90">
          Explore how you can build AI-powered experiences with CopilotKit. Click
          below to interact with a live demo showcasing shared state, generative
          UI, and more.
        </p>
        <Link
          href="/copilotkit"
          className="inline-block bg-white text-indigo-700 font-semibold py-3 px-8 rounded-full shadow-lg hover:bg-gray-100 transition-colors duration-200"
        >
          Launch Demo
        </Link>
      </main>

      {/* Footer */}
      <footer className="py-6 text-center text-white/80 text-sm">
        © {new Date().getFullYear()} CopilotKit Demo. All rights reserved.
      </footer>
    </div>
  );
}
