// src/app/instructor/page.tsx
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/app/[locale]/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/db/prisma";
import Link from "next/link";
import Image from "next/image";
import {
  BookOpen,
  DollarSign,
  TrendingUp,
  Clock,
  Users,
  Award,
  Download,
  Plus,
} from "lucide-react";
import { format } from "date-fns-jalali";

export default async function InstructorDashboard() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "INSTRUCTOR") redirect("/auth");

  const instructorId = session.user.id;

  // آمار کلی
  const [courses, totalRevenue, thisMonthRevenue, totalStudents, pendingCourses] = await Promise.all([
    prisma.course.findMany({
      where: { instructorId },
      include: {
        _count: { select: { buyers: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.payment.aggregate({
      where: { course: { instructorId }, status: "PAID" },
      _sum: { amount: true },
    }),
    prisma.payment.aggregate({
      where: {
        course: { instructorId },
        status: "PAID",
        createdAt: { gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) },
      },
      _sum: { amount: true },
    }),
    prisma.enrollment.count({
      where: { course: { instructorId, status: "PUBLISHED" } },
    }),
    prisma.course.count({ where: { instructorId, status: "PENDING_REVIEW" } }),
  ]);

  const publishedCourses = courses.filter((c) => c.status === "PUBLISHED").length;
  const totalEarnings = totalRevenue._sum.amount || 0;
  const monthlyEarnings = thisMonthRevenue._sum.amount || 0;

  // درآمد هر دوره (از enrollments یا payments)
  const courseRevenues = await prisma.payment.groupBy({
    by: ["courseId"],
    where: { course: { instructorId }, status: "PAID" },
    _sum: { amount: true },
  });

  const courseRevenueMap = new Map(courseRevenues.map((r) => [r.courseId, r._sum.amount || 0]));

  return (
    <div className="container mx-auto px-6 py-32 max-w-7xl">
      {/* هدر لوکس */}
      <div className="text-center mb-20">
        <div className="inline-flex items-center justify-center w-56 h-56 rounded-full bg-gradient-to-br from-primary to-secondary p-3 shadow-4xl mb-12">
          <Image
            src={session.user.image || "/avatar.jpg"}
            alt={session.user.name || "استاد"}
            width={224}
            height={224}
            className="rounded-full ring-8 ring-white/60"
          />
        </div>
        <h1 className="text-9xl font-black bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent mb-6">
          خوش آمدید، استاد {session.user.name}
        </h1>
        <p className="text-5xl font-bold text-foreground/70">پنل مدیریت دوره‌ها و درآمد شما</p>
      </div>

      {/* کارت‌های آمار اصلی */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-12 mb-20">
        <div className="group relative overflow-hidden rounded-4xl bg-card/90 backdrop-blur-2xl shadow-3xl border-4 border-primary/20 hover:border-primary transition-all hover:scale-105">
          <div className="p-16 text-center">
            <BookOpen size={100} className="mx-auto mb-8 text-primary" />
            <p className="text-4xl font-black text-foreground mb-6">کل دوره‌ها</p>
            <p className="text-9xl font-black text-primary">{courses.length}</p>
          </div>
        </div>

        <div className="group relative overflow-hidden rounded-4xl bg-card/90 backdrop-blur-2xl shadow-3xl border-4 border-success/20 hover:border-success transition-all hover:scale-105">
          <div className="p-16 text-center">
            <Award size={100} className="mx-auto mb-8 text-success" />
            <p className="text-4xl font-black text-foreground mb-6">منتشر شده</p>
            <p className="text-9xl font-black text-success">{publishedCourses}</p>
          </div>
        </div>

        <div className="group relative overflow-hidden rounded-4xl bg-card/90 backdrop-blur-2xl shadow-3xl border-4 border-orange-500/20 hover:border-orange-500 transition-all hover:scale-105">
          <div className="p-16 text-center">
            <Clock size={100} className="mx-auto mb-8 text-orange-600" />
            <p className="text-4xl font-black text-foreground mb-6">در انتظار تأیید</p>
            <p className="text-9xl font-black text-orange-600">{pendingCourses}</p>
          </div>
        </div>

        <div className="group relative overflow-hidden rounded-4xl bg-card/90 backdrop-blur-2xl shadow-3xl border-4 border-cyan-500/20 hover:border-cyan-500 transition-all hover:scale-105">
          <div className="p-16 text-center">
            <Users size={100} className="mx-auto mb-8 text-cyan-600" />
            <p className="text-4xl font-black text-foreground mb-6">تعداد دانشجو</p>
            <p className="text-8xl font-black text-cyan-600">{totalStudents}</p>
          </div>
        </div>

        <div className="group relative overflow-hidden rounded-4xl bg-card/90 backdrop-blur-2xl shadow-3xl border-4 border-rose-500/20 hover:border-rose-500 transition-all hover:scale-105">
          <div className="p-16 text-center">
            <TrendingUp size={100} className="mx-auto mb-8 text-rose-600" />
            <p className="text-4xl font-black text-foreground mb-6">درآمد کل</p>
            <p className="text-7xl font-black text-rose-600">{totalEarnings.toLocaleString("fa-IR")}</p>
            <p className="text-4xl text-muted-foreground mt-4">تومان</p>
          </div>
        </div>
      </div>

      {/* دکمه‌های سریع */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-12 mb-20">
        <Link
          href="/instructor/courses/new"
          className="bg-gradient-to-r from-emerald-500 to-teal-600 text-white px-32 py-20 rounded-4xl text-6xl font-black text-center hover:scale-110 transition-all shadow-5xl flex items-center justify-center gap-12"
        >
          <Plus size={100} />
          ایجاد دوره جدید
        </Link>
        <Link
          href="/instructor/students"
          className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-32 py-20 rounded-4xl text-6xl font-black text-center hover:scale-110 transition-all shadow-5xl flex items-center justify-center gap-12"
        >
          <Users size={100} />
          دانشجویان من
        </Link>
        <Link
          href="/instructor/withdraw"
          className="bg-gradient-to-r from-orange-600 to-red-600 text-white px-32 py-20 rounded-4xl text-6xl font-black text-center hover:scale-110 transition-all shadow-5xl flex items-center justify-center gap-12"
        >
          <Download size={100} />
          برداشت درآمد
        </Link>
      </div>

      {/* لیست دوره‌ها */}
      <div>
        <h2 className="text-8xl font-black text-center mb-20 bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
          دوره‌های شما
        </h2>
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-16">
          {courses.map((course) => {
            const courseRevenue = courseRevenueMap.get(course.id) || 0;

            return (
              <div
                key={course.id}
                className="group bg-card/90 backdrop-blur-3xl rounded-4xl shadow-4xl overflow-hidden hover:shadow-5xl transition-all hover:-translate-y-12 border-4 border-border/30 hover:border-primary"
              >
                <div className="relative h-80">
                  <Image
                    src={course.image || "/placeholder.jpg"}
                    alt={course.title}
                    fill
                    className="object-cover group-hover:scale-110 transition-transform"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
                  <div className="absolute bottom-12 left-12 right-12 text-white">
                    <h3 className="text-5xl font-black mb-4 line-clamp-2">{course.title}</h3>
                    {course.code && <p className="text-3xl opacity-90">کد: {course.code}</p>}
                  </div>
                  {course.status === "PENDING_REVIEW" && (
                    <div className="absolute top-12 right-12 bg-orange-600 text-white px-12 py-6 rounded-full text-4xl font-black animate-pulse shadow-3xl">
                      در انتظار تأیید
                    </div>
                  )}
                </div>
                <div className="p-16 space-y-10">
                  <div className="grid grid-cols-2 gap-8 text-center">
                    <div className="bg-gradient-to-br from-primary/10 to-secondary/10 rounded-3xl p-10">
                      <Users size={60} className="mx-auto text-primary mb-6" />
                      <p className="text-6xl font-black">{course._count.buyers}</p>
                      <p className="text-3xl text-muted-foreground">دانشجو</p>
                    </div>
                    <div className="bg-gradient-to-br from-success/10 to-emerald-600/10 rounded-3xl p-10">
                      <DollarSign size={60} className="mx-auto text-success mb-6" />
                      <p className="text-5xl font-black">{courseRevenue.toLocaleString("fa-IR")}</p>
                      <p className="text-3xl text-muted-foreground">تومان</p>
                    </div>
                  </div>
                  <div className="flex gap-8">
                    <Link
                      href={`/courses/${course.id}`}
                      className="flex-1 bg-gradient-to-r from-primary to-secondary text-white py-10 rounded-3xl text-4xl font-black text-center hover:scale-110 transition shadow-3xl"
                    >
                      مشاهده
                    </Link>
                    {course.status === "PUBLISHED" && (
                      <Link
                        href={`/my-courses/${course.id}`}
                        className="flex-1 bg-gradient-to-r from-emerald-600 to-teal-600 text-white py-10 rounded-3xl text-4xl font-black text-center hover:scale-110 transition shadow-3xl"
                      >
                        ورود به کلاس
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}