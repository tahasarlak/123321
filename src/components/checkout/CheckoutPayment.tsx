// src/components/checkout/CheckoutPayment.tsx
"use client";

import { useState } from "react";
import toast from "react-hot-toast";
import { CreditCard, Banknote, Upload, CheckCircle } from "lucide-react";

interface CartItem {
  id: string;
  quantity: number;
  product?: {
    id: string;
    title: string;
    price: number;
    onlinePaymentEnabled: boolean;
    offlinePaymentEnabled: boolean;
    offlineCardNumber?: string;
    offlineCardHolder?: string;
    offlineBankName?: string;
  };
  course?: {
    id: string;
    title: string;
    price: number;
    onlinePaymentEnabled: boolean;
  };
}

interface CheckoutPaymentProps {
  items: CartItem[];
  total: number;
  type: "product" | "course";
}

export default function CheckoutPayment({ items, total, type }: CheckoutPaymentProps) {
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // آیا پرداخت آنلاین فعاله؟
  const hasOnlinePayment = items.some(i =>
    type === "product" ? i.product?.onlinePaymentEnabled : i.course?.onlinePaymentEnabled
  );

  // آیا پرداخت آفلاین فعاله؟
  const hasOfflinePayment = type === "product" && items.some(i => i.product?.offlinePaymentEnabled);

  // شماره کارت آفلاین (اولین محصولی که داره رو نشون بده)
  const offlineCard = items.find(i => i.product?.offlinePaymentEnabled)?.product;

  const handleOnlinePayment = async () => {
    // اینجا باید orderId واقعی داشته باشی — بعداً اضافه می‌کنیم
    const fakeOrderId = "temp-" + Date.now();

    const res = await fetch("/api/payment/zarinpal", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        orderId: fakeOrderId,
        amount: total,
        description: type === "course" ? "خرید دوره آموزشی" : "خرید محصولات",
      }),
    });

    const data = await res.json();
    if (data.url) {
      window.location.href = data.url;
    } else {
      toast.error(data.error || "خطا در اتصال به درگاه پرداخت");
    }
  };

  const handleOfflinePayment = async () => {
    if (!selectedFile) {
      toast.error("لطفاً فیش واریزی را آپلود کنید");
      return;
    }

    setUploading(true);
    const formData = new FormData();
    formData.append("amount", total.toString());
    formData.append("receipt", selectedFile);
    formData.append("type", type);

    const res = await fetch("/api/payment/offline", {
      method: "POST",
      body: formData,
    });

    if (res.ok) {
      toast.success("فیش با موفقیت آپلود شد! در حال بررسی هستیم");
      setTimeout(() => location.reload(), 2000);
    } else {
      toast.error("خطا در آپلود فیش");
    }
    setUploading(false);
  };

  return (
    <div className="mt-12 space-y-8">
      <h3 className="text-3xl font-black text-center mb-8">
        پرداخت {type === "course" ? "دوره‌ها" : "محصولات"} ({total.toLocaleString()} تومان)
      </h3>

      <div className="grid md:grid-cols-2 gap-8">
        {/* پرداخت آنلاین */}
        {hasOnlinePayment && (
          <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-3xl shadow-2xl p-8 hover:shadow-3xl transition transform hover:-translate-y-4">
            <div className="text-center mb-8">
              <div className="w-20 h-20 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-2xl">
                <CreditCard size={40} className="text-white" />
              </div>
              <h4 className="text-2xl font-black mb-4">پرداخت آنلاین</h4>
              <p className="text-gray-700">فوری • امن • خودکار</p>
            </div>

            <ul className="space-y-3 mb-8 text-gray-700">
              <li className="flex items-center gap-3"><CheckCircle className="text-green-600" size={20} /> دسترسی فوری پس از پرداخت</li>
              <li className="flex items-center gap-3"><CheckCircle className="text-green-600" size={20} /> پرداخت با تمام کارت‌های شتاب</li>
              <li className="flex items-center gap-3"><CheckCircle className="text-green-600" size={20} /> بدون نیاز به آپلود فیش</li>
            </ul>

            <button
              onClick={handleOnlinePayment}
              className="w-full bg-gradient-to-r from-green-600 to-emerald-600 text-white py-6 rounded-2xl text-2xl font-black hover:shadow-2xl transition transform hover:scale-105 flex items-center justify-center gap-4 shadow-xl"
            >
              <CreditCard size={32} />
              پرداخت آنلاین ({total.toLocaleString()} تومان)
            </button>
          </div>
        )}

        {/* پرداخت آفلاین */}
        {hasOfflinePayment && (
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-3xl shadow-2xl p-8 hover:shadow-3xl transition transform hover:-translate-y-4">
            <div className="text-center mb-8">
              <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-2xl">
                <Banknote size={40} className="text-white" />
              </div>
              <h4 className="text-2xl font-black mb-4">کارت به کارت</h4>
              <p className="text-gray-700">واریز به حساب فروشنده</p>
            </div>

            {offlineCard && (
              <div className="bg-white rounded-2xl p-6 mb-8 shadow-xl text-center">
                <p className="text-sm text-gray-600">شماره کارت</p>
                <p className="text-2xl font-black text-indigo-600">{offlineCard.offlineCardNumber}</p>
                <p className="text-sm text-gray-600 mt-2">به نام: {offlineCard.offlineCardHolder || "شرکت روم"}</p>
                <p className="text-sm text-gray-600">بانک: {offlineCard.offlineBankName || "ملت"}</p>
              </div>
            )}

            <div className="mb-8">
              <label className="block text-lg font-bold mb-4 text-center">آپلود فیش واریزی</label>
              <div className="border-4 border-dashed border-indigo-300 rounded-3xl p-10 text-center hover:border-indigo-500 transition cursor-pointer">
                <Upload size={48} className="mx-auto text-indigo-600 mb-4" />
                <input
                  type="file"
                  accept="image/*,.pdf"
                  onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                  className="hidden"
                  id={`receipt-${type}`}
                />
                <label htmlFor={`receipt-${type}`} className="text-indigo-600 font-bold text-xl">
                  {selectedFile ? selectedFile.name : "انتخاب فایل (عکس یا PDF)"}
                </label>
              </div>
            </div>

            <button
              onClick={handleOfflinePayment}
              disabled={uploading || !selectedFile}
              className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-6 rounded-2xl text-2xl font-black hover:shadow-2xl transition transform hover:scale-105 flex items-center justify-center gap-4 disabled:opacity-60 disabled:cursor-not-allowed shadow-xl"
            >
              <Banknote size={32} />
              {uploading ? "در حال ارسال..." : "ثبت پرداخت آفلاین"}
            </button>
          </div>
        )}

        {/* اگر هیچ روش پرداختی نداشته باشه */}
        {!hasOnlinePayment && !hasOfflinePayment && (
          <div className="col-span-2 text-center py-20">
            <p className="text-3xl font-black text-red-600">این آیتم قابل پرداخت نیست</p>
            <p className="text-xl text-gray-600 mt-4">لطفاً با پشتیبانی تماس بگیرید</p>
          </div>
        )}
      </div>
    </div>
  );
}