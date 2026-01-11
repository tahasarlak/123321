"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { Loader2, Save, ArrowLeft, CalendarIcon, ChevronDown } from "lucide-react";
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
import { RESOURCES_BY_ROLE, type Role } from "@/config/resources";
import type { FormField, ResourceConfigWithForm } from "@/types/resource-types";
import { hasFormConfig } from "@/types/resource-types";

interface Props {
  role: Role;
  resource: string;
  initialData?: Record<string, any>;
  preloadData?: Record<string, any>;
}

export default function UniversalResourceFormAdmin({
  role,
  resource,
  initialData,
  preloadData = {},
}: Props) {
  const resources = RESOURCES_BY_ROLE[role];
  const rawConfig = resources[resource as keyof typeof resources];

if (!hasFormConfig(rawConfig)) {
  throw new Error(`فرم برای منبع ${resource} در نقش ${role} تعریف نشده است.`);
}

 const config = rawConfig as ResourceConfigWithForm<any>; // 
const fields = config.form.fields;

  const commonT = useTranslations("common");
  const router = useRouter();
  const isEdit = !!initialData?.id;
  const [isPending, startTransition] = useTransition();
  const [imageUrl, setImageUrl] = useState<string | null>(initialData?.image || null);
  const [galleryUrls, setGalleryUrls] = useState<string[]>(
    Array.isArray(initialData?.gallery) ? initialData.gallery : []
  );

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm({
    defaultValues: {
      ...initialData,
      ...fields
        .filter((f): f is FormField & { type: "multi-select" } => f.type === "multi-select")
        .reduce((acc, field) => {
          acc[field.name] = Array.isArray(initialData?.[field.name])
            ? initialData[field.name]
            : [];
          return acc;
        }, {} as Record<string, any>),
    },
  });

  const onSubmit = handleSubmit((data) => {
    startTransition(async () => {
      try {
        const formData = new FormData();

        Object.entries(data).forEach(([key, value]) => {
          if (value === undefined || value === null || value === "") return;
          if (Array.isArray(value)) {
            value.forEach((item) => formData.append(key, String(item)));
          } else {
            formData.append(key, String(value));
          }
        });

        // checkboxهای تیک نخورده
        fields
          .filter((f) => f.type === "checkbox")
          .forEach((field) => {
            if (!(field.name in data)) {
              formData.append(field.name, "false");
            }
          });

        // تصویر
        if (imageUrl && imageUrl !== initialData?.image) {
          formData.append("image", imageUrl);
        }

        // گالری
        galleryUrls.forEach((url) => {
          if (!initialData?.gallery?.includes(url)) {
            formData.append("gallery", url);
          }
        });

        let result;
        if (isEdit && initialData?.id) {
          if (!config.form.updateAction) {
            toast.error("عملیات ویرایش تعریف نشده است.");
            return;
          }
          result = await config.form.updateAction(formData, initialData.id);
        } else {
          if (!config.form.createAction) {
            toast.error("عملیات ایجاد تعریف نشده است.");
            return;
          }
          result = await config.form.createAction(formData);
        }

        if (result?.success) {
          toast.success(result.message || (isEdit ? "تغییرات ذخیره شد" : "ایجاد موفق"));
          router.push(`/dashboard/${role}/${resource}`);
          router.refresh();
        } else {
          toast.error(result?.message || "خطایی رخ داد");
        }
      } catch (error: any) {
        console.error("خطا در ارسال فرم:", error);
        toast.error(error?.message || "خطای ناشناخته");
      }
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

    const error = errors[field.name];

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
              {...register(field.name, {
                required: field.required ? `${field.label} الزامی است` : false,
                valueAsNumber: field.type === "number",
              })}
              className="text-xl py-6"
            />
            {error && <p className="text-sm text-destructive">{String(error.message)}</p>}
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
              rows={field.rows || 6}
              {...register(field.name, {
                required: field.required ? `${field.label} الزامی است` : false,
              })}
              className="text-xl resize-none"
            />
            {error && <p className="text-sm text-destructive">{String(error.message)}</p>}
          </div>
        );

      case "checkbox":
        return (
          <div className="flex items-center space-x-3 space-y-0">
            <Checkbox
              id={field.name}
              {...register(field.name)}
              defaultChecked={!!initialData?.[field.name]}
            />
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
                <img src={imageUrl} alt="preview" className="max-h-96 rounded-2xl shadow-2xl mx-auto object-contain" />
              </div>
            )}
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
                    <img src={url} alt={`gallery ${i}`} className="rounded-2xl shadow-xl object-cover h-48 w-full" />
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
                  className={cn("w-full justify-start text-left font-normal text-xl py-6", !dateValue && "text-muted-foreground")}
                >
                  <CalendarIcon className="mr-2 h-5 w-5" />
                  {dateValue ? format(new Date(dateValue), "PPP") : <span>{field.placeholder || "انتخاب تاریخ"}</span>}
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
          </div>
        );

      case "select":
        const selectValue = watch(field.name);
        const selectOptions = getOptions(field);
        return (
          <div className="space-y-2">
            <Label>
              {field.label} {field.required && <span className="text-red-500">*</span>}
            </Label>
            <Select onValueChange={(value) => setValue(field.name, value, { shouldValidate: true })} value={selectValue?.toString()}>
              <SelectTrigger className="text-xl py-6">
                <SelectValue placeholder={field.placeholder || "انتخاب کنید"} />
              </SelectTrigger>
              <SelectContent>
                {selectOptions.length === 0 ? (
                  <div className="py-6 text-center text-muted-foreground text-sm">گزینه‌ای موجود نیست</div>
                ) : (
                  selectOptions.map((opt) => (
                    <SelectItem key={String(opt.value)} value={String(opt.value)}>
                      {opt.label}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
            {error && <p className="text-sm text-destructive">{String(error.message)}</p>}
          </div>
        );

      case "multi-select":
        const multiValue: string[] = watch(field.name) || [];
        const multiOptions = getOptions(field);
        return (
          <div className="space-y-2">
            <Label>
              {field.label} {field.required && <span className="text-red-500">*</span>}
            </Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-between text-xl py-6">
                  <span>
                    {multiValue.length > 0 ? `${multiValue.length} مورد انتخاب شده` : field.placeholder || "هیچ موردی انتخاب نشده"}
                  </span>
                  <ChevronDown className="h-5 w-5 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-full p-0">
                <div className="max-h-96 overflow-y-auto">
                  {multiOptions.map((opt) => (
                    <label key={String(opt.value)} className="flex items-center gap-3 px-4 py-3 hover:bg-accent cursor-pointer">
                      <Checkbox
                        checked={multiValue.includes(String(opt.value))}
                        onCheckedChange={(checked) => {
                          const val = String(opt.value);
                          if (checked) {
                            setValue(field.name, [...multiValue, val], { shouldValidate: true });
                          } else {
                            setValue(field.name, multiValue.filter((v) => v !== val), { shouldValidate: true });
                          }
                        }}
                      />
                      <span>{opt.label}</span>
                    </label>
                  ))}
                </div>
              </PopoverContent>
            </Popover>
          </div>
        );

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
          onClick={() => router.push(`/dashboard/${role}/${resource}`)}
          disabled={isPending}
        >
          <ArrowLeft className="ml-2 h-5 w-5" />
          {commonT("cancel")}
        </Button>
        <Button type="submit" size="lg" disabled={isPending} className="px-12 text-xl">
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