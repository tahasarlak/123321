// src/app/profile/edit/EditProfileClient.tsx
"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Camera, Save, User, Mail, Phone, MapPin, Calendar, Edit3 } from "lucide-react";
import ImageUploader from "@/components/upload/ImageUploader";
import { updateProfileAction } from "@/actions/user/profile";
import { toast } from "sonner";
import { useTranslations } from "next-intl";

type User = {
  id: string;
  name: string | null;
  email: string | null;
  image: string | null;
  phone: string | null;
  city: string | null;
  bio: string | null;
  gender: "MALE" | "FEMALE" | "OTHER" | null;
  birthDate: Date | null;
};

export default function EditProfileClient({ initialUser }: { initialUser: User }) {
  const t = useTranslations("profile");
  const [imageUrl, setImageUrl] = useState(initialUser.image || "");
  const [isLoading, setIsLoading] = useState(false);

  const updateProfile = async (formData: FormData) => {
    setIsLoading(true);

    if (imageUrl) {
      formData.set("imageUrl", imageUrl);
    }

    const result = await updateProfileAction(formData);

    if (result.success) {
      toast.success(result.message);
    } else {
      toast.error(result.error);
    }

    setIsLoading(false);
  };

  return (
    <div className="container mx-auto px-6 py-32 max-w-5xl">
      {/* هدر */}
      <div className="text-center mb-20">
        <h1 className="text-6xl md:text-8xl font-black mb-8 bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
          {t("edit_title") || "ویرایش پروفایل"}
        </h1>
        <p className="text-3xl md:text-4xl text-foreground/70">
          {t("edit_subtitle") || "اطلاعات خود را به‌روز کنید"}
        </p>
      </div>

      {/* فرم اصلی */}
      <div className="bg-card/95 backdrop-blur-2xl rounded-3xl shadow-3xl p-12 lg:p-24 border border-border/50">
        <form action={updateProfile} className="space-y-20">
          {/* آپلود تصویر */}
          <div className="text-center mb-24">
            <h2 className="text-5xl md:text-6xl font-black mb-16 text-foreground flex items-center justify-center gap-6">
              <Camera size={70} className="text-primary" />
              {t("profile_photo") || "عکس پروفایل"}
            </h2>
            <div className="mb-12">
              <Image
                src={imageUrl || initialUser.image || "/avatar.jpg"}
                alt="پیش‌نمایش"
                width={240}
                height={240}
                className="mx-auto rounded-full ring-12 ring-primary/20 shadow-4xl object-cover"
                priority
              />
            </div>
            <ImageUploader
              onUpload={setImageUrl}
              multiple={false}
              maxFiles={1}
              maxSizeMB={10}
              aspectRatio="1:1"
            />
            <input type="hidden" name="imageUrl" value={imageUrl} />
          </div>

          <div className="grid md:grid-cols-2 gap-16">
            <div>
              <label className="flex items-center gap-6 text-4xl font-bold text-foreground mb-6">
                <User size={48} className="text-primary" />
                {t("full_name") || "نام کامل"}
              </label>
              <input
                type="text"
                name="name"
                defaultValue={initialUser.name || ""}
                required
                className="w-full px-12 py-10 rounded-3xl bg-background text-4xl focus:outline-none focus:ring-8 focus:ring-primary transition-all shadow-lg border border-border"
                placeholder={t("full_name_placeholder") || "نام و نام خانوادگی"}
              />
            </div>

            <div>
              <label className="flex items-center gap-6 text-4xl font-bold text-foreground mb-6">
                <Mail size={48} className="text-primary" />
                {t("email") || "ایمیل"}
              </label>
              <input
                type="email"
                defaultValue={initialUser.email || ""}
                disabled
                className="w-full px-12 py-10 rounded-3xl bg-muted text-4xl opacity-70 cursor-not-allowed"
              />
              <p className="text-2xl text-muted-foreground mt-4">{t("email_note") || "ایمیل قابل تغییر نیست"}</p>
            </div>

            <div>
              <label className="flex items-center gap-6 text-4xl font-bold text-foreground mb-6">
                <Phone size={48} className="text-primary" />
                {t("phone") || "شماره موبایل"}
              </label>
              <input
                type="text"
                name="phone"
                defaultValue={initialUser.phone || ""}
                dir="ltr"
                className="w-full px-12 py-10 rounded-3xl bg-background text-4xl focus:outline-none focus:ring-8 focus:ring-primary transition-all shadow-lg text-left border border-border"
                placeholder="09123456789"
              />
            </div>

            <div>
              <label className="flex items-center gap-6 text-4xl font-bold text-foreground mb-6">
                <MapPin size={48} className="text-primary" />
                {t("city") || "شهر"}
              </label>
              <input
                type="text"
                name="city"
                defaultValue={initialUser.city || ""}
                className="w-full px-12 py-10 rounded-3xl bg-background text-4xl focus:outline-none focus:ring-8 focus:ring-primary transition-all shadow-lg border border-border"
                placeholder={t("city_placeholder") || "تهران، اصفهان، شیراز..."}
              />
            </div>

            <div>
              <label className="flex items-center gap-6 text-4xl font-bold text-foreground mb-6">
                <User size={48} className="text-primary" />
                {t("gender") || "جنسیت"}
              </label>
              <select
                name="gender"
                defaultValue={initialUser.gender || "OTHER"}
                className="w-full px-12 py-10 rounded-3xl bg-background text-4xl focus:outline-none focus:ring-8 focus:ring-primary transition-all shadow-lg border border-border"
              >
                <option value="MALE">{t("male") || "مرد"}</option>
                <option value="FEMALE">{t("female") || "زن"}</option>
                <option value="OTHER">{t("other") || "سایر / ترجیح نمی‌دهم"}</option>
              </select>
            </div>

            <div>
              <label className="flex items-center gap-6 text-4xl font-bold text-foreground mb-6">
                <Calendar size={48} className="text-primary" />
                {t("birth_date") || "تاریخ تولد (اختیاری)"}
              </label>
              <input
                type="date"
                name="birthDate"
                defaultValue={initialUser.birthDate ? initialUser.birthDate.toISOString().split("T")[0] : ""}
                className="w-full px-12 py-10 rounded-3xl bg-background text-4xl focus:outline-none focus:ring-8 focus:ring-primary transition-all shadow-lg border border-border"
              />
            </div>
          </div>

          <div>
            <label className="flex items-center gap-6 text-4xl font-bold text-foreground mb-6">
              <Edit3 size={48} className="text-primary" />
              {t("bio") || "بیوگرافی"}
            </label>
            <textarea
              name="bio"
              rows={6}
              defaultValue={initialUser.bio || ""}
              className="w-full px-12 py-10 rounded-3xl bg-background text-4xl focus:outline-none focus:ring-8 focus:ring-primary transition-all shadow-lg resize-none border border-border"
              placeholder={t("bio_placeholder") || "درباره خودتون بنویسید..."}
            />
          </div>

          <div className="flex justify-center gap-12 mt-24">
            <button
              type="submit"
              disabled={isLoading}
              className="inline-flex items-center gap-12 bg-gradient-to-r from-primary to-secondary text-white px-32 py-16 rounded-4xl text-6xl font-black shadow-4xl hover:scale-105 active:scale-95 transition-all duration-300 disabled:opacity-70 disabled:cursor-not-allowed"
            >
              <Save size={64} />
              {isLoading ? t("saving") || "در حال ذخیره..." : t("save_changes") || "ذخیره تغییرات"}
            </button>
            <Link
              href="/profile"
              className="inline-flex items-center gap-12 bg-muted text-muted-foreground px-32 py-16 rounded-4xl text-6xl font-black shadow-4xl hover:bg-muted/80 transition-all"
            >
              {t("cancel") || "انصراف"}
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}