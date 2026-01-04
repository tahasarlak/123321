// src/components/auth/LoginForm.tsx

"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Mail, Lock, Eye, EyeOff, CheckCircle, Shield, Loader2 } from "lucide-react";
import { loginSchema, type LoginForm } from "@/lib/validations/auth";

type LoginFormProps = {
  recaptchaToken: string | null;
  showRecaptchaButton: boolean;
  handleRecaptchaExecute: () => void;
  toggleForgot: () => void;
  toggleResendVerification: () => void; // ← اضافه شد
};

export default function LoginForm({
  recaptchaToken,
  showRecaptchaButton,
  handleRecaptchaExecute,
  toggleForgot,
  toggleResendVerification,
}: LoginFormProps) {
  const t = useTranslations("auth");
  const router = useRouter();

  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const form = useForm<LoginForm>({ resolver: zodResolver(loginSchema) });

  const onSubmit = async (data: LoginForm) => {
    if (!recaptchaToken) return toast.error(t("recaptcha_required"));
    setIsLoading(true);
    const res = await signIn("credentials", {
      email: data.email,
      password: data.password,
      redirect: false,
    });
    if (res?.ok) {
      toast.success(t("login_success") || "خوش آمدید!");
      router.push("/dashboard");
    } else {
      toast.error(res?.error === "AccessDenied" ? t("verify_email") : t("invalid_credentials"));
    }
    setIsLoading(false);
  };

  return (
    <>
      <div className="text-center mb-8">
        <h2 className="text-4xl md:text-5xl font-black text-foreground mb-4">{t("welcome_back")}</h2>
        <p className="text-lg text-muted-foreground">{t("login_desc")}</p>
      </div>

      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Email */}
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
          />
          {form.formState.errors.email && <p className="text-red-500 text-sm mt-2">{form.formState.errors.email.message}</p>}
        </div>

        {/* Password */}
        <div>
          <label className="flex items-center gap-3 text-xl md:text-2xl font-bold mb-3 text-foreground">
            <Lock size={32} className="text-primary" />
            {t("password")}
          </label>
          <div className="relative">
            <input
              {...form.register("password")}
              type={showPassword ? "text" : "password"}
              placeholder={t("password_placeholder")}
              className="w-full px-10 py-5 pr-14 rounded-2xl border-4 border-border focus:border-primary outline-none text-lg bg-background"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute top-1/2 -translate-y-1/2 right-4 text-muted-foreground hover:text-primary"
            >
              {showPassword ? <EyeOff size={28} /> : <Eye size={28} />}
            </button>
          </div>
        </div>

        {/* reCAPTCHA */}
        <div className="mt-6">
          {!showRecaptchaButton ? (
            <div className="flex flex-col items-center py-6">
              <div className="w-full h-14 bg-muted/50 rounded-2xl animate-pulse" />
              <p className="text-muted-foreground text-sm mt-3">{t("loading_recaptcha") || "در حال بارگذاری..."}</p>
            </div>
          ) : (
            <button
              type="button"
              onClick={handleRecaptchaExecute}
              disabled={!!recaptchaToken || isLoading}
              className="w-full bg-muted hover:bg-muted/80 py-5 rounded-2xl text-lg font-bold flex items-center justify-center gap-3 disabled:opacity-60"
            >
              {recaptchaToken ? (
                <>
                  <CheckCircle size={32} className="text-green-500" />
                  {t("recaptcha_verified") || "تأیید شدید!"}
                </>
              ) : (
                <>
                  <Shield size={28} />
                  {t("recaptcha_prompt") || "تأیید کنید که ربات نیستید"}
                </>
              )}
            </button>
          )}
          {recaptchaToken && <p className="text-green-600 text-center mt-3 font-medium">✅ {t("recaptcha_verified")}</p>}
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isLoading || !recaptchaToken}
          className="w-full bg-gradient-to-r from-primary to-secondary text-white py-6 rounded-3xl text-2xl md:text-3xl font-black hover:scale-105 transition-all shadow-2xl disabled:opacity-70"
        >
          {isLoading ? <Loader2 className="animate-spin mx-auto" size={36} /> : t("login_button")}
        </button>

        {/* لینک‌های اضافی */}
        <div className="text-center mt-6 space-y-3">
          <button type="button" onClick={toggleForgot} className="text-primary hover:underline text-lg block">
            {t("forgot_password")}
          </button>
          <button
            type="button"
            onClick={toggleResendVerification}
            className="text-primary hover:underline text-lg block"
          >
            {t("resend_verification_link") || "ایمیل تأیید دریافت نکردید؟ ارسال مجدد"}
          </button>
        </div>
      </form>
    </>
  );
}