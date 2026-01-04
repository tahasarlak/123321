"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import { fadeInUp } from "@/components/animations/aboutVariants";
import { cn } from "@/lib/utils/cn";

type StoryProps = {
  isRTL: boolean;
  translations: {
    story_title: string;
    story_p1: string;
    story_quote: string;
    story_p2: string; 
    story_p3: string;
  };
};

export default function StorySection({ isRTL, translations }: StoryProps) {
  return (
    <motion.section
      variants={fadeInUp}
      initial="initial"
      whileInView="animate"
      viewport={{ once: true }}
      className={cn("grid lg:grid-cols-2 gap-16 lg:gap-32 items-center mb-32", isRTL && "lg:grid-flow-dense")}
    >
      <div className={cn("space-y-10", isRTL ? "lg:order-2" : "lg:order-1")}>
        <h2 className="text-4xl sm:text-5xl md:text-6xl font-black bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
          {translations.story_title}
        </h2>
        <div className="space-y-8 text-lg md:text-xl text-foreground/80 leading-relaxed">
          <p>{translations.story_p1}</p>
          <blockquote className="text-2xl md:text-3xl font-bold text-primary italic py-12 px-10 bg-gradient-to-br from-primary/10 to-secondary/10 rounded-3xl border-l-8 border-primary rtl:border-r-8 rtl:border-l-0 shadow-2xl">
            <div dangerouslySetInnerHTML={{ __html: translations.story_quote }} />
          </blockquote>
          <p dangerouslySetInnerHTML={{ __html: translations.story_p2 }} />
          <p>{translations.story_p3}</p>
        </div>
      </div>
      <div className={cn("relative", isRTL ? "lg:order-1" : "lg:order-2")}>
        <Image
          src="/about/story-image.webp" 
          alt={translations.story_title}
          width={1200}
          height={800}
          sizes="(max-width: 1024px) 100vw, 50vw"
          className="rounded-3xl shadow-3xl object-cover w-full h-auto"
          loading="lazy"
          placeholder="blur"
          blurDataURL="data:image/webp;base64,..." 
        />
      </div>
    </motion.section>
  );
}