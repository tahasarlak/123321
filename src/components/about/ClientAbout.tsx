"use client";

import CTASection from "./sections/CTASection";
import HeroSection from "./sections/HeroSection";
import IntroSection from "./sections/IntroSection";
import StorySection from "./sections/StorySection";
import ValuesSection from "./sections/ValuesSection";



type Translations = {
  hero_title: string;
  hero_subtitle: string;
  intro_title: string;
  intro_desc: string;
  intro_p1: string;
  intro_p2: string;
  intro_p3: string;
  intro_p4: string;
  story_title: string;
  story_p1: string;
  story_quote: string;
  story_p2: string;
  story_p3: string;
  values_title: string;
  values: Record<string, { title: string; desc: string }>;
  team_title: string;
  team_desc: string;
  cta_button: string;
};

type ClientAboutProps = {
  locale: string;
  translations: Translations;
};

export default function ClientAbout({ locale, translations }: ClientAboutProps) {
  const isRTL = locale === "fa";

  return (
    <div className="container mx-auto px-4  max-w-7xl">
      <HeroSection isRTL={isRTL} translations={translations} />
      <IntroSection isRTL={isRTL} translations={translations} />
      <StorySection isRTL={isRTL} translations={translations} />
      <ValuesSection isRTL={isRTL} translations={translations} />
      <CTASection isRTL={isRTL} translations={translations} />
    </div>
  );
}