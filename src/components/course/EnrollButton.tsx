// src/components/course/EnrollButton.tsx
"use client";

import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

interface EnrollButtonProps {
  courseId: string;
  price: number;
  disabled?: boolean;
}

export default function EnrollButton({ courseId, price, disabled }: EnrollButtonProps) {
  const router = useRouter();

  const handleEnroll = async () => {
    if (disabled) {
      toast.error("این دوره قابل ثبت‌نام نیست");
      return;
    }

    // مستقیم به صفحه پرداخت ببر (یا سبد خرید)
    // می‌تونی بعداً یه صفحه checkout اختصاصی بسازی
    router.push(`/checkout?course=${courseId}`);
  };

  return (
    <button
      onClick={handleEnroll}
      disabled={disabled}
      className={`w-full py-6 rounded-2xl text-2xl font-black transition-all transform hover:scale-105 ${
        disabled
          ? "bg-gray-400 text-gray-700 cursor-not-allowed"
          : "bg-gradient-to-r from-green-600 to-emerald-600 text-white hover:shadow-2xl shadow-green-500/50"
      }`}
    >
      {disabled ? "غیرقابل ثبت‌نام" : `ثبت‌نام در دوره • ${price.toLocaleString()} تومان`}
    </button>
  );
}