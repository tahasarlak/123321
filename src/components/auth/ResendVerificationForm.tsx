"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Mail, Loader2, ArrowLeft } from "lucide-react";
import { forgotSchema, type ForgotForm } from "@/lib/validations/auth";

type ResendVerificationFormProps = {
  /** اگر از داخل AuthPage استفاده شد، این callback برای بازگشت بدون رفرش فراخوانی شود */
  onBack?: () => void;
};

export default function ResendVerificationForm({ onBack }: ResendVerificationFormProps = {}) {
  const t = useTranslations("auth");
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<ForgotForm>({
    resolver: zodResolver(forgotSchema),
  });

  const onSubmit = async (data: ForgotForm) => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/auth/verify-email/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      const result = await res.json();

      if (res.ok) {
        toast.success(result.message || t("verification_sent") || "لینک تأیید مجدد ارسال شد!");

        // هر دو حالت در نهایت به صفحه موفقیت می‌رن
        router.push("/auth?resend_verification=true");
      } else {
        toast.error(result.message || t("send_error") || "خطایی در ارسال لینک رخ داد");
      }
    } catch {
      toast.error(t("server_error") || "خطایی در ارتباط با سرور رخ داد");
    } finally {
      setIsLoading(false);
    }
  };

  const handleBack = () => {
    if (onBack) {
      // حالت داخلی: فقط فرم رو ببند (بدون رفرش یا ریدایرکت)
      onBack();
    } else {
      // حالت صفحه مستقل: ریدایرکت به صفحه اصلی ورود
      router.push("/auth");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-accent/20 to-background flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-card rounded-3xl shadow-2xl p-8 border border-border/50">
        <h2 className="text-3xl md:text-4xl font-black text-center mb-8 text-foreground">
          {t("resend_verification") || "ارسال مجدد لینک تأیید ایمیل"}
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
              <p className="text-red-500 text-sm mt-2">{form.formState.errors.email.message}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-gradient-to-r from-primary to-secondary text-white py-6 rounded-3xl text-2xl md:text-3xl font-black hover:scale-105 transition-all shadow-2xl disabled:opacity-70"
          >
            {isLoading ? (
              <Loader2 className="animate-spin mx-auto" size={36} />
            ) : (
              t("send_verification_link") || "ارسال لینک تأیید"
            )}
          </button>
        </form>

        {/* دکمه بازگشت هوشمند */}
        <button
          onClick={handleBack}
          disabled={isLoading}
          className="mt-8 w-full flex items-center justify-center gap-2 text-primary hover:underline text-lg font-medium"
        >
          <ArrowLeft className="size-5" />
          {t("back_to_login") || "بازگشت به صفحه ورود"}
        </button>
      </div>
    </div>
  );
}