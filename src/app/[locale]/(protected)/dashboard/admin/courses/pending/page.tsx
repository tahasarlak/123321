// src/app/[locale]/(protected)/dashboard/admin/courses/pending/page.tsx
import { Suspense } from "react";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/[locale]/api/auth/[...nextauth]/route";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db/prisma";
import Link from "next/link";
import Image from "next/image";
import { revalidatePath } from "next/cache";
import {
  CheckCircle,
  XCircle,
  Eye,
  User,
  Clock,
  Tag,
  Calendar,
} from "lucide-react";
import { getTranslations } from "next-intl/server";

export const metadata = {
  title: "دوره‌های در انتظار تأیید | روم آکادمی",
  description: "بررسی و تأیید یا رد دوره‌های ارسالی اساتید",
};

async function PendingCoursesContent() {
  const session = await getServerSession(authOptions);
  const userRoles: string[] = (session?.user?.roles || []) as string[];

  const hasAdminAccess = userRoles.includes("ADMIN") || userRoles.includes("SUPER_ADMIN");

  if (!session || !hasAdminAccess) {
    redirect("/auth");
  }

  const t = await getTranslations("admin.courses");

  const pending = await prisma.course.findMany({
    where: { status: "PENDING_REVIEW" },
    include: {
      instructor: { select: { id: true, name: true, image: true, email: true } },
      tags: true,
      term: true,
    },
    orderBy: { createdAt: "desc" },
  });

  async function approveCourse(id: string) {
    "use server";

    const course = await prisma.course.findUnique({
      where: { id },
      select: { instructorId: true, title: true },
    });

    if (!course?.instructorId) return;

    await prisma.course.update({
      where: { id },
      data: { status: "PUBLISHED" },
    });

    await prisma.notification.create({
      data: {
        userId: course.instructorId,
        title: "دوره شما منتشر شد!",
        message: `دوره "${course.title}" با موفقیت تأیید و منتشر گردید.`,
        type: "SUCCESS",
      },
    });

    revalidatePath("/admin/courses/pending");
    revalidatePath("/admin/courses");
  }

  async function rejectCourse(formData: FormData) {
    "use server";

    const id = formData.get("id") as string;
    const reason = (formData.get("reason") as string)?.trim() || "مشخص نشده";

    const course = await prisma.course.findUnique({
      where: { id },
      select: { instructorId: true, title: true },
    });

    if (!course?.instructorId) return;

    await prisma.course.update({
      where: { id },
      data: { status: "REJECTED", rejectReason: reason },
    });

    await prisma.notification.create({
      data: {
        userId: course.instructorId,
        title: "دوره شما رد شد",
        message: `دوره "${course.title}" رد شد. دلیل: ${reason}`,
        type: "ERROR",
      },
    });

    revalidatePath("/admin/courses/pending");
    revalidatePath("/admin/courses");
  }

  if (pending.length === 0) {
    return (
      <div className="container mx-auto px-6 py-32 text-center">
        <div className="max-w-2xl mx-auto">
          <CheckCircle className="w-32 h-32 text-green-600 mx-auto mb-8" />
          <h1 className="text-6xl font-black text-foreground mb-8">
            {t("noPendingCourses") || "هیچ دوره‌ای در انتظار تأیید نیست"}
          </h1>
          <p className="text-3xl text-muted-foreground mb-12">
            همه دوره‌های ارسالی بررسی شده‌اند.
          </p>
          <Link
            href="/dashboard/admin/courses"
            className="inline-block bg-primary text-white px-16 py-8 rounded-3xl text-3xl font-black hover:scale-105 transition-all shadow-2xl"
          >
            بازگشت به مدیریت دوره‌ها
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-6 py-20 max-w-7xl space-y-20">
      {/* عنوان */}
      <div className="text-center">
        <h1 className="text-7xl md:text-9xl font-black bg-gradient-to-r from-orange-500 via-red-600 to-rose-600 bg-clip-text text-transparent mb-8">
          دوره‌های در انتظار تأیید
        </h1>
        <p className="text-4xl md:text-5xl font-bold text-foreground/70">
          {pending.length} دوره منتظر بررسی شما
        </p>
      </div>

      {/* لیست دوره‌ها */}
      <div className="space-y-20">
        {pending.map((course) => (
          <div
            key={course.id}
            className="bg-card rounded-3xl shadow-3xl overflow-hidden border border-border/50 hover:shadow-4xl transition-all duration-500"
          >
            <div className="grid lg:grid-cols-3 gap-0">
              {/* تصویر دوره */}
              <div className="relative h-96 lg:h-full">
                <Image
                  src={course.image || "/placeholder.jpg"}
                  alt={course.title}
                  fill
                  className="object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />
                <div className="absolute bottom-12 left-12 right-12 text-white">
                  <h3 className="text-5xl md:text-6xl font-black mb-4 line-clamp-2">
                    {course.title}
                  </h3>
                  {course.code && (
                    <p className="text-3xl opacity-90">کد: {course.code}</p>
                  )}
                </div>
                <div className="absolute top-8 right-8 bg-destructive text-white px-8 py-4 rounded-full text-2xl font-black animate-pulse shadow-2xl">
                  در انتظار تأیید
                </div>
              </div>

              {/* جزئیات و اکشن‌ها */}
              <div className="lg:col-span-2 p-12 lg:p-20 space-y-16">
                {/* اطلاعات سریع */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
                  <div className="bg-accent/50 rounded-3xl p-8 text-center">
                    <User size={56} className="mx-auto text-primary mb-4" />
                    <p className="text-3xl font-black text-foreground">{course.instructor.name}</p>
                  </div>
                  <div className="bg-muted/50 rounded-3xl p-8 text-center">
                    <Clock size={56} className="mx-auto text-orange-600 mb-4" />
                    <p className="text-3xl font-black text-foreground">{course.duration || "-"}</p>
                  </div>
                  <div className="bg-accent/50 rounded-3xl p-8 text-center">
                    <Tag size={56} className="mx-auto text-secondary mb-4" />
                    <p className="text-3xl font-black text-foreground">{course.type}</p>
                  </div>
                  <div className="bg-muted/50 rounded-3xl p-8 text-center">
                    <Calendar size={56} className="mx-auto text-teal-600 mb-4" />
                    <p className="text-2xl font-black text-foreground">
                      {new Date(course.createdAt).toLocaleDateString("fa-IR")}
                    </p>
                  </div>
                </div>

                {/* توضیحات دوره */}
                <div className="prose prose-xl max-w-none text-foreground/80">
                  <h3 className="text-4xl md:text-5xl font-black mb-8 text-foreground">
                    توضیحات و سرفصل‌ها
                  </h3>
                  <div
                    className="text-xl leading-relaxed prose-p:my-4 prose-headings:font-bold prose-headings:text-foreground"
                    dangerouslySetInnerHTML={{
                      __html: course.description || "<p>توضیحاتی ثبت نشده است.</p>",
                    }}
                  />
                </div>

                {/* اکشن‌ها */}
                <div className="flex flex-wrap items-center justify-center gap-10 pt-12 border-t border-border/30">
                  <form action={approveCourse.bind(null, course.id)}>
                    <button className="bg-gradient-to-r from-emerald-500 to-teal-600 text-white px-20 py-10 rounded-3xl text-4xl font-black hover:scale-110 transition-all shadow-3xl flex items-center gap-6">
                      <CheckCircle size={56} />
                      تأیید و انتشار
                    </button>
                  </form>

                  <form action={rejectCourse} className="flex flex-col md:flex-row items-center gap-6">
                    <input type="hidden" name="id" value={course.id} />
                    <textarea
                      name="reason"
                      required
                      placeholder="دلیل رد دوره را بنویسید..."
                      className="w-full md:w-96 px-10 py-8 rounded-2xl border-4 border-destructive/50 focus:border-destructive outline-none text-2xl resize-none bg-background"
                      rows={3}
                    />
                    <button className="bg-gradient-to-r from-red-600 to-rose-600 text-white px-16 py-10 rounded-3xl text-4xl font-black hover:scale-110 transition-all shadow-3xl flex items-center gap-6">
                      <XCircle size={56} />
                      رد کردن
                    </button>
                  </form>

                  <Link
                    href={`/courses/${course.id}`}
                    target="_blank"
                    className="bg-gradient-to-r from-gray-700 to-gray-900 text-white px-20 py-10 rounded-3xl text-4xl font-black hover:scale-110 transition-all shadow-3xl flex items-center gap-6"
                  >
                    <Eye size={56} />
                    مشاهده دوره
                  </Link>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function PendingCoursesPage() {
  return (
    <div className="min-h-screen bg-background">
      <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><div className="text-4xl">در حال بارگذاری...</div></div>}>
        <PendingCoursesContent />
      </Suspense>
    </div>
  );
}