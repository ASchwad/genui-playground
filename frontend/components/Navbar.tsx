'use client';

import Link from "next/link";
import Image from "next/image";

export default function Navbar() {
  return (
    <nav className="fixed top-0 left-0 w-full h-16 bg-white/80 dark:bg-black/40 backdrop-blur-md shadow-md flex items-center px-6 z-50">
      {/* Logo */}
      <Link href="/" className="flex items-center gap-2 text-xl font-semibold text-gray-900 dark:text-white">
        <Image
          src="/next.svg"
          alt="Logo"
          width={90}
          height={20}
          className="dark:invert"
        />
      </Link>

      {/* Links */}
      <div className="ml-auto flex items-center gap-6 text-sm sm:text-base font-medium">
        <Link
          href="/"
          className="text-gray-700 hover:text-gray-900 dark:text-gray-200 dark:hover:text-white transition-colors"
        >
          Home
        </Link>
        <Link
          href="/copilotkit"
          className="text-gray-700 hover:text-gray-900 dark:text-gray-200 dark:hover:text-white transition-colors"
        >
          Demo
        </Link>
        <a
          href="https://github.com/ASchwad/genui-playground"
          target="_blank"
          rel="noopener noreferrer"
          className="text-gray-700 hover:text-gray-900 dark:text-gray-200 dark:hover:text-white transition-colors"
        >
          GitHub
        </a>
      </div>
    </nav>
  );
}