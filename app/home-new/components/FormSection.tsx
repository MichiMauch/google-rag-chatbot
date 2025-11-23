"use client";

import { motion } from "framer-motion";
import WizardForm from "@/components/WizardForm";

export default function FormSection() {
  return (
    <section className="py-20 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <h2 className="text-4xl md:text-5xl font-bold mb-4 text-digitaltag-navy">
            Chat konfigurieren
          </h2>
          <p className="text-xl text-gray-700 max-w-2xl mx-auto">
            Erstelle deinen eigenen KI-Chat in wenigen Schritten
          </p>
        </motion.div>

        {/* Glass Form Container */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, delay: 0.2 }}
          className="relative"
        >
          {/* Card */}
          <div className="relative bg-white border border-gray-200 rounded-3xl shadow-xl p-8 md:p-12">
            {/* Form Content */}
            <div className="relative z-10">
              <WizardForm />
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
