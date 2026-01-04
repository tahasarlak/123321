// src/app/[locale]/courses/page.tsx
import { getTranslations } from "next-intl/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/[locale]/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/db/prisma";
import { Prisma } from "@prisma/client";
import CourseCard from "@/components/course/CourseCard";
import Link from "next/link";
import { Search, Plus, Heart } from "lucide-react";
import { cn } from "@/lib/utils/cn";

type Props = {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

export default async function CoursesPage(props: Props) {
  const t = await getTranslations("course");
  const session = await getServerSession(authOptions);
  const searchParams = await props.searchParams;

  const q = (searchParams.q as string) || "";
  const category = searchParams.category as string | undefined;
  const tag = searchParams.tag as string | undefined;
  const instructor = searchParams.instructor as string | undefined;
  const type = searchParams.type as "LIVE" | "RECORDED" | "HYBRID" | undefined;
  const statusFilter = searchParams.status as "upcoming" | "ongoing" | "ended" | undefined;
  const minPrice = searchParams.minPrice ? Number(searchParams.minPrice) : undefined;
  const maxPrice = searchParams.maxPrice ? Number(searchParams.maxPrice) : undefined;
  const liked = searchParams.liked === "true";
  const sort = (searchParams.sort as "newest" | "bestseller" | "popular") || "newest";

  const now = new Date();

  const where: Prisma.CourseWhereInput = {
    status: "PUBLISHED",
    isVisible: true,
    isSaleEnabled: true,
  };

  if (q) {
    where.OR = [
      { title: { contains: q, mode: "insensitive" } },
      { shortDescription: { contains: q, mode: "insensitive" } },
      { description: { contains: q, mode: "insensitive" } },
    ];
  }
  if (category) where.categories = { some: { slug: category } };
  if (tag) where.tags = { some: { slug: tag } };
  if (instructor) where.instructor = { name: { contains: instructor, mode: "insensitive" } };
  if (type) where.type = type;
  if (statusFilter === "upcoming") where.startDate = { gt: now };
  if (statusFilter === "ongoing") {
    where.startDate = { lte: now };
    where.OR = [{ endDate: null }, { endDate: { gte: now } }];
  }
  if (statusFilter === "ended") where.endDate = { lt: now };
  if (minPrice !== undefined || maxPrice !== undefined) {
    where.price = {
      path: ["IRR"],
      ...(minPrice !== undefined && { gte: minPrice }),
      ...(maxPrice !== undefined && { lte: maxPrice }),
    };
  }
  if (liked && session?.user?.id) where.likes = { some: { userId: session.user.id } };

  const orderBy: Prisma.CourseOrderByWithRelationInput =
    sort === "newest"
      ? { createdAt: "desc" }
      : sort === "bestseller"
      ? { enrollments: { _count: "desc" } }
      : { likes: { _count: "desc" } };

  const [courses, total, categories, popularTags, instructors] = await Promise.all([
    prisma.course.findMany({
      where,
      include: {
        instructor: { select: { id: true, name: true, image: true } },
        categories: true,
        tags: true,
        _count: { select: { enrollments: true, likes: true, reviews: true } },
        likes: session?.user?.id
          ? { where: { userId: session.user.id }, select: { id: true } }
          : false,
      },
      orderBy,
      take: 20,
    }),
    prisma.course.count({ where }),
    prisma.category.findMany({
      where: { courses: { some: { status: "PUBLISHED" } } },
      select: { name: true, slug: true, _count: { select: { courses: true } } },
      orderBy: { name: "asc" },
    }),
    prisma.tag.findMany({
      where: { courses: { some: { status: "PUBLISHED" } } },
      select: { name: true, slug: true, _count: { select: { courses: true } } },
      orderBy: { courses: { _count: "desc" } },
      take: 15,
    }),
    prisma.user.findMany({
      where: { taughtCourses: { some: { status: "PUBLISHED" } } },
      select: { id: true, name: true },
      distinct: ["name"],
      orderBy: { taughtCourses: { _count: "desc" } },
      take: 8,
    }),
  ]);

  const isAdmin = session?.user?.roles?.includes("ADMIN") || session?.user?.roles?.includes("SUPERADMIN");

  const createFilterUrl = (key: string, value?: string) => {
    const newParams = new URLSearchParams(searchParams as any);
    if (value !== undefined) {
      if (newParams.get(key) === value) {
        newParams.delete(key);
      } else {
        newParams.set(key, value);
      }
    } else {
      newParams.delete(key);
    }
    const query = newParams.toString();
    return query ? `/courses?${query}` : "/courses";
  };

  return (
    <div className="container mx-auto px-6 py-32 max-w-7xl">
      <div className="flex justify-between items-center mb-16">
        <h1 className="text-6xl md:text-8xl font-black bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
          {t("courses_title") || "دوره‌های آموزشی"}
        </h1>
        {isAdmin && (
          <Link
            href="/admin/courses/create"
            className="bg-gradient-to-r from-emerald-500 to-teal-600 text-white px-10 py-6 rounded-2xl text-2xl font-black hover:shadow-2xl transition transform hover:scale-105 shadow-2xl flex items-center gap-4"
          >
            <Plus size={32} />
            {t("add_new_course") || "افزودن دوره جدید"}
          </Link>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-12">
        {/* فیلتر سمت چپ */}
        <aside className="bg-card rounded-3xl shadow-2xl p-10 h-fit sticky top-32 border border-border/50">
          <h2 className="text-4xl font-black mb-10 text-foreground">{t("filters") || "فیلترها"}</h2>

          {/* جستجو */}
          <form action="/courses" method="GET" className="mb-10">
            <div className="relative">
              <Search className="absolute right-8 top-1/2 -translate-y-1/2 text-primary" size={32} />
              <input
                name="q"
                defaultValue={q}
                placeholder={t("search_placeholder") || "جستجو در دوره‌ها..."}
                className="w-full pr-20 pl-8 py-8 rounded-2xl border-4 border-border focus:border-primary outline-none text-2xl font-medium bg-background"
              />
            </div>
          </form>

          {/* نوع دوره */}
          <div className="mb-12">
            <h3 className="text-2xl md:text-3xl font-bold mb-6 text-foreground">{t("course_type") || "نوع دوره"}</h3>
            <div className="space-y-4">
              {["LIVE", "RECORDED", "HYBRID"].map((t) => (
                <Link
                  key={t}
                  href={createFilterUrl("type", t)}
                  className={cn("block text-xl", type === t ? "font-black text-primary" : "hover:text-primary")}
                >
                  {t === "LIVE" ? "لایو" : t === "RECORDED" ? "ضبط‌شده" : "ترکیبی"}
                </Link>
              ))}
            </div>
          </div>

          {/* وضعیت دوره */}
          <div className="mb-12">
            <h3 className="text-2xl md:text-3xl font-bold mb-6 text-foreground">{t("status") || "وضعیت"}</h3>
            <div className="space-y-4">
              {["upcoming", "ongoing", "ended"].map((s) => (
                <Link
                  key={s}
                  href={createFilterUrl("status", s)}
                  className={cn("block text-xl", statusFilter === s ? "font-black text-primary" : "hover:text-primary")}
                >
                  {s === "upcoming"
                    ? t("upcoming") || "شروع نشده"
                    : s === "ongoing"
                    ? t("ongoing") || "در حال برگزاری"
                    : t("ended") || "تمام شده"}
                </Link>
              ))}
            </div>
          </div>

          {/* فقط علاقه‌مندی‌ها */}
          {session && (
            <Link
              href={createFilterUrl("liked", liked ? undefined : "true")}
              className={cn(
                "block text-center py-8 px-12 rounded-3xl font-black text-2xl transition-all mt-12",
                liked ? "bg-primary text-white shadow-2xl" : "bg-muted hover:bg-accent"
              )}
            >
              <Heart className="inline-block ml-3" size={36} fill={liked ? "white" : "none"} />
              {t("my_likes") || "فقط علاقه‌مندی‌ها"}
            </Link>
          )}
        </aside>

        {/* لیست دوره‌ها */}
        <div className="lg:col-span-3">
          <div className="flex justify-between items-center mb-16">
            <p className="text-3xl text-muted-foreground">
              <strong className="text-primary">{courses.length.toLocaleString("fa-IR")}</strong> {t("courses_found") || "دوره یافت شد"}
            </p>
          </div>

          {courses.length === 0 ? (
            <div className="text-center py-40 bg-card/80 backdrop-blur rounded-3xl shadow-2xl">
              <p className="text-5xl md:text-6xl text-muted-foreground mb-12">
                {t("no_courses_found") || "دوره‌ای با این فیلتر یافت نشد"}
              </p>
              <Link
                href="/courses"
                className="inline-block px-20 py-10 bg-primary text-white rounded-3xl text-3xl font-black hover:shadow-2xl transition-all"
              >
                {t("show_all_courses") || "نمایش همه دوره‌ها"}
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-12">
              {courses.map((course) => (
                <CourseCard
                  key={course.id}
                  id={course.id}
                  title={course.title}
                  instructor={course.instructor.name}
                  price={course.price}
                  duration={course.duration || t("unknown") || "نامشخص"}
                  students={course._count.enrollments}
                  image={course.image ?? undefined}
                  isLive={course.type === "LIVE"}
                  reviewsCount={course._count.reviews}
                  isLiked={Array.isArray(course.likes) && course.likes.length > 0}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}