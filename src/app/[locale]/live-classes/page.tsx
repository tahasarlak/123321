// src/app/[locale]/live-classes/page.tsx
import { getTranslations } from "next-intl/server";
import { prisma } from "@/lib/db/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/[locale]/api/auth/[...nextauth]/route";
import Link from "next/link";
import Image from "next/image";
import { format } from "date-fns-jalali";
import { Metadata } from "next";
import {
  Clock,
  Users,
  PlayCircle,
  Calendar,
  Sparkles,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";

type Props = {
  params: { locale: string };
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = params;
  const t = await getTranslations({ locale, namespace: "liveClasses" });

  return {
    title: t("title") || "کلاس‌های زنده",
    description: t("description") || "کلاس‌های زنده و آینده روم آکادمی",
    openGraph: {
      title: t("title") || "کلاس‌های زنده",
      description: t("description") || "کلاس‌های زنده و آینده روم آکادمی",
      url: `https://rom.ir/${locale}/live-classes`,
      images: ["/live-classes-hero.jpg"],
    },
    alternates: {
      canonical: "/live-classes",
      languages: {
        fa: "/fa/live-classes",
        en: "/en/live-classes",
        ru: "/ru/live-classes",
      },
    },
  };
}

export default async function LiveClassesPage({ params }: Props) {
  const { locale } = params;
  const t = await getTranslations({ locale, namespace: "liveClasses" });
  const isRTL = locale === "fa";

  const session = await getServerSession(authOptions);

  const now = new Date();
  const threeDaysLater = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);

  const sessions = await prisma.classSession.findMany({
    where: {
      type: "LIVE_CLASS",
      startTime: { gte: now, lte: threeDaysLater },
      course: { status: "PUBLISHED", isVisible: true, isSaleEnabled: true },
    },
    include: {
      course: {
        select: {
          id: true,
          title: true,
          image: true,
          capacity: true,
          instructor: { select: { name: true, image: true } },
          enrollments: { select: { id: true } },
        },
      },
      group: { select: { capacity: true } },
    },
    orderBy: { startTime: "asc" },
  });

  const liveClasses = sessions.map((session) => {
    const isLiveNow = now >= session.startTime && now <= session.endTime;
    const enrolled = session.course.enrollments.length;

    return {
      id: session.id,
      title: session.title,
      courseId: session.course.id,
      courseTitle: session.course.title,
      instructor: {
        name: session.course.instructor.name,
        image: session.course.instructor.image,
      },
      startTime: session.startTime,
      endTime: session.endTime,
      thumbnail: session.course.image,
      enrolledCount: enrolled,
      capacity: session.group?.capacity || session.course.capacity || 500,
      meetLink: session.meetLink,
      status: isLiveNow ? "LIVE" : now < session.startTime ? "UPCOMING" : "ENDED",
    };
  });

  const liveNow = liveClasses.filter((c) => c.status === "LIVE");
  const upcoming = liveClasses.filter((c) => c.status === "UPCOMING");

  return (
    <div className="container mx-auto px-6 py-32 max-w-7xl">
      {/* هدر */}
      <div className="text-center mb-24">
        <h1 className="text-9xl md:text-10xl font-black bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent mb-8">
          {t("title") || "کلاس‌های زنده"}
        </h1>
        <p className="text-5xl font-bold text-foreground/70 mb-12">
          {t("subtitle") || "با بهترین اساتید، همین الان بپیوندید!"}
        </p>
        <div className="flex justify-center gap-12 text-3xl">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-red-500 rounded-full animate-pulse" />
            <span className="font-black text-red-600">
              {liveNow.length} {t("live_now") || "کلاس در حال اجرا"}
            </span>
          </div>
          <div className="flex items-center gap-4">
            <Sparkles size={48} className="text-yellow-500" />
            <span className="font-black text-primary">
              {upcoming.length} {t("upcoming") || "کلاس آینده"}
            </span>
          </div>
        </div>
      </div>

      {/* کلاس‌های در حال اجرا */}
      {liveNow.length > 0 && (
        <section className="mb-32">
          <div className="flex items-center gap-6 mb-16">
            <PlayCircle size={80} className="text-red-600 animate-pulse" />
            <h2 className="text-8xl font-black text-red-600">{t("live_now_title") || "همین الان در حال اجرا!"}</h2>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-12">
            {liveNow.map((cls) => (
              <Link
                key={cls.id}
                href={cls.meetLink ? `/class/${cls.meetLink}` : `/courses/${cls.courseId}`}
                className="group relative bg-card/90 backdrop-blur-3xl rounded-4xl shadow-4xl overflow-hidden border-8 border-red-200 hover:border-red-600 transition-all hover:scale-105"
              >
                <div className="relative h-96">
                  <Image
                    src={cls.thumbnail || "/live-default.jpg"}
                    alt={cls.title}
                    fill
                    className="object-cover group-hover:scale-110 transition-transform duration-700"
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent" />
                  <div className="absolute top-8 left-8 bg-red-600 text-white px-8 py-4 rounded-full flex items-center gap-4 animate-pulse shadow-2xl">
                    <div className="w-6 h-6 bg-white rounded-full animate-ping" />
                    <span className="text-3xl font-black">{t("live") || "زنده"}</span>
                  </div>
                </div>
                <div className="p-12 space-y-8">
                  <h3 className="text-5xl font-black text-foreground">{cls.title}</h3>
                  <p className="text-3xl text-muted-foreground">{cls.courseTitle}</p>
                  <div className="flex items-center gap-6">
                    <Image
                      src={cls.instructor.image || "/avatar.jpg"}
                      alt={cls.instructor.name}
                      width={100}
                      height={100}
                      className="rounded-full ring-8 ring-white shadow-2xl"
                    />
                    <div>
                      <p className="text-3xl font-black text-foreground">{cls.instructor.name}</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-3xl">
                    <div className="flex items-center gap-4 text-success">
                      <Users size={40} />
                      <span className="font-black">
                        {cls.enrolledCount}/{cls.capacity}
                      </span>
                    </div>
                    <div className="bg-gradient-to-r from-red-600 to-pink-600 text-white px-12 py-6 rounded-3xl font-black shadow-2xl">
                      {t("enter_now") || "ورود فوری به کلاس"}
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* کلاس‌های آینده */}
      <section>
        <div className="flex items-center gap-6 mb-16">
          <Calendar size={80} className="text-primary" />
          <h2 className="text-8xl font-black text-primary">{t("upcoming_title") || "کلاس‌های آینده"}</h2>
        </div>

        {upcoming.length === 0 ? (
          <div className="text-center py-32 bg-card/80 rounded-3xl shadow-2xl border border-border/50">
            <Sparkles size={120} className="mx-auto text-primary mb-12" />
            <p className="text-5xl font-bold text-muted-foreground">
              {t("no_upcoming") || "به زودی کلاس‌های جدید اضافه میشه!"}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12">
            {upcoming.map((cls) => {
              const hoursUntil = Math.floor((cls.startTime.getTime() - now.getTime()) / (1000 * 60 * 60));
              const isSoon = hoursUntil <= 2;

              return (
                <div
                  key={cls.id}
                  className="group relative bg-card/90 backdrop-blur-3xl rounded-4xl shadow-4xl overflow-hidden border-8 border-primary/20 hover:border-primary transition-all hover:scale-105"
                >
                  <div className="relative h-80">
                    <Image
                      src={cls.thumbnail || "/upcoming.jpg"}
                      alt={cls.title}
                      fill
                      className="object-cover"
                      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
                    {isSoon && (
                      <div className="absolute top-8 left-8 bg-gradient-to-r from-yellow-500 to-orange-500 text-white px-10 py-6 rounded-full shadow-2xl animate-bounce">
                        <p className="text-4xl font-black">{t("soon") || "به زودی!"}</p>
                      </div>
                    )}
                  </div>
                  <div className="p-10 space-y-6">
                    <h3 className="text-4xl font-black text-foreground">{cls.title}</h3>
                    <p className="text-2xl text-muted-foreground">{cls.courseTitle}</p>
                    <div className="flex items-center gap-4">
                      <Image
                        src={cls.instructor.image || "/avatar.jpg"}
                        alt={cls.instructor.name}
                        width={80}
                        height={80}
                        className="rounded-full"
                      />
                      <div>
                        <p className="text-2xl font-bold text-foreground">{cls.instructor.name}</p>
                        <p className="text-lg text-muted-foreground">
                          {format(cls.startTime, "eeee dd MMMM - HH:mm")}
                        </p>
                      </div>
                    </div>
                    <div className="flex justify-end">
                      <Link
                        href={`/courses/${cls.courseId}`}
                        className="bg-gradient-to-r from-primary to-secondary text-white px-10 py-6 rounded-3xl font-black flex items-center gap-4 hover:scale-110 transition shadow-2xl"
                      >
                        {t("view_course") || "مشاهده دوره"}
                        <ChevronRight size={32} className={cn(isRTL && "rotate-180")} />
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}