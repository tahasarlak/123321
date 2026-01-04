"use client";

import { useMemo } from "react";
import { Control, FieldErrors } from "react-hook-form";
import { GraduationCap, BookOpen, IdCard, Calendar } from "lucide-react";
import { useTranslations } from "next-intl";
import React from "react";

import { FormValues, University, Major } from "@/types/user";
import { InputField } from "@/components/ui/InputField";

// گسترش interface SelectOption برای پشتیبانی از disabled و hidden در گزینه‌های پیش‌فرض
interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
  hidden?: boolean;
}

interface Props {
  control: Control<FormValues>;
  errors: FieldErrors<FormValues>;
  universities: University[];
  majors: Major[];
}

export const AcademicInfoSection = React.memo(function AcademicInfoSection({
  control,
  errors,
  universities,
  majors,
}: Props) {
  const t = useTranslations("admin");

  /**
   * تبدیل دقیق سال میلادی به سال شمسی (جلالی)
   * الگوریتم استاندارد و دقیق برای محدودهٔ ۱۹۰۰ تا ۲۱۰۰
   */
  const gregorianToJalaliYear = (gregorianYear: number): number => {
    let gy = gregorianYear;
    let jy = 0;

    if (gy <= 1600) {
      jy = 0;
      gy -= 621;
    } else {
      jy = 979;
      gy -= 1600;
    }

    let days =
      365 * gy +
      Math.floor((gy + 3) / 4) -
      Math.floor((gy + 99) / 100) +
      Math.floor((gy + 399) / 400) -
      80 +
      79;

    jy += 33 * Math.floor(days / 12053);
    days %= 12053;
    jy += 4 * Math.floor(days / 1461);
    days %= 1461;

    if (days > 365) {
      jy += Math.floor((days - 1) / 365);
      days = (days - 1) % 365;
    }

    return jy;
  };

  // سال جاری میلادی
  const currentGregorianYear = new Date().getFullYear(); // مثلاً ۲۰۲۶

  // محدودهٔ گسترده و منطقی: از ۱۹۵۰ تا ۲۰ سال آینده
  const startGregorianYear = 1950;
  const endGregorianYear = currentGregorianYear + 20;

  // گزینه‌های سال ورود (از جدید به قدیم)
  const entranceYearOptions = useMemo(() => {
    return Array.from(
      { length: endGregorianYear - startGregorianYear + 1 },
      (_, i) => {
        const gy = endGregorianYear - i;
        const py = gregorianToJalaliYear(gy);
        return {
          value: gy.toString(),
          label: `${gy} میلادی (${py} شمسی)`,
        };
      }
    );
  }, [endGregorianYear]);

  // گزینه‌های دانشگاه با placeholder غیرقابل انتخاب
  const universityOptions = useMemo<SelectOption[]>(() => {
    const sorted = [...universities].sort((a, b) =>
      a.name.localeCompare(b.name, "fa")
    );
    return [
      {
        value: "",
        label: t("selectUniversity"),
        disabled: true,
        hidden: true,
      },
      ...sorted.map((uni) => ({
        value: String(uni.id),
        label: uni.name,
      })),
    ];
  }, [universities, t]);

  // گزینه‌های رشته تحصیلی با placeholder غیرقابل انتخاب
  const majorOptions = useMemo<SelectOption[]>(() => {
    const sorted = [...majors].sort((a, b) =>
      a.name.localeCompare(b.name, "fa")
    );
    return [
      {
        value: "",
        label: t("selectMajor"),
        disabled: true,
        hidden: true,
      },
      ...sorted.map((major) => ({
        value: String(major.id),
        label: major.name,
      })),
    ];
  }, [majors, t]);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
      {/* دانشگاه */}
      <InputField
        id="universityId"
        label={t("university")}
        iconLeft={GraduationCap}
        type="select"
        required
        control={control}
        error={errors.universityId}
        options={universityOptions}
      />

      {/* رشته تحصیلی */}
      <InputField
        id="majorId"
        label={t("major")}
        iconLeft={BookOpen}
        type="select"
        required
        control={control}
        error={errors.majorId}
        options={majorOptions}
      />

      {/* شماره دانشجویی */}
      <InputField
        id="studentId"
        label={t("student_id")}
        iconLeft={IdCard}
        control={control}
        error={errors.studentId}
        placeholder="۹۸۱۰۱۲۳۴"
      />

      {/* سال ورود */}
      <InputField
        id="entranceYear"
        label={t("entrance_year")}
        iconLeft={Calendar}
        type="select"
        required
        control={control}
        error={errors.entranceYear}
        options={[
          {
            value: "",
            label: t("selectYear"),
            disabled: true,
            hidden: true,
          },
          ...entranceYearOptions,
        ]}
      />
    </div>
  );
});

AcademicInfoSection.displayName = "AcademicInfoSection";