"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { Button } from "@/components/ui/button"; // اگر shadcn داری
import { ArrowLeft, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { scaleIn } from "@/components/animations/aboutVariants";

type CTAProps = {
  isRTL: boolean;
  translations: {
    team_title: string;
    team_desc: string;
    cta_button: string;
  };
};

export default function CTASection({ isRTL, translations }: CTAProps) {
  const Arrow = isRTL ? ArrowLeft : ArrowRight;

  return (
    <motion.section
      variants={scaleIn}
      initial="initial"
      whileInView="animate"
      viewport={{ once: true }}
      transition={{ duration: 1 }}
      className="text-center px-4 mb-32"
    >
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary to-secondary p-12 lg:p-24 shadow-3xl">
        <div className="absolute inset-0 bg-black/20" /> {/* overlay برای خوانایی */}
        <div className="relative z-10">
          <h2 className="text-4xl sm:text-5xl md:text-6xl font-black mb-10 text-white drop-shadow-2xl">
            {translations.team_title}
          </h2>
          <p
            className="text-xl md:text-2xl text-white/90 mb-16 max-w-5xl mx-auto leading-relaxed drop-shadow-lg"
            dangerouslySetInnerHTML={{ __html: translations.team_desc }}
          />
          <motion.div
            initial={{ y: 40, opacity: 0 }}
            whileInView={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.4 }}
          >
            <Button
              asChild
              size="lg"
              className="bg-white text-primary hover:bg-white/90 text-2xl px-20 py-10 font-black rounded-2xl shadow-2xl hover:shadow-3xl hover:scale-110 transition-all duration-500 group"
            >
              <Link href="/careers">
                {translations.cta_button}
                <Arrow
                  className={cn(
                    "size-10 ml-4 transition-transform duration-500 group-hover:translate-x-6",
                    isRTL && "mr-4 ml-0 rotate-180 group-hover:-translate-x-6"
                  )}
                />
              </Link>
            </Button>
          </motion.div>
        </div>
      </div>
    </motion.section>
  );
}