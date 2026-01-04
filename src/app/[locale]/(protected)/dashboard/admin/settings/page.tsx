// src/app/[locale]/admin/settings/page.tsx
"use client";

import { useTranslations } from "next-intl";
import { useActionState } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";


// پیش‌فرض‌ها (در صورت عدم دریافت از سرور)
const defaultSettings: SiteSettings = {
  siteName: "روم استور",
  siteDescription: "بهترین فروشگاه ایمپلنت و محصولات دندانپزشکی ایران",
  primaryColor: "#8b5cf6",
  currency: "IRR",
  taxRate: 9,
  freeShippingThreshold: 5000000,
  contactEmail: "support@romstore.ir",
  contactPhone: "021-88450000",
  instagram: "romstore.ir",
  telegram: "romstore",
  whatsapp: "989123456789",
  maintenanceMode: false,
  allowRegistration: true,
};

export default function AdminSettingsPage({
  initialSettings = defaultSettings,
}: {
  initialSettings?: SiteSettings;
}) {
  const t = useTranslations("admin.settings");

  const [state, formAction, isPending] = useActionState(updateSiteSettings, {
    success: false,
    message: "",
    errors: {},
  });

  // نمایش toast پس از submit
  if (state.message) {
    if (state.success) {
      toast.success(state.message);
    } else {
      toast.error(state.message);
    }
  }

  return (
    <div className="container mx-auto px-6 py-20 max-w-7xl">
      {/* عنوان اصلی */}
      <div className="text-center mb-20">
        <h1 className="text-7xl md:text-9xl font-black bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent mb-8 animate-gradient">
          {t("title") || "تنظیمات سایت"}
        </h1>
        <p className="text-3xl md:text-4xl font-bold text-foreground/70">
          {t("subtitle") || "همه چیز در کنترل شماست"}
        </p>
      </div>

      <form action={formAction} className="space-y-24">
        {/* اطلاعات اصلی سایت */}
        <Section title={t("main_info") || "اطلاعات اصلی سایت"} gradient="from-primary to-secondary">
          <div className="grid lg:grid-cols-2 gap-12">
            <Input
              label={t("site_name") || "نام سایت *"}
              name="siteName"
              defaultValue={initialSettings.siteName}
              required
              error={state.errors?.siteName}
            />
            <Input
              label={t("site_description") || "توضیحات سایت"}
              name="siteDescription"
              defaultValue={initialSettings.siteDescription}
              error={state.errors?.siteDescription}
            />
          </div>

          <div className="grid lg:grid-cols-3 gap-12 mt-16">
            <Input
              label={t("primary_color") || "رنگ اصلی سایت"}
              name="primaryColor"
              type="color"
              defaultValue={initialSettings.primaryColor}
              error={state.errors?.primaryColor}
            />
            <Input
              label={t("currency") || "واحد پول پیش‌فرض"}
              name="currency"
              defaultValue={initialSettings.currency}
              uppercase
              error={state.errors?.currency}
            />
            <Input
              label={t("tax_rate") || "نرخ مالیات (%)"}
              name="taxRate"
              type="number"
              defaultValue={initialSettings.taxRate}
              error={state.errors?.taxRate}
            />
          </div>
        </Section>

        {/* تنظیمات مالی و ارسال */}
        <Section title={t("finance_shipping") || "تنظیمات مالی و ارسال"} gradient="from-emerald-500 to-teal-600">
          <div className="grid lg:grid-cols-2 gap-12">
            <Input
              label={t("free_shipping_threshold") || "حداقل خرید برای ارسال رایگان (تومان)"}
              name="freeShippingThreshold"
              type="number"
              defaultValue={initialSettings.freeShippingThreshold}
              error={state.errors?.freeShippingThreshold}
            />
          </div>
        </Section>

        {/* اطلاعات تماس */}
        <Section title={t("contact_social") || "اطلاعات تماس و شبکه‌های اجتماعی"} gradient="from-pink-500 to-rose-600">
          <div className="grid lg:grid-cols-2 gap-12">
            <Input
              label={t("contact_email") || "ایمیل پشتیبانی *"}
              name="contactEmail"
              type="email"
              defaultValue={initialSettings.contactEmail}
              required
              error={state.errors?.contactEmail}
            />
            <Input
              label={t("contact_phone") || "تلفن تماس"}
              name="contactPhone"
              defaultValue={initialSettings.contactPhone}
              error={state.errors?.contactPhone}
            />
          </div>
          <div className="grid lg:grid-cols-3 gap-12 mt-12">
            <Input
              label={t("instagram") || "اینستاگرام"}
              name="instagram"
              defaultValue={initialSettings.instagram}
              error={state.errors?.instagram}
            />
            <Input
              label={t("telegram") || "تلگرام"}
              name="telegram"
              defaultValue={initialSettings.telegram}
              error={state.errors?.telegram}
            />
            <Input
              label={t("whatsapp") || "واتساپ"}
              name="whatsapp"
              defaultValue={initialSettings.whatsapp}
              error={state.errors?.whatsapp}
            />
          </div>
        </Section>

        {/* دسترسی و امنیت */}
        <Section title={t("access_security") || "دسترسی و امنیت"} gradient="from-orange-500 to-red-600">
          <div className="space-y-16">
            <Toggle
              label={t("maintenance_mode") || "حالت تعمیر و نگهداری"}
              name="maintenanceMode"
              defaultChecked={initialSettings.maintenanceMode}
              description={t("maintenance_mode_desc") || "سایت فقط برای ادمین‌ها قابل دسترسی می‌شود"}
            />
            <Toggle
              label={t("allow_registration") || "اجازه ثبت‌نام کاربران جدید"}
              name="allowRegistration"
              defaultChecked={initialSettings.allowRegistration}
              description={t("allow_registration_desc") || "اگر خاموش باشد، فقط ادمین می‌تواند کاربر اضافه کند"}
            />
          </div>
        </Section>

        {/* دکمه‌های نهایی */}
        <div className="text-center space-y-12 pt-12">
          <button
            type="submit"
            disabled={isPending}
            className="px-40 py-16 bg-gradient-to-r from-primary via-secondary to-pink-600 text-white rounded-3xl text-5xl md:text-6xl font-black hover:scale-105 transition-all shadow-3xl disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isPending ? (
              <span className="flex items-center gap-4">
                <Loader2 className="w-12 h-12 animate-spin" />
                {t("saving") || "در حال ذخیره..."}
              </span>
            ) : (
              t("save_changes") || "ذخیره تمام تغییرات"
            )}
          </button>
        </div>
      </form>

      {/* پیام نهایی */}
      <div className="mt-32 text-center py-24 bg-gradient-to-br from-primary via-secondary to-pink-900 rounded-3xl shadow-3xl text-white">
        <h2 className="text-7xl md:text-8xl font-black mb-10">
          {t("full_control") || "شما کنترل کامل را دارید!"}
        </h2>
        <p className="text-4xl md:text-5xl opacity-90">
          {t("full_control_desc") || "هر تغییری که بخواهید، همینجاست"}
        </p>
      </div>
    </div>
  );
}

// کامپوننت‌های کمکی (بدون تغییر)
function Section({
  title,
  gradient,
  children,
}: {
  title: string;
  gradient: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-card/95 backdrop-blur-2xl rounded-3xl shadow-3xl p-12 lg:p-20 border border-border/50 relative overflow-hidden">
      <div className={`absolute inset-0 bg-gradient-to-br ${gradient} opacity-10`} />
      <h2 className={`text-5xl md:text-6xl font-black text-center mb-16 bg-gradient-to-r ${gradient} bg-clip-text text-transparent relative z-10`}>
        {title}
      </h2>
      <div className="relative z-10">{children}</div>
    </div>
  );
}

function Input({
  label,
  name,
  type = "text",
  defaultValue = "",
  placeholder = "",
  required = false,
  uppercase = false,
  error,
}: {
  label: string;
  name: string;
  type?: string;
  defaultValue?: string | number;
  placeholder?: string;
  required?: boolean;
  uppercase?: boolean;
  error?: string;
}) {
  return (
    <div>
      <label className="block text-3xl md:text-4xl font-black mb-6 text-foreground">{label}</label>
      <input
        type={type}
        name={name}
        defaultValue={defaultValue}
        placeholder={placeholder}
        required={required}
        className={`w-full px-12 py-10 rounded-2xl border-4 ${error ? "border-destructive" : "border-border focus:border-primary"} outline-none text-2xl font-medium transition-all bg-background ${uppercase ? "uppercase" : ""}`}
      />
      {error && <p className="text-destructive text-xl mt-4">{error}</p>}
    </div>
  );
}

function Toggle({
  label,
  name,
  defaultChecked = false,
  description,
}: {
  label: string;
  name: string;
  defaultChecked?: boolean;
  description: string;
}) {
  return (
    <label className="flex items-center justify-between cursor-pointer group p-8 rounded-3xl hover:bg-accent/30 transition-all">
      <div>
        <p className="text-4xl md:text-5xl font-black group-hover:text-primary transition">{label}</p>
        <p className="text-xl md:text-2xl text-muted-foreground mt-4">{description}</p>
      </div>
      <input
        type="checkbox"
        name={name}
        defaultChecked={defaultChecked}
        className="w-16 h-16 rounded-2xl accent-primary focus:ring-8 focus:ring-primary/30 transition-all"
      />
    </label>
  );
}