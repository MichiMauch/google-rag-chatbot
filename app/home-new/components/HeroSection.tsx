"use client";

import { motion } from "framer-motion";
import AnimatedBadge from "./AnimatedBadge";

const staggerContainer = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.2,
      delayChildren: 0.1,
    },
  },
};

const fadeInUp = {
  hidden: { opacity: 0, y: 20 },
  show: {
    opacity: 1,
    y: 0,
  },
};

export default function HeroSection() {
  return (
    <section className="relative min-h-[80vh] flex items-center justify-center px-4 py-20">
      <motion.div
        variants={staggerContainer}
        initial="hidden"
        animate="show"
        className="max-w-5xl mx-auto text-center space-y-8"
      >
        {/* Badge */}
        <motion.div variants={fadeInUp} className="flex justify-center">
          <AnimatedBadge />
        </motion.div>

        {/* Title */}
        <motion.h1
          variants={fadeInUp}
          className="text-5xl sm:text-6xl md:text-7xl font-bold leading-tight"
        >
          <span className="text-digitaltag-navy">
            KI-gestützte
          </span>
          <br />
          <span className="text-digitaltag-violet">
            Dokumenten-Analyse
          </span>
        </motion.h1>

        {/* Description */}
        <motion.p
          variants={fadeInUp}
          className="text-xl md:text-2xl text-gray-700 max-w-3xl mx-auto leading-relaxed"
        >
          Erstellen Sie in wenigen Klicks einen Chat-Bot für Ihre Dokumente oder Webseiten.
          Nutzen Sie Google Gemini für intelligente Antworten.
        </motion.p>

        {/* Stats */}
        <motion.div
          variants={fadeInUp}
          className="flex flex-wrap justify-center gap-8 pt-8"
        >
          <div className="text-center">
            <div className="text-3xl font-bold text-digitaltag-navy">
              Gemini 2.5
            </div>
            <div className="text-sm text-gray-600 mt-1">Neuestes KI-Modell</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-digitaltag-violet">
              100+ Formate
            </div>
            <div className="text-sm text-gray-600 mt-1">PDF, Word, Excel & mehr</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-digitaltag-cyan">
              Web-Scraping
            </div>
            <div className="text-sm text-gray-600 mt-1">Bis zu 500 Seiten</div>
          </div>
        </motion.div>
      </motion.div>
    </section>
  );
}
