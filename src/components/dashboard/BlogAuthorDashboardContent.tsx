"use client";

import Link from "next/link";
import {
  FileText,
  Edit,
  BarChart,
  Clipboard,
  ArrowRight,
} from "lucide-react";
import { useTranslations, useLocale } from "next-intl";
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import type { Session } from "next-auth";

type BlogAuthorData = {
  publishedCount: number;
  draftsCount: number;
  totalViews: number;
};

type BlogAuthorDashboardContentProps = {
  session: Session;
};

export default function BlogAuthorDashboardContent({
  session,
}: BlogAuthorDashboardContentProps) {
  const t = useTranslations("dashboard");
  const locale = useLocale();
  const [data, setData] = useState<BlogAuthorData>({
    publishedCount: 0,
    draftsCount: 0,
    totalViews: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      if (!session?.user?.id) {
        setLoading(false);
        return;
      }
      try {
        const res = await fetch("/api/dashboard/blog-author");
        if (res.ok) {
          const json = await res.json();
          setData(json);
        }
      } catch (err) {
        console.error("خطا در بارگذاری داده‌های داشبورد وبلاگ:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [session]);

  if (loading) {
    return (
      <div className="container mx-auto px-6 py-32 text-center">
        <p className="text-3xl font-bold">{t("common.loading")}</p>
      </div>
    );
  }

  const numberLocale = locale === "fa" ? "fa-IR" : "en-US";

  return (
    <div
      className="container mx-auto px-6 py-32 max-w-7xl"
      dir={locale === "fa" ? "rtl" : "ltr"}
    >
      {/* خوش‌آمدگویی */}
      <div className="text-center mb-32">
        <h1 className="text-8xl md:text-9xl font-black bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent mb-6">
          {t("blogAuthor.greeting").replace(
            "{name}",
            session?.user?.name || "نویسنده"
          )}
        </h1>
        <p className="text-5xl font-bold text-foreground/70">
          {t("blogAuthor.panel")}
        </p>
      </div>

      {/* کارت‌های آمار */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-12 mb-20">
        <div className="group rounded-4xl bg-card/90 backdrop-blur-2xl shadow-3xl border-4 border-purple-500/20 hover:border-purple-500 p-12 text-center transition-all">
          <FileText
            size={80}
            className="mx-auto mb-8 text-purple-600 group-hover:scale-110 transition-transform"
          />
          <p className="text-4xl font-black mb-4">
            {t("blogAuthor.publishedPosts")}
          </p>
          <p className="text-8xl font-black text-purple-600">
            {data.publishedCount.toLocaleString(numberLocale)}
          </p>
        </div>

        <div className="group rounded-4xl bg-card/90 backdrop-blur-2xl shadow-3xl border-4 border-indigo-500/20 hover:border-indigo-500 p-12 text-center transition-all">
          <Clipboard
            size={80}
            className="mx-auto mb-8 text-indigo-600 group-hover:scale-110 transition-transform"
          />
          <p className="text-4xl font-black mb-4">{t("blogAuthor.drafts")}</p>
          <p className="text-8xl font-black text-indigo-600">
            {data.draftsCount.toLocaleString(numberLocale)}
          </p>
        </div>

        <div className="group rounded-4xl bg-card/90 backdrop-blur-2xl shadow-3xl border-4 border-blue-500/20 hover:border-blue-500 p-12 text-center transition-all">
          <BarChart
            size={80}
            className="mx-auto mb-8 text-blue-600 group-hover:scale-110 transition-transform"
          />
          <p className="text-4xl font-black mb-4">
            {t("blogAuthor.totalViews")}
          </p>
          <p className="text-7xl font-black text-blue-600">
            {data.totalViews.toLocaleString(numberLocale)}
          </p>
        </div>
      </div>

      {/* لینک‌های سریع */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-12">
        <Link
          href="/dashboard/blog/posts"
          className="flex flex-col items-center justify-center p-12 rounded-4xl bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-2xl hover:shadow-3xl transition-all hover:scale-105 group"
        >
          <FileText size={80} className="group-hover:scale-110 transition-transform" />
          <span className="mt-6 text-4xl font-bold">
            {t("blogAuthor.myPosts")}
          </span>
          <ArrowRight
            size={40}
            className="mt-4 opacity-0 group-hover:opacity-100 translate-x-[-20px] group-hover:translate-x-0 transition-all"
          />
        </Link>

        <Link
          href="/dashboard/blog/create"
          className="flex flex-col items-center justify-center p-12 rounded-4xl bg-gradient-to-r from-indigo-600 to-blue-600 text-white shadow-2xl hover:shadow-3xl transition-all hover:scale-105 group"
        >
          <Edit size={80} className="group-hover:scale-110 transition-transform" />
          <span className="mt-6 text-4xl font-bold">
            {t("blogAuthor.createPost")}
          </span>
          <ArrowRight
            size={40}
            className="mt-4 opacity-0 group-hover:opacity-100 translate-x-[-20px] group-hover:translate-x-0 transition-all"
          />
        </Link>

        <Link
          href="/dashboard/blog/analytics"
          className="flex flex-col items-center justify-center p-12 rounded-4xl bg-gradient-to-r from-blue-600 to-cyan-600 text-white shadow-2xl hover:shadow-3xl transition-all hover:scale-105 group"
        >
          <BarChart size={80} className="group-hover:scale-110 transition-transform" />
          <span className="mt-6 text-4xl font-bold">
            {t("blogAuthor.analytics")}
          </span>
          <ArrowRight
            size={40}
            className="mt-4 opacity-0 group-hover:opacity-100 translate-x-[-20px] group-hover:translate-x-0 transition-all"
          />
        </Link>

        <Link
          href="/dashboard/blog/drafts"
          className="flex flex-col items-center justify-center p-12 rounded-4xl bg-gradient-to-r from-cyan-600 to-teal-600 text-white shadow-2xl hover:shadow-3xl transition-all hover:scale-105 group"
        >
          <Clipboard size={80} className="group-hover:scale-110 transition-transform" />
          <span className="mt-6 text-4xl font-bold">
            {t("blogAuthor.myDrafts")}
          </span>
          <ArrowRight
            size={40}
            className="mt-4 opacity-0 group-hover:opacity-100 translate-x-[-20px] group-hover:translate-x-0 transition-all"
          />
        </Link>
      </div>
    </div>
  );
}