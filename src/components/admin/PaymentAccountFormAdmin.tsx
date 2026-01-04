"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

type OwnerType = "SITE" | "INSTRUCTOR" | "CUSTOM";

interface Props {
  countries: { id: string; name: string; flagEmoji: string; currency: string }[];
  instructors?: { id: string; name: string; email: string }[];
  currentUserRole?: string; // از سرور میاد
  currentUserId?: string;   // فقط برای استاد
}

export default function PaymentAccountFormAdmin({
  countries,
  instructors = [],
  currentUserRole = "ADMIN",
  currentUserId,
}: Props) {
  const [ownerType, setOwnerType] = useState<OwnerType>("CUSTOM");
  const [accountType, setAccountType] = useState<
    "CARD_TO_CARD" | "BANK_TRANSFER" | "CRYPTO"
  >("CARD_TO_CARD");

  const router = useRouter();

  const isAdmin = ["ADMIN", "SUPERADMIN"].includes(currentUserRole);
  const isInstructor = currentUserRole === "INSTRUCTOR";

  // اگر استاد باشه، خودکار مالکیت رو روی خودش فیکس می‌کنه
  const effectiveOwnerType = isInstructor ? "INSTRUCTOR" : ownerType;
  const effectiveOwnerId = isInstructor ? currentUserId : undefined;

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const formData = new FormData(e.currentTarget);

    // اضافه کردن داده‌های پنهان
    formData.append("ownerType", effectiveOwnerType);
    if (effectiveOwnerId) formData.append("ownerId", effectiveOwnerId);
    if (ownerType === "CUSTOM" && formData.get("customOwnerId")?.toString().trim() === "") {
      toast.error("شناسه متفرقه را وارد کنید");
      return;
    }

    try {
      const res = await fetch("/api/admin/payment-accounts/create", {
        method: "POST",
        body: formData,
      });

      if (res.ok) {
        toast.success("حساب پرداخت با موفقیت اضافه شد!");
        router.push("/admin/payment-accounts");
        router.refresh();
      } else {
        const error = await res.text();
        toast.error("خطا: " + error);
      }
    } catch (err) {
      toast.error("خطای شبکه. دوباره امتحان کنید.");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-16 max-w-5xl mx-auto">
      {/* انتخاب مالکیت حساب – فقط ادمین می‌بینه */}
      {isAdmin && (
        <div className="bg-gradient-to-br from-purple-50 via-pink-50 to-indigo-50 p-10 rounded-3xl border-4 border-purple-200">
          <h3 className="text-4xl font-black mb-8 text-center">این حساب متعلق به کیست؟</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {(["SITE", "INSTRUCTOR", "CUSTOM"] as OwnerType[]).map((type) => (
              <label key={type} className="cursor-pointer">
                <input
                  type="radio"
                  name="ownerTypeRadio"
                  value={type}
                  checked={ownerType === type}
                  onChange={() => setOwnerType(type)}
                  className="sr-only peer"
                />
                <div className="bg-white p-10 rounded-3xl text-center transition-all peer-checked:ring-8 peer-checked:ring-purple-500 peer-checked:scale-105 shadow-2xl">
                 <div className="text-7xl mb-4">
  {type === "SITE" && "Store"}
  {type === "INSTRUCTOR" && "Teacher"}
  {type === "CUSTOM" && "Briefcase"}
</div>
                  <div className="text-3xl font-black">
                    {type === "SITE" && "سایت اصلی"}
                    {type === "INSTRUCTOR" && "یک استاد"}
                    {type === "CUSTOM" && "متفرقه"}
                  </div>
                </div>
              </label>
            ))}
          </div>
        </div>
      )}

      {/* اگر استاد انتخاب شده باشه */}
      {effectiveOwnerType === "INSTRUCTOR" && isAdmin && (
        <div className="bg-indigo-50 p-8 rounded-3xl border-4 border-indigo-300">
          <label className="block text-3xl font-black mb-6">استاد صاحب حساب</label>
          <select
            name="instructorId"
            required
            className="w-full px-10 py-8 rounded-3xl border-4 border-indigo-200 focus:border-indigo-600 text-2xl"
          >
            <option value="">انتخاب کنید...</option>
            {instructors.map((inst) => (
              <option key={inst.id} value={inst.id}>
                {inst.name} ({inst.email})
              </option>
            ))}
          </select>
        </div>
      )}

      {/* اگر متفرقه باشه */}
      {effectiveOwnerType === "CUSTOM" && (
        <div className="bg-pink-50 p-8 rounded-3xl border-4 border-pink-300">
          <label className="block text-3xl font-black mb-6">شناسه متفرقه (دلخواه)</label>
          <input
            name="customOwnerId"
            placeholder="مثلاً: company-alibaba-2025 یا freelancer-john"
            className="w-full px-10 py-8 rounded-3xl border-4 border-pink-200 focus:border-pink-600 text-2xl"
          />
        </div>
      )}

      {/* عنوان و نوع حساب */}
      <div className="grid lg:grid-cols-2 gap-12">
        <div>
          <label className="block text-3xl font-black mb-6">عنوان حساب *</label>
          <input
            name="title"
            required
            placeholder="مثلاً: کارت ملت اصلی سایت"
            className="w-full px-10 py-8 rounded-3xl border-4 border-gray-200 focus:border-purple-600 text-2xl transition"
          />
        </div>

        <div>
          <label className="block text-3xl font-black mb-6">نوع حساب *</label>
          <select
            name="type"
            value={accountType}
            onChange={(e) => setAccountType(e.target.value as any)}
            className="w-full px-10 py-8 rounded-3xl border-4 border-gray-200 focus:border-purple-600 text-2xl"
          >
            <option value="CARD_TO_CARD">کارت به کارت</option>
            <option value="BANK_TRANSFER">حواله بانکی / IBAN</option>
            <option value="CRYPTO">کریپتو (تتر، بیت‌کوین و ...)</option>
          </select>
        </div>
      </div>

      {/* فیلدهای شرطی بر اساس نوع حساب */}
      {accountType === "CARD_TO_CARD" && (
        <input
          name="cardNumber"
          placeholder="شماره کارت (6037-9999-1234-5678)"
          className="w-full px-10 py-8 rounded-3xl border-4 border-green-200 focus:border-green-600 text-2xl"
          dir="ltr"
          maxLength={19}
        />
      )}

      {accountType === "BANK_TRANSFER" && (
        <input
          name="iban"
          placeholder="IBAN (مثلاً AE12 3456 7890 1234 5678 901)"
          className="w-full px-10 py-8 rounded-3xl border-4 border-blue-200 focus:border-blue-600 text-2xl"
          dir="ltr"
        />
      )}

      {accountType === "CRYPTO" && (
        <div className="space-y-8">
          <input
            name="cryptoAddress"
            placeholder="آدرس والت (مثلاً: 0x123... یا bc1q...)"
            className="w-full px-10 py-8 rounded-3xl border-4 border-orange-200 focus:border-orange-600 text-2xl"
            dir="ltr"
          />
          <input
            name="cryptoNetwork"
            placeholder="شبکه (مثلاً: ERC20, TRC20, BTC, SOL)"
            className="w-full px-10 py-8 rounded-3xl border-4 border-orange-200 focus:border-orange-600 text-2xl"
          />
        </div>
      )}

      {/* نام صاحب حساب + نام بانک */}
      <div className="grid lg:grid-cols-2 gap-12">
        <input
          name="holderName"
          required
          placeholder="نام صاحب حساب"
          className="w-full px-10 py-8 rounded-3xl border-4 border-gray-200 focus:border-purple-600 text-2xl"
        />
        <input
          name="bankName"
          required
          placeholder="نام بانک یا صرافی"
          className="w-full px-10 py-8 rounded-3xl border-4 border-gray-200 focus:border-purple-600 text-2xl"
        />
      </div>

      {/* کشور + اولویت */}
      <div className="grid lg:grid-cols-2 gap-12">
        <div>
          <label className="block text-3xl font-black mb-6">کشور *</label>
          <select
            name="countryId"
            required
            className="w-full px-10 py-8 rounded-3xl border-4 border-gray-200 focus:border-purple-600 text-2xl"
          >
            <option value="">انتخاب کشور</option>
            {countries.map((c) => (
              <option key={c.id} value={c.id}>
                {c.flagEmoji} {c.name} ({c.currency})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-3xl font-black mb-6">اولویت نمایش (عدد بزرگتر = بالاتر)</label>
          <input
            name="priority"
            type="number"
            defaultValue="0"
            className="w-full px-10 py-8 rounded-3xl border-4 border-gray-200 focus:border-purple-600 text-2xl"
          />
        </div>
      </div>

      {/* دکمه ارسال */}
      <div className="text-center pt-16">
        <button
          type="submit"
          className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 text-white px-40 py-14 rounded-3xl text-5xl font-black hover:scale-110 transition-all shadow-3xl"
        >
          ذخیره حساب پرداخت
        </button>
      </div>
    </form>
  );
}