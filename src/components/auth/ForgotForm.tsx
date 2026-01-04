// src/app/[locale]/(auth)/ForgotForm.tsx
"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { Mail, Loader2, CheckCircle, ArrowRight } from "lucide-react";
import { forgotSchema, type ForgotForm } from "@/lib/validations/auth";

type ForgotFormProps = {
  toggleBack: () => void;
};

export default function ForgotForm({ toggleBack }: ForgotFormProps) {
  const t = useTranslations("auth");
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [countdown, setCountdown] = useState(10);

  const form = useForm<ForgotForm>({ resolver: zodResolver(forgotSchema) });

  const onSubmit = async (data: ForgotForm) => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/auth/forgot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const result = await res.json();

      if (res.ok) {
        setSuccess(true);

        // شروع تایمر شمارش معکوس
        const timer = setInterval(() => {
          setCountdown((prev) => {
            if (prev <= 1) {
              clearInterval(timer);
              toggleBack(); // بازگشت اتوماتیک به لاگین
              return 0;
            }
            return prev - 1;
          });
        }, 1000);

        toast.success(result.message || t("recovery_sent"));
      } else {
        toast.error(result.error || t("email_not_found"));
      }
    } catch {
      toast.error(t("server_error"));
    } finally {
      setIsLoading(false);
    }
  };

  // اگر موفقیت‌آمیز بود، پیام زیبا با تایمر نشون بده
  if (success) {
    return (
      <div className="max-w-md mx-auto text-center py-12">
        <div className="mb-8">
          <CheckCircle className="size-32 mx-auto text-green-500 mb-6" />
          <h2 className="text-4xl md:text-5xl font-black text-foreground mb-4">
            {t("recovery_link_sent") || "لینک بازیابی ارسال شد!"}
          </h2>
          <p className="text-xl text-muted-foreground leading-relaxed">
            {t("check_your_email") || "لطفاً ایمیل خود را چک کنید و روی لینک بازیابی کلیک کنید."}
          </p>
        </div>

        <div className="my-10">
          <p className="text-lg text-muted-foreground mb-4">
            {t("returning_in") || "اتوماتیک به صفحه ورود برمی‌گردید در:"}
          </p>
          <div className="text-6xl font-black text-primary tabular-nums">
            {countdown}
          </div>
        </div>

        <button
          onClick={toggleBack}
          className="inline-flex items-center gap-3 text-lg font-bold text-primary hover:underline"
        >
          {t("back_to_login_now") || "بازگشت فوری به ورود"}
          <ArrowRight className="size-6" />
        </button>
      </div>
    );
  }

  // فرم اصلی
  return (
    <div className="max-w-md mx-auto text-center">
      <h2 className="text-3xl md:text-4xl font-black mb-8 text-foreground">
        {t("recover_password")}
      </h2>

      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div>
          <label className="flex items-center gap-3 text-xl md:text-2xl font-bold mb-3 text-foreground">
            <Mail size={32} className="text-primary" />
            {t("email")}
          </label>
          <input
            {...form.register("email")}
            type="email"
            placeholder="email@example.com"
            className="w-full px-10 py-5 rounded-2xl border-4 border-border focus:border-primary outline-none text-lg bg-background"
            disabled={isLoading}
          />
          {form.formState.errors.email && (
            <p className="text-red-500 text-sm mt-2 text-left">
              {form.formState.errors.email.message}
            </p>
          )}
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full bg-gradient-to-r from-primary to-secondary text-white py-6 rounded-3xl text-2xl md:text-3xl font-black hover:scale-105 transition-all shadow-2xl disabled:opacity-70 flex items-center justify-center gap-4"
        >
          {isLoading ? (
            <>
              <Loader2 className="animate-spin" size={36} />
              {t("sending") || "در حال ارسال..."}
            </>
          ) : (
            t("send_recovery_link")
          )}
        </button>
      </form>

      <button
        onClick={toggleBack}
        className="mt-8 text-primary hover:underline text-lg"
        disabled={isLoading}
      >
        {t("back_to_login")}
      </button>
    </div>
  );
}