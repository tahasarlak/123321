// src/components/admin/CourseFormAdmin.tsx
"use client";

import { useState } from "react";
import {
  Upload,
  Image as ImageIcon,
  Video,
  Tag,
  Users,
  DollarSign,
  Percent,
  Calendar,
  BookOpen,
  Globe,
  CheckCircle,
  Clock,
  FileText,
  Plus,
  X,
  ListChecks,
  GraduationCap,
  Flag,
  Lock,
  UserPlus,
} from "lucide-react";
import ImageUploader from "@/components/upload/ImageUploader";
import VideoUploader from "@/components/upload/VideoUploader";
import { toast } from "sonner";

interface Category {
  id: string;
  name: string;
}

interface Tag {
  id: string;
  name: string;
}

interface Instructor {
  id: string;
  name: string;
}

interface AcademicTerm {
  id: string;
  title: string;
  year: number;
  semester: number;
}

interface User {
  id: string;
  name: string;
}

interface Course {
  id: string;
  title: string;
  slug: string;
  code?: string;
  description?: string;
  duration?: string;
  units: number;
  type: string;
  status: string;
  capacity?: number | null;
  discountPercent?: number;
  maxDiscountAmount?: { IRR?: number };
  image?: string;
  videoPreview?: string;
  isSaleEnabled: boolean;
  isLocked: boolean;
  instructorId: string;
  instructor: User;
  categories: { id: string }[];
  createdBy?: User | null;
  createdAt: string | Date;
}

interface Props {
  categories: Category[];
  tags: Tag[];
  instructors: Instructor[];
  currentTerm: AcademicTerm | null;

  mode?: "create" | "edit";
  course?: Course;
  existingTags?: string[];
  existingPrerequisites?: string[];
  existingWhatYouWillLearn?: string[];
  price?: { IRR?: number; USD?: number; EUR?: number };
  isAdmin?: boolean;
}

export default function CourseFormAdmin({
  categories,
  tags,
  instructors,
  currentTerm,
  mode = "create",
  course,
  existingTags = [],
  existingPrerequisites = [],
  existingWhatYouWillLearn = [],
  price = { IRR: 0, USD: 0, EUR: 0 },
  isAdmin = false,
}: Props) {
  const [imageUrl, setImageUrl] = useState<string>(course?.image || "");
  const [previewVideoUrl, setPreviewVideoUrl] = useState<string>(course?.videoPreview || "");

  const [selectedTags, setSelectedTags] = useState<string[]>(existingTags);
  const toggleTag = (tagId: string) => {
    setSelectedTags((prev) =>
      prev.includes(tagId)
        ? prev.filter((t) => t !== tagId)
        : prev.length < 8
        ? [...prev, tagId]
        : prev
    );
  };

  const [prerequisites, setPrerequisites] = useState<string[]>(existingPrerequisites);
  const [prereqInput, setPrereqInput] = useState("");

  const [whatYouWillLearn, setWhatYouWillLearn] = useState<string[]>(existingWhatYouWillLearn);
  const [learnInput, setLearnInput] = useState("");

  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);

    if (mode === "edit" && course?.id) {
      formData.append("courseId", course.id);
    }

    if (imageUrl && imageUrl !== course?.image) formData.set("image", imageUrl);
    if (previewVideoUrl && previewVideoUrl !== course?.videoPreview)
      formData.set("previewVideo", previewVideoUrl);

    formData.append("tags", JSON.stringify(selectedTags));
    formData.append("prerequisites", JSON.stringify(prerequisites));
    formData.append("whatYouWillLearn", JSON.stringify(whatYouWillLearn));

    const updatedPrice = {
      IRR: Number(formData.get("priceIRR")) || price.IRR || 0,
      USD: Number(formData.get("priceUSD")) || price.USD || 0,
      EUR: Number(formData.get("priceEUR")) || price.EUR || 0,
    };
    formData.append("price", JSON.stringify(updatedPrice));

    const discountPercent = Number(formData.get("discountPercent")) || 0;
    const maxDiscount = Number(formData.get("maxDiscount")) || 0;
    if (discountPercent > 0) {
      formData.append(
        "discount",
        JSON.stringify({
          percent: discountPercent,
          maxAmount: maxDiscount > 0 ? { IRR: maxDiscount } : undefined,
        })
      );
    } else {
      formData.delete("discount");
    }

    const capacity = formData.get("capacity")?.toString().trim();
    if (capacity && capacity !== "") {
      formData.set("capacity", capacity);
    } else {
      formData.delete("capacity");
    }

    if (currentTerm) {
      formData.append("termId", currentTerm.id);
    }

    try {
      const endpoint =
        mode === "edit" ? "/api/admin/courses/update" : "/api/admin/courses/create";

      const res = await fetch(endpoint, {
        method: mode === "edit" ? "PATCH" : "POST",
        body: formData,
      });

      if (res.ok) {
        toast.success(
          mode === "edit"
            ? "دوره با موفقیت بروزرسانی شد 🎉"
            : "دوره با موفقیت ایجاد شد 🎉"
        );
        setTimeout(() => {
          window.location.href = isAdmin ? "/admin/courses" : "/instructor/courses";
        }, 1500);
      } else {
        const error = await res.text();
        toast.error(error || "خطا در انجام عملیات");
      }
    } catch (err) {
      console.error(err);
      toast.error("خطا در ارتباط با سرور");
    } finally {
      setLoading(false);
    }
  };

  const MultiTextList = ({
    items,
    setItems,
    input,
    setInput,
    placeholder,
    icon,
  }: {
    items: string[];
    setItems: (items: string[]) => void;
    input: string;
    setInput: (val: string) => void;
    placeholder: string;
    icon: React.ReactNode;
  }) => {
    const addItem = () => {
      if (input.trim()) {
        setItems([...items, input.trim()]);
        setInput("");
      }
    };

    return (
      <div className="space-y-6">
        <div className="flex gap-4">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addItem();
              }
            }}
            placeholder={placeholder}
            className="flex-1 px-10 py-8 rounded-2xl border-4 border-border focus:border-primary outline-none text-2xl bg-background"
          />
          <button
            type="button"
            onClick={addItem}
            className="px-8 py-8 bg-primary text-white rounded-2xl hover:bg-primary/90 transition-all"
          >
            <Plus size={40} />
          </button>
        </div>
        {items.length > 0 && (
          <ul className="space-y-4">
            {items.map((item, i) => (
              <li
                key={i}
                className="flex items-center justify-between bg-muted/50 px-10 py-6 rounded-2xl text-2xl"
              >
                <span className="flex items-center gap-4">
                  {icon}
                  {item}
                </span>
                <button
                  type="button"
                  onClick={() => setItems(items.filter((_, idx) => idx !== i))}
                  className="text-red-500 hover:text-red-700"
                >
                  <X size={32} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    );
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-card/95 backdrop-blur-2xl rounded-3xl shadow-3xl p-12 lg:p-20 border border-border/50 space-y-20"
    >
      {/* اطلاعات ایجاد دوره - فقط در حالت ویرایش */}
      {mode === "edit" && (
        <div className="bg-gradient-to-r from-indigo-500/10 to-purple-500/10 border-4 border-indigo-500/50 rounded-3xl p-12 mb-20">
          <h3 className="text-5xl font-black mb-10 flex items-center gap-6 text-indigo-700">
            <UserPlus size={64} className="text-indigo-600" />
            اطلاعات ایجاد و وضعیت دوره
          </h3>
          <div className="grid md:grid-cols-3 gap-12 text-2xl">
            <div>
              <strong className="block mb-2">ایجاد شده توسط:</strong>
              <p className="font-bold text-indigo-700">
                {course?.createdBy?.name || "نامشخص (دوره قدیمی)"}
              </p>
            </div>
            <div>
              <strong className="block mb-2">تاریخ ایجاد:</strong>
              <p className="font-bold text-purple-700">
                {course?.createdAt
                  ? new Date(course.createdAt).toLocaleDateString("fa-IR")
                  : "-"}
              </p>
            </div>
            <div>
              <strong className="block mb-2">مدرس فعلی:</strong>
              <p className="font-bold text-emerald-700">{course?.instructor?.name}</p>
            </div>
          </div>

          {/* وضعیت قفل دوره */}
          {course?.isLocked && (
            <div className="mt-10 p-8 bg-red-500/20 border-4 border-red-500/50 rounded-2xl flex items-center gap-6">
              <Lock size={48} className="text-red-600" />
              <p className="text-3xl font-bold text-red-600">
                این دوره توسط مدیریت قفل شده و قابل ویرایش نیست.
              </p>
            </div>
          )}
        </div>
      )}

      {/* عنوان و مدرس */}
      <div className="grid md:grid-cols-2 gap-12">
        <div>
          <label className="flex items-center gap-4 text-4xl md:text-5xl font-black mb-8 text-foreground">
            <BookOpen size={56} className="text-primary" />
            عنوان دوره *
          </label>
          <input
            required
            name="title"
            defaultValue={course?.title}
            placeholder="جراحی ایمپلنت دیجیتال پیشرفته ۱۴۰۴"
            className="w-full px-10 py-8 rounded-2xl border-4 border-border focus:border-primary outline-none text-2xl md:text-3xl font-medium transition-all bg-background"
          />
        </div>
        <div>
          <label className="flex items-center gap-4 text-4xl md:text-5xl font-black mb-8 text-foreground">
            <Users size={56} className="text-success" />
            مدرس دوره *
          </label>
          {isAdmin ? (
            <select
              required
              name="instructorId"
              defaultValue={course?.instructorId}
              className="w-full px-10 py-8 rounded-2xl border-4 border-border focus:border-success outline-none text-2xl md:text-3xl font-medium bg-background"
            >
              <option value="">انتخاب مدرس</option>
              {instructors.map((ins) => (
                <option key={ins.id} value={ins.id}>
                  {ins.name}
                </option>
              ))}
            </select>
          ) : (
            <div className="w-full px-10 py-8 rounded-2xl bg-muted text-2xl md:text-3xl font-bold text-center flex items-center justify-center gap-4">
              <Users size={40} />
              {course?.instructor?.name || "شما"} (مدرس ثابت)
            </div>
          )}
        </div>
      </div>

      {/* کد، واحد، ترم */}
      <div className="grid md:grid-cols-3 gap-12">
        <div>
          <label className="flex items-center gap-4 text-4xl md:text-5xl font-black mb-8 text-foreground">
            <Tag size={56} className="text-secondary" />
            کد درس
          </label>
          <input
            name="code"
            defaultValue={course?.code}
            placeholder="DENT-901"
            className="w-full px-10 py-8 rounded-2xl border-4 border-border focus:border-secondary outline-none text-2xl md:text-3xl uppercase font-mono bg-background"
          />
        </div>
        <div>
          <label className="flex items-center gap-4 text-4xl md:text-5xl font-black mb-8 text-foreground">
            <BookOpen size={56} className="text-orange-600" />
            واحد درسی *
          </label>
          <input
            required
            name="units"
            type="number"
            min="1"
            max="6"
            defaultValue={course?.units || 3}
            className="w-full px-10 py-8 rounded-2xl border-4 border-border focus:border-orange-600 outline-none text-2xl md:text-3xl text-center font-bold bg-background"
          />
        </div>
        <div>
          <label className="flex items-center gap-4 text-4xl md:text-5xl font-black mb-8 text-foreground">
            <Calendar size={56} className="text-teal-600" />
            ترم پیش‌فرض
          </label>
          <div className="w-full px-10 py-8 rounded-2xl bg-gradient-to-r from-teal-100 to-cyan-100 text-2xl md:text-3xl font-black text-center flex items-center justify-center">
            {currentTerm ? `${currentTerm.title} (جاری)` : "ترم جاری تعریف نشده"}
          </div>
        </div>
      </div>

      {/* توضیحات کلی */}
      <div>
        <label className="flex items-center gap-4 text-4xl md:text-5xl font-black mb-8 text-foreground">
          <FileText size={56} className="text-pink-600" />
          توضیحات کلی دوره *
        </label>
        <textarea
          required
          name="description"
          rows={10}
          defaultValue={course?.description}
          placeholder="توضیح کامل، اهداف، مخاطبان، سرفصل‌ها..."
          className="w-full px-10 py-8 rounded-2xl border-4 border-border focus:border-pink-600 outline-none text-2xl resize-none bg-background"
        />
      </div>

      {/* پیش‌نیازها و آنچه یاد می‌گیرید */}
      <div>
        <label className="flex items-center gap-4 text-4xl md:text-5xl font-black mb-8 text-foreground">
          <GraduationCap size={56} className="text-amber-600" />
          پیش‌نیازها
        </label>
        <MultiTextList
          items={prerequisites}
          setItems={setPrerequisites}
          input={prereqInput}
          setInput={setPrereqInput}
          placeholder="مثلاً: آشنایی با آناتومی دندان"
          icon={<ListChecks size={32} className="text-amber-600" />}
        />
      </div>

      <div>
        <label className="flex items-center gap-4 text-4xl md:text-5xl font-black mb-8 text-foreground">
          <Flag size={56} className="text-emerald-600" />
          آنچه یاد می‌گیرید
        </label>
        <MultiTextList
          items={whatYouWillLearn}
          setItems={setWhatYouWillLearn}
          input={learnInput}
          setInput={setLearnInput}
          placeholder="مثلاً: تکنیک‌های پیشرفته ایمپلنت"
          icon={<CheckCircle size={32} className="text-emerald-600" />}
        />
      </div>

      {/* قیمت‌ها */}
      <div>
        <label className="flex items-center gap-4 text-4xl md:text-5xl font-black mb-8 text-foreground">
          <DollarSign size={56} className="text-emerald-600" />
          قیمت دوره *
        </label>
        <div className="grid md:grid-cols-3 gap-12">
          <div>
            <label className="block text-2xl font-bold text-emerald-700 mb-4">تومان (IRR)</label>
            <input
              required
              name="priceIRR"
              type="number"
              min="0"
              defaultValue={price.IRR}
              placeholder="2,500,000"
              className="w-full px-10 py-8 rounded-2xl border-4 border-emerald-300 focus:border-emerald-600 outline-none text-2xl md:text-3xl font-mono bg-background"
            />
          </div>
          <div>
            <label className="block text-2xl font-bold text-blue-700 mb-4">دلار (USD)</label>
            <input
              name="priceUSD"
              type="number"
              step="0.01"
              defaultValue={price.USD}
              placeholder="60.00"
              className="w-full px-10 py-8 rounded-2xl border-4 border-blue-300 focus:border-blue-600 outline-none text-2xl md:text-3xl font-mono bg-background"
            />
          </div>
          <div>
            <label className="block text-2xl font-bold text-purple-700 mb-4">یورو (EUR)</label>
            <input
              name="priceEUR"
              type="number"
              step="0.01"
              defaultValue={price.EUR}
              placeholder="55.00"
              className="w-full px-10 py-8 rounded-2xl border-4 border-purple-300 focus:border-purple-600 outline-none text-2xl md:text-3xl font-mono bg-background"
            />
          </div>
        </div>
      </div>

      {/* تخفیف، ظرفیت، نوع دوره */}
      <div className="grid md:grid-cols-4 gap-12">
        <div>
          <label className="flex items-center gap-4 text-4xl md:text-5xl font-black mb-8 text-foreground">
            <Percent size={56} className="text-orange-600" />
            درصد تخفیف
          </label>
          <input
            name="discountPercent"
            type="number"
            min="0"
            max="99"
            defaultValue={course?.discountPercent || ""}
            placeholder="25"
            className="w-full px-10 py-8 rounded-2xl border-4 border-orange-300 focus:border-orange-600 outline-none text-2xl md:text-3xl text-center bg-background"
          />
        </div>
        <div>
          <label className="flex items-center gap-4 text-4xl md:text-5xl font-black mb-8 text-foreground">
            <DollarSign size={56} className="text-red-600" />
            حداکثر تخفیف (تومان)
          </label>
          <input
            name="maxDiscount"
            type="number"
            defaultValue={course?.maxDiscountAmount?.IRR || ""}
            placeholder="1,000,000"
            className="w-full px-10 py-8 rounded-2xl border-4 border-red-300 focus:border-red-600 outline-none text-2xl md:text-3xl text-center font-mono bg-background"
          />
        </div>
        <div>
          <label className="flex items-center gap-4 text-4xl md:text-5xl font-black mb-8 text-foreground">
            <Users size={56} className="text-cyan-600" />
            ظرفیت (خالی = نامحدود)
          </label>
          <input
            name="capacity"
            type="number"
            defaultValue={course?.capacity || ""}
            placeholder="نامحدود"
            className="w-full px-10 py-8 rounded-2xl border-4 border-cyan-300 focus:border-cyan-600 outline-none text-2xl md:text-3xl text-center bg-background"
          />
        </div>
        <div>
          <label className="flex items-center gap-4 text-4xl md:text-5xl font-black mb-8 text-foreground">
            <Video size={56} className="text-rose-600" />
            نوع دوره *
          </label>
          <select
            required
            name="type"
            defaultValue={course?.type || "RECORDED"}
            className="w-full px-10 py-8 rounded-2xl border-4 border-rose-300 focus:border-rose-600 outline-none text-2xl md:text-3xl font-medium bg-background"
          >
            <option value="RECORDED">ضبط‌شده</option>
            <option value="LIVE">لایو</option>
            <option value="HYBRID">ترکیبی</option>
          </select>
        </div>
      </div>

      {/* دسته‌بندی و مدت زمان */}
      <div className="grid md:grid-cols-2 gap-12">
        <div>
          <label className="flex items-center gap-4 text-4xl md:text-5xl font-black mb-8 text-foreground">
            <BookOpen size={56} className="text-primary" />
            دسته‌بندی *
          </label>
          <select
            required
            name="categoryId"
            defaultValue={course?.categories[0]?.id || ""}
            className="w-full px-10 py-8 rounded-2xl border-4 border-border focus:border-primary outline-none text-2xl md:text-3xl font-medium bg-background"
          >
            <option value="">انتخاب دسته‌بندی</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="flex items-center gap-4 text-4xl md:text-5xl font-black mb-8 text-foreground">
            <Clock size={56} className="text-teal-600" />
            مدت زمان دوره *
          </label>
          <input
            required
            name="duration"
            defaultValue={course?.duration}
            placeholder="مثال: ۳۲ ساعت"
            className="w-full px-10 py-8 rounded-2xl border-4 border-teal-300 focus:border-teal-600 outline-none text-2xl md:text-3xl bg-background"
          />
        </div>
      </div>

      {/* تگ‌ها */}
      <div>
        <label className="flex items-center gap-4 text-4xl md:text-5xl font-black mb-8 text-foreground">
          <Tag size={56} className="text-secondary" />
          تگ‌ها (حداکثر ۸ تگ)
        </label>
        <div className="flex flex-wrap gap-6 mt-8">
          {tags.map((tag) => (
            <button
              key={tag.id}
              type="button"
              onClick={() => toggleTag(tag.id)}
              className={`px-10 py-6 rounded-2xl text-2xl font-bold transition-all hover:scale-105 shadow-lg ${
                selectedTags.includes(tag.id)
                  ? "bg-gradient-to-r from-secondary to-pink-600 text-white"
                  : "bg-muted text-muted-foreground hover:bg-accent"
              }`}
            >
              {tag.name}
            </button>
          ))}
        </div>
      </div>

      {/* آپلودها */}
      <div className="grid md:grid-cols-2 gap-16">
        <div>
          <label className="flex items-center gap-4 text-4xl md:text-5xl font-black mb-8 text-foreground">
            <ImageIcon size={56} className="text-emerald-600" />
            تصویر کاور (۱۶:۹) - اختیاری
          </label>
          <ImageUploader onUpload={setImageUrl} />
          {(imageUrl || course?.image) && (
            <p className="text-2xl text-success mt-6 flex items-center gap-4">
              <CheckCircle size={40} />
              {imageUrl !== course?.image ? "تصویر جدید آماده است" : "تصویر فعلی"}
            </p>
          )}
        </div>
        <div>
          <label className="flex items-center gap-4 text-4xl md:text-5xl font-black mb-8 text-foreground">
            <Video size={56} className="text-rose-600" />
            ویدیو پیش‌نمایش - اختیاری
          </label>
          <VideoUploader onUpload={setPreviewVideoUrl} />
          {(previewVideoUrl || course?.videoPreview) && (
            <p className="text-2xl text-success mt-6 flex items-center gap-4">
              <CheckCircle size={40} />
              {previewVideoUrl !== course?.videoPreview ? "ویدیو جدید آماده است" : "ویدیو فعلی"}
            </p>
          )}
        </div>
      </div>

      {/* وضعیت‌ها */}
      <div className="grid md:grid-cols-2 gap-12">
        <div>
          <label className="flex items-center gap-4 text-4xl md:text-5xl font-black mb-8 text-foreground">
            <Globe size={56} className="text-cyan-600" />
            وضعیت فروش
          </label>
          <select
            name="isSaleEnabled"
            defaultValue={course?.isSaleEnabled ? "true" : "false"}
            className="w-full px-10 py-8 rounded-2xl border-4 border-cyan-300 focus:border-cyan-600 outline-none text-2xl md:text-3xl font-medium bg-background"
          >
            <option value="true">فعال (قابل خرید)</option>
            <option value="false">غیرفعال</option>
          </select>
        </div>
        <div>
          <label className="flex items-center gap-4 text-4xl md:text-5xl font-black mb-8 text-foreground">
            <CheckCircle size={56} className="text-emerald-600" />
            وضعیت انتشار
          </label>
          <select
            name="status"
            defaultValue={course?.status || "DRAFT"}
            className="w-full px-10 py-8 rounded-2xl border-4 border-emerald-300 focus:border-emerald-600 outline-none text-2xl md:text-3xl font-medium bg-background"
          >
            <option value="PUBLISHED">منتشر شده</option>
            <option value="DRAFT">پیش‌نویس</option>
            <option value="PENDING_REVIEW">در انتظار بررسی</option>
            <option value="ARCHIVED">آرشیو شده</option>
            <option value="REJECTED">رد شده</option>
          </select>
        </div>
      </div>

      {/* قفل کردن دوره - فقط برای ادمین */}
      {isAdmin && mode === "edit" && (
        <div className="bg-red-500/10 border-4 border-red-500/50 rounded-3xl p-12">
          <label className="flex items-center gap-6 text-5xl font-black mb-10 text-red-600">
            <Lock size={64} className="text-red-600" />
            قفل کردن دوره (مدیریت پیشرفته)
          </label>
          <p className="text-3xl text-foreground/80 mb-10">
            با فعال کردن این گزینه، حتی خود مدرس هم دیگر نمی‌تواند دوره را ویرایش کند. مناسب برای دوره‌های منتشرشده و در حال فروش.
          </p>
          <select
            name="isLocked"
            defaultValue={course?.isLocked ? "true" : "false"}
            className="w-full px-10 py-8 rounded-2xl border-4 border-red-500 focus:border-red-700 outline-none text-3xl font-bold bg-background"
          >
            <option value="false">باز - قابل ویرایش توسط مدرس</option>
            <option value="true">قفل - غیرقابل ویرایش حتی برای مدرس</option>
          </select>
        </div>
      )}

      {/* دکمه ارسال */}
      <div className="text-center pt-12">
        <button
          type="submit"
          disabled={loading || (mode === "edit" && course?.isLocked && !isAdmin)}
          className="inline-flex items-center gap-8 bg-gradient-to-r from-emerald-500 via-teal-600 to-cyan-600 text-white px-32 py-12 rounded-3xl text-5xl md:text-6xl font-black hover:scale-105 transition-all shadow-3xl disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Upload size={80} />
          {loading
            ? "در حال پردازش..."
            : mode === "edit"
            ? "بروزرسانی دوره"
            : "ایجاد و انتشار دوره"}
        </button>
        <p className="text-2xl text-muted-foreground mt-12">
          {mode === "edit"
            ? "پس از بروزرسانی، می‌توانید سرفصل‌ها و درس‌ها را مدیریت کنید."
            : "پس از ایجاد دوره، می‌توانید سرفصل‌ها و درس‌ها را اضافه کنید."}
        </p>
      </div>
    </form>
  );
}