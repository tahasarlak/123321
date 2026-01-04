// src/components/admin/DeletePaymentAccountButton.tsx
"use client";

import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

export default function DeletePaymentAccountButton({ id }: { id: string }) {
  const router = useRouter();

  const handleDelete = async () => {
    if (!confirm("واقعاً می‌خواهید این حساب پرداخت را حذف کنید؟\nاین عمل قابل بازگشت نیست!")) {
      return;
    }

    const formData = new FormData();
    formData.append("id", id);

    try {
      const res = await fetch("/api/admin/payment-accounts/delete", {
        method: "POST",
        body: formData,
      });

      if (res.ok) {
        toast.success("حساب پرداخت با موفقیت حذف شد!");
        router.refresh();
      } else {
        const error = await res.text();
        toast.error(error || "خطا در حذف حساب");
      }
    } catch {
      toast.error("خطای شبکه رخ داد");
    }
  };

  return (
    <button
      onClick={handleDelete}
      className="p-4 bg-destructive/10 hover:bg-destructive/20 rounded-2xl transition-all"
    >
      <Trash2 size={36} className="text-destructive" />
    </button>
  );
}