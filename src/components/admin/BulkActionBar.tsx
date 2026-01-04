// components/admin/BulkActionBar.tsx
"use client";

import { Ban, CheckCircle } from "lucide-react";
import { useTranslations } from "next-intl";

interface BulkActionBarProps {
  selectedCount: number;
  onBan: () => void;
  onUnban: () => void;
  isPending?: boolean;
}

export default function BulkActionBar({
  selectedCount,
  onBan,
  onUnban,
  isPending = false,
}: BulkActionBarProps) {
  const t = useTranslations("admin.users");

  return (
    <div
      className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 bg-card/95 backdrop-blur-xl border border-border rounded-3xl shadow-2xl p-6 flex items-center gap-8 animate-in fade-in slide-in-from-bottom duration-300"
      role="alert"
      aria-live="polite"
      aria-atomic="true"
    >
      {/* تعداد انتخاب‌شده */}
      <span className="text-xl font-bold pr-6 border-r border-border whitespace-nowrap">
        {t("selectedCount", { count: selectedCount })}
      </span>

      {/* دکمه‌های عملیات گروهی */}
      <div className="flex gap-4">
        <button
          onClick={onBan}
          disabled={isPending}
          className="px-8 py-4 bg-destructive text-white rounded-2xl hover:bg-destructive/90 disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-3 font-medium transition shadow-lg"
          aria-label={t("bulkBan")}
        >
          <Ban className="w-6 h-6" />
          {t("bulkBan")}
        </button>

        <button
          onClick={onUnban}
          disabled={isPending}
          className="px-8 py-4 bg-green-600 text-white rounded-2xl hover:bg-green-700 disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-3 font-medium transition shadow-lg"
          aria-label={t("bulkUnban")}
        >
          <CheckCircle className="w-6 h-6" />
          {t("bulkUnban")}
        </button>
      </div>

      {/* اختیاری: انیمیشن لودینگ روی کل بار اگر بخوای */}
      {isPending && (
        <div className="absolute inset-0 bg-card/80 backdrop-blur-sm rounded-3xl flex items-center justify-center">
          <div className="text-xl font-medium">{t("processing")}...</div>
        </div>
      )}
    </div>
  );
}