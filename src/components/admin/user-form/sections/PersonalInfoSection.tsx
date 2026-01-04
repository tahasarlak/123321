"use client";

import { useState, useEffect, useRef, memo } from "react";
import {
  Control,
  FieldErrors,
  useWatch,
  UseFormSetValue,
} from "react-hook-form";
import {
  Mail,
  Phone,
  User as UserIcon,
  Lock,
  Shield,
  CheckCircle2,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { useTranslations } from "next-intl";
import { FormValues } from "@/types/user";
import { InputField } from "@/components/ui/InputField";

interface Props {
  control: Control<FormValues>;
  errors: FieldErrors<FormValues>;
  disabledEmail?: boolean;
  isCreateMode?: boolean;
  setValue: UseFormSetValue<FormValues>;
  disabled?: boolean; // اضافه شده برای هماهنگی با حالت غیرفعال فرم
}

export const PersonalInfoSection = memo(function PersonalInfoSection({
  control,
  errors,
  disabledEmail = false,
  isCreateMode = false,
  setValue,
  disabled = false,
}: Props) {
  const t = useTranslations("admin");

  const emailVerified = useWatch({ control, name: "emailVerified" });
  const passwordValue = useWatch({ control, name: "password" }) || "";

  const [passwordStrength, setPasswordStrength] = useState(0);

  // ref برای فوکوس و انتخاب خودکار رمز عبور بعد از تولید
  const passwordInputRef = useRef<HTMLInputElement>(null);

  const calculatePasswordStrength = (password: string): number => {
    let strength = 0;
    if (password.length >= 8) strength += 25;
    if (/[A-Z]/.test(password)) strength += 25;
    if (/[0-9]/.test(password)) strength += 25;
    if (/[^A-Za-z0-9]/.test(password)) strength += 25;
    return strength;
  };

  useEffect(() => {
    setPasswordStrength(calculatePasswordStrength(passwordValue));
  }, [passwordValue]);

  const generateStrongPassword = () => {
    const charset =
      "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*";
    let array: Uint32Array;

    try {
      array = new Uint32Array(16);
      crypto.getRandomValues(array);
    } catch (e) {
      // fallback برای محیط‌هایی که crypto ندارند
      array = new Uint32Array(16);
      for (let i = 0; i < 16; i++) {
        array[i] = Math.floor(Math.random() * 0xffffffff);
      }
    }

    let password = "";
    for (let i = 0; i < 16; i++) {
      password += charset.charAt(array[i] % charset.length);
    }

    setValue("password", password, {
      shouldDirty: true,
      shouldValidate: true,
    });

    setPasswordStrength(100);

    // فوکوس و انتخاب خودکار متن رمز عبور برای راحتی کپی
    setTimeout(() => {
      passwordInputRef.current?.focus();
      passwordInputRef.current?.select();
    }, 100);
  };

  const getStrengthColor = () => {
    if (passwordStrength < 50) return "bg-red-500";
    if (passwordStrength < 75) return "bg-yellow-500";
    if (passwordStrength < 100) return "bg-green-500";
    return "bg-emerald-600";
  };

  const getStrengthText = () => {
    if (passwordStrength < 50) return t("passwordStrength.weak");
    if (passwordStrength < 75) return t("passwordStrength.medium");
    if (passwordStrength < 100) return t("passwordStrength.strong");
    return t("passwordStrength.excellent");
  };

  const getStrengthTextColor = () => {
    return getStrengthColor().replace("bg-", "text-");
  };

  // نمایش نوار قدرت فقط وقتی کاربر در حال وارد کردن رمز هست (در ایجاد یا وقتی مقدار داره)
  const showPasswordStrength = isCreateMode || (!!passwordValue && passwordValue.trim() !== "");

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
      {/* نام کامل */}
      <InputField
        id="name"
        label={t("fullName")}
        iconLeft={UserIcon}
        required
        control={control}
        error={errors.name}
        disabled={disabled}
      />

      {/* ایمیل */}
      <InputField
        id="email"
        label={t("email")}
        iconLeft={Mail}
        type="email"
        required
        control={control}
        error={errors.email}
        disabled={disabledEmail || disabled}
      />

      {/* شماره موبایل */}
      <InputField
        id="phone"
        label={t("phoneNumber")}
        iconLeft={Phone}
        control={control}
        error={errors.phone}
        disabled={disabled}
      />

      {/* جنسیت */}
      <InputField
        id="gender"
        label={t("gender")}
        type="select"
        control={control}
        error={errors.gender}
        disabled={disabled}
        options={[
          { value: "", label: t("selectGender") },
          { value: "MALE", label: t("male") },
          { value: "FEMALE", label: t("female") },
          { value: "OTHER", label: t("other") },
        ]}
      />

      {/* رمز عبور + نوار قدرت + دکمه تولید */}
      <div className="sm:col-span-2 space-y-4">
        <InputField
          id="password"
          label={t("password")}
          iconLeft={Lock}
          type="password"
          required={isCreateMode}
          control={control}
          error={errors.password}
          disabled={disabled}
          placeholder={
            isCreateMode
              ? t("passwordPlaceholderCreate")
              : t("passwordPlaceholderEdit")
          }
          showPasswordToggle
          ref={passwordInputRef} // برای فوکوس خودکار
        />

        {/* نوار قدرت رمز عبور - فقط وقتی نیازه نمایش داده میشه */}
        {showPasswordStrength && (
          <div className="space-y-2">
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div
                className={cn(
                  "h-full transition-all duration-500",
                  getStrengthColor()
                )}
                style={{ width: `${passwordStrength}%` }}
                role="progressbar"
                aria-valuenow={passwordStrength}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={`${t("passwordStrength.label")}: ${getStrengthText()}`}
              />
            </div>
            <p className="text-sm text-muted-foreground">
              {t("passwordStrength.label")}:{" "}
              <span className={cn("font-medium", getStrengthTextColor())}>
                {getStrengthText()}
              </span>
            </p>
          </div>
        )}

        {/* دکمه تولید رمز قوی - فقط وقتی فرم غیرفعاله نمایش داده نمیشه */}
        {!disabled && (
          <button
            type="button"
            onClick={generateStrongPassword}
            className="flex items-center gap-2 text-primary hover:text-primary/80 text-sm font-medium transition-colors"
            aria-label={t("generateStrongPassword")}
          >
            <Shield className="h-5 w-5" />
            {t("generateStrongPassword")}
          </button>
        )}
      </div>

      {/* تایید ایمیل */}
      <div className="sm:col-span-2 space-y-4">
        <InputField
          id="emailVerified"
          label={t("emailVerified")}
          type="checkbox"
          control={control}
          disabled={disabled}
        />
        {emailVerified && (
          <p className="text-green-600 flex items-center gap-2 text-sm font-medium">
            <CheckCircle2 className="h-5 w-5" />
            {t("emailVerifiedNote")}
          </p>
        )}
      </div>
    </div>
  );
});

PersonalInfoSection.displayName = "PersonalInfoSection";