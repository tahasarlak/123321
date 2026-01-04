"use client";

import React, { useMemo } from "react";
import { Control, FieldErrors } from "react-hook-form";
import { Instagram, GraduationCap, User as UserIcon } from "lucide-react";
import { useTranslations } from "next-intl";

import { FormValues, University, Major } from "@/types/user";
import { InputField } from "@/components/ui/InputField";
import { ProfileImageSection } from "./ProfileImageSection";

interface Props {
  control: Control<FormValues>;
  errors: FieldErrors<FormValues>;
  imageUrl: string | null;
  setImageUrl: (url: string | null) => void;
  universities: University[];
  majors: Major[];
}

/**
 * بخش اطلاعات مدرس (Instructor)
 * شامل دانشگاه، رشته، بیوگرافی، اینستاگرام، مدرک، رتبه علمی و تصویر پروفایل
 */
export const InstructorSection = React.memo(function InstructorSection({
  control,
  errors,
  imageUrl,
  setImageUrl,
  universities,
  majors,
}: Props) {
  const t = useTranslations("admin");

  // مرتب‌سازی و آماده‌سازی گزینه‌های دانشگاه
  const universityOptions = useMemo(() => {
    const sorted = [...universities].sort((a, b) =>
      a.name.localeCompare(b.name, "fa")
    );
    return [
      { value: "", label: t("select_university") || "انتخاب دانشگاه" },
      ...sorted.map((uni) => ({
        value: String(uni.id),
        label: uni.name,
      })),
    ];
  }, [universities, t]);

  // مرتب‌سازی و آماده‌سازی گزینه‌های رشته تحصیلی
  const majorOptions = useMemo(() => {
    const sorted = [...majors].sort((a, b) =>
      a.name.localeCompare(b.name, "fa")
    );
    return [
      { value: "", label: t("select_major") || "انتخاب رشته" },
      ...sorted.map((major) => ({
        value: String(major.id),
        label: major.name,
      })),
    ];
  }, [majors, t]);

  return (
    <div className="space-y-8">
      {/* دانشگاه و رشته تحصیلی */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <InputField
          id="universityId"
          label={t("university")}
          type="select"
          required
          control={control}
          error={errors.universityId}
          options={universityOptions}
        />

        <InputField
          id="majorId"
          label={t("major")}
          type="select"
          required
          control={control}
          error={errors.majorId}
          options={majorOptions}
        />
      </div>

      {/* بیوگرافی و رزومه */}
      <InputField
        id="bio"
        label={t("bio_resume") || "بیوگرافی و رزومه"}
        type="textarea"
        rows={8}
        required
        control={control}
        error={errors.bio}
        placeholder={
          t("bio_placeholder") ||
          "توضیحات کامل درباره سوابق تحصیلی، تدریس، مقالات، دستاوردها و تجربیات حرفه‌ای..."
        }
      />

      {/* اینستاگرام */}
      <InputField
        id="instagram"
        label={t("instagram") || "اینستاگرام"}
        iconLeft={Instagram}
        control={control}
        error={errors.instagram}
        placeholder="dr_alirezaei (بدون @ وارد کنید)"
      />

      {/* مدرک و رتبه علمی */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <InputField
          id="degree"
          label={t("degree") || "مدرک تحصیلی"}
          iconLeft={GraduationCap}
          control={control}
          error={errors.degree}
          placeholder="دکتری تخصصی ایمپلنت"
        />

        <InputField
          id="academicRank"
          label={t("academic_rank") || "رتبه علمی"}
          iconLeft={UserIcon}
          control={control}
          error={errors.academicRank}
          placeholder="استاد"
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
          t("active_from_creation") || "کاربر از لحظه ایجاد فعال باشد"
        }
      />
    </div>
  );
});

InstructorSection.displayName = "InstructorSection";