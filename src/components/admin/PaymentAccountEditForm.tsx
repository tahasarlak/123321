// src/components/admin/PaymentAccountEditForm.tsx
"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle,
  XCircle,
  Store,
  User,
  Briefcase,
  Globe,
  Building2,
  CreditCard,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils/cn";

type OwnerType = "SITE" | "INSTRUCTOR" | "CUSTOM";
type AccountType = "CARD_TO_CARD" | "BANK_TRANSFER" | "CRYPTO";

interface Country {
  id: string;
  name: string;
  flagEmoji: string;
  currency: string;
}

interface Instructor {
  id: string;
  name: string;
  email: string;
}

interface InitialAccount {
  id?: string;
  title?: string;
  type?: AccountType;
  cardNumber?: string | null;
  iban?: string | null;
  holderName?: string;
  bankName?: string;
  countryId?: string;
  priority?: number;
  isActive?: boolean;
  ownerType?: OwnerType;
  instructorId?: string | null;
  customOwnerId?: string | null;
}

interface Props {
  account?: InitialAccount;
  countries: Country[];
  instructors: Instructor[];
}

export default function PaymentAccountEditForm({
  account,
  countries,
  instructors,
}: Props) {
  const t = useTranslations("admin");
  const router = useRouter();
  const isEdit = !!account?.id;
  const [isPending, startTransition] = useTransition();

  const [ownerType, setOwnerType] = useState<OwnerType>(account?.ownerType || "SITE");
  const [accountType, setAccountType] = useState<AccountType>(account?.type || "CARD_TO_CARD");
  const [isActive, setIsActive] = useState<boolean>(account?.isActive ?? true);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const formData = new FormData(e.currentTarget);

    formData.set("ownerType", ownerType);
    formData.set("type", accountType);
    formData.set("isActive", isActive ? "true" : "false");

    if (isEdit && account?.id) {
      formData.set("id", account.id);
    }

    startTransition(async () => {
      const endpoint = isEdit
        ? "/api/admin/payment-accounts/edit"
        : "/api/admin/payment-accounts/create";

      try {
        const res = await fetch(endpoint, {
          method: "POST",
          body: formData,
        });

        if (res.ok) {
          toast.success(
            isEdit
              ? t("account_updated") || "حساب با موفقیت ویرایش شد! 🎉"
              : t("account_created") || "حساب جدید با موفقیت ایجاد شد! 🚀"
          );
          router.push("/admin/payment-accounts");
          router.refresh();
        } else {
          const result = await res.json();
          toast.error(result.message || t("operation_error") || "خطایی رخ داد");
        }
      } catch {
        toast.error(t("network_error") || "خطای شبکه رخ داد");
      }
    });
  };

  const ownerOptions = [
    {
      value: "SITE" as const,
      icon: Store,
      label: t("site_owner") || "سایت اصلی",
      gradient: "from-emerald-500 to-teal-600",
    },
    {
      value: "INSTRUCTOR" as const,
      icon: User,
      label: t("instructor_owner") || "یک استاد",
      gradient: "from-primary to-secondary",
    },
    {
      value: "CUSTOM" as const,
      icon: Briefcase,
      label: t("custom_owner") || "متفرقه / سفارشی",
      gradient: "from-pink-500 to-rose-600",
    },
  ];

  return (
    <form onSubmit={handleSubmit} className="space-y-24">
      {/* وضعیت حساب */}
      <div className="bg-gradient-to-br from-primary/10 to-secondary/10 rounded-3xl p-16 shadow-2xl border border-border/50 text-center">
        <label className="flex flex-col items-center gap-12 cursor-pointer">
          <span className="text-5xl md:text-6xl font-black text-foreground">
            {t("account_status") || "وضعیت حساب پرداخت"}
          </span>
          <div className="relative inline-flex items-center">
            <input
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-96 h-48 bg-muted rounded-full peer peer-checked:bg-gradient-to-r peer-checked:from-emerald-500 peer-checked:to-teal-600 transition-all duration-500 shadow-3xl">
              <div className="absolute top-6 left-6 w-36 h-36 bg-white rounded-full flex items-center justify-center transition-all duration-500 peer-checked:translate-x-48 shadow-3xl">
                <span className="text-8xl">{isActive ? "✅" : "❌"}</span>
              </div>
            </div>
          </div>
          <span className={`text-5xl md:text-6xl font-black ${isActive ? "text-success" : "text-destructive"}`}>
            {isActive ? t("active") || "فعال" : t("inactive") || "غیرفعال"}
          </span>
        </label>
      </div>

      {/* انتخاب مالک حساب */}
      <section>
        <h2 className="text-5xl md:text-6xl font-black text-center mb-16 text-foreground">
          {t("account_owner") || "مالک این حساب پرداخت"}
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
          {ownerOptions.map((option) => (
            <label key={option.value} className="cursor-pointer">
              <input
                type="radio"
                name="ownerType"
                value={option.value}
                checked={ownerType === option.value}
                onChange={(e) => setOwnerType(e.target.value as OwnerType)}
                className="sr-only peer"
              />
              <div
                className={`bg-card rounded-3xl p-16 text-center transition-all duration-500 hover:scale-105 peer-checked:scale-110 peer-checked:shadow-3xl peer-checked:ring-8 peer-checked:ring-primary/30 border border-border/50`}
              >
                <div className={`mx-auto w-32 h-32 bg-gradient-to-br ${option.gradient} rounded-3xl flex items-center justify-center shadow-2xl mb-8`}>
                  <option.icon size={80} className="text-white" />
                </div>
                <p className="text-4xl md:text-5xl font-black text-foreground">{option.label}</p>
              </div>
            </label>
          ))}
        </div>
      </section>

      {/* فیلدهای شرطی */}
      {ownerType === "INSTRUCTOR" && (
        <div className="bg-primary/5 rounded-3xl p-16 border border-primary/20">
          <label className="block text-4xl md:text-5xl font-black mb-10 text-foreground">
            {t("select_instructor") || "انتخاب استاد صاحب حساب"}
          </label>
          <select
            name="instructorId"
            required
            defaultValue={account?.instructorId || ""}
            className="w-full px-12 py-10 rounded-2xl border-4 border-primary/30 focus:border-primary outline-none text-2xl md:text-3xl font-medium bg-background"
          >
            <option value="">{t("select_instructor_placeholder") || "یک استاد انتخاب کنید..."}</option>
            {instructors.map((inst) => (
              <option key={inst.id} value={inst.id}>
                {inst.name} ({inst.email})
              </option>
            ))}
          </select>
        </div>
      )}

      {ownerType === "CUSTOM" && (
        <div className="bg-pink-500/10 rounded-3xl p-16 border border-pink-500/30">
          <label className="block text-4xl md:text-5xl font-black mb-10 text-foreground">
            {t("custom_identifier") || "شناسه سفارشی"}
          </label>
          <input
            name="customOwnerId"
            placeholder={t("custom_id_placeholder") || "مثلاً: company-usdt-2025"}
            required
            defaultValue={account?.customOwnerId || ""}
            className="w-full px-12 py-10 rounded-2xl border-4 border-pink-500/30 focus:border-pink-600 outline-none text-2xl md:text-3xl bg-background"
          />
        </div>
      )}

      {/* اطلاعات اصلی */}
      <div className="grid md:grid-cols-2 gap-12">
        <div>
          <label className="block text-3xl md:text-4xl font-black mb-6 text-foreground">
            {t("account_title") || "عنوان حساب"} *
          </label>
          <input
            name="title"
            required
            defaultValue={account?.title || ""}
            placeholder={t("title_placeholder") || "مثلاً: حساب اصلی کارت به کارت"}
            className="w-full px-12 py-10 rounded-2xl border-4 border-border focus:border-primary outline-none text-2xl font-medium bg-background"
          />
        </div>

        <div>
          <label className="block text-3xl md:text-4xl font-black mb-6 text-foreground">
            {t("account_type") || "نوع حساب"} *
          </label>
          <select
            name="type"
            value={accountType}
            onChange={(e) => setAccountType(e.target.value as AccountType)}
            className="w-full px-12 py-10 rounded-2xl border-4 border-border focus:border-primary outline-none text-2xl font-medium bg-background"
          >
            <option value="CARD_TO_CARD">{t("card_to_card") || "کارت به کارت"}</option>
            <option value="BANK_TRANSFER">{t("bank_transfer") || "حواله بانکی / IBAN"}</option>
            <option value="CRYPTO">{t("crypto") || "کریپتو (USDT و ...)"}</option>
          </select>
        </div>
      </div>

      {/* شماره / آدرس */}
      {(accountType === "CARD_TO_CARD" || accountType === "BANK_TRANSFER" || accountType === "CRYPTO") && (
        <div>
          <label className="block text-3xl md:text-4xl font-black mb-6 text-foreground">
            {accountType === "CARD_TO_CARD" && (t("card_number") || "شماره کارت *")}
            {accountType === "BANK_TRANSFER" && (t("iban") || "شماره IBAN *")}
            {accountType === "CRYPTO" && (t("wallet_address") || "آدرس کیف پول (مثلاً TRC20) *")}
          </label>
          <input
            name={accountType === "CARD_TO_CARD" ? "cardNumber" : accountType === "BANK_TRANSFER" ? "iban" : "cryptoAddress"}
            required
            defaultValue={
              accountType === "CARD_TO_CARD"
                ? account?.cardNumber || ""
                : accountType === "BANK_TRANSFER"
                ? account?.iban || ""
                : ""
            }
            placeholder={
              accountType === "CARD_TO_CARD"
                ? "6037-9912-3456-7890"
                : accountType === "BANK_TRANSFER"
                ? "AE070331234567890123456"
                : t("crypto_placeholder") || "TR7j... مثال آدرس USDT"
            }
            dir="ltr"
            className="w-full px-12 py-10 rounded-2xl border-4 border-border focus:border-primary outline-none text-2xl font-mono text-center tracking-wider bg-background"
          />
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-12">
        <div>
          <label className="block text-3xl md:text-4xl font-black mb-6 text-foreground">
            {t("holder_name") || "نام صاحب حساب"} *
          </label>
          <input
            name="holderName"
            required
            defaultValue={account?.holderName || ""}
            placeholder={t("holder_placeholder") || "نام دقیق صاحب حساب"}
            className="w-full px-12 py-10 rounded-2xl border-4 border-border focus:border-primary outline-none text-2xl bg-background"
          />
        </div>

        <div>
          <label className="block text-3xl md:text-4xl font-black mb-6 text-foreground">
            {t("bank_name") || "نام بانک / صرافی"} *
          </label>
          <input
            name="bankName"
            required
            defaultValue={account?.bankName || ""}
            placeholder={t("bank_placeholder") || "مثلاً: ملت، تراست والت، بایننس"}
            className="w-full px-12 py-10 rounded-2xl border-4 border-border focus:border-primary outline-none text-2xl bg-background"
          />
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-12">
        <div>
          <label className="flex items-center gap-4 text-3xl md:text-4xl font-black mb-6 text-foreground">
            <Globe size={48} />
            {t("country") || "کشور"} *
          </label>
          <select
            name="countryId"
            required
            defaultValue={account?.countryId || ""}
            className="w-full px-12 py-10 rounded-2xl border-4 border-border focus:border-primary outline-none text-2xl font-medium bg-background"
          >
            <option value="">{t("select_country") || "انتخاب کشور..."}</option>
            {countries.map((c) => (
              <option key={c.id} value={c.id}>
                {c.flagEmoji} {c.name} ({c.currency})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-3xl md:text-4xl font-black mb-6 text-foreground">
            {t("priority") || "اولویت نمایش (عدد بالاتر = بالاتر)"}
          </label>
          <input
            name="priority"
            type="number"
            defaultValue={account?.priority ?? 0}
            placeholder="مثلاً ۱۰"
            className="w-full px-12 py-10 rounded-2xl border-4 border-border focus:border-primary outline-none text-2xl text-center bg-background"
          />
        </div>
      </div>

      {/* دکمه ارسال */}
      <div className="text-center pt-12">
        <button
          type="submit"
          disabled={isPending}
          className={cn(
            "inline-flex items-center gap-8 px-32 py-12 rounded-3xl text-5xl md:text-6xl font-black shadow-3xl transition-all transform hover:scale-105",
            isPending
              ? "bg-muted text-muted-foreground cursor-not-allowed"
              : "bg-gradient-to-r from-primary via-secondary to-pink-600 text-white"
          )}
        >
          {isPending ? (
            <>
              <Loader2 className="animate-spin" size={80} />
              {t("saving") || "در حال ذخیره..."}
            </>
          ) : (
            <>
              <CreditCard size={80} />
              {isEdit ? t("update_account") || "به‌روزرسانی حساب" : t("create_account") || "ایجاد حساب جدید و بازگشت به لیست"}
            </>
          )}
        </button>
      </div>
    </form>
  );
}