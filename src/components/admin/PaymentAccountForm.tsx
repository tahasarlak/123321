// src/components/admin/PaymentAccountEditForm.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { FiGlobe, FiUser, FiBriefcase, FiStore, FiCheck, FiX } from "react-icons/fi";

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

interface PaymentAccount {
  id: string;
  title: string;
  type: AccountType;
  cardNumber?: string | null;
  iban?: string | null;
  holderName: string;
  bankName: string;
  countryId: string;
  currency?: string;
  priority: number;
  isActive: boolean;
  ownerType: OwnerType;
  ownerId?: string | null;
  instructorId?: string | null;
  instructor?: { id: string; name: string; email: string } | null;
  country: Country;
}

interface Props {
  account: PaymentAccount;
  countries: Country[];
  instructors: Instructor[];
}

export default function PaymentAccountEditForm({ account, countries, instructors }: Props) {
  const router = useRouter();

  const [ownerType, setOwnerType] = useState<OwnerType>(account.ownerType);
  const [accountType, setAccountType] = useState<AccountType>(account.type);
  const [isActive, setIsActive] = useState<boolean>(account.isActive);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    // مهم‌ترین خط: همیشه isActive رو بفرست (حتی false)
    formData.append("isActive", String(isActive));
    formData.append("ownerType", ownerType);
    formData.append("id", account.id);

    try {
      const res = await fetch("/api/admin/payment-accounts/edit", {
        method: "POST",
        body: formData,
      });

      const result = await res.json().catch(() => ({}));

      if (res.ok) {
        toast.success(result.message || "حساب با موفقیت ویرایش شد!");
        router.push("/admin/payment-accounts");
        router.refresh();
      } else {
        toast.error(result.message || "خطایی رخ داد");
      }
    } catch (err) {
      console.error(err);
      toast.error("خطای شبکه — اتصال خود را بررسی کنید");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-28 max-w-7xl mx-auto">

      {/* سوئیچ فعال/غیرفعال — فوق‌العاده زیبا */}
      <div className="flex flex-col items-center justify-center gap-12 py-20 bg-gradient-to-r from-purple-50 via-pink-50 to-rose-50 rounded-4xl p-20 shadow-3xl border-8 border-purple-100">
        <h3 className="text-7xl font-black text-gray-800">وضعیت حساب پرداخت</h3>
        <label className="relative inline-flex items-center cursor-pointer scale-150">
          <input
            type="checkbox"
            checked={isActive}
            onChange={(e) => setIsActive(e.target.checked)}
            className="sr-only peer"
          />
          <div className="w-80 h-40 bg-gray-300 rounded-full peer transition-all duration-500 peer-checked:bg-gradient-to-r peer-checked:from-emerald-500 peer-checked:to-teal-600 shadow-2xl">
            <div className="absolute top-4 left-4 w-32 h-32 bg-white rounded-full transition-all duration-500 peer-checked:translate-x-40 shadow-xl flex items-center justify-center">
              {isActive ? (
                <FiCheck className="w-20 h-20 text-emerald-600" />
              ) : (
                <FiX className="w-20 h-20 text-red-600" />
              )}
            </div>
          </div>
        </label>
        <span className={`text-8xl font-black mt-8 ${isActive ? "text-emerald-600" : "text-red-600"} animate-pulse`}>
          {isActive ? "فعال" : "غیرفعال"}
        </span>
      </div>

      {/* انتخاب نوع مالکیت */}
      <div className="bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 p-24 rounded-4xl border-12 border-purple-200 shadow-4xl">
        <h3 className="text-8xl font-black text-center mb-24 text-purple-900">این حساب متعلق به کیست؟</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-20">
          {([
            { type: "SITE" as const, icon: FiStore, label: "سایت اصلی", color: "emerald" },
            { type: "INSTRUCTOR" as const, icon: FiUser, label: "یک استاد", color: "indigo" },
            { type: "CUSTOM" as const, icon: FiBriefcase, label: "متفرقه", color: "pink" },
          ]).map(({ type, icon: Icon, label, color }) => (
            <label key={type} className="cursor-pointer group">
              <input
                type="radio"
                name="ownerType"
                value={type}
                checked={ownerType === type}
                onChange={() => setOwnerType(type)}
                className="sr-only peer"
              />
              <div
                className={`
                  relative bg-white p-24 rounded-4xl text-center transition-all duration-500 
                  hover:scale-105 peer-checked:scale-115 peer-checked:ring-12 shadow-3xl
                  peer-checked:ring-${color}-500 peer-checked:bg-${color}-50
                  group-hover:shadow-4xl overflow-hidden
                `}
              >
                <div className="absolute inset-0 bg-gradient-to-br from-transparent via-white to-transparent opacity-0 peer-checked:opacity-30 transition-opacity" />
                <Icon className={`w-32 h-32 mx-auto mb-12 text-${color}-600`} />
                <p className="text-7xl font-black text-gray-800">{label}</p>
              </div>
            </label>
          ))}
        </div>
      </div>

      {/* فیلدهای شرطی */}
      {ownerType === "INSTRUCTOR" && (
        <div className="bg-indigo-50 p-20 rounded-4xl border-12 border-indigo-300 shadow-3xl">
          <label className="block text-6xl font-black mb-10 text-indigo-900">استاد صاحب حساب</label>
          <select
            name="instructorId"
            defaultValue={account.instructorId || account.instructor?.id || ""}
            required
            className="w-full px-20 py-16 rounded-3xl border-6 border-indigo-400 focus:border-indigo-700 text-5xl font-bold bg-white shadow-xl focus:shadow-2xl transition-all"
          >
            <option value="">انتخاب استاد...</option>
            {instructors.map((i) => (
              <option key={i.id} value={i.id}>
                {i.name} ({i.email})
              </option>
            ))}
          </select>
        </div>
      )}

      {ownerType === "CUSTOM" && (
        <div className="bg-pink-50 p-20 rounded-4xl border-12 border-pink-300 shadow-3xl">
          <label className="block text-6xl font-black mb-10 text-pink-900">شناسه متفرقه (دلخواه)</label>
          <input
            name="customOwnerId"
            defaultValue={account.ownerId || ""}
            placeholder="مثال: tether-2025-company, crypto-wallet-1"
            required
            className="w-full px-20 py-16 rounded-3xl border-6 border-pink-400 focus:border-pink-700 text-5xl font-bold bg-white shadow-xl focus:shadow-2xl transition-all"
          />
        </div>
      )}

      {/* فرم اصلی */}
      <div className="grid lg:grid-cols-2 gap-20">
        <input
          name="title"
          defaultValue={account.title}
          required
          placeholder="عنوان حساب (مثلاً: حساب اصلی سایت)"
          className="input-elegant"
        />
        <select
          name="type"
          value={accountType}
          onChange={(e) => setAccountType(e.target.value as AccountType)}
          className="input-elegant"
        >
          <option value="CARD_TO_CARD">کارت به کارت</option>
          <option value="BANK_TRANSFER">حواله بانکی / IBAN</option>
          <option value="CRYPTO">کریپتو (USDT, BTC و...)</option>
        </select>
      </div>

      {accountType === "CARD_TO_CARD" && (
        <input
          name="cardNumber"
          defaultValue={account.cardNumber || ""}
          placeholder="شماره کارت: 6037-9912-3456-7890"
          dir="ltr"
          className="input-mono"
        />
      )}

      {accountType === "BANK_TRANSFER" && (
        <input
          name="iban"
          defaultValue={account.iban || ""}
          placeholder="IBAN: AE070331234567890123456"
          dir="ltr"
          className="input-mono"
        />
      )}

      <div className="grid lg:grid-cols-2 gap-20">
        <input
          name="holderName"
          defaultValue={account.holderName}
          required
          placeholder="نام صاحب حساب"
          className="input-elegant"
        />
        <input
          name="bankName"
          defaultValue={account.bankName}
          required
          placeholder="نام بانک یا صرافی (مثلاً: ملت، نوبیتکس)"
          className="input-elegant"
        />
      </div>

      <div className="grid lg:grid-cols-2 gap-20">
        <select name="countryId" defaultValue={account.countryId} required className="input-elegant">
          <option value="">انتخاب کشور...</option>
          {countries.map((c) => (
            <option key={c.id} value={c.id}>
              {c.flagEmoji} {c.name} ({c.currency})
            </option>
          ))}
        </select>
        <input
          name="priority"
          type="number"
          defaultValue={account.priority}
          placeholder="اولویت نمایش (عدد بزرگتر = بالاتر)"
          className="input-elegant"
        />
      </div>

      {/* دکمه ارسال */}
      <div className="text-center pt-32">
        <button
          type="submit"
          className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 text-white px-96 py-32 rounded-4xl text-9xl font-black hover:scale-110 transition-all duration-500 shadow-4xl hover:shadow-purple-600/80 tracking-tighter"
        >
          ذخیره تغییرات
        </button>
      </div>
    </form>
  );
}

// استایل‌های جهانی و زیبا
<style jsx>{`
  .input-elegant {
    @apply w-full px-24 py-20 rounded-4xl border-6 border-purple-200 focus:border-purple-600 text-5xl font-bold transition-all shadow-2xl focus:shadow-3xl bg-white focus:bg-purple-50/30;
  }
  .input-mono {
    @apply w-full px-24 py-20 rounded-4xl border-6 border-gray-300 focus:border-purple-600 text-5xl font-mono bg-gray-50 focus:bg-white transition-all shadow-2xl focus:shadow-3xl text-center tracking-wider;
  }
`}</style>