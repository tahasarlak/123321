import { prisma } from "@/lib/db/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/[locale]/api/auth/[...nextauth]/route";
import { format } from "date-fns-jalali";

export default async function StudentCalendar() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return <div>وارد شوید</div>;

  const userId = session.user.id as string;

  const enrollments = await prisma.enrollment.findMany({
    where: { userId },
    include: {
      course: { select: { title: true, image: true } },
      classSessions: {
        orderBy: { startTime: "asc" },
        include: { course: true },
      },
    },
  });

  const sessions = enrollments.flatMap(e => e.classSessions.map(s => ({
    ...s,
    courseTitle: e.course.title,
    courseImage: e.course.image,
  })));

  const now = new Date();

  return (
    <div className="p-8">
      <h1 className="text-3xl mb-8">تقویم کلاس‌های من</h1>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {sessions.map(session => {
          const isLive = session.startTime <= now && session.endTime >= now;
          const isUpcoming = session.startTime > now;

          return (
            <div key={session.id} className={`p-6 rounded-xl border ${isLive ? "border-red-500 bg-red-50" : "border-gray-200"}`}>
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-xl font-bold">{session.title}</h3>
                {isLive && <span className="bg-red-600 text-white px-3 py-1 rounded-full text-sm animate-pulse">زنده</span>}
                {isUpcoming && <span className="bg-amber-600 text-white px-3 py-1 rounded-full text-sm">آتی</span>}
              </div>

              <p className="text-gray-600 mb-4">{session.courseTitle}</p>

              <div className="space-y-2 text-sm">
                <p>شروع: {format(new Date(session.startTime), "yyyy/MM/dd HH:mm")}</p>
                <p>پایان: {format(new Date(session.endTime), "HH:mm")}</p>
              </div>

              <div className="mt-6">
                {session.meetLink ? (
                  <a href={session.meetLink} target="_blank" className="btn btn-primary w-full">
                    ورود به جلسه (خارجی)
                  </a>
                ) : (
                  <a href={`/courses/${session.course.slug}/sessions/${session.id}`} className="btn btn-success w-full">
                    ورود به کلاس داخلی
                  </a>
                )}

                {session.recordingLink && (
                  <a href={session.recordingLink} target="_blank" className="btn btn-outline mt-2 w-full">
                    مشاهده ضبط
                  </a>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}