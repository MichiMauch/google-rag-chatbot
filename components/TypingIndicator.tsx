"use client";

import { motion } from "framer-motion";
import { Bot } from "lucide-react";

export default function TypingIndicator() {
  return (
    <div className="flex items-start space-x-2 sm:space-x-3">
      {/* Bot Avatar */}
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="flex-shrink-0 w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-white border-2 border-gray-200 flex items-center justify-center"
      >
        <Bot className="w-4 h-4 sm:w-5 sm:h-5 text-digitaltag-navy" />
      </motion.div>

      {/* Typing Bubble with Animated Dots */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="relative max-w-[90%] sm:max-w-[85%] lg:max-w-[80%]"
      >
        <div className="px-4 py-3 sm:px-5 sm:py-3 rounded-2xl backdrop-blur-md bg-white/80 border border-gray-200 shadow-sm">
          <div className="flex space-x-1.5">
            {[0, 1, 2].map((index) => (
              <motion.div
                key={index}
                animate={{
                  y: [0, -8, 0],
                  opacity: [0.4, 1, 0.4],
                }}
                transition={{
                  duration: 1.2,
                  repeat: Infinity,
                  delay: index * 0.15,
                  ease: "easeInOut",
                }}
                className="w-2 h-2 rounded-full bg-digitaltag-violet"
              />
            ))}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
