// src/app/[locale]/instructor/courses/new/page.tsx
import { getTranslations } from "next-intl/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/[locale]/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/db/prisma";
import { redirect } from "next/navigation";
import { Metadata } from "next";
import CourseFormInstructor from "@/components/course/CourseFormInstructor";
import { CheckCircle } from "lucide-react";

type Props = {
  params: { locale: string };
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = params;
  const t = await getTranslations({ locale, namespace: "instructor" });

  return {
    title: t("new_course_title") || "ایجاد دوره جدید",
    description: t("new_course_desc") || "مدرس عزیز، دوره جدید خود را ایجاد کنید",
  };
}

export default async function NewCourseByInstructor({ params }: Props) {
  const { locale } = params;
  const t = await getTranslations({ locale, namespace: "instructor" });

  const session = await getServerSession(authOptions);

  if (!session || !session.user.roles?.includes("INSTRUCTOR")) {
    redirect("/auth");
  }

  const [categories, tags, currentTerm] = await Promise.all([
    prisma.category.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true, slug: true },
    }),
    prisma.tag.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true, slug: true },
    }),
    prisma.academicTerm.findFirst({ where: { isCurrent: true } }),
  ]);

  if (!currentTerm) {
    return (
      <div className="container mx-auto px-6 py-32 text-center">
        <h1 className="text-6xl font-black text-red-600 mb-8">
          {t("no_current_term") || "ترم جاری تعریف نشده است"}
        </h1>
        <p className="text-2xl text-muted-foreground">
          {t("contact_admin") || "لطفاً با مدیریت تماس بگیرید."}
        </p>
      </div>
    );
  }

  // فیکس نهایی: name ممکنه null باشه → با fallback ایمن
  const instructorName = session.user.name ?? "مدرس گرامی";

  return (
    <div className="container mx-auto px-6 py-32 max-w-7xl">
      {/* هدر لوکس */}
      <div className="text-center mb-20">
        <h1 className="text-6xl md:text-8xl font-black mb-8 bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent leading-tight">
          {t("new_course_title") || "ایجاد دوره جدید"}
        </h1>
        <p className="text-2xl md:text-4xl text-foreground/70 max-w-4xl mx-auto leading-relaxed">
          {t("new_course_welcome", { name: instructorName }) ||
            `استاد ${instructorName} عزیز، دوره شما پس از بررسی توسط تیم ما منتشر خواهد شد`}
        </p>
      </div>

      {/* مراحل فرم */}
      <div className="flex justify-center mb-20">
        <div className="flex flex-wrap justify-center items-center gap-8 text-2xl md:text-3xl">
          {[
            { step: 1, label: t("step_basic") || "اطلاعات پایه" },
            { step: 2, label: t("step_media") || "رسانه" },
            { step: 3, label: t("step_pricing") || "قیمت و تخفیف" },
            { step: 4, label: t("step_content") || "سرفصل و محتوا" },
            { step: 5, label: t("step_preview") || "پیش‌نمایش" },
          ].map((item, i) => (
            <div key={i} className="flex items-center gap-6">
              <div className="w-16 h-16 md:w-20 md:h-20 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white font-black text-3xl md:text-4xl shadow-2xl">
                {item.step}
              </div>
              <span className="font-bold text-foreground hidden sm:block">{item.label}</span>
              {i < 4 && <span className="text-primary text-4xl">→</span>}
            </div>
          ))}
        </div>
      </div>

      {/* فرم اصلی */}
      <div className="bg-card/95 backdrop-blur-2xl rounded-3xl shadow-3xl p-12 lg:p-24 border border-border/50">
        <CourseFormInstructor
          instructorId={session.user.id}
          instructorName={instructorName} // حالا ۱۰۰٪ string هست
          categories={categories}
          tags={tags}
          currentTerm={currentTerm}
        />
      </div>

      {/* نکته نهایی */}
      <div className="text-center mt-20">
        <div className="inline-flex items-center gap-12 bg-gradient-to-r from-emerald-100 to-teal-100 px-24 py-16 rounded-4xl shadow-3xl border border-emerald-200">
          <CheckCircle size={100} className="text-emerald-600" />
          <p className="text-4xl md:text-5xl font-black text-foreground">
            {t("review_note") || "پس از ارسال، دوره شما حداکثر ظرف ۲۴ ساعت بررسی و در صورت تأیید منتشر خواهد شد"}
          </p>
        </div>
      </div>
    </div>
  );
}