// src/app/(protected)/courses/[slug]/edit/page.tsx
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/[locale]/api/auth/[...nextauth]/route";
import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/db/prisma";
import CourseFormAdmin from "@/components/admin/CourseFormAdmin";
import Link from "next/link";

interface Props {
  params: { slug: string };
}

export default async function EditCoursePage({ params }: Props) {
  const session = await getServerSession(authOptions);

  // اگر لاگین نکرده باشد
  if (!session?.user?.id) {
    redirect("/auth");
  }

  const userId = session.user.id;
  const userRoles = session.user.roles as string[] | undefined;

  const isAdmin =
    userRoles?.includes("ADMIN") || userRoles?.includes("SUPERADMIN");

  // پیدا کردن دوره با slug
  const course = await prisma.course.findUnique({
    where: { slug: params.slug },
    include: {
      instructor: { select: { id: true, name: true } },
      createdBy: { select: { id: true, name: true } }, // سازنده اصلی
      tags: { select: { id: true } },
      categories: { select: { id: true } },
      term: true,
      priceHistories: {
        orderBy: { recordedAt: "desc" },
        take: 1,
      },
    },
  });

  if (!course) {
    notFound();
  }

  // چک دسترسی ویرایش
  const canEdit =
    isAdmin ||
    (!isAdmin &&
      course.instructorId === userId &&
      !course.isLocked); // استاد فقط اگر دوره قفل نباشد

  if (!canEdit) {
    return (
      <div className="container mx-auto px-6 py-20 text-center max-w-4xl">
        <div className="bg-red-500/10 border-4 border-red-500/50 rounded-3xl p-16">
          <h1 className="text-8xl font-black text-red-600 mb-12">
            دسترسی ممنوع
          </h1>
          <p className="text-4xl text-foreground/90 mb-12 leading-relaxed">
            {course.isLocked
              ? "این دوره توسط مدیریت قفل شده و حتی مدرس آن نیز نمی‌تواند آن را ویرایش کند."
              : "شما اجازه ویرایش این دوره را ندارید."}
          </p>
          <Link
            href={isAdmin ? "/admin/courses" : "/instructor/courses"}
            className="inline-flex items-center gap-6 px-16 py-8 bg-primary text-white rounded-2xl text-3xl font-bold hover:bg-primary/90 transition-all"
          >
            بازگشت به لیست دوره‌ها
          </Link>
        </div>
      </div>
    );
  }

  // دریافت داده‌های لازم برای فرم
  const [categories, tags, instructors, currentTerm] = await Promise.all([
    prisma.category.findMany({ orderBy: { name: "asc" } }),
    prisma.tag.findMany({ orderBy: { name: "asc" }),
    isAdmin
      ? prisma.user.findMany({
          where: {
            roles: { some: { role: "INSTRUCTOR" } },
          },
          select: { id: true, name: true },
          orderBy: { name: "asc" },
        })
      : [], // استاد نیازی به لیست همه اساتید ندارد
    prisma.academicTerm.findFirst({ where: { isCurrent: true } }),
  ]);

  // آماده‌سازی داده‌ها برای فرم
  const existingTags = course.tags.map((t) => t.id);

  // قیمت فعلی (از Json)
  const price = (course.price as { IRR?: number; USD?: number; EUR?: number }) || {
    IRR: 0,
    USD: 0,
    EUR: 0,
  };

  const prerequisites = (course.prerequisites as string[]) || [];
  const whatYouWillLearn = (course.whatYouWillLearn as string[]) || [];

  return (
    <div className="container mx-auto px-6 py-20 max-w-7xl">
      {/* هدر صفحه */}
      <div className="text-center mb-20">
        <h1 className="text-7xl md:text-9xl font-black bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent mb-8 animate-gradient">
          ویرایش دوره
        </h1>
        <p className="text-3xl md:text-4xl font-bold text-foreground/70 mb-4">
          {course.title}
        </p>
        <div className="flex items-center justify-center gap-8 text-2xl text-muted-foreground">
          <span>
            مدرس فعلی:{" "}
            <strong className="text-foreground">{course.instructor.name}</strong>
          </span>
          {course.createdBy && (
            <span>
              ایجاد شده توسط:{" "}
              <strong className="text-foreground">
                {course.createdBy.name}
              </strong>
            </span>
          )}
          {course.isLocked && (
            <span className="flex items-center gap-3 text-red-600 font-bold">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="32"
                height="32"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
              قفل شده توسط مدیریت
            </span>
          )}
        </div>
      </div>

      {/* فرم ویرایش */}
      <CourseFormAdmin
        mode="edit"
        course={{
          ...course,
          // برای سازگاری با تایپ Course در فرم
          createdBy: course.createdBy
            ? { id: course.createdBy.id, name: course.createdBy.name }
            : null,
          instructor: { id: course.instructor.id, name: course.instructor.name },
          categories: course.categories,
          createdAt: course.createdAt,
        }}
        existingTags={existingTags}
        existingPrerequisites={prerequisites}
        existingWhatYouWillLearn={whatYouWillLearn}
        price={price}
        categories={categories}
        tags={tags}
        instructors={instructors}
        currentTerm={currentTerm}
        isAdmin={isAdmin}
      />

      {/* نکته پایینی */}
      <div className="text-center mt-20">
        <p className="text-2xl text-muted-foreground">
          {isAdmin
            ? "شما به عنوان ادمین دسترسی کامل به ویرایش و قفل کردن دوره دارید."
            : "شما به عنوان مدرس این دوره، می‌توانید محتوای آموزشی را ویرایش کنید."}
        </p>
      </div>
    </div>
  );
}