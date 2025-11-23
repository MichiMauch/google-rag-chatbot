"use client";

import { FileText, Bot } from "lucide-react";
import Link from "next/link";

export default function GlassHeader() {
  return (
    <header className="sticky top-0 z-50 backdrop-blur-xl bg-white/80 border-b border-gray-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <Link href="/home-new" className="flex items-center space-x-3 group">
            <div className="relative transition-transform group-hover:scale-110 duration-300">
              <FileText className="w-9 h-9 text-digitaltag-navy" />
              <Bot className="w-5 h-5 text-digitaltag-violet absolute -bottom-1 -right-1" />
            </div>
            <h1 className="text-2xl font-bold text-digitaltag-navy">
              NETNODE.AI
            </h1>
          </Link>

          {/* Admin Link */}
          <Link
            href="/admin"
            className="px-4 py-2 text-sm font-medium text-digitaltag-navy hover:text-digitaltag-violet transition-all hover:scale-105 rounded-lg bg-white border border-gray-300 hover:bg-gray-50"
          >
            Admin
          </Link>
        </div>
      </div>
    </header>
  );
}
