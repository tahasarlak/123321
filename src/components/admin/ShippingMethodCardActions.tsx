// src/components/admin/ShippingMethodCardActions.tsx
"use client";

import { ToggleLeft, ToggleRight, Trash2 } from "lucide-react";
import { toggleMethod, deleteMethod } from "@/actions/admin/shippingMethods";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export default function ShippingMethodCardActions({
  id,
  isActive,
}: {
  id: string;
  isActive: boolean;
}) {
  const router = useRouter();

  const handleToggle = async () => {
    if (confirm(isActive ? "این روش ارسال غیرفعال شود؟" : "این روش ارسال فعال شود؟")) {
      const result = await toggleMethod(id, isActive);
      if (result?.success) {
        toast.success(isActive ? "روش ارسال غیرفعال شد" : "روش ارسال فعال شد");
      } else {
        toast.error(result?.error || "خطایی رخ داد");
      }
      router.refresh();
    }
  };

  const handleDelete = async () => {
    if (confirm("این روش ارسال برای همیشه حذف شود؟ این عمل قابل بازگشت نیست!")) {
      const result = await deleteMethod(id);
      if (result?.success) {
        toast.success("روش ارسال با موفقیت حذف شد");
      } else {
        toast.error(result?.error || "خطایی رخ داد");
      }
      router.refresh();
    }
  };

  return (
    <div className="flex items-center gap-6">
      {/* Toggle فعال/غیرفعال */}
      <button
        onClick={handleToggle}
        className={`p-6 rounded-full shadow-2xl hover:scale-110 transition-all ${
          isActive
            ? "bg-success text-white"
            : "bg-muted text-muted-foreground"
        }`}
      >
        {isActive ? <ToggleRight size={48} /> : <ToggleLeft size={48} />}
      </button>

      {/* حذف */}
      <button
        onClick={handleDelete}
        className="p-6 bg-destructive text-white rounded-full shadow-2xl hover:scale-110 hover:bg-destructive/90 transition-all"
      >
        <Trash2 size={48} />
      </button>
    </div>
  );
}