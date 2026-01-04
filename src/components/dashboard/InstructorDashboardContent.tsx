"use client";

import Link from "next/link";
import { BookOpen, Users, TrendingUp, PlusCircle, Clock, ArrowRight } from "lucide-react";
import { useTranslations, useLocale } from "next-intl";
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import type { Session } from "next-auth";

type InstructorData = {
  coursesCount: number;
  studentsCount: number;
  totalRevenue: number;
  pendingCourses: number;
};

type InstructorDashboardContentProps = {
  session: Session;
};

export default function InstructorDashboardContent({
  session,
}: InstructorDashboardContentProps) {
  const t = useTranslations("dashboard");
  const locale = useLocale();
  const [data, setData] = useState<InstructorData>({
    coursesCount: 0,
    studentsCount: 0,
    totalRevenue: 0,
    pendingCourses: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      if (!session?.user?.id) {
        setLoading(false);
        return;
      }

      try {
        const res = await fetch("/api/dashboard/instructor");
        if (res.ok) {
          const json = await res.json();
          setData(json);
        }
      } catch (err) {
        console.error("خطا در بارگذاری داشبورد مدرس:", err);
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
          {t("instructor.greeting").replace("{name}", session?.user?.name || "مدرس")}
        </h1>
        <p className="text-5xl font-bold text-foreground/70">
          {t("instructor.panel")}
        </p>
      </div>

      {/* کارت‌های آماری */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-12 mb-20">
        <div className="group rounded-4xl bg-card/90 backdrop-blur-2xl shadow-3xl border-4 border-emerald-500/20 hover:border-emerald-500 p-12 text-center transition-all">
          <BookOpen
            size={80}
            className="mx-auto mb-8 text-emerald-600 group-hover:scale-110 transition-transform"
          />
          <p className="text-4xl font-black mb-4">{t("instructor.myCourses")}</p>
          <p className="text-8xl font-black text-emerald-600">
            {data.coursesCount.toLocaleString(numberLocale)}
          </p>
        </div>

        <div className="group rounded-4xl bg-card/90 backdrop-blur-2xl shadow-3xl border-4 border-teal-500/20 hover:border-teal-500 p-12 text-center transition-all">
          <Users
            size={80}
            className="mx-auto mb-8 text-teal-600 group-hover:scale-110 transition-transform"
          />
          <p className="text-4xl font-black mb-4">{t("instructor.students")}</p>
          <p className="text-8xl font-black text-teal-600">
            {data.studentsCount.toLocaleString(numberLocale)}
          </p>
        </div>

        <div className="group rounded-4xl bg-card/90 backdrop-blur-2xl shadow-3xl border-4 border-orange-500/20 hover:border-orange-500 p-12 text-center transition-all">
          <TrendingUp
            size={80}
            className="mx-auto mb-8 text-orange-600 group-hover:scale-110 transition-transform"
          />
          <p className="text-4xl font-black mb-4">{t("instructor.totalRevenue")}</p>
          <p className="text-7xl font-black text-orange-600">
            {data.totalRevenue.toLocaleString(numberLocale)} {t("common.toman")}
          </p>
        </div>

        {data.pendingCourses > 0 && (
          <div className="group rounded-4xl bg-card/90 backdrop-blur-2xl shadow-3xl border-4 border-red-500/20 hover:border-red-500 p-12 text-center transition-all">
            <Clock
              size={80}
              className="mx-auto mb-8 text-red-600 group-hover:scale-110 transition-transform"
            />
            <p className="text-4xl font-black mb-4">{t("instructor.pendingReview")}</p>
            <p className="text-8xl font-black text-red-600">
              {data.pendingCourses.toLocaleString(numberLocale)}
            </p>
          </div>
        )}
      </div>

      {/* لینک‌های دسترسی سریع */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-12">
        <Link
          href="/dashboard/instructor/courses"
          className="flex flex-col items-center justify-center p-12 rounded-4xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-2xl hover:shadow-3xl transition-all hover:scale-105 group"
        >
          <BookOpen size={80} className="group-hover:scale-110 transition-transform" />
          <span className="mt-6 text-4xl font-bold">{t("instructor.myCoursesLink")}</span>
          <ArrowRight
            size={40}
            className="mt-4 opacity-0 group-hover:opacity-100 translate-x-[-20px] group-hover:translate-x-0 transition-all"
          />
        </Link>

        <Link
          href="/dashboard/instructor/create-course"
          className="flex flex-col items-center justify-center p-12 rounded-4xl bg-gradient-to-r from-teal-600 to-cyan-600 text-white shadow-2xl hover:shadow-3xl transition-all hover:scale-105 group"
        >
          <PlusCircle size={80} className="group-hover:scale-110 transition-transform" />
          <span className="mt-6 text-4xl font-bold">{t("instructor.createCourse")}</span>
          <ArrowRight
            size={40}
            className="mt-4 opacity-0 group-hover:opacity-100 translate-x-[-20px] group-hover:translate-x-0 transition-all"
          />
        </Link>

        <Link
          href="/dashboard/instructor/analytics"
          className="flex flex-col items-center justify-center p-12 rounded-4xl bg-gradient-to-r from-orange-600 to-red-600 text-white shadow-2xl hover:shadow-3xl transition-all hover:scale-105 group"
        >
          <TrendingUp size={80} className="group-hover:scale-110 transition-transform" />
          <span className="mt-6 text-4xl font-bold">{t("instructor.analytics")}</span>
          <ArrowRight
            size={40}
            className="mt-4 opacity-0 group-hover:opacity-100 translate-x-[-20px] group-hover:translate-x-0 transition-all"
          />
        </Link>

        <Link
          href="/dashboard/instructor/students"
          className="flex flex-col items-center justify-center p-12 rounded-4xl bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-2xl hover:shadow-3xl transition-all hover:scale-105 group"
        >
          <Users size={80} className="group-hover:scale-110 transition-transform" />
          <span className="mt-6 text-4xl font-bold">{t("instructor.myStudents")}</span>
          <ArrowRight
            size={40}
            className="mt-4 opacity-0 group-hover:opacity-100 translate-x-[-20px] group-hover:translate-x-0 transition-all"
          />
        </Link>
      </div>
    </div>
  );
}