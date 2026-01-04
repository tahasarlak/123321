import { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import ClientContact from "@/components/Contact/ClientContact";

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "contact" });

  return {
    title: t("hero.title"),
    description: t("hero.subtitle"),
    openGraph: {
      title: t("hero.title"),
      description: t("hero.subtitle"),
      url: `https://rom.ir/${locale}/contact`,
      images: ["/contact/hero-bg.webp"],
    },
    alternates: {
      canonical: "/contact",
      languages: {
        fa: "/fa/contact",
        en: "/en/contact",
        ru: "/ru/contact",
      },
    },
  };
}

export default async function ContactPage({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "contact" });

  const translations = {
    hero: {
      title: t("hero.title"),
      subtitle: t("hero.subtitle"),
    },
    form: {
      title: t("form.title"),
      description: t("form.description"),
      name_label: t("form.name_label"),
      name_placeholder: t("form.name_placeholder"),
      email_label: t("form.email_label"),
      email_placeholder: t("form.email_placeholder"),
      subject_label: t("form.subject_label"),
      subject_placeholder: t("form.subject_placeholder"),
      message_label: t("form.message_label"),
      message_placeholder: t("form.message_placeholder"),
      submit: t("form.submit"),
      sending: t("form.sending"),
      sent: t("form.sent"),
      success: t("form.success"),
      error_generic: t("form.error_generic"),
      error_network: t("form.error_network"),
    },
    info: {
      title: t("info.title"),
      phone: { title: t("info.phone.title"), number: t("info.phone.number"), hours: t("info.phone.hours") },
      email: { title: t("info.email.title"), address: t("info.email.address") },
      address: { title: t("info.address.title"), text: t("info.address.text") },
      online: { title: t("info.online.title"), hours: t("info.online.hours"), link: t("info.online.link"), link_text: t("info.online.link_text") },
    },
  };

  const contactInfo = [
    { icon: "Phone" as const, titleKey: "info.phone.title", mainKey: "info.phone.number", subKey: "info.phone.hours", dir: "ltr" as const },
    { icon: "Mail" as const, titleKey: "info.email.title", mainKey: "info.email.address", dir: "ltr" as const },
    { icon: "MapPin" as const, titleKey: "info.address.title", mainKey: "info.address.text" },
    { icon: "MessageCircle" as const, titleKey: "info.online.title", subKey: "info.online.hours", linkKey: "info.online.link", linkTextKey: "info.online.link_text" },
  ];

  return (
    <ClientContact locale={locale} translations={translations} contactInfo={contactInfo} />
  );
}