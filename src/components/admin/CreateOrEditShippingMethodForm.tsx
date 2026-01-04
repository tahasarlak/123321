// src/components/admin/CreateOrEditShippingMethodForm.tsx
"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Package,
  Truck,
  Clock,
  DollarSign,
  CheckCircle,
  Loader2,
  AlertCircle,
  Target,
} from "lucide-react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";

import {
  createShippingMethodSchema,
  updateShippingMethodSchema,
  type CreateShippingMethodForm,
  type UpdateShippingMethodForm,
} from "@/lib/validations/admin/shipping";
import { cn } from "@/lib/utils/cn";

interface Props {
  methodId?: string;
  initialData?: {
    title: string;
    type: "POST" | "COURIER" | "TIPAX" | "INTERNATIONAL" | "PRESENTIAL" | "FREE";
    cost?: number | null;
    costPercent?: number | null;
    freeAbove?: number | null;
    estimatedDays?: string | null;
    priority?: number;
    isActive?: boolean;
    zoneId?: string | null;
    pickupId?: string | null;
  };
}

export default function CreateOrEditShippingMethodForm({ methodId, initialData }: Props) {
  const t = useTranslations("admin");
  const router = useRouter();
  const isEdit = !!methodId;
  const [isPending, startTransition] = useTransition();

  const schema = isEdit ? updateShippingMethodSchema : createShippingMethodSchema;

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<CreateShippingMethodForm | UpdateShippingMethodForm>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: initialData?.title || "",
      type: initialData?.type || "POST",
      cost: initialData?.cost ?? undefined,
      costPercent: initialData?.costPercent ?? undefined,
      freeAbove: initialData?.freeAbove ?? undefined,
      estimatedDays: initialData?.estimatedDays || "",
      priority: initialData?.priority ?? 0,
      isActive: initialData?.isActive ?? true,
      zoneId: initialData?.zoneId || "",
      pickupId: initialData?.pickupId || "",
    },
  });

  const onSubmit = (data: CreateShippingMethodForm | UpdateShippingMethodForm) => {
    startTransition(async () => {
      const endpoint = isEdit ? `/api/admin/shipping/${methodId}` : "/api/admin/shipping/create";
      const method = isEdit ? "PATCH" : "POST";

      try {
        const res = await fetch(endpoint, {
          method,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });

        if (res.ok) {
          toast.success(isEdit ? t("shipping_updated") || "روش ارسال به‌روزرسانی شد!" : t("shipping_created") || "روش ارسال با موفقیت ایجاد شد!");
          router.push("/admin/shipping");
          router.refresh();
        } else {
          const err = await res.json();
          toast.error(err.error || t("operation_error") || "خطا در عملیات");
        }
      } catch {
        toast.error(t("server_error") || "مشکل در ارتباط با سرور");
      }
    });
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-4xl font-bold mb-12 text-center">
        {isEdit ? t("edit_shipping") || "ویرایش روش ارسال" : t("create_shipping") || "ایجاد روش ارسال جدید"}
      </h1>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-12 bg-card/95 backdrop-blur-2xl rounded-3xl shadow-3xl p-12 border border-border/50">
        {/* عنوان و نوع */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div>
            <label className="flex items-center gap-4 text-2xl font-bold mb-4">
              <Package size={40} className="text-primary" />
              {t("title") || "عنوان روش ارسال"} *
            </label>
            <input
              {...register("title")}
              placeholder={t("title_placeholder") || "پست پیشتاز"}
              className="w-full px-8 py-6 rounded-2xl border-4 border-border focus:border-primary text-xl shadow-2xl bg-background"
            />
            {errors.title && <p className="text-red-500 mt-2 flex items-center gap-2"><AlertCircle size={20} /> {errors.title.message}</p>}
          </div>

          <div>
            <label className="flex items-center gap-4 text-2xl font-bold mb-4">
              <Truck size={40} className="text-primary" />
              {t("type") || "نوع روش ارسال"} *
            </label>
            <select
              {...register("type")}
              className="w-full px-8 py-6 rounded-2xl border-4 border-border focus:border-primary text-xl shadow-2xl bg-background"
            >
              <option value="POST">{t("post") || "پست"}</option>
              <option value="COURIER">{t("courier") || "پیک موتوری"}</option>
              <option value="TIPAX">{t("tipax") || "تیپاکس"}</option>
              <option value="INTERNATIONAL">{t("international") || "بین‌المللی"}</option>
              <option value="PRESENTIAL">{t("presential") || "تحویل حضوری"}</option>
              <option value="FREE">{t("free") || "رایگان"}</option>
            </select>
          </div>
        </div>

        {/* هزینه‌ها */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <label className="flex items-center gap-4 text-2xl font-bold mb-4">
              <DollarSign size={40} className="text-primary" />
              {t("cost") || "هزینه ثابت (تومان)"}
            </label>
            <input
              {...register("cost", { valueAsNumber: true })}
              type="number"
              placeholder="50000"
              className="w-full px-8 py-6 rounded-2xl border-4 border-border focus:border-primary text-xl shadow-2xl bg-background"
            />
          </div>

          <div>
            <label className="flex items-center gap-4 text-2xl font-bold mb-4">
              <DollarSign size={40} className="text-primary" />
              {t("cost_percent") || "هزینه درصدی (%)"}
            </label>
            <input
              {...register("costPercent", { valueAsNumber: true })}
              type="number"
              min="0"
              max="100"
              placeholder="5"
              className="w-full px-8 py-6 rounded-2xl border-4 border-border focus:border-primary text-xl shadow-2xl bg-background"
            />
          </div>

          <div>
            <label className="flex items-center gap-4 text-2xl font-bold mb-4">
              <CheckCircle size={40} className="text-primary" />
              {t("free_above") || "رایگان بالای (تومان)"}
            </label>
            <input
              {...register("freeAbove", { valueAsNumber: true })}
              type="number"
              placeholder="500000"
              className="w-full px-8 py-6 rounded-2xl border-4 border-border focus:border-primary text-xl shadow-2xl bg-background"
            />
          </div>
        </div>

        {/* زمان تخمینی و اولویت */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div>
            <label className="flex items-center gap-4 text-2xl font-bold mb-4">
              <Clock size={40} className="text-primary" />
              {t("estimated_days") || "زمان تخمینی تحویل"}
            </label>
            <input
              {...register("estimatedDays")}
              placeholder="۳-۵ روز کاری"
              className="w-full px-8 py-6 rounded-2xl border-4 border-border focus:border-primary text-xl shadow-2xl bg-background"
            />
          </div>

          <div>
            <label className="flex items-center gap-4 text-2xl font-bold mb-4">
              <Target size={40} className="text-primary" />
              {t("priority") || "اولویت نمایش"}
            </label>
            <input
              {...register("priority", { valueAsNumber: true })}
              type="number"
              defaultValue={0}
              className="w-full px-8 py-6 rounded-2xl border-4 border-border focus:border-primary text-xl shadow-2xl bg-background"
            />
          </div>
        </div>

        {/* فعال بودن */}
        <div className="flex items-center gap-6">
          <input
            {...register("isActive")}
            type="checkbox"
            id="isActive"
            className="w-8 h-8 rounded accent-primary"
          />
          <label htmlFor="isActive" className="text-2xl font-bold cursor-pointer">
            {t("active") || "روش ارسال فعال باشد"}
          </label>
        </div>

        {/* دکمه ذخیره */}
        <div className="text-center pt-12">
          <button
            type="submit"
            disabled={isPending || isSubmitting}
            className={cn(
              "px-48 py-16 rounded-3xl text-6xl font-black shadow-3xl transition-all transform hover:scale-110",
              isPending || isSubmitting
                ? "bg-muted text-muted-foreground cursor-not-allowed"
                : "bg-gradient-to-r from-primary via-secondary to-pink-600 text-white"
            )}
          >
            {isPending || isSubmitting ? (
              <>
                <Loader2 className="inline-block animate-spin mr-8" size={64} />
                {t("saving") || "در حال ذخیره..."}
              </>
            ) : (
              t("save") || "ذخیره روش ارسال"
            )}
          </button>
        </div>
      </form>
    </div>
  );
}