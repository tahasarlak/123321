"use client";

import { Control, FieldErrors } from "react-hook-form";
import { Instagram, Link as LinkIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import React from "react";

import { FormValues } from "@/types/user";
import { ProfileImageSection } from "./ProfileImageSection";
import { InputField } from "@/components/ui/InputField";

interface Props {
  control: Control<FormValues>;
  errors: FieldErrors<FormValues>;
  imageUrl: string | null;
  setImageUrl: (url: string | null) => void;
}

export const BloggerSection = React.memo(function BloggerSection({
  control,
  errors,
  imageUrl,
  setImageUrl,
}: Props) {
  const t = useTranslations("admin");

  return (
    <div className="space-y-8">
      {/* بیوگرافی کوتاه - حالا با InputField یکپارچه */}
      <InputField
        id="shortBio"
        label={t("short_bio") || "بیوگرافی کوتاه (برای نمایش در کارت پست‌ها)"}
        type="textarea"
        rows={4}
        required
        control={control}
        error={errors.shortBio}
        placeholder={t("short_bio_placeholder") || "معرفی کوتاه خودتان در ۲-۳ جمله..."}
      />

      {/* بیوگرافی کامل */}
      <InputField
        id="bio"
        label={t("full_bio") || "بیوگرافی کامل"}
        type="textarea"
        rows={8}
        control={control}
        error={errors.bio}
        placeholder={t("full_bio_placeholder") || "بیوگرافی کامل، سوابق نوشتاری، موضوعات مورد علاقه و ..."}
      />

      {/* لینک‌های اجتماعی */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <InputField
          id="website"
          label={t("website") || "وب‌سایت شخصی"}
          iconLeft={LinkIcon}
          control={control}
          error={errors.website}
          placeholder="https://example.com"
        />

        <InputField
          id="linkedin"
          label={t("linkedin") || "لینکدین"}
          iconLeft={LinkIcon}
          control={control}
          error={errors.linkedin}
          placeholder="linkedin.com/in/username"
        />

        <InputField
          id="twitter"
          label={t("twitter") || "توییتر / X (بدون @)"}
          iconLeft={LinkIcon}
          control={control}
          error={errors.twitter}
          placeholder="username"
        />

        <InputField
          id="instagram"
          label={t("instagram") || "اینستاگرام (بدون @)"}
          iconLeft={Instagram}
          control={control}
          error={errors.instagram}
          placeholder="username"
        />
      </div>

      {/* تصویر پروفایل و وضعیت فعال بودن */}
      <ProfileImageSection
        control={control}
        errors={errors}
        imageUrl={imageUrl}
        setImageUrl={setImageUrl}
        required={true}
        activeLabel={
          t("active_from_creation_blogger") ||
          "نویسنده از لحظه ایجاد فعال باشد (پست‌هایش منتشر شوند)"
        }
      />
    </div>
  );
});

BloggerSection.displayName = "BloggerSection";