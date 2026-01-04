"use client";

import { motion } from "framer-motion";
import { Shield, Globe, Heart, Star, Target, Zap } from "lucide-react";
import { ValueCard } from "@/components/about/ui/ValueCard";
import { staggerContainer, fadeInUp } from "@/components/animations/aboutVariants";

type ValuesProps = {
  isRTL: boolean;
  translations: {
    values_title: string;
    values: Record<string, { title: string; desc: string }>;
  };
};

export default function ValuesSection({ translations }: ValuesProps) {
  const values = [
    { icon: Shield, ...translations.values.quality },
    { icon: Globe, ...translations.values.global },
    { icon: Heart, ...translations.values.love },
    { icon: Star, ...translations.values.innovation },
    { icon: Target, ...translations.values.focus },
    { icon: Zap, ...translations.values.speed },
  ];

  return (
    <section className="mb-32 px-4">
      <motion.h2
        variants={fadeInUp}
        initial="initial"
        whileInView="animate"
        viewport={{ once: true }}
        className="text-4xl sm:text-5xl md:text-6xl font-black text-center mb-20 bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent"
      >
        {translations.values_title}
      </motion.h2>
      <motion.div
        variants={staggerContainer}
        initial="initial"
        whileInView="animate"
        viewport={{ once: true }}
        className="grid sm:grid-cols-2 lg:grid-cols-3 gap-10 max-w-7xl mx-auto"
      >
        {values.map((value, i) => (
          <ValueCard key={i} icon={value.icon} title={value.title} desc={value.desc} index={i} />
        ))}
      </motion.div>
    </section>
  );
}