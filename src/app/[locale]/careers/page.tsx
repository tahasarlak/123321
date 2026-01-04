  import { getTranslations } from "next-intl/server";
  import { Metadata } from "next";
  import ClientCareers from "@/components/Careers/ClientCareers";

  type Props = {
    params: Promise<{ locale: string }>;
  };

  export async function generateMetadata(props: Props): Promise<Metadata> {
    const params = await props.params;
    const { locale } = params;
    const t = await getTranslations({ locale, namespace: "careers" });

    return {
      title: t("hero_title"),
      description: t("hero_desc").replace(/<[^>]*>/g, ""),
      openGraph: {
        title: t("hero_title"),
        description: t("hero_desc").replace(/<[^>]*>/g, ""),
        url: `https://rom.ir/${locale}/careers`,
        images: ["/careers/hero-bg.webp"],
      },
      alternates: {
        canonical: "/careers",
        languages: {
          fa: "/fa/careers",
          en: "/en/careers",
          ru: "/ru/careers",
        },
      },
    };
  }

  export default async function CareersPage(props: Props) {
    const params = await props.params;
    const { locale } = params;
    const t = await getTranslations({ locale, namespace: "careers" });

    const translations = {
      hero_title: t("hero_title"),
      hero_desc: t.raw("hero_desc"),
      hero_button: t("hero_button"),
      culture_title: t("culture_title"),
      culture_items: t.raw("culture_items") as Array<{ title: string; desc: string }>,
      benefits_title: t("benefits_title"),
      benefits: t.raw("benefits") as Array<{ title: string; desc: string }>,
      positions_title: t("positions_title"),
      positions_apply_button: t("positions_apply_button"),
      positions: (t.raw("positions") as Array<{ title: string; level: string; type: string; location: string }>) || [],
      cta_title: t("cta_title"),
      cta_desc: t.raw("cta_desc"),
      cta_form_button: t("cta_form_button"),
    };

    const applyFormUrl = "https://your-real-form.link"; // لینک واقعی فرم گوگل یا Typeform

    return (
      <ClientCareers locale={locale} translations={translations} applyFormUrl={applyFormUrl} />
    );
  }