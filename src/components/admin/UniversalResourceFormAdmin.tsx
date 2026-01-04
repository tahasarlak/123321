// src/components/admin/UniversalResourceFormAdmin.tsx
"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Loader2,
  Save,
  ArrowLeft,
  CalendarIcon,
  ChevronDown,
} from "lucide-react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";

import ImageUploader from "@/components/upload/ImageUploader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils/cn";
import { format } from "date-fns-jalali";

import { FormField } from "@/types/resource-types"; // فرض بر این است که نوع FormField اینجا import شده

type FieldType =
  | "text"
  | "email"
  | "password"
  | "number"
  | "textarea"
  | "select"
  | "multi-select"
  | "checkbox"
  | "date"
  | "image"
  | "gallery";

interface Props {
  resource: string;
  initialData?: Record<string, any>;
  preloadData?: Record<string, any>;
  fields: FormField[];
}

export default function UniversalResourceFormAdmin({
  resource,
  initialData,
  preloadData = {},
  fields,
}: Props) {
  const t = useTranslations(`admin.${resource}`);
  const commonT = useTranslations("common");
  const router = useRouter();

  const isEdit = !!initialData?.id;

  const [isPending, startTransition] = useTransition();
  const [imageUrl, setImageUrl] = useState<string | null>(
    initialData?.image || null
  );
  const [galleryUrls, setGalleryUrls] = useState<string[]>(
    Array.isArray(initialData?.gallery) ? initialData.gallery : []
  );

  // ساخت اسکیما با zod
  const formSchema = z.object(
    fields.reduce((acc: Record<string, z.ZodTypeAny>, field) => {
      const isRequired = field.required === true;

      let fieldSchema: z.ZodTypeAny;

      if (isRequired) {
        if (field.type === "number") {
          fieldSchema = z.coerce.number().positive({
            message: `${field.label} باید عدد مثبت باشد`,
          });
        } else if (field.type === "date") {
          fieldSchema = z.string().min(1, {
            message: `${field.label} الزامی است`,
          });
        } else {
          fieldSchema = z.string().min(1, {
            message: `${field.label} الزامی است`,
          });
        }
      } else {
        fieldSchema = z.any().optional();
      }

      acc[field.name] = fieldSchema;
      return acc;
    }, {} as Record<string, z.ZodTypeAny>)
  );

  type FormData = z.infer<typeof formSchema>;

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: initialData || {},
  });

  const onSubmit = handleSubmit((data) => {
    startTransition(async () => {
      const submitData = {
        ...data,
        image: imageUrl || undefined,
        gallery: galleryUrls.length > 0 ? galleryUrls : undefined,
      };

      // TODO: اینجا server action واقعی خودتون رو فراخوانی کنید
      console.log("فرم ارسال شد:", { resource, isEdit, data: submitData });

      toast.success(
        isEdit ? "تغییرات با موفقیت ذخیره شد!" : "ایجاد با موفقیت انجام شد!"
      );

      router.push(`/dashboard/admin/${resource}`);
      router.refresh();
    });
  });

  const getOptions = (field: FormField): Array<{ value: string | number; label: string }> => {
    if (!field.options) return [];

    if (typeof field.options === "string" && field.options.startsWith("preload.")) {
      const key = field.options.split(".")[1];
      return preloadData[key] || [];
    }

    return Array.isArray(field.options) ? field.options : [];
  };

  const renderField = (field: FormField) => {
    if (field.createOnly && isEdit) return null;
    if (field.editOnly && !isEdit) return null;

    const error = errors[field.name as keyof FormData];

    switch (field.type) {
      case "text":
      case "email":
      case "password":
      case "number":
        return (
          <div className="space-y-2">
            <Label htmlFor={field.name}>
              {field.label} {field.required && <span className="text-red-500">*</span>}
            </Label>
            <Input
              id={field.name}
              type={field.type}
              placeholder={field.placeholder}
              {...register(field.name, { valueAsNumber: field.type === "number" })}
              className="text-xl py-6"
            />
            {error && <p className="text-sm text-destructive">{error.message as string}</p>}
          </div>
        );

      case "textarea":
        return (
          <div className="space-y-2">
            <Label htmlFor={field.name}>
              {field.label} {field.required && <span className="text-red-500">*</span>}
            </Label>
            <Textarea
              id={field.name}
              placeholder={field.placeholder}
              rows={6}
              {...register(field.name)}
              className="text-xl resize-none"
            />
            {error && <p className="text-sm text-destructive">{error.message as string}</p>}
          </div>
        );

      case "checkbox":
        return (
          <div className="flex items-center space-x-3 space-y-0">
            <Checkbox id={field.name} {...register(field.name)} />
            <Label htmlFor={field.name} className="font-medium text-lg cursor-pointer">
              {field.label}
            </Label>
          </div>
        );

      case "image":
        return (
          <div className="space-y-4">
            <Label>
              {field.label} {field.required && <span className="text-red-500">*</span>}
            </Label>
            <ImageUploader onUpload={setImageUrl} />
            {imageUrl && (
              <div className="mt-4">
                <img
                  src={imageUrl}
                  alt="preview"
                  className="max-h-96 rounded-2xl shadow-2xl mx-auto object-contain"
                />
              </div>
            )}
            {error && <p className="text-sm text-destructive">{error.message as string}</p>}
          </div>
        );

      case "gallery":
        return (
          <div className="space-y-4">
            <Label>{field.label}</Label>
            <ImageUploader onUpload={(url) => setGalleryUrls((prev) => [...prev, url])} multiple />
            {galleryUrls.length > 0 && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-6">
                {galleryUrls.map((url, i) => (
                  <div key={i} className="relative group">
                    <img
                      src={url}
                      alt={`gallery ${i}`}
                      className="rounded-2xl shadow-xl object-cover h-48 w-full"
                    />
                    <button
                      type="button"
                      onClick={() => setGalleryUrls((prev) => prev.filter((_, index) => index !== i))}
                      className="absolute top-2 right-2 bg-destructive text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        );

      case "date":
        const dateValue = watch(field.name);
        return (
          <div className="space-y-2">
            <Label>
              {field.label} {field.required && <span className="text-red-500">*</span>}
            </Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal text-xl py-6",
                    !dateValue && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-5 w-5" />
                  {dateValue ? format(new Date(dateValue), "PPP") : <span>انتخاب تاریخ</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={dateValue ? new Date(dateValue) : undefined}
                  onSelect={(date) => setValue(field.name, date?.toISOString(), { shouldValidate: true })}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
            {error && <p className="text-sm text-destructive">{error.message as string}</p>}
          </div>
        );

      case "select": {
        const selectValue = watch(field.name);
        let selectOptions = getOptions(field);

        // فیلتر گزینه‌های معتبر
        selectOptions = selectOptions.filter(
          (opt) => opt && opt.value != null && String(opt.value).trim() !== ""
        );

        return (
          <div className="space-y-2">
            <Label>
              {field.label} {field.required && <span className="text-red-500">*</span>}
            </Label>
            <Select
              onValueChange={(value) => setValue(field.name, value)}
              defaultValue={selectValue?.toString() ?? undefined}
            >
              <SelectTrigger className="text-xl py-6">
                <SelectValue placeholder="انتخاب کنید" />
              </SelectTrigger>
              <SelectContent>
                {selectOptions.length === 0 ? (
                  <div className="py-6 text-center text-muted-foreground text-sm">
                    گزینه‌ای موجود نیست
                  </div>
                ) : (
                  selectOptions.map((opt) => (
                    <SelectItem key={String(opt.value)} value={String(opt.value)}>
                      {opt.label || "گزینه بدون عنوان"}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
            {error && <p className="text-sm text-destructive">{error.message as string}</p>}
          </div>
        );
      }

      case "multi-select": {
        const multiValue = watch(field.name) || [];
        const multiOptions = getOptions(field);

        return (
          <div className="space-y-2">
            <Label>
              {field.label} {field.required && <span className="text-red-500">*</span>}
            </Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full justify-between text-xl py-6"
                >
                  <span>
                    {multiValue.length > 0
                      ? `${multiValue.length} مورد انتخاب شده`
                      : "هیچ موردی انتخاب نشده"}
                  </span>
                  <ChevronDown className="h-5 w-5 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-full p-0">
                <div className="max-h-96 overflow-y-auto">
                  {multiOptions.map((opt) => (
                    <label
                      key={String(opt.value)}
                      className="flex items-center gap-3 px-4 py-3 hover:bg-accent cursor-pointer"
                    >
                      <Checkbox
                        checked={multiValue.includes(String(opt.value))}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setValue(field.name, [...multiValue, String(opt.value)]);
                          } else {
                            setValue(
                              field.name,
                              multiValue.filter((v: string) => v !== String(opt.value))
                            );
                          }
                        }}
                      />
                      <span>{opt.label}</span>
                    </label>
                  ))}
                </div>
              </PopoverContent>
            </Popover>
            {error && <p className="text-sm text-destructive">{error.message as string}</p>}
          </div>
        );
      }

      default:
        return null;
    }
  };

  return (
    <form onSubmit={onSubmit} className="space-y-20">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
        {fields.map((field) => (
          <div key={field.name}>{renderField(field)}</div>
        ))}
      </div>

      <div className="flex justify-end gap-6 pt-12 border-t border-border">
        <Button
          type="button"
          variant="outline"
          size="lg"
          onClick={() => router.push(`/dashboard/admin/${resource}`)}
          disabled={isPending}
        >
          <ArrowLeft className="ml-2 h-5 w-5" />
          {commonT("cancel")}
        </Button>

        <Button
          type="submit"
          size="lg"
          disabled={isPending}
          className="px-12 text-xl"
        >
          {isPending ? (
            <>
              <Loader2 className="ml-2 h-5 w-5 animate-spin" />
              {commonT("saving")}
            </>
          ) : (
            <>
              <Save className="ml-2 h-5 w-5" />
              {isEdit ? commonT("save_changes") : commonT("create")}
            </>
          )}
        </Button>
      </div>
    </form>
  );
}