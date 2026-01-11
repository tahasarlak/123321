// app/my-courses/[id]/page.tsx
import { prisma } from "@/lib/db/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/[locale]/api/auth/[...nextauth]/route";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { FiCheckCircle, FiLock, FiPlayCircle, FiClock, FiFileText, FiDownload, FiAward, FiMessageCircle } from "react-icons/fi";


export default async function LearningRoom({ params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/auth");

  const course = await prisma.course.findUnique({
    where: { id: params.id },
    include: {
      lessons: {
        orderBy: { order: "asc" },
        include: {
          completions: { where: { userId: session.user.id } },
          attachments: true,
        },
      },
      buyers: { where: { id: session.user.id } },
      instructor: { select: { name: true, image: true } },
      _count: { select: { lessons: true } },
    },
  });

  if (!course || !course.buyers.length) notFound();

  const completedLessons = course.lessons.filter(l => l.completions.length > 0).length;
  const progress = course._count.lessons > 0 ? Math.round((completedLessons / course._count.lessons) * 100) : 0;
  const isCompleted = progress === 100;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white">
      {/* هدر ثابت */}
      <div className="bg-black/50 backdrop-blur-xl border-b border-white/10 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-8 py-6 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <Link href="/my-courses" className="text-4xl font-black hover:text-purple-400 transition">دوره‌های من</Link>
            <div className="h-12 w-px bg-white/20" />
            <h1 className="text-5xl font-black truncate max-w-2xl">{course.title}</h1>
          </div>
          <div className="flex items-center gap-12 text-3xl">
            <div className="text-right">
              <p className="text-xl opacity-70">پیشرفت شما</p>
              <p className="text-5xl font-black text-emerald-400">{progress}%</p>
            </div>
            {isCompleted && <FiAward size={64} className="text-yellow-400 animate-pulse" />}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-8 py-12 grid lg:grid-cols-4 gap-12">
        {/* لیست درس‌ها */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white/10 backdrop-blur-xl rounded-3xl p-8 border border-white/20">
            <h2 className="text-4xl font-black mb-8 flex items-center gap-4">
              <FiPlayCircle size={48} />
              درس‌ها ({course.lessons.length})
            </h2>
            <div className="space-y-4">
              {course.lessons.map((lesson, idx) => {
                const isCompleted = lesson.completions.length > 0;
                const isFree = lesson.isFree;

                return (
                  <Link
                    key={lesson.id}
                    href={`/my-courses/${course.id}?lesson=${lesson.id}`}
                    className={`block p-6 rounded-2xl transition-all hover:scale-105 ${
                      isCompleted ? "bg-emerald-600/30 border border-emerald-400" : "bg-white/5 border border-white/10"
                    }`}
                  >
                    <div className="flex items-start gap-6">
                      {isCompleted ? (
                        <FiCheckCircle size={40} className="text-emerald-400 mt-1" />
                      ) : isFree ? (
                        <FiPlayCircle size={40} className="text-purple-400 mt-1" />
                      ) : (
                        <FiLock size={40} className="text-gray-500 mt-1" />
                      )}
                      <div className="flex-1">
                        <p className="text-3xl font-bold">{idx + 1}. {lesson.title}</p>
                        {lesson.duration && (
                          <p className="text-xl opacity-70 flex items-center gap-3 mt-2">
                            <FiClock size={28} />
                            {lesson.duration} دقیقه
                          </p>
                        )}
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>

          {/* اطلاعات مدرس */}
          <div className="bg-white/10 backdrop-blur-xl rounded-3xl p-8 border border-white/20">
            <h3 className="text-4xl font-black mb-6">مدرس دوره</h3>
            <div className="flex items-center gap-6">
              <Image
                src={course.instructor.image || "/avatar.jpg"}
                alt={course.instructor.name}
                width={120}
                height={120}
                className="rounded-full ring-4 ring-purple-500"
              />
              <div>
                <p className="text-3xl font-black">{course.instructor.name}</p>
                <p className="text-xl opacity-70">مدرس حرفه‌ای</p>
              </div>
            </div>
          </div>
        </div>

        {/* پلیر و محتوای درس */}
        <div className="lg:col-span-3">
          {/* اینجا بعداً پلیر واقعی میاد — فعلاً placeholder */}
          <div className="bg-black rounded-4xl aspect-video flex items-center justify-center border-8 border-purple-600 shadow-5xl">
            <div className="text-center">
              <FiPlayCircle size={140} className="mx-auto mb-8 text-purple-400" />
              <p className="text-6xl font-black">پلیر ویدیو در حال توسعه است</p>
              <p className="text-4xl mt-6 opacity-70">به زودی اضافه میشه!</p>
            </div>
          </div>

          {/* تب‌های محتوا */}
          <div className="mt-12 bg-white/10 backdrop-blur-xl rounded-3xl p-12 border border-white/20">
            <h3 className="text-5xl font-black mb-8">محتوای این درس</h3>
            <p className="text-3xl leading-relaxed opacity-90">
              توضیحات درس اینجا نمایش داده میشه...
            </p>
          </div>

          {/* فایل‌های ضمیمه */}
          {course.lessons.some(l => l.attachments.length > 0) && (
            <div className="mt-12 bg-white/10 backdrop-blur-xl rounded-3xl p-12 border border-white/20">
              <h3 className="text-5xl font-black mb-8 flex items-center gap-6">
                <FiFileText size={56} />
                فایل‌های ضمیمه
              </h3>
              <div className="grid md:grid-cols-2 gap-8">
                {/* مثال */}
                <a href="#" className="flex items-center gap-6 bg-white/10 p-8 rounded-2xl hover:bg-white/20 transition">
                  <FiDownload size={48} className="text-emerald-400" />
                  <div>
                    <p className="text-3xl font-bold">فایل PDF درس ۱</p>
                    <p className="text-xl opacity-70">2.4 مگابایت</p>
                  </div>
                </a>
              </div>
            </div>
          )}

          {/* گواهی پایان دوره */}
          {isCompleted && (
            <div className="mt-20 text-center bg-gradient-to-r from-yellow-600 to-orange-600 p-16 rounded-4xl border-8 border-yellow-300">
              <FiAward size={160} className="mx-auto mb-8" />
              <h2 className="text-8xl font-black mb-6">تبریک! دوره رو تموم کردی</h2>
              <button className="bg-white text-orange-600 px-20 py-12 rounded-3xl text-5xl font-black hover:scale-110 transition shadow-3xl">
                دانلود گواهی پایان دوره
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}