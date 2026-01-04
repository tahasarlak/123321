// src/app/[locale]/instructors/page.tsx
import { getTranslations } from "next-intl/server";
import { prisma } from "@/lib/db/prisma";
import Link from "next/link";
import Image from "next/image";
import { Metadata } from "next";
import { Award } from "lucide-react";

type Props = {
  params: { locale: string };
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = params;
  const t = await getTranslations({ locale, namespace: "instructor" });

  return {
    title: t("instructors_title") || "اساتید برجسته روم آکادمی",
    description: t("instructors_desc") || "بهترین متخصصان دندانپزشکی ایران و جهان",
    openGraph: {
      title: t("instructors_title") || "اساتید برجسته روم آکادمی",
      description: t("instructors_desc") || "بهترین متخصصان دندانپزشکی ایران و جهان",
      url: `https://rom.ir/${locale}/instructors`,
      images: ["/instructors-hero.jpg"],
    },
    alternates: {
      canonical: "/instructors",
      languages: {
        fa: "/fa/instructors",
        en: "/en/instructors",
        ru: "/ru/instructors",
      },
    },
  };
}

export default async function InstructorsPage({ params }: Props) {
  const { locale } = params;
  const t = await getTranslations({ locale, namespace: "instructor" });
  const isRTL = locale === "fa";

  const instructors = await prisma.user.findMany({
    where: {
      roles: { some: { role: "INSTRUCTOR" } },
    },
    include: {
      taughtCourses: {
        where: { status: "PUBLISHED", isVisible: true, isSaleEnabled: true },
        select: { id: true },
      },
      _count: {
        select: { taughtCourses: true, reviews: true },
      },
    },
    orderBy: { name: "asc" },
  });

  return (
    <div className="container mx-auto px-6 py-32 max-w-7xl">
      {/* هیرو */}
      <div className="text-center mb-32">
        <h1 className="text-6xl md:text-8xl font-black mb-8 bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent leading-tight">
          {t("instructors_title") || "اساتید برجسته روم"}
        </h1>
        <p className="text-2xl md:text-4xl text-foreground/70 max-w-4xl mx-auto leading-relaxed">
          {t("instructors_desc") || "بهترین متخصصان دندانپزشکی ایران و جهان، آماده انتقال دانش و تجربه به شما"}
        </p>
      </div>

      {/* لیست اساتید */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-12">
        {instructors.length === 0 ? (
          <div className="col-span-full text-center py-40 bg-card/80 backdrop-blur rounded-3xl shadow-2xl border border-border/50">
            <Award size={120} className="mx-auto mb-8 text-muted-foreground" />
            <p className="text-5xl text-muted-foreground">{t("no_instructors") || "هنوز استادی ثبت نشده"}</p>
          </div>
        ) : (
          instructors.map((instructor) => {
            const publishedCoursesCount = instructor.taughtCourses.length;

            return (
              <Link
                key={instructor.id}
                href={`/instructors/${instructor.id}`}
                className="group bg-card rounded-3xl shadow-2xl overflow-hidden hover:shadow-3xl transition-all duration-700 hover:-translate-y-6 border border-border/50"
              >
                <div className="relative aspect-square">
                  <Image
                    src={instructor.image || "/avatar.jpg"}
                    alt={instructor.name || "مدرس"}
                    fill
                    className="object-cover group-hover:scale-110 transition-transform duration-1000"
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                  <div className="absolute bottom-8 left-8 right-8 text-white">
                    <h3 className="text-3xl md:text-4xl font-black mb-2">{instructor.name}</h3>
                    <p className="text-xl opacity-90">
                      {publishedCoursesCount} {t("courses") || "دوره منتشرشده"}
                    </p>
                  </div>
                </div>
                <div className="p-8 text-center space-y-6">
                  <p className="text-lg text-muted-foreground line-clamp-3">
                    {instructor.bio || t("default_bio") || "متخصص دندانپزشکی با تجربه در آموزش پیشرفته"}
                  </p>
                  <div className="flex justify-center gap-8">
                    <div>
                      <p className="text-4xl font-black text-primary">{instructor._count.taughtCourses}</p>
                      <p className="text-muted-foreground">{t("courses") || "دوره"}</p>
                    </div>
                    <div>
                      <p className="text-4xl font-black text-secondary">{instructor._count.reviews}</p>
                      <p className="text-muted-foreground">{t("reviews") || "نظر"}</p>
                    </div>
                  </div>
                </div>
              </Link>
            );
          })
        )}
      </div>
    </div>
  );
}