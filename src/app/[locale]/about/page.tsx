import { getTranslations } from "next-intl/server";
import { Metadata } from "next";
import ClientAbout from "@/components/about/ClientAbout";

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata(props: Props): Promise<Metadata> {
  const params = await props.params;
  const { locale } = params;
  const t = await getTranslations({ locale, namespace: "about" });

  const heroSubtitle = t("hero_subtitle");

  return {
    title: t("hero_title"),
    description: heroSubtitle.replace(/<[^>]*>/g, ""),
    openGraph: {
      title: t("hero_title"),
      description: heroSubtitle.replace(/<[^>]*>/g, ""),
      url: `https://rom.ir/${locale}/about`,
      images: ["/about/hero-bg.webp"],
    },
    alternates: {
      canonical: "/about",
      languages: {
        fa: "/fa/about",
        en: "/en/about",
        ru: "/ru/about",
      },
    },
  };
}

export default async function AboutPage(props: Props) {
  const params = await props.params;
  const { locale } = params;
  const t = await getTranslations({ locale, namespace: "about" });

  const translations = {
    hero_title: t("hero_title"),
    hero_subtitle: t.raw("hero_subtitle"), // raw برای HTML
    intro_title: t("intro_title"),
    intro_desc: t("intro_desc"),
    intro_p1: t("intro_p1"),
    intro_p2: t("intro_p2"),
    intro_p3: t("intro_p3"),
    intro_p4: t("intro_p4"),
    story_title: t("story_title"),
    story_p1: t("story_p1"),
    story_quote: t.raw("story_quote"),
    story_p2: t.raw("story_p2"), // اگر rich نیاز داری، اینجا rich بذار
    story_p3: t("story_p3"),
    values_title: t("values_title"),
    values: {
      quality: { title: t("values.quality.title"), desc: t("values.quality.desc") },
      global: { title: t("values.global.title"), desc: t("values.global.desc") },
      love: { title: t("values.love.title"), desc: t("values.love.desc") },
      innovation: { title: t("values.innovation.title"), desc: t("values.innovation.desc") },
      focus: { title: t("values.focus.title"), desc: t("values.focus.desc") },
      speed: { title: t("values.speed.title"), desc: t("values.speed.desc") },
    },
    team_title: t("team_title"),
    team_desc: t.raw("team_desc"),
    cta_button: t("cta_button"),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "EducationalOrganization",
            name: "روم آکادمی",
            description: t("hero_subtitle").replace(/<[^>]*>/g, ""),
            url: "https://rom.ir",
            logo: "/logo.png",
            sameAs: [
              "https://instagram.com/romacademy",
              "https://youtube.com/@romacademy",
            ],
          }),
        }}
      />
      <ClientAbout locale={locale} translations={translations} />
    </>
  );
}