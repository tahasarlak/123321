// src/components/auth/RegisterForm.tsx

"use client";

import { useState, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import ReCAPTCHA from "react-google-recaptcha";
import { User, Mail, Phone, Lock, Eye, EyeOff, CheckCircle, Shield, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { registerSchema, type RegisterForm } from "@/lib/validations/auth";

type RegisterFormProps = {
  recaptchaToken: string | null;
  showRecaptchaButton: boolean;
  handleRecaptchaExecute: () => void;
  onSuccess?: () => void;
};

export default function RegisterForm({
  recaptchaToken,
  showRecaptchaButton,
  handleRecaptchaExecute,
  onSuccess,
}: RegisterFormProps) {
  const t = useTranslations("auth");
  const router = useRouter();

  const [isLoading, setIsLoading] = useState(false);
  const [showPasswords, setShowPasswords] = useState({ password: false, confirm: false });
  const [passwordStrength, setPasswordStrength] = useState(0);

  const recaptchaRef = useRef<ReCAPTCHA>(null);

  const form = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
  });

  const calculatePasswordStrength = (password: string) => {
    let strength = 0;
    if (password.length >= 8) strength += 25;
    if (/[A-Z]/.test(password)) strength += 25;
    if (/[0-9]/.test(password)) strength += 25;
    if (/[^A-Za-z0-9]/.test(password)) strength += 25;
    return strength;
  };

  const generateStrongPassword = () => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*";
    let password = "";
    for (let i = 0; i < 16; i++) password += chars.charAt(Math.floor(Math.random() * chars.length));
    form.setValue("password", password);
    form.setValue("passwordConfirm", password);
    setPasswordStrength(100);
    toast.success(t("strong_password_generated") || "رمز عبور قوی تولید شد!");
  };

  const onSubmit = async (data: RegisterForm) => {
    if (!recaptchaToken) {
      return toast.error(t("recaptcha_required") || "لطفاً تأیید امنیتی را انجام دهید");
    }

    setIsLoading(true);

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, recaptchaToken }),
      });

      const result = await res.json();

      if (res.ok) {
        toast.success(result.message || t("register_success") || "ثبت‌نام با موفقیت انجام شد!");
        onSuccess?.();
      } else {
        toast.error(result.message || t("register_error") || "خطایی در ثبت‌نام رخ داد");
      }
    } catch (error) {
      console.error("Register error:", error);
      toast.error(t("server_error") || "خطایی در ارتباط با سرور رخ داد");
    } finally {
      setIsLoading(false);
      recaptchaRef.current?.reset();
    }
  };

  return (
    <>
      <div className="text-center mb-8">
        <h2 className="text-4xl md:text-5xl font-black text-foreground mb-4">{t("join_rom")}</h2>
        <p className="text-lg text-muted-foreground">{t("register_desc")}</p>
      </div>

      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Name */}
        <div>
          <label className="flex items-center gap-3 text-xl md:text-2xl font-bold mb-3 text-foreground">
            <User size={32} className="text-primary" />
            {t("name")} *
          </label>
          <input
            {...form.register("name")}
            placeholder={t("name_placeholder")}
            className="w-full px-10 py-5 rounded-2xl border-4 border-border focus:border-primary outline-none text-lg bg-background"
          />
          {form.formState.errors.name && (
            <p className="text-red-500 text-sm mt-2">{form.formState.errors.name.message}</p>
          )}
        </div>

        {/* Email */}
        <div>
          <label className="flex items-center gap-3 text-xl md:text-2xl font-bold mb-3 text-foreground">
            <Mail size={32} className="text-primary" />
            {t("email")} *
          </label>
          <input
            {...form.register("email")}
            type="email"
            placeholder="email@example.com"
            className="w-full px-10 py-5 rounded-2xl border-4 border-border focus:border-primary outline-none text-lg bg-background"
          />
          {form.formState.errors.email && (
            <p className="text-red-500 text-sm mt-2">{form.formState.errors.email.message}</p>
          )}
        </div>

        {/* Phone */}
        <div>
          <label className="flex items-center gap-3 text-xl md:text-2xl font-bold mb-3 text-foreground">
            <Phone size={32} className="text-primary" />
            {t("phone")} *
          </label>
          <input
            {...form.register("phone")}
            placeholder="09123456789"
            dir="ltr"
            className="w-full px-10 py-5 rounded-2xl border-4 border-border focus:border-primary outline-none text-lg text-left font-mono bg-background"
          />
          {form.formState.errors.phone && (
            <p className="text-red-500 text-sm mt-2">{form.formState.errors.phone.message}</p>
          )}
        </div>

        {/* Password */}
        <div>
          <label className="flex items-center gap-3 text-xl md:text-2xl font-bold mb-3 text-foreground">
            <Lock size={32} className="text-primary" />
            {t("password")} *
          </label>
          <div className="relative">
            <input
              {...form.register("password", {
                onChange: (e) => setPasswordStrength(calculatePasswordStrength(e.target.value)),
              })}
              type={showPasswords.password ? "text" : "password"}
              placeholder={t("password_placeholder")}
              className="w-full px-10 py-5 pr-14 rounded-2xl border-4 border-border focus:border-primary outline-none text-lg bg-background"
            />
            <button
              type="button"
              onClick={() => setShowPasswords((prev) => ({ ...prev, password: !prev.password }))}
              className="absolute top-1/2 -translate-y-1/2 right-4 text-muted-foreground hover:text-primary"
            >
              {showPasswords.password ? <EyeOff size={28} /> : <Eye size={28} />}
            </button>
          </div>
          <div className="mt-4">
            <div className="h-3 bg-muted rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-500 ${
                  passwordStrength < 50 ? "bg-red-500" :
                  passwordStrength < 75 ? "bg-yellow-500" :
                  passwordStrength < 100 ? "bg-green-500" :
                  "bg-emerald-600"
                }`}
                style={{ width: `${passwordStrength}%` }}
              />
            </div>
            <p className="text-sm mt-2 text-foreground/70">
              قدرت رمز: {passwordStrength < 50 ? "ضعیف" : passwordStrength < 75 ? "متوسط" : passwordStrength < 100 ? "قوی" : "عالی"}
            </p>
          </div>
          <button type="button" onClick={generateStrongPassword} className="mt-3 text-primary hover:underline text-sm flex items-center gap-2">
            <Shield size={24} />
            تولید رمز عبور قوی
          </button>
          {form.formState.errors.password && (
            <p className="text-red-500 text-sm mt-2">{form.formState.errors.password.message}</p>
          )}
        </div>

        {/* Confirm Password */}
        <div>
          <label className="flex items-center gap-3 text-xl md:text-2xl font-bold mb-3 text-foreground">
            <CheckCircle size={32} className="text-success" />
            {t("confirm_password")} *
          </label>
          <div className="relative">
            <input
              {...form.register("passwordConfirm")}
              type={showPasswords.confirm ? "text" : "password"}
              placeholder={t("confirm_placeholder")}
              className="w-full px-10 py-5 pr-14 rounded-2xl border-4 border-border focus:border-primary outline-none text-lg bg-background"
            />
            <button
              type="button"
              onClick={() => setShowPasswords((prev) => ({ ...prev, confirm: !prev.confirm }))}
              className="absolute top-1/2 -translate-y-1/2 right-4 text-muted-foreground hover:text-primary"
            >
              {showPasswords.confirm ? <EyeOff size={28} /> : <Eye size={28} />}
            </button>
          </div>
          {form.formState.errors.passwordConfirm && (
            <p className="text-red-500 text-sm mt-2">{form.formState.errors.passwordConfirm.message}</p>
          )}
        </div>

        {/* Gender */}
        <div>
          <label className="flex items-center gap-3 text-xl md:text-2xl font-bold mb-3 text-foreground">
            <User size={32} className="text-primary" />
            {t("gender")}
          </label>
          <select
            {...form.register("gender")}
            className="w-full px-10 py-5 rounded-2xl border-4 border-border focus:border-primary outline-none text-lg bg-background"
          >
            <option value="">{t("gender_placeholder") || "انتخاب کنید (اختیاری)"}</option>
            <option value="MALE">{t("male")}</option>
            <option value="FEMALE">{t("female")}</option>
            <option value="OTHER">{t("other")}</option>
          </select>
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

        <button
          type="submit"
          disabled={isLoading || !recaptchaToken}
          className="w-full bg-gradient-to-r from-primary to-secondary text-white py-6 rounded-3xl text-2xl md:text-3xl font-black hover:scale-105 transition-all shadow-2xl disabled:opacity-70"
        >
          {isLoading ? <Loader2 className="animate-spin mx-auto" size={36} /> : t("register_button")}
        </button>
      </form>
    </>
  );
}