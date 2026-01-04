// src/components/admin/InstructorFormAdmin.tsx
"use client";

import { useState } from "react";
import {
  User,
  Mail,
  Phone,
  Instagram,
  GraduationCap,
  Building2,
  BookOpen,
  Upload,
  CheckCircle,
} from "lucide-react";
import ImageUploader from "@/components/upload/ImageUploader";
import { toast } from "sonner";

interface University {
  id: string;
  name: string;
}

interface Major {
  id: string;
  name: string;
}

interface Props {
  universities: University[];
  majors: Major[];
}

export default function InstructorFormAdmin({ universities, majors }: Props) {
  const [imageUrl, setImageUrl] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!imageUrl) {
      return toast.error("آپلود تصویر پروفایل الزامی است");
    }

    setLoading(true);

    const formData = new FormData(e.currentTarget);
    formData.set("image", imageUrl);

    try {
      const res = await fetch("/api/admin/instructors/create", {
        method: "POST",
        body: formData,
      });

      if (res.ok) {
        toast.success("استاد با موفقیت ایجاد شد 🎉");
        setTimeout(() => {
          window.location.href = "/admin/instructors";
        }, 1500);
      } else {
        const error = await res.text();
        toast.error(error || "خطا در ایجاد استاد");
      }
    } catch (err) {
      console.error(err);
      toast.error("خطا در ارتباط با سرور");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-20">
      {/* اطلاعات شخصی */}
      <section>
        <h2 className="text-5xl md:text-6xl font-black mb-16 text-center bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
          اطلاعات شخصی
        </h2>

        <div className="grid md:grid-cols-2 gap-12">
          <Input label="نام و نام خانوادگی *" name="name" placeholder="دکتر علی رضایی" required />
          <Input label="ایمیل *" name="email" type="email" placeholder="ali@example.com" required />
          <Input label="شماره موبایل" name="phone" placeholder="۰۹۱۲۳۴۵۶۷۸۹" />
          <Input label="اینستاگرام (بدون @)" name="instagram" placeholder="dr_alirezaei" />
        </div>

        <div className="mt-12">
          <label className="block text-4xl font-black mb-8 text-foreground">بیوگرافی و رزومه</label>
          <textarea
            name="bio"
            rows={8}
            placeholder="توضیحات کامل درباره سوابق تحصیلی، تدریس، مقالات و دستاوردها..."
            className="w-full px-12 py-10 rounded-2xl border-4 border-border focus:border-secondary outline-none text-2xl resize-none bg-background"
          />
        </div>
      </section>

      {/* اطلاعات تحصیلی */}
      <section>
        <h2 className="text-5xl md:text-6xl font-black mb-16 text-center text-emerald-800">
          اطلاعات تحصیلی
        </h2>

        <div className="grid md:grid-cols-2 gap-12">
          <div>
            <label className="flex items-center gap-4 text-4xl font-black mb-8 text-foreground">
              <GraduationCap size={56} className="text-primary" />
              دانشگاه *
            </label>
            <select
              name="universityId"
              required
              className="w-full px-12 py-10 rounded-2xl border-4 border-border focus:border-primary outline-none text-2xl font-medium bg-background"
            >
              <option value="">انتخاب دانشگاه</option>
              {universities.map((uni) => (
                <option key={uni.id} value={uni.id}>
                  {uni.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="flex items-center gap-4 text-4xl font-black mb-8 text-foreground">
              <BookOpen size={56} className="text-secondary" />
              رشته تحصیلی *
            </label>
            <select
              name="majorId"
              required
              className="w-full px-12 py-10 rounded-2xl border-4 border-border focus:border-secondary outline-none text-2xl font-medium bg-background"
            >
              <option value="">انتخاب رشته</option>
              {majors.map((major) => (
                <option key={major.id} value={major.id}>
                  {major.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-12 grid md:grid-cols-2 gap-12">
          <Input label="مدرک تحصیلی" name="degree" placeholder="دکتری تخصصی ایمپلنت" />
          <Input label="رتبه علمی" name="academicRank" placeholder="استاد" />
        </div>
      </section>

      {/* وضعیت و تصویر */}
      <section className="grid md:grid-cols-2 gap-20">
        <div>
          <h2 className="text-5xl md:text-6xl font-black mb-16 text-center text-success">
            وضعیت حساب
          </h2>

          <label className="flex items-center justify-center gap-8 text-4xl font-black cursor-pointer">
            <input
              type="checkbox"
              name="academicStatus"
              value="ACTIVE"
              defaultChecked
              className="w-12 h-12 rounded-xl accent-success"
            />
            استاد از لحظه ایجاد فعال باشد
          </label>
        </div>

        <div>
          <h2 className="text-5xl md:text-6xl font-black mb-16 text-center text-emerald-800">
            تصویر پروفایل *
          </h2>

          <ImageUploader onUpload={setImageUrl} />

          {imageUrl && (
            <p className="text-3xl text-success mt-10 flex items-center justify-center gap-6">
              <CheckCircle size={56} />
              تصویر با موفقیت آپلود شد
            </p>
          )}
        </div>
      </section>

      {/* دکمه ارسال */}
      <div className="text-center pt-12">
        <button
          type="submit"
          disabled={loading}
          className="inline-flex items-center gap-8 bg-gradient-to-r from-emerald-500 via-teal-600 to-cyan-600 text-white px-32 py-12 rounded-3xl text-5xl md:text-6xl font-black hover:scale-105 transition-all shadow-3xl disabled:opacity-70 disabled:cursor-not-allowed"
        >
          <Upload size={80} />
          {loading ? "در حال ایجاد استاد..." : "ایجاد استاد جدید"}
        </button>
      </div>
    </form>
  );
}

function Input({
  label,
  name,
  type = "text",
  placeholder = "",
  required = false,
}: {
  label: string;
  name: string;
  type?: string;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <div>
      <label className="block text-3xl md:text-4xl font-black mb-6 text-foreground">{label}</label>
      <input
        type={type}
        name={name}
        required={required}
        placeholder={placeholder}
        className="w-full px-12 py-10 rounded-2xl border-4 border-border focus:border-secondary outline-none text-2xl font-medium transition-all bg-background"
      />
    </div>
  );
}