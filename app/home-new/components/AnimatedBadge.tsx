"use client";

import { Sparkles } from "lucide-react";
import { motion } from "framer-motion";

export default function AnimatedBadge() {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5 }}
      className="inline-flex items-center px-4 py-2 rounded-full bg-digitaltag-navy/5 border border-digitaltag-navy/20 backdrop-blur-sm"
    >
      <Sparkles className="w-4 h-4 mr-2 text-digitaltag-violet animate-pulse-slow" />
      <span className="text-sm font-medium text-digitaltag-navy">
        Demo - Zentralschweizer Digitaltag 2025
      </span>
    </motion.div>
  );
}
