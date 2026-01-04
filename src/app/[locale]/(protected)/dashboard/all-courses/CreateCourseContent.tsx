import { getServerSession } from "next-auth";
import { authOptions } from "@/app/[locale]/api/auth/[...nextauth]/route";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db/prisma";
import CourseFormAdmin from "@/components/admin/CourseFormAdmin";

export default async function CreateCourseContent() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect("/auth");
  }

  const userId = session.user.id;
  const userName = session.user.name || "کاربر";
  const userRoles = session.user.roles as string[] | undefined;

  const isAdmin =
    userRoles?.includes("ADMIN") || userRoles?.includes("SUPERADMIN");
  const isInstructor = userRoles?.includes("INSTRUCTOR");

  if (!isAdmin && !isInstructor) {
    redirect("/courses");
  }

  const [categories, tags, instructors, currentTerm] = await Promise.all([
    prisma.category.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
    }),
    prisma.tag.findMany({
      orderBy: { name: "asc" },
    }),
    isAdmin
      ? prisma.user.findMany({
          where: {
            roles: { some: { role: "INSTRUCTOR" } },
          },
          select: { id: true, name: true },
          orderBy: { name: "asc" },
        })
      : [{ id: userId, name: userName }],
    prisma.academicTerm.findFirst({
      where: { isCurrent: true },
    }),
  ]);

  return (
    <>
      <div className="text-center mb-20">
        <h1 className="text-7xl md:text-9xl font-black bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent mb-8 animate-gradient">
          ایجاد دوره جدید
        </h1>
        <p className="text-3xl md:text-4xl font-bold text-foreground/70">
          {isAdmin
            ? "به عنوان ادمین — دسترسی کامل به تمام تنظیمات"
            : `به عنوان مدرس — ${userName}`}
        </p>
      </div>

      <CourseFormAdmin
        mode="create"
        categories={categories}
        tags={tags}
        instructors={instructors}
        currentTerm={currentTerm}
        isAdmin={isAdmin}
        course={
          !isAdmin
            ? {
                instructorId: userId,
                instructor: { id: userId, name: userName },
                isSaleEnabled: true,
                status: "DRAFT",
                type: "RECORDED",
                units: 3,
              }
            : undefined
        }
      />

      <div className="text-center mt-20">
        <p className="text-2xl text-muted-foreground max-w-4xl mx-auto leading-relaxed">
          {isAdmin
            ? "شما می‌توانید مدرس دلخواه را انتخاب کنید، دوره را منتشر کنید و حتی بعداً آن را قفل کنید."
            : "دوره با نام شما به عنوان مدرس ایجاد خواهد شد. پس از ایجاد، می‌توانید محتوای آموزشی (سرفصل‌ها، درس‌ها، فایل‌ها و ...) را اضافه کنید."}
        </p>
      </div>
    </>
  );
}