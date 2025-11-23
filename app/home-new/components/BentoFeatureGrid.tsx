"use client";

import { motion } from "framer-motion";
import { Search, Database, Globe, Sparkles, Zap, Shield } from "lucide-react";

const features = [
  {
    icon: Search,
    title: "Semantische Suche",
    description: "Intelligente Suche durch deine Dokumente mit Gemini File Search API",
    gradient: "from-digitaltag-navy/10 to-digitaltag-violet/10",
    iconColor: "text-digitaltag-navy",
    span: "md:col-span-2",
  },
  {
    icon: Database,
    title: "Automatisches Chunking",
    description: "Deine Dokumente werden automatisch intelligent aufbereitet und indexiert",
    gradient: "from-digitaltag-violet/10 to-digitaltag-cyan/10",
    iconColor: "text-digitaltag-violet",
    span: "md:col-span-1",
  },
  {
    icon: Globe,
    title: "Website-Scraping",
    description: "Scrappe bis zu 500 URLs einer Website mit automatischer Sitemap-Erkennung",
    gradient: "from-digitaltag-cyan/10 to-digitaltag-navy/10",
    iconColor: "text-digitaltag-cyan",
    span: "md:col-span-1",
  },
  {
    icon: Sparkles,
    title: "KI-gestützte Antworten",
    description: "Präzise Antworten basierend auf deinen Dokumenten mit Google Gemini 2.5 Flash",
    gradient: "from-digitaltag-navy/10 to-digitaltag-violet/10",
    iconColor: "text-digitaltag-violet",
    span: "md:col-span-2",
  },
  {
    icon: Zap,
    title: "Blitzschnell",
    description: "Antworten in Sekunden dank optimierter Indexierung und Caching",
    gradient: "from-digitaltag-violet/10 to-digitaltag-cyan/10",
    iconColor: "text-digitaltag-navy",
    span: "md:col-span-1",
  },
  {
    icon: Shield,
    title: "100+ Formate",
    description: "PDF, DOC, TXT, CSV, JSON, Markdown und über 100 weitere Dateiformate",
    gradient: "from-digitaltag-cyan/10 to-digitaltag-navy/10",
    iconColor: "text-digitaltag-cyan",
    span: "md:col-span-2",
  },
];

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: {
    opacity: 1,
    y: 0,
  },
};

export default function BentoFeatureGrid() {
  return (
    <section className="py-20 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-5xl font-bold mb-4 text-digitaltag-navy">
            Leistungsstarke Features
          </h2>
          <p className="text-xl text-gray-700 max-w-2xl mx-auto">
            Alles was du brauchst, um deine Dokumente intelligent zu nutzen
          </p>
        </motion.div>

        {/* Bento Grid */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-100px" }}
          className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6"
        >
          {features.map((feature, index) => (
            <motion.div
              key={index}
              variants={itemVariants}
              className={`${feature.span} group`}
            >
              <div
                className={`h-full p-6 md:p-8 rounded-2xl border border-white/20 backdrop-blur-sm bg-gradient-to-br ${feature.gradient} hover:shadow-2xl hover:shadow-accent-purple/10 transition-all duration-300 hover:-translate-y-1`}
              >
                {/* Icon */}
                <div className="mb-6">
                  <div className={`inline-flex p-3 rounded-xl bg-white/60 backdrop-blur-sm ${feature.iconColor} group-hover:scale-110 transition-transform duration-300`}>
                    <feature.icon className="w-6 h-6" />
                  </div>
                </div>

                {/* Content */}
                <h3 className="text-xl md:text-2xl font-bold text-gray-900 mb-3">
                  {feature.title}
                </h3>
                <p className="text-gray-600 leading-relaxed">
                  {feature.description}
                </p>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
