// src/components/layout/Footer.tsx
"use client";

import { useTranslations, useLocale } from "next-intl";
import Link from "next/link";
import { useEffect } from "react";
import { useActionState } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils/cn";
import { subscribeNewsletter } from "@/actions/public/newsletter";
import {
  Facebook,
  Instagram,
  Youtube,
  Twitter,
  Linkedin,
  Mail,
  Phone,
  MapPin,
  Heart,
  Sparkles,
  Shield,
  Truck,
  HeadphonesIcon,
  Award,
  ArrowUp,
  Send,
  BookOpen,
  Calendar,
  PlayCircle,
  Tag,
  Lock,
  FileText,
  HelpCircle,
  Globe,
} from "lucide-react";

type State = { success: boolean; message: string } | null;

function NewsletterForm() {
  const t = useTranslations("footer");
  const [state, formAction, pending] = useActionState<State, FormData>(
    subscribeNewsletter,
    null
  );

  useEffect(() => {
    if (!state) return; // early return داخل useEffect مشکلی نداره

    if (state.success) {
      toast.success(state.message);
    } else if (state.message) {
      toast.error(state.message);
    }
  }, [state]);

  return (
    <form action={formAction} className="max-w-4xl mx-auto flex flex-col md:flex-row gap-6">
      <input type="text" name="honeypot" className="hidden" tabIndex={-1} autoComplete="off" />
      <input
        type="email"
        name="email"
        required
        placeholder={t("newsletterPlaceholder")}
        disabled={pending}
        className="flex-1 px-8 py-6 rounded-2xl bg-card/80 backdrop-blur-xl text-foreground text-lg font-medium placeholder-muted-foreground focus:outline-none focus:ring-4 focus:ring-primary/50 shadow-2xl border border-border disabled:opacity-70"
        aria-label="Email for newsletter"
      />
      <button
        disabled={pending}
        className={cn(
          "bg-gradient-to-r from-primary to-secondary text-white px-12 py-6 rounded-2xl text-2xl font-black hover:scale-105 transition-all shadow-2xl flex items-center gap-4 justify-center disabled:opacity-70 disabled:scale-100"
        )}
      >
        <Send className="w-8 h-8" />
        {pending ? "..." : t("newsletterButton")}
      </button>
    </form>
  );
}

export default function Footer() {
  const t = useTranslations("footer");
  const locale = useLocale();
  const isRTL = locale === "fa";

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const quickLinks = [
    { href: "/courses?type=LIVE", key: "liveCourses", icon: Sparkles },
    { href: "/courses?type=RECORDED", key: "recordedCourses", icon: PlayCircle },
    { href: "/courses?status=upcoming", key: "presaleCourses", icon: Calendar },
    { href: "/instructors", key: "instructors", icon: Award },
    { href: "/products?discount=true", key: "specialOffers", icon: Tag },
    { href: "/blog", key: "blog", icon: BookOpen },
  ];

  const supportLinks = [
    { href: "/support", key: "support24h", icon: HeadphonesIcon },
    { href: "/faq", key: "faq", icon: HelpCircle },
    { href: "/shipping", key: "shipping", icon: Truck },
    { href: "/returns", key: "returns", icon: Shield },
    { href: "/terms", key: "terms", icon: FileText },
    { href: "/privacy", key: "privacy", icon: Lock },
  ];

  const socials = [
    { icon: Instagram, href: "https://instagram.com/romacademy", color: "hover:text-pink-500" },
    { icon: Youtube, href: "https://youtube.com/@romacademy", color: "hover:text-red-500" },
    { icon: Linkedin, href: "https://linkedin.com/company/romacademy", color: "hover:text-blue-600" },
    { icon: Twitter, href: "https://twitter.com/romacademy", color: "hover:text-sky-500" },
    { icon: Facebook, href: "https://facebook.com/romacademy", color: "hover:text-blue-600" },
  ];

  return (
    <footer className="relative bg-gradient-to-b from-background/5 via-card to-muted/50 mt-40 overflow-hidden border-t border-border/20">
      <div className="absolute inset-0 -z-10 overflow-hidden opacity-60">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-secondary/5 to-primary/10 blur-3xl" />
      </div>

      {/* خبرنامه */}
      <div className="relative bg-gradient-to-r from-primary/10 via-secondary/10 to-primary/10 py-24 border-b border-border/20">
        <div className="container mx-auto px-6 text-center">
          <h2 className="text-5xl md:text-7xl font-black mb-8 bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
            {t("newsletterTitle")}
          </h2>
          <p className="text-xl md:text-2xl mb-12 text-foreground/80 font-bold max-w-4xl mx-auto">
            {t("newsletterDesc")}
          </p>
          <NewsletterForm />
          <p className="text-lg mt-8 text-muted-foreground">{t("newsletterStats")}</p>
        </div>
      </div>

      {/* محتوای اصلی */}
      <div className="container mx-auto px-6 py-24">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-16">
          {/* لوگو + درباره */}
          <div className="lg:col-span-4 space-y-12">
            <Link href="/" className="flex items-center gap-6 group">
              <div className="w-20 h-20 bg-gradient-to-br from-primary to-secondary rounded-3xl flex items-center justify-center text-5xl font-black text-white shadow-2xl ring-4 ring-primary/20 group-hover:scale-110 transition-all">
                R
              </div>
              <div>
                <h1 className="text-5xl font-black bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                  روم آکادمی
                </h1>
                <p className="text-lg text-primary font-bold">بزرگ‌ترین پلتفرم دندانپزشکی ایران</p>
              </div>
            </Link>
            <p className="text-lg leading-9 text-muted-foreground">{t("aboutText")}</p>
            <div className="flex gap-6">
              {socials.map((s, i) => (
                <a
                  key={i}
                  href={s.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={cn("p-4 bg-card/80 backdrop-blur-xl rounded-2xl hover:scale-125 transition-all shadow-2xl", s.color)}
                  aria-label="Social link"
                >
                  <s.icon size={28} />
                </a>
              ))}
            </div>
            <div className="flex items-center gap-4 text-primary">
              <Award className="w-12 h-12" />
              <p className="text-2xl font-black">{t("topRank")}</p>
            </div>
          </div>

          {/* دسترسی سریع */}
          <div className="lg:col-span-3">
            <h3 className="text-3xl font-black mb-10 flex items-center gap-4 text-foreground">
              <Sparkles className="w-10 h-10 text-primary" />
              {t("quickLinks")}
            </h3>
            <ul className="space-y-5">
              {quickLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={`/${locale}${link.href}`}
                    className="flex items-center gap-4 text-lg text-muted-foreground hover:text-primary transition group"
                  >
                    <link.icon className="w-6 h-6 text-primary group-hover:scale-125 transition" />
                    <span className={cn("group-hover:translate-x-2 transition", isRTL && "group-hover:-translate-x-2")}>
                      {t(link.key)}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* پشتیبانی */}
          <div className="lg:col-span-3">
            <h3 className="text-3xl font-black mb-10 flex items-center gap-4 text-foreground">
              <Shield className="w-10 h-10 text-primary" />
              {t("support")}
            </h3>
            <ul className="space-y-5">
              {supportLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={`/${locale}${link.href}`}
                    className="flex items-center gap-4 text-lg text-muted-foreground hover:text-primary transition group"
                  >
                    <link.icon className="w-6 h-6 text-primary group-hover:scale-125 transition" />
                    <span className={cn("group-hover:translate-x-2 transition", isRTL && "group-hover:-translate-x-2")}>
                      {t(link.key)}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* تماس با ما */}
          <div className="lg:col-span-2 space-y-10">
            <h3 className="text-3xl font-black mb-10 text-foreground">{t("contactUs")}</h3>
            <div className="space-y-6">
              <div className="flex items-center gap-5 bg-card/60 backdrop-blur-xl rounded-3xl p-5 shadow-xl">
                <div className="p-3 bg-primary/20 rounded-2xl">
                  <Phone className="w-8 h-8 text-primary" />
                </div>
                <div>
                  <p className="font-bold text-foreground">{t("support24h")}</p>
                  <p className="text-primary font-bold">{t("phone")}</p>
                </div>
              </div>
              <div className="flex items-center gap-5 bg-card/60 backdrop-blur-xl rounded-3xl p-5 shadow-xl">
                <div className="p-3 bg-primary/20 rounded-2xl">
                  <Mail className="w-8 h-8 text-primary" />
                </div>
                <p className="text-primary font-bold">{t("email")}</p>
              </div>
              <div className="flex items-center gap-5 bg-card/60 backdrop-blur-xl rounded-3xl p-5 shadow-xl">
                <div className="p-3 bg-primary/20 rounded-2xl">
                  <MapPin className="w-8 h-8 text-primary" />
                </div>
                <p className="text-muted-foreground">{t("address")}</p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-5 mt-12">
              <div className="bg-card/60 backdrop-blur-xl rounded-3xl p-6 text-center hover:scale-110 transition shadow-2xl">
                <Shield className="w-10 h-10 mx-auto text-primary mb-2" />
                <p className="text-sm font-bold text-foreground">{t("securePayment")}</p>
              </div>
              <div className="bg-card/60 backdrop-blur-xl rounded-3xl p-6 text-center hover:scale-110 transition shadow-2xl">
                <Truck className="w-10 h-10 mx-auto text-primary mb-2" />
                <p className="text-sm font-bold text-foreground">{t("freeShipping")}</p>
              </div>
              <div className="bg-card/60 backdrop-blur-xl rounded-3xl p-6 text-center hover:scale-110 transition shadow-2xl">
                <Heart className="w-10 h-10 mx-auto text-primary mb-2 fill-current" />
                <p className="text-sm font-bold text-foreground">{t("loveGuarantee")}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="border-t border-border/20 mt-24 pt-16">
          <div className={cn("flex flex-col md:flex-row justify-between items-center gap-8", isRTL && "md:flex-row-reverse")}>
            <div className="text-center md:text-right">
              <p className="text-xl font-bold text-muted-foreground">{t("copyright")}</p>
              <p className="text-lg text-muted-foreground mt-4 flex items-center gap-3 justify-center md:justify-end">
                <Heart className="w-8 h-8 text-primary fill-current" />
                {t("madeWithLove")}
                <Globe className="w-8 h-8 text-primary mx-2" />
              </p>
            </div>
            <button
              onClick={scrollToTop}
              className="bg-gradient-to-r from-primary to-secondary p-5 rounded-full hover:scale-125 transition-all shadow-2xl hover:shadow-primary/40"
              aria-label="Scroll to top"
            >
              <ArrowUp className="w-10 h-10 text-white" />
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
}