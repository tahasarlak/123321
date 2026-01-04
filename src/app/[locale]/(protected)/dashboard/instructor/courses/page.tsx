// src/app/(protected)/instructor/courses/page.tsx
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/[locale]/api/auth/[...nextauth]/route";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db/prisma";
import Link from "next/link";
import Image from "next/image";
import {
  Search,
  Users,
  DollarSign,
  Eye,
  Edit,
  Clock,
  Plus,
  Lock,
  Calendar,
} from "lucide-react";

export default async function InstructorCoursesPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect("/auth");
  }

  const userId = session.user.id;
  const userRoles = session.user.roles as string[] | undefined;

  // فقط استاد یا ادمین اجازه دسترسی دارند (ادمین هم می‌تونه ببینه اگر بخواد)
  const isInstructor = userRoles?.includes("INSTRUCTOR");
  const isAdmin = userRoles?.includes("ADMIN") || userRoles?.includes("SUPERADMIN");

  if (!isInstructor && !isAdmin) {
    redirect("/courses");
  }

  const params = await searchParams;
  const search = (params.search as string) || "";

  // فقط دوره‌های این استاد (یا همه اگر ادمین باشد — اما اینجا فقط برای استاد)
  const where: any = {
    instructorId: userId,
  };

  if (search) {
    where.OR = [
      { title: { contains: search, mode: "insensitive" } },
      { code: { contains: search, mode: "insensitive" } },
      { tags: { some: { name: { contains: search, mode: "insensitive" } } } },
    ];
  }

  const courses = await prisma.course.findMany({
    where,
    include: {
      instructor: { select: { name: true, image: true } },
      createdBy: { select: { name: true } },
      tags: true,
      term: true,
      _count: { select: { buyers: true, enrollments: true, reviews: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  // آمار کلی فقط برای دوره‌های این استاد
  const totalStudents = courses.reduce((sum, c) => sum + c._count.buyers, 0);
  const totalRevenue = courses.reduce(
    (sum, c) => sum + ((c.price as any)?.IRR || 0) * c._count.buyers,
    0
  );
  const draftCount = courses.filter((c) => c.status === "DRAFT").length;

  return (
    <div className="container mx-auto px-6 py-20 max-w-7xl space-y-24">
      {/* هدر + خوش‌آمدگویی */}
      <div className="text-center">
        <h1 className="text-7xl md:text-9xl font-black bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent mb-12 animate-gradient">
          دوره‌های من
        </h1>
        <p className="text-3xl md:text-4xl font-bold text-foreground/70 mb-16">
          سلام {session.user.name} عزیز 👋
        </p>

        {/* آمار کلی */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 max-w-6xl mx-auto">
          <div className="bg-card/95 backdrop-blur-xl rounded-3xl shadow-3xl p-12 border border-border/50">
            <p className="text-3xl font-bold text-foreground/70">تعداد دوره‌ها</p>
            <p className="text-7xl font-black text-primary mt-8">
              {courses.length.toLocaleString("fa-IR")}
            </p>
          </div>
          <div className="bg-gradient-to-br from-blue-500 to-indigo-600 text-white rounded-3xl shadow-3xl p-12">
            <p className="text-3xl font-bold">کل دانشجویان</p>
            <p className="text-7xl font-black mt-8">
              {totalStudents.toLocaleString("fa-IR")}
            </p>
          </div>
          <div className="bg-gradient-to-br from-emerald-500 to-teal-600 text-white rounded-3xl shadow-3xl p-12">
            <p className="text-3xl font-bold">درآمد کل</p>
            <p className="text-6xl font-black mt-8">
              {totalRevenue.toLocaleString("fa-IR")}
              <span className="text-4xl ml-4">تومان</span>
            </p>
          </div>
          <div className="bg-gradient-to-br from-purple-500 to-pink-600 text-white rounded-3xl shadow-3xl p-12">
            <p className="text-3xl font-bold">پیش‌نویس</p>
            <p className="text-7xl font-black mt-8">
              {draftCount.toLocaleString("fa-IR")}
            </p>
          </div>
        </div>
      </div>

      {/* جستجو و ایجاد جدید */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-12">
        <div className="relative w-full md:w-96">
          <Search className="absolute right-8 top-1/2 -translate-y-1/2 h-10 w-10 text-primary" />
          <input
            name="search"
            type="text"
            defaultValue={search}
            placeholder="جستجو در دوره‌های من..."
            className="w-full pr-24 pl-8 py-8 rounded-2xl border-4 border-border focus:border-primary outline-none text-2xl font-medium transition-all bg-background"
          />
        </div>

        <Link
          href="/courses/new"
          className="bg-gradient-to-r from-emerald-500 to-teal-600 text-white px-20 py-10 rounded-3xl text-4xl font-black hover:scale-110 transition-all shadow-3xl flex items-center gap-6"
        >
          <Plus size={56} />
          ایجاد دوره جدید
        </Link>
      </div>

      {/* لیست دوره‌ها */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-12">
        {courses.length === 0 ? (
          <div className="col-span-full text-center py-32">
            <p className="text-5xl font-bold text-muted-foreground mb-12">
              هنوز دوره‌ای ایجاد نکرده‌اید
            </p>
            <Link
              href="/courses/new"
              className="inline-flex items-center gap-6 bg-primary text-white px-16 py-8 rounded-3xl text-3xl font-bold hover:scale-105 transition-all"
            >
              <Plus size={48} />
              اولین دوره خود را ایجاد کنید
            </Link>
          </div>
        ) : (
          courses.map((course) => {
            const revenue = ((course.price as any)?.IRR || 0) * course._count.buyers;
            const isLocked = course.isLocked;

            return (
              <div
                key={course.id}
                className={`bg-card rounded-3xl shadow-2xl overflow-hidden transition-all duration-500 border-4 ${
                  isLocked
                    ? "border-red-500/50 opacity-90"
                    : "border-border/50 hover:shadow-3xl hover:-translate-y-4"
                }`}
              >
                <div className="relative h-80">
                  <Image
                    src={course.image || "/placeholder.jpg"}
                    alt={course.title}
                    fill
                    className="object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

                  {/* وضعیت قفل */}
                  {isLocked && (
                    <div className="absolute top-8 left-8 bg-red-600 text-white px-8 py-4 rounded-full text-2xl font-black flex items-center gap-4 shadow-2xl">
                      <Lock size={32} />
                      قفل شده
                    </div>
                  )}

                  {/* وضعیت انتشار */}
                  {course.status === "DRAFT" && (
                    <div className="absolute top-8 right-8 bg-orange-500 text-white px-8 py-4 rounded-full text-xl font-bold">
                      پیش‌نویس
                    </div>
                  )}

                  <div className="absolute bottom-0 left-0 right-0 p-10 text-white">
                    <h3 className="text-4xl font-black line-clamp-2">{course.title}</h3>
                    {course.code && <p className="text-2xl opacity-90 mt-2">کد: {course.code}</p>}
                  </div>
                </div>

                <div className="p-10 space-y-8">
                  {/* ایجاد شده توسط */}
                  {course.createdBy && course.createdBy.name !== course.instructor.name && (
                    <p className="text-lg text-muted-foreground text-center">
                      ایجاد شده توسط: <strong>{course.createdBy.name}</strong>
                    </p>
                  )}

                  <div className="grid grid-cols-2 gap-6">
                    <div className="bg-accent/50 rounded-2xl p-6 text-center">
                      <Users size={40} className="mx-auto text-primary mb-3" />
                      <p className="text-4xl font-black">{course._count.buyers}</p>
                      <p className="text-lg text-muted-foreground">دانشجو</p>
                    </div>
                    <div className="bg-success/10 rounded-2xl p-6 text-center">
                      <DollarSign size={40} className="mx-auto text-success mb-3" />
                      <p className="text-3xl font-black text-success">
                        {revenue.toLocaleString("fa-IR")}
                      </p>
                      <p className="text-lg text-muted-foreground">تومان</p>
                    </div>
                  </div>

                  {/* اکشن‌ها */}
                  <div className="flex justify-center gap-10 pt-6 border-t border-border/30">
                    <Link
                      href={`/courses/${course.slug}`}
                      target="_blank"
                      className="text-secondary hover:scale-125 transition"
                      title="مشاهده دوره"
                    >
                      <Eye size={48} />
                    </Link>

                    {!isLocked && (
                      <Link
                        href={`/courses/${course.slug}/edit`}
                        className="text-primary hover:scale-125 transition"
                        title="ویرایش دوره"
                      >
                        <Edit size={48} />
                      </Link>
                    )}

                    {isLocked && (
                      <div className="text-red-600" title="این دوره قفل شده و قابل ویرایش نیست">
                        <Lock size={48} />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}