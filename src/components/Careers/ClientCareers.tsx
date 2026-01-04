"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import {
  Heart,
  Zap,
  Globe,
  Users,
  Coffee,
  Calendar,
  DollarSign,
  Trophy,
  ArrowRight,
  MessageCircle,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils/cn";

type Translations = {
  hero_title: string;
  hero_desc: string;
  hero_button: string;
  culture_title: string;
  culture_items: Array<{ title: string; desc: string }>;
  benefits_title: string;
  benefits: Array<{ title: string; desc: string }>;
  positions_apply_button: string;
  cta_title: string;
  cta_desc: string;
  cta_form_button: string;
};

type ClientCareersProps = {
  locale: string;
  translations: Translations;
  applyFormUrl: string;
};

export default function ClientCareers({ locale, translations: t, applyFormUrl }: ClientCareersProps) {
  const isRTL = locale === "fa";

  const benefitIcons = [Heart, Zap, Globe, Users, Coffee, Calendar, DollarSign, Trophy];

  return (
    <div className="container mx-auto px-6  max-w-7xl">
<section className="relative overflow-hidden rounded-3xl mb-32 min-h-[80vh] flex items-center justify-center text-center">
  {/* Background Image */}
  <Image
    src="/careers/hero-bg.webp" 
    alt=""
    fill
    sizes="100vw"
    className="object-cover object-center"
    priority 
    quality={95}
  
  />

  <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-black/50 to-black/90 pointer-events-none" />

  <div className="absolute inset-0 bg-gradient-to-tr from-primary/30 via-transparent to-secondary/25 pointer-events-none" />

  <div className="relative z-10 px-6 py-20 max-w-5xl mx-auto">
    <motion.h1
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 1 }}
      className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-black mb-10 bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent drop-shadow-2xl leading-tight"
    >
      {t.hero_title}
    </motion.h1>

    <motion.p
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      transition={{ delay: 0.3 }}
      className="text-xl md:text-3xl text-foreground/90 max-w-4xl mx-auto mb-12 leading-relaxed drop-shadow-lg"
      dangerouslySetInnerHTML={{ __html: t.hero_desc }}
    />

    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.6 }}
    >
      <Button asChild size="lg" className="text-2xl px-16 py-8 font-bold group shadow-2xl hover:shadow-3xl hover:scale-105 transition-all">
        <Link href={applyFormUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-4">
          {t.positions_apply_button}
          <ArrowRight
            className={cn(
              "size-9 transition-transform duration-500 group-hover:translate-x-4",
              isRTL && "rotate-180 group-hover:-translate-x-4"
            )}
          />
        </Link>
      </Button>
    </motion.div>
  </div>
</section>

      {/* Culture Section + Apply Button */}
      <section className="mb-32">
        <motion.h2
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-4xl md:text-6xl font-black text-center mb-20 bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent"
        >
          {t.culture_title}
        </motion.h2>

        <div className="grid md:grid-cols-3 gap-10 mb-16">
          {t.culture_items.map((item, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.2 }}
              whileHover={{ y: -10, scale: 1.03 }}
            >
              <Card className="h-full p-10 text-center rounded-3xl shadow-2xl hover:shadow-3xl transition-all bg-gradient-to-br from-primary/5 to-secondary/5">
                <CardTitle className="text-3xl mb-6">{item.title}</CardTitle>
                <CardDescription className="text-lg leading-relaxed">{item.desc}</CardDescription>
              </Card>
            </motion.div>
          ))}
        </div>

        <div className="text-center">
          <Button asChild size="lg" className="text-2xl px-16 py-8 group">
            <Link href={applyFormUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-4">
              {t.positions_apply_button}
              <ArrowRight className={cn("size-9 group-hover:translate-x-4 transition-transform", isRTL && "rotate-180 group-hover:-translate-x-4")} />
            </Link>
          </Button>
        </div>
      </section>

      {/* Benefits Section + Apply Button */}
      <section className="mb-32">
        <motion.h2
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-4xl md:text-6xl font-black text-center mb-20"
        >
          {t.benefits_title}
        </motion.h2>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-10 mb-16">
          {t.benefits.map((benefit, i) => {
            const Icon = benefitIcons[i % benefitIcons.length];
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                whileHover={{ scale: 1.05, y: -8 }}
              >
                <Card className="text-center h-full rounded-3xl shadow-xl hover:shadow-2xl transition-all bg-card/95 backdrop-blur-xl border border-primary/10">
                  <CardContent className="p-10">
                    <div className="w-20 h-20 bg-gradient-to-br from-primary to-secondary rounded-3xl mx-auto mb-8 flex items-center justify-center shadow-lg">
                      <Icon className="size-10 text-white" aria-hidden="true" />
                    </div>
                    <CardTitle className="text-2xl mb-4">{benefit.title}</CardTitle>
                    <CardDescription className="text-lg">{benefit.desc}</CardDescription>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>

        <div className="text-center">
          <Button asChild size="lg" className="text-2xl px-16 py-8 group">
            <Link href={applyFormUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-4">
              {t.positions_apply_button}
              <ArrowRight className={cn("size-9 group-hover:translate-x-4 transition-transform", isRTL && "rotate-180 group-hover:-translate-x-4")} />
            </Link>
          </Button>
        </div>
      </section>

      {/* Final CTA */}
      <section className="relative overflow-hidden rounded-3xl">
        <div className="bg-gradient-to-br from-primary via-secondary to-pink-600 text-white p-16 lg:p-28 text-center shadow-3xl">
          <motion.h2
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="text-4xl md:text-6xl font-black mb-10 drop-shadow-2xl"
          >
            {t.cta_title}
          </motion.h2>
          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="text-xl md:text-2xl mb-12 max-w-4xl mx-auto opacity-90 leading-relaxed drop-shadow-lg"
            dangerouslySetInnerHTML={{ __html: t.cta_desc }}
          />
          <div className="flex flex-col sm:flex-row gap-8 justify-center items-center">
            <Button asChild size="lg" className="bg-white text-primary hover:bg-white/90 text-2xl px-16 py-9 font-black shadow-2xl hover:shadow-3xl hover:scale-105 group">
              <Link href={applyFormUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-4">
                {t.positions_apply_button}
                <ArrowRight
                  className={cn(
                    "size-9 transition-transform duration-500 group-hover:translate-x-6",
                    isRTL && "rotate-180 group-hover:-translate-x-6"
                  )}
                />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="border-white/60 text-white hover:bg-white/20 text-2xl px-16 py-9">
              <Link href="/contact" className="flex items-center gap-4">
                {t.cta_form_button}
                <MessageCircle className={cn("size-9 transition-transform duration-300 hover:rotate-12", isRTL && "mr-4")} />
              </Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}