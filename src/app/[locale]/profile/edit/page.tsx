// src/app/[locale]/profile/edit/page.tsx
import { getTranslations } from "next-intl/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/[locale]/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/db/prisma";
import { redirect } from "next/navigation";
import { Metadata } from "next";
import EditProfileClient from "./EditProfileClient";

type Props = {
  params: { locale: string };
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = params;
  const t = await getTranslations({ locale, namespace: "profile" });

  return {
    title: t("edit_title") || "ویرایش پروفایل | روم آکادمی",
    description: t("edit_desc") || "اطلاعات پروفایل خود را به‌روزرسانی کنید",
  };
}

export default async function EditProfilePage({ params }: Props) {
  const { locale } = params;
  const t = await getTranslations({ locale, namespace: "profile" });

  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect("/auth");
  }

  const userId = session.user.id;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
      phone: true,
      city: true,
      bio: true,
      gender: true,
      birthDate: true,
    },
  });

  if (!user) {
    redirect("/profile");
  }

  return <EditProfileClient initialUser={user} />;
}