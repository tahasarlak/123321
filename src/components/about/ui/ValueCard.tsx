"use client";

import { motion } from "framer-motion";
import { LucideIcon } from "lucide-react";
import { fadeInUp } from "@/components/animations/aboutVariants";
import { cn } from "@/lib/utils/cn";

type ValueCardProps = {
  icon: LucideIcon;
  title: string;
  desc: string;
  index: number;
};

export function ValueCard({ icon: Icon, title, desc }: ValueCardProps) {
  return (
    <motion.div
      variants={fadeInUp}
      whileHover={{ scale: 1.05, y: -10 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className={cn(
        "group relative p-8 rounded-3xl bg-gradient-to-br from-primary/5 via-transparent to-secondary/5",
        "border border-primary/10 backdrop-blur-sm shadow-xl hover:shadow-2xl",
        "transition-all duration-500 overflow-hidden"
      )}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-primary/0 to-secondary/0 group-hover:from-primary/10 group-hover:to-secondary/10 transition-all duration-500" />
      <Icon
        className="size-16 mb-6 text-primary group-hover:scale-110 transition-transform duration-500"
        aria-hidden="true"
      />
      <h3 className="text-2xl font-bold mb-4 text-foreground">{title}</h3>
      <p className="text-foreground/80 leading-relaxed">{desc}</p>
    </motion.div>
  );
}