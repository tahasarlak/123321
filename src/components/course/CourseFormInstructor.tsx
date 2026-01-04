// src/components/course/CourseFormInstructor.tsx
"use client";

import { useState, useEffect, useMemo } from "react";
import { useForm, useFieldArray, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import ImageUploader from "@/components/upload/ImageUploader";
import VideoUploader from "@/components/upload/VideoUploader";
import FileUploader from "@/components/upload/FileUploader";
import {
  Plus,
  Trash2,
  Move,
  ArrowRight,
  ArrowLeft,
  CheckCircle,
  PlayCircle,
} from "lucide-react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { useTranslations, useLocale } from "next-intl";
import { cn } from "@/lib/utils/cn";
import { courseInstructorSchema, CourseInstructorFormData } from "@/lib/validations/courses/instructor";
interface Props {
  instructorId: string;
  instructorName: string;
  categories: { id: string; name: string; slug: string }[];
  tags: { id: string; name: string; slug: string }[];
  currentTerm: { id: string; title: string };
}

const steps = [
  { number: 1, title: "اطلاعات پایه", description: "عنوان، توضیحات و جزئیات" },
  { number: 2, title: "رسانه و تگ‌ها", description: "تصاویر، ویدیو و برچسب‌ها" },
  { number: 3, title: "قیمت و پرداخت", description: "قیمت‌گذاری و حساب‌ها" },
  { number: 4, title: "سرفصل‌ها و محتوا", description: "فصول، دروس و فایل‌ها" },
  { number: 5, title: "پیش‌نمایش و ارسال", description: "بررسی نهایی و انتشار" },
];

export default function CourseFormInstructor({
  instructorId,
  instructorName,
  categories,
  tags,
  currentTerm,
}: Props) {
  const t = useTranslations("instructor");
  const locale = useLocale();
  const isRTL = locale === "fa";

  const [step, setStep] = useState(1);
  const [imageUrl, setImageUrl] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
    watch,
    setValue,
  } = useForm<CourseInstructorFormData>({
    resolver: zodResolver(courseInstructorSchema),
    defaultValues: {
      units: 3,
      type: "RECORDED",
      priceIRR: 0,
      tags: [],
      description: "",
      chapters: [
        {
          id: Date.now().toString(),
          title: "",
          description: "",
          lessons: [
            {
              id: Date.now().toString(),
              title: "",
              description: "",
              duration: "",
              attachments: [],
            },
          ],
        },
      ],
    },
  });

  const { fields: chapters, append: appendChapter, remove: removeChapter, move: moveChapter } = useFieldArray({
    control,
    name: "chapters",
  });

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = (event: any) => {
    const { active, over } = event;
    if (active.id !== over?.id) {
      const oldIndex = chapters.findIndex((c) => c.id === active.id);
      const newIndex = chapters.findIndex((c) => c.id === over?.id);
      moveChapter(oldIndex, newIndex);
    }
  };

  const toggleTag = (tagId: string) => {
    setSelectedTags((prev) =>
      prev.includes(tagId) ? prev.filter((t) => t !== tagId) : [...prev, tagId].slice(0, 8)
    );
  };

  useEffect(() => {
    setValue("tags", selectedTags);
  }, [selectedTags, setValue]);

  const watchedData = useWatch({ control });

  const courseProgress = useMemo(() => {
    if (!watchedData.chapters?.length) return 0;
    let totalLessons = 0;
    let completedLessons = 0;
    watchedData.chapters.forEach((chapter) => {
      if (chapter.lessons) {
        totalLessons += chapter.lessons.length;
        completedLessons += chapter.lessons.filter((lesson: any) => lesson.title?.trim()).length;
      }
    });
    return totalLessons === 0 ? 0 : Math.round((completedLessons / totalLessons) * 100);
  }, [watchedData.chapters]);

  const onSubmit = async (data: CourseInstructorFormData) => {
    if (!imageUrl) {
      toast.error(t("cover_required") || "تصویر کاور الزامی است");
      setStep(2);
      return;
    }
    if (!videoUrl) {
      toast.error(t("preview_required") || "ویدیو پیش‌نمایش الزامی است");
      setStep(2);
      return;
    }

    setLoading(true);

    const formData = new FormData();
    Object.entries(data).forEach(([key, value]) => {
      if (key === "tags" || key === "chapters") {
        formData.append(key, JSON.stringify(value));
      } else if (value !== undefined && value !== null && value !== "") {
        formData.append(key, String(value));
      }
    });
    formData.append("image", imageUrl);
    formData.append("videoPreview", videoUrl);
    formData.append("instructorId", instructorId);
    formData.append("termId", currentTerm.id);

    try {
      const res = await fetch("/api/instructor/courses/create", {
        method: "POST",
        body: formData,
      });

      if (res.ok) {
        toast.success(t("course_submitted") || "دوره با موفقیت ارسال شد و در انتظار تأیید ادمین است!");
        setTimeout(() => {
          window.location.href = "/instructor/courses";
        }, 2000);
      } else {
        const err = await res.text();
        toast.error(err || t("course_error") || "خطا در ارسال دوره");
      }
    } catch {
      toast.error(t("network_error") || "خطا در ارتباط با سرور");
    } finally {
      setLoading(false);
    }
  };

  const renderStepContent = () => {
    switch (step) {
      case 1:
        return (
          <Card className="bg-card/95 backdrop-blur-2xl border border-border/50 shadow-3xl p-8 md:p-12">
            <CardHeader className="text-center">
              <CardTitle className="text-6xl md:text-8xl font-black bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                {t("basic_info") || "اطلاعات پایه و توضیحات"}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-10">
              <Input
                {...register("title")}
                placeholder={t("title_placeholder") || "عنوان دوره"}
                className="text-4xl h-20 px-6 py-4 rounded-3xl border-4 border-border focus:border-primary"
              />
              {errors.title && <p className="text-red-600 text-xl">{errors.title.message}</p>}
              <Textarea
                {...register("description")}
                rows={8}
                placeholder={t("description_placeholder") || "توضیحات کامل دوره"}
                className="text-2xl resize-none rounded-3xl border-4 border-border focus:border-primary"
              />
              {errors.description && <p className="text-red-600 text-xl">{errors.description.message}</p>}
              <div className="grid md:grid-cols-4 gap-6">
                <Input {...register("code")} placeholder={t("code_placeholder") || "کد درس (اختیاری)"} className="text-xl uppercase font-mono" />
                <Input
                  type="number"
                  {...register("units", { valueAsNumber: true })}
                  placeholder={t("units_placeholder") || "واحد درسی"}
                  className="text-2xl text-center"
                />
                <Input {...register("duration")} placeholder={t("duration_placeholder") || "مدت کل (مثال: ۳۲ ساعت)"} className="text-2xl" />
                <Select onValueChange={(val) => setValue("type", val as any)}>
                  <SelectTrigger className="h-16 text-2xl">
                    <SelectValue placeholder={t("type_placeholder") || "نوع دوره"} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="RECORDED">{t("recorded") || "ضبط‌شده"}</SelectItem>
                    <SelectItem value="LIVE">{t("live") || "لایو"}</SelectItem>
                    <SelectItem value="HYBRID">{t("hybrid") || "ترکیبی"}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Select onValueChange={(val) => setValue("categoryId", val)}>
                <SelectTrigger className="h-16 text-3xl">
                  <SelectValue placeholder={t("category_placeholder") || "دسته‌بندی را انتخاب کنید"} />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id} className="text-2xl">
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.categoryId && <p className="text-red-600 text-xl">{errors.categoryId.message}</p>}
            </CardContent>
          </Card>
        );

      case 2:
        return (
          <Card className="bg-card/95 backdrop-blur-2xl border border-border/50 shadow-3xl p-8 md:p-12">
            <CardHeader className="text-center">
              <CardTitle className="text-6xl md:text-8xl font-black bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                {t("media_tags") || "رسانه و تگ‌ها"}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-12">
              <div className="grid lg:grid-cols-2 gap-12">
                <div>
                  <h3 className="text-4xl font-bold text-center mb-8">{t("cover_image") || "تصویر کاور *"}</h3>
                  <ImageUploader onUpload={setImageUrl} aspectRatio="16/9" />
                  {imageUrl && (
                    <Badge className="mt-4 text-xl px-6 py-3 bg-emerald-600">
                      <CheckCircle className="w-6 h-6 mr-2" />
                      {t("uploaded") || "آپلود شد"}
                    </Badge>
                  )}
                </div>
                <div>
                  <h3 className="text-4xl font-bold text-center mb-8">{t("preview_video") || "ویدیو پیش‌نمایش *"}</h3>
                  <VideoUploader onUpload={setVideoUrl} />
                  {videoUrl && (
                    <Badge className="mt-4 text-xl px-6 py-3 bg-emerald-600">
                      <CheckCircle className="w-6 h-6 mr-2" />
                      {t("uploaded") || "آپلود شد"}
                    </Badge>
                  )}
                </div>
              </div>
              <Separator />
              <div>
                <h3 className="text-4xl font-bold text-center mb-8">{t("course_tags") || "تگ‌های دوره"}</h3>
                <div className="flex flex-wrap justify-center gap-4">
                  {tags.map((tag) => (
                    <Badge
                      key={tag.id}
                      variant={selectedTags.includes(tag.id) ? "default" : "secondary"}
                      className={cn(
                        "text-xl px-6 py-3 rounded-full cursor-pointer transition-all hover:scale-105",
                        selectedTags.includes(tag.id)
                          ? "bg-gradient-to-r from-primary to-secondary"
                          : "bg-muted"
                      )}
                      onClick={() => toggleTag(tag.id)}
                    >
                      #{tag.name}
                    </Badge>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        );

      case 3:
        return (
          <Card className="bg-card/95 backdrop-blur-2xl border border-border/50 shadow-3xl p-8 md:p-12">
            <CardHeader className="text-center">
              <CardTitle className="text-6xl md:text-8xl font-black bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
                {t("pricing") || "قیمت و پرداخت"}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-10">
              <div className="grid md:grid-cols-3 gap-8">
                <div>
                  <label className="text-2xl font-semibold">{t("price") || "قیمت به تومان *"}</label>
                  <Input
                    type="number"
                    {...register("priceIRR", { valueAsNumber: true })}
                    placeholder="0"
                    className="text-3xl h-16 text-right font-mono"
                  />
                </div>
                <div>
                  <label className="text-2xl font-semibold">{t("discount_percent") || "درصد تخفیف"}</label>
                  <Input
                    type="number"
                    {...register("discountPercent", { valueAsNumber: true })}
                    placeholder="0"
                    className="text-3xl h-16 text-center"
                  />
                </div>
                <div>
                  <label className="text-2xl font-semibold">{t("max_discount") || "حداکثر تخفیف (تومان)"}</label>
                  <Input
                    type="number"
                    {...register("maxDiscount", { valueAsNumber: true })}
                    placeholder="0"
                    className="text-3xl h-16 text-right font-mono"
                  />
                </div>
              </div>
              <div>
                <label className="text-2xl font-semibold">{t("capacity") || "ظرفیت"}</label>
                <Input
                  type="number"
                  {...register("capacity", { valueAsNumber: true })}
                  placeholder={t("unlimited") || "نامحدود"}
                  className="text-3xl h-16 text-center"
                />
              </div>
            </CardContent>
          </Card>
        );

      case 4:
        return (
          <div className="space-y-12">
            <Card className="bg-card/95 backdrop-blur-2xl border border-border/50 shadow-3xl p-8 md:p-12">
              <CardHeader className="text-center">
                <CardTitle className="text-6xl md:text-8xl font-black bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                  {t("chapters_content") || "سرفصل‌ها و محتوا"}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                  <SortableContext items={chapters.map((c) => c.id)} strategy={verticalListSortingStrategy}>
                    {chapters.map((chapter, chapterIndex) => (
                      <SortableChapter
                        key={chapter.id}
                        id={chapter.id}
                        chapterIndex={chapterIndex}
                        control={control}
                        register={register}
                        removeChapter={removeChapter}
                        watch={watch}
                        setValue={setValue}
                      />
                    ))}
                  </SortableContext>
                </DndContext>
                <Button
                  type="button"
                  onClick={() =>
                    appendChapter({
                      id: Date.now().toString(),
                      title: "",
                      description: "",
                      lessons: [
                        {
                          id: Date.now().toString(),
                          title: "",
                          description: "",
                          duration: "",
                          attachments: [],
                        },
                      ],
                    })
                  }
                  variant="outline"
                  size="lg"
                  className="w-full mt-8 text-3xl h-16 rounded-2xl border-2 border-dashed border-primary hover:border-primary"
                >
                  <Plus className="w-8 h-8 mr-4" />
                  {t("add_chapter") || "افزودن فصل جدید"}
                </Button>
                <div className="mt-12">
                  <div className="flex justify-between text-xl text-muted-foreground mb-4">
                    <span>{t("chapters_progress") || "پیشرفت سرفصل‌ها"}</span>
                    <span>{courseProgress}%</span>
                  </div>
                  <Progress value={courseProgress} className="h-6" />
                </div>
              </CardContent>
            </Card>
          </div>
        );

      case 5:
        return (
          <div className="space-y-12">
            <h2 className="text-7xl md:text-9xl font-black text-center bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              {t("final_preview") || "پیش‌نمایش نهایی دوره"}
            </h2>
            <Card className="bg-card/95 backdrop-blur-2xl border border-border/50 shadow-3xl">
              <CardContent className="p-0">
                <div className="grid lg:grid-cols-2 gap-0">
                  <div className="relative h-96">
                    {imageUrl ? (
                      <img src={imageUrl} alt={watch("title")} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center">
                        <p className="text-4xl text-muted-foreground">{t("cover_image") || "تصویر کاور"}</p>
                      </div>
                    )}
                  </div>
                  <div className="p-12 space-y-8">
                    <h3 className="text-5xl md:text-7xl font-black text-foreground">
                      {watch("title") || t("course_title") || "عنوان دوره"}
                    </h3>
                    <p className="text-3xl text-primary font-bold">{t("instructor") || "استاد"}: {instructorName}</p>
                    <div className="text-4xl font-black text-success">
                      {watch("priceIRR")?.toLocaleString() || 0} {t("toman") || "تومان"}
                    </div>
                    {videoUrl && <video src={videoUrl} controls className="w-full rounded-3xl shadow-2xl" />}
                    <div className="grid md:grid-cols-2 gap-6 text-2xl">
                      <div>
                        <p><strong>{t("type") || "نوع"}:</strong> {watch("type")}</p>
                        <p><strong>{t("units") || "واحد"}:</strong> {watch("units")}</p>
                        <p><strong>{t("capacity") || "ظرفیت"}:</strong> {watch("capacity") || t("unlimited") || "نامحدود"}</p>
                      </div>
                      <div>
                        <p><strong>{t("duration") || "مدت"}:</strong> {watch("duration")}</p>
                        <p><strong>{t("term") || "ترم"}:</strong> {currentTerm.title}</p>
                        <p><strong>{t("tags") || "تگ‌ها"}:</strong> {selectedTags.length}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
            <div className="text-center space-y-8">
              <Button
                type="submit"
                disabled={loading || !imageUrl || !videoUrl}
                size="lg"
                className="w-full max-w-md text-4xl h-20 rounded-3xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 shadow-3xl"
              >
                {loading ? t("sending") || "در حال ارسال..." : t("submit_for_review") || "ارسال برای بررسی ادمین"}
              </Button>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="space-y-12">
      {/* Progress Indicator */}
      <div className="relative max-w-6xl mx-auto">
        <div className="grid grid-cols-5 gap-8">
          {steps.map((s) => (
            <Tooltip key={s.number}>
              <TooltipTrigger asChild>
                <div
                  className={cn(
                    "text-center cursor-pointer transition-all",
                    step >= s.number && "scale-110"
                  )}
                  onClick={() => setStep(s.number)}
                >
                  <div
                    className={cn(
                      "w-20 h-20 mx-auto rounded-full flex items-center justify-center transition-all duration-300 shadow-lg",
                      step === s.number
                        ? "bg-gradient-to-br from-primary to-secondary text-white"
                        : step > s.number
                        ? "bg-emerald-600 text-white"
                        : "bg-muted text-muted-foreground"
                    )}
                  >
                    {s.number}
                  </div>
                  <p className={cn(
                    "mt-4 text-xl md:text-2xl font-bold",
                    step === s.number ? "text-primary" : step > s.number ? "text-emerald-600" : "text-muted-foreground"
                  )}>
                    {s.title}
                  </p>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                {s.description}
              </TooltipContent>
            </Tooltip>
          ))}
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-12">
        {renderStepContent()}
      </form>

      {/* Navigation */}
      <div className="flex justify-between items-center pt-12 border-t border-border/30">
        <Button
          type="button"
          onClick={() => setStep((prev) => Math.max(1, prev - 1))}
          disabled={step === 1}
          variant="outline"
          size="lg"
          className="text-2xl h-16 px-12 rounded-3xl"
        >
          <ArrowLeft className={cn("w-8 h-8 mr-4", isRTL && "rotate-180 ml-4 mr-0")} />
          {t("previous_step") || "مرحله قبل"}
        </Button>
        {step < 5 && (
          <Button
            type="button"
            onClick={() => setStep((prev) => Math.min(5, prev + 1))}
            size="lg"
            className="text-2xl h-16 px-12 rounded-3xl bg-gradient-to-r from-primary to-secondary text-white"
          >
            {t("next_step") || "مرحله بعد"}
            <ArrowRight className={cn("w-8 h-8 ml-4", isRTL && "rotate-180 mr-4 ml-0")} />
          </Button>
        )}
      </div>
    </div>
  );
}

// Sortable Chapter Component
function SortableChapter({
  id,
  chapterIndex,
  control,
  register,
  removeChapter,
  watch,
  setValue,
}: any) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const { fields: lessons, append: appendLesson, remove: removeLesson } = useFieldArray({
    control,
    name: `chapters.${chapterIndex}.lessons`,
  });

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners} className="bg-card/90 rounded-3xl shadow-2xl p-8 mb-8 border border-border/30">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-6">
          <div className="w-12 h-12 bg-primary rounded-2xl flex items-center justify-center cursor-grab">
            <Move className="w-6 h-6 text-white" />
          </div>
          <Input
            {...register(`chapters.${chapterIndex}.title`)}
            placeholder="عنوان فصل"
            className="text-3xl font-bold"
          />
        </div>
        <Button type="button" onClick={() => removeChapter(chapterIndex)} variant="ghost" size="icon">
          <Trash2 className="w-6 h-6 text-destructive" />
        </Button>
      </div>
      <Textarea
        {...register(`chapters.${chapterIndex}.description`)}
        placeholder="توضیحات فصل (اختیاری)"
        rows={3}
        className="mb-6"
      />
      <div className="space-y-6">
        {lessons.map((lesson: any, lessonIndex: number) => (
          <Card key={lesson.id} className="p-6">
            <div className="flex items-start gap-6">
              <div className="w-10 h-10 bg-secondary rounded-full flex items-center justify-center">
                <PlayCircle className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1 space-y-4">
                <div className="flex items-center gap-4">
                  <Input
                    {...register(`chapters.${chapterIndex}.lessons.${lessonIndex}.title`)}
                    placeholder="عنوان درس"
                    className="text-2xl"
                  />
                  <Input
                    {...register(`chapters.${chapterIndex}.lessons.${lessonIndex}.duration`)}
                    placeholder="مدت (دقیقه)"
                    className="w-32 text-center"
                  />
                </div>
                <Textarea
                  {...register(`chapters.${chapterIndex}.lessons.${lessonIndex}.description`)}
                  placeholder="توضیحات درس"
                  rows={2}
                />
                <VideoUploader onUpload={(url) => setValue(`chapters.${chapterIndex}.lessons.${lessonIndex}.videoUrl`, url)} />
                <FileUploader
                  onUpload={(url, name) => {
                    const current = watch(`chapters.${chapterIndex}.lessons.${lessonIndex}.attachments`) || [];
                    setValue(`chapters.${chapterIndex}.lessons.${lessonIndex}.attachments`, [...current, { name, url }]);
                  }}
                  multiple
                />
              </div>
              <Button type="button" onClick={() => removeLesson(lessonIndex)} variant="ghost" size="icon">
                <Trash2 className="w-5 h-5 text-destructive" />
              </Button>
            </div>
          </Card>
        ))}
        <Button
          type="button"
          onClick={() =>
            appendLesson({
              id: Date.now().toString(),
              title: "",
              description: "",
              duration: "",
              attachments: [],
            })
          }
          variant="outline"
          className="w-full"
        >
          <Plus className="w-5 h-5 mr-2" />
          افزودن درس جدید
        </Button>
      </div>
    </div>
  );
}