// src/app/[locale]/(protected)/dashboard/my-courses/page.tsx

import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/app/[locale]/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/db/prisma";
import Link from "next/link";
import Image from "next/image";
import { BookOpen, Clock, PlayCircle, Award } from "lucide-react";

export default async function MyCoursesPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/auth");

  const userId = session.user.id as string;

  const purchasedCourses = await prisma.course.findMany({
    where: {
      buyers: { some: { id: userId } },
      status: "PUBLISHED",
    },
    include: {
      instructor: { select: { name: true, image: true } },
      lessons: {
        orderBy: { order: "asc" },
        include: { completions: { where: { userId } } },
      },
      sessions: {  // ← تغییر از classSessions به sessions
        where: { type: "LIVE_CLASS", meetLink: { not: null } },
        select: { meetLink: true },
        orderBy: { startTime: "asc" },
        take: 1,
      },
      _count: { select: { lessons: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="container mx-auto px-6 py-32 max-w-7xl">
      {/* هدر */}
      <div className="text-center mb-20">
        <h1 className="text-9xl font-black bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent mb-6">
          دوره‌های من
        </h1>
        <p className="text-5xl font-bold text-foreground/70">
          {purchasedCourses.length > 0
            ? `شما ${purchasedCourses.length} دوره فعال دارید`
            : "هنوز دوره‌ای خریداری نکردید"}
        </p>
      </div>

      {purchasedCourses.length === 0 ? (
        <div className="text-center py-32 bg-card/80 backdrop-blur rounded-4xl shadow-3xl border border-border/50">
          <BookOpen size={120} className="mx-auto mb-12 text-muted-foreground" />
          <p className="text-6xl font-black text-muted-foreground mb-8">دوره‌ای پیدا نشد!</p>
          <Link
            href="/courses"
            className="inline-block bg-gradient-to-r from-primary to-secondary text-white px-20 py-12 rounded-3xl text-5xl font-black hover:scale-110 transition shadow-3xl"
          >
            برو به فروشگاه دوره‌ها
          </Link>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-12">
          {purchasedCourses.map((course) => {
            const completed = course.lessons.filter((l) => l.completions.length > 0).length;
            const progress = course._count.lessons > 0 ? Math.round((completed / course._count.lessons) * 100) : 0;
            const hasLiveLink = course.sessions.length > 0 && course.sessions[0].meetLink; // ← تغییر اینجا

            return (
              <div
                key={course.id}
                className="group relative bg-card/90 backdrop-blur-3xl rounded-4xl shadow-3xl overflow-hidden hover:shadow-4xl transition-all hover:-translate-y-6 border border-border/50"
              >
                <div className="relative h-80">
                  <Image
                    src={course.image || "/placeholder.jpg"}
                    alt={course.title}
                    fill
                    className="object-cover group-hover:scale-110 transition-transform duration-700"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />
                  {/* پیشرفت */}
                  <div className="absolute bottom-8 left-8 right-8">
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-4xl font-black text-white">{progress}% تکمیل</span>
                      {progress === 100 && <Award size={56} className="text-yellow-400 animate-bounce" />}
                    </div>
                    <div className="w-full bg-white/20 rounded-full h-12 overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 transition-all duration-1000"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>
                </div>

                <div className="p-10">
                  <h3 className="text-5xl font-black mb-6 line-clamp-2 group-hover:text-primary transition">
                    {course.title}
                  </h3>

                  <div className="flex items-center gap-6 mb-8">
                    <Image
                      src={course.instructor.image || "/avatar.jpg"}
                      alt={course.instructor.name}
                      width={80}
                      height={80}
                      className="rounded-full ring-4 ring-primary/20"
                    />
                    <div>
                      <p className="text-3xl font-bold text-foreground">{course.instructor.name}</p>
                      <p className="text-xl text-muted-foreground">مدرس دوره</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-3xl mb-8">
                    <div className="flex items-center gap-4">
                      <PlayCircle size={40} className="text-primary" />
                      <span>{course.lessons.length} درس</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <Clock size={40} className="text-success" />
                      <span>{course.duration || "?"} ساعت</span>
                    </div>
                  </div>

                  {/* دکمه اصلی */}
                  {hasLiveLink ? (
                    <Link
                      href={`/class/${course.sessions[0].meetLink}`} // ← تغییر اینجا
                      className="block text-center bg-gradient-to-r from-red-600 to-rose-600 text-white py-10 rounded-3xl text-5xl font-black hover:scale-105 transition shadow-2xl"
                    >
                      ورود به کلاس زنده
                    </Link>
                  ) : (
                    <Link
                      href={`/my-courses/${course.id}`}
                      className="block text-center bg-gradient-to-r from-primary to-secondary text-white py-10 rounded-3xl text-5xl font-black hover:scale-105 transition shadow-2xl"
                    >
                      {progress === 0 ? "شروع یادگیری" : progress === 100 ? "مرور مجدد" : "ادامه یادگیری"}
                    </Link>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}