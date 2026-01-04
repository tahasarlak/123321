"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import { fadeInUp } from "@/components/animations/aboutVariants";

type HeroProps = {
  isRTL: boolean;
  translations: { hero_title: string; hero_subtitle: string };
};

export default function HeroSection({ translations }: HeroProps) {
  return (
    <motion.section
      variants={fadeInUp}
      initial="initial"
      whileInView="animate"
      viewport={{ once: true }}
      transition={{ duration: 1.2, ease: "easeOut" }}
      className="relative overflow-hidden min-h-screen flex items-center justify-center text-center rounded-b-3xl"
      aria-labelledby="hero-title"
    >
      {/* Background Image */}
      <Image
        src="/about/hero-bg.webp" 
        alt="" 
        fill
        sizes="100vw"
        className="object-cover object-center"
        priority 
        quality={95}
      />

      <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-black/50 to-black/90 pointer-events-none" />

      <div className="absolute inset-0 bg-gradient-to-tr from-primary/30 via-transparent to-secondary/25 pointer-events-none" />

      {/* Content */}
      <div className="relative z-10 px-6 py-24 max-w-5xl mx-auto">
        <h1
          id="hero-title"
          className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-black mb-10 bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent drop-shadow-2xl leading-tight"
        >
          {translations.hero_title}
        </h1>

        <p
          className="text-lg sm:text-xl md:text-2xl lg:text-3xl text-foreground/90 max-w-4xl mx-auto leading-relaxed drop-shadow-xl"
          dangerouslySetInnerHTML={{ __html: translations.hero_subtitle }}
        />
      </div>
    </motion.section>
  );
}