"use client";
import { useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import ReCAPTCHA from "react-google-recaptcha";
import { useSearchParams, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import AuthLayout from "@/components/auth/AuthLayout";
import ForgotForm from "@/components/auth/ForgotForm";
import LoginForm from "@/components/auth/LoginForm";
import RegisterForm from "@/components/auth/RegisterForm";
import ResetForm from "@/components/auth/ResetForm";
import ResendVerificationForm from "@/components/auth/ResendVerificationForm";
import { CheckCircle, ArrowRight } from "lucide-react";

export default function AuthPage() {
  const t = useTranslations("auth");
  const router = useRouter();
  const searchParams = useSearchParams();

  const token = searchParams.get("token");
  const verified = searchParams.get("verified") === "true";
  const registered = searchParams.get("registered") === "true";
  const passwordReset = searchParams.get("password_reset") === "true";
  const resendVerification = searchParams.get("resend_verification") === "true";

  const [isLogin, setIsLogin] = useState(true);
  const [isForgot, setIsForgot] = useState(false);
  const [isResendVerification, setIsResendVerification] = useState(false);
  const [recaptchaToken, setRecaptchaToken] = useState<string | null>(null);
  const [showRecaptchaButton, setShowRecaptchaButton] = useState(false);
  const [countdown, setCountdown] = useState(10);

  const recaptchaRef = useRef<ReCAPTCHA | null>(null);

  // نمایش toastهای موفقیت
  useEffect(() => {
    if (verified) toast.success(t("email_verified") || "ایمیل شما با موفقیت تأیید شد!");
    if (registered) toast.success(t("register_success") || "ثبت‌نام با موفقیت انجام شد!");
    if (passwordReset) toast.success(t("password_changed") || "رمز عبور شما با موفقیت تغییر کرد!");
    if (resendVerification) toast.success(t("verification_sent") || "لینک تأیید مجدد ارسال شد!");
  }, [verified, registered, passwordReset, resendVerification, t]);

  // تأخیر نمایش دکمه reCAPTCHA
  useEffect(() => {
    setShowRecaptchaButton(false);
    const timer = setTimeout(() => setShowRecaptchaButton(true), 1500);
    return () => clearTimeout(timer);
  }, [isLogin, isForgot, isResendVerification]);

  // مدیریت شمارش معکوس (بدون router.push داخل setState)
  useEffect(() => {
    if (!registered && !resendVerification) {
      setCountdown(10);
      return;
    }

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [registered, resendVerification]);

  // ریدایرکت خودکار وقتی countdown به صفر رسید
  useEffect(() => {
    if (countdown === 0 && (registered || resendVerification)) {
      router.push("/auth");
    }
  }, [countdown, registered, resendVerification, router]);

  const handleRecaptchaExecute = () => recaptchaRef.current?.execute();

  const toggleMode = () => {
    setIsLogin(!isLogin);
    setIsForgot(false);
    setIsResendVerification(false);
    setRecaptchaToken(null);
    recaptchaRef.current?.reset();
  };

  const handleRegisterSuccess = () => {
    router.push("/auth?registered=true");
  };

  // توکن ریست رمز عبور
  if (token) {
    return <ResetForm token={token} />;
  }

  // صفحه موفقیت بعد از ثبت‌نام یا ارسال مجدد تأیید
  if (registered || resendVerification) {
    return (
      <AuthLayout isLogin={true}>
        <div className="max-w-md mx-auto text-center py-12">
          <div className="mb-8">
            <CheckCircle className="size-32 mx-auto text-green-500 mb-6" />
            <h2 className="text-4xl md:text-5xl font-black text-foreground mb-4">
              {registered
                ? t("register_success") || "ثبت‌نام با موفقیت انجام شد!"
                : t("verification_sent") || "لینک تأیید مجدد ارسال شد!"}
            </h2>
            <p className="text-xl text-muted-foreground leading-relaxed">
              {registered
                ? t("check_your_email_for_verification") || "لینک تأیید ایمیل برای شما ارسال شد. لطفاً ایمیل خود را چک کنید."
                : t("check_your_email") || "لطفاً ایمیل خود را چک کنید و روی لینک تأیید کلیک کنید."}
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
            onClick={() => router.push("/auth")}
            className="inline-flex items-center gap-3 text-lg font-bold text-primary hover:underline"
          >
            {t("back_to_login_now") || "بازگشت فوری به ورود"}
            <ArrowRight className="size-6" />
          </button>
        </div>
      </AuthLayout>
    );
  }

  // حالت عادی فرم‌ها
  return (
    <AuthLayout isLogin={isLogin}>
      <ReCAPTCHA
        sitekey={process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY || "test-key"}
        size="invisible"
        ref={recaptchaRef}
        onChange={setRecaptchaToken}
        onExpired={() => setRecaptchaToken(null)}
        onErrored={() => toast.error(t("recaptcha_error") || "خطا در تأیید امنیتی")}
      />
      {isResendVerification ? (
  <ResendVerificationForm
    onBack={() => {
      setIsResendVerification(false);
      setRecaptchaToken(null);
      recaptchaRef.current?.reset();
    }}
  />
) : isForgot ? (
  <ForgotForm toggleBack={() => setIsForgot(false)} />
) : (
        <>
          {isLogin ? (
            <LoginForm
              recaptchaToken={recaptchaToken}
              showRecaptchaButton={showRecaptchaButton}
              handleRecaptchaExecute={handleRecaptchaExecute}
              toggleForgot={() => setIsForgot(true)}
              toggleResendVerification={() => setIsResendVerification(true)}
            />
          ) : (
            <RegisterForm
              recaptchaToken={recaptchaToken}
              showRecaptchaButton={showRecaptchaButton}
              handleRecaptchaExecute={handleRecaptchaExecute}
              onSuccess={handleRegisterSuccess}
            />
          )}
          <div className="text-center mt-10">
            <button onClick={toggleMode} className="text-lg md:text-xl font-bold text-primary hover:underline">
              {isLogin ? t("no_account") : t("have_account")}
            </button>
          </div>
        </>
      )}
    </AuthLayout>
  );
}