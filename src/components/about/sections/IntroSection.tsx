"use client";

import { motion } from "framer-motion";
import { fadeInUp } from "@/components/animations/aboutVariants";

type IntroProps = {
  isRTL: boolean;
  translations: {
    intro_title: string;
    intro_desc: string;
    intro_p1: string;
    intro_p2: string;
    intro_p3: string;
    intro_p4: string;
  };
};

export default function IntroSection({ translations }: IntroProps) {
  return (
    <motion.section
      variants={fadeInUp}
      initial="initial"
      whileInView="animate"
      viewport={{ once: true }}
      transition={{ duration: 0.8 }}
      className="text-center mb-32 px-4"
    >
      <h2 className="text-4xl sm:text-5xl md:text-6xl font-black mb-12 bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
        {translations.intro_title}
      </h2>
      <p className="text-xl md:text-2xl text-foreground/80 max-w-4xl mx-auto mb-16 leading-relaxed">
        {translations.intro_desc}
      </p>
      <div className="max-w-4xl mx-auto space-y-8 text-lg md:text-xl text-foreground/70 leading-relaxed">
        <p>{translations.intro_p1}</p>
        <p>{translations.intro_p2}</p>
        <p>{translations.intro_p3}</p>
        <p className="font-bold text-foreground text-2xl">{translations.intro_p4}</p>
      </div>
    </motion.section>
  );
}