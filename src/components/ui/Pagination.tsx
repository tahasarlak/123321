// components/ui/Pagination.tsx
"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useTransition } from "react";
import { useTranslations } from "next-intl";

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  /** مسیر پایه برای ناوبری (مثلاً /blog یا /shop/products) - اگر ندی از مسیر فعلی استفاده می‌کند */
  basePath?: string;
  /** namespace ترجمه‌ها - پیش‌فرض "common" */
  translationNamespace?: string;
  /** کلید اختیاری برای نام آیتم (مثلاً "articles" یا "products") - اگر ندی از "items" استفاده می‌کند */
  itemLabelKey?: string;
}

export default function Pagination({
  currentPage,
  totalPages,
  totalItems,
  basePath,
  translationNamespace = "common",
  itemLabelKey,
}: PaginationProps) {
  const t = useTranslations(translationNamespace);
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname(); // مسیر فعلی صفحه
  const [isPending, startTransition] = useTransition();

  // اگر فقط یک صفحه داریم، چیزی نمایش نده
  if (totalPages <= 1) return null;

  // تولید اعداد صفحه‌بندی هوشمند (حداکثر حدود ۷ دکمه قابل مشاهده)
  const pageNumbers = (() => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }

    const delta = 2;
    const range: number[] = [];
    const start = Math.max(2, currentPage - delta);
    const end = Math.min(totalPages - 1, currentPage + delta);

    range.push(1);
    if (start > 2) range.push(-1); // ellipsis

    for (let i = start; i <= end; i++) {
      range.push(i);
    }

    if (end < totalPages - 1) range.push(-1); // ellipsis
    if (totalPages > 1) range.push(totalPages);

    return range;
  })();

  const navigateToPage = (page: number) => {
    const params = new URLSearchParams(searchParams.toString());

    if (page === 1) {
      params.delete("page");
    } else {
      params.set("page", page.toString());
    }

    // اگر basePath داده شده بود از اون استفاده کن، در غیر اینصورت از مسیر فعلی
    const path = basePath || pathname;

    startTransition(() => {
      router.replace(`${path}?${params.toString()}`, { scroll: false });
    });
  };

  // نام آیتم (مثلاً "مقاله"، "محصول"، "مورد" و ...)
  const itemLabel = itemLabelKey ? t(itemLabelKey) : t("items");

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-10 mt-20">
      {/* دکمه‌های صفحه‌بندی */}
      <nav
        className="flex items-center gap-3 flex-wrap justify-center"
        aria-label="Pagination"
      >
        {/* قبلی */}
        <button
          onClick={() => navigateToPage(currentPage - 1)}
          disabled={currentPage === 1 || isPending}
          className={`px-6 py-4 rounded-2xl font-bold transition ${
            currentPage === 1 || isPending
              ? "opacity-50 bg-muted pointer-events-none"
              : "bg-muted hover:bg-accent"
          }`}
          aria-label={t("previous")}
        >
          {t("previous")}
        </button>

        {/* اعداد صفحه */}
        {pageNumbers.map((pageNum, idx) =>
          pageNum === -1 ? (
            <span
              key={`ellipsis-${idx}`}
              className="px-6 py-4 text-muted-foreground text-2xl"
              aria-hidden="true"
            >
              ...
            </span>
          ) : (
            <button
              key={pageNum}
              onClick={() => navigateToPage(pageNum)}
              disabled={isPending}
              aria-current={pageNum === currentPage ? "page" : undefined}
              className={`px-6 py-4 rounded-2xl font-bold transition text-xl ${
                pageNum === currentPage
                  ? "bg-primary text-primary-foreground shadow-lg scale-110"
                  : "bg-muted hover:bg-accent"
              } ${isPending ? "opacity-60 pointer-events-none" : ""}`}
            >
              {pageNum.toLocaleString("fa-IR")}
            </button>
          )
        )}

        {/* بعدی */}
        <button
          onClick={() => navigateToPage(currentPage + 1)}
          disabled={currentPage === totalPages || isPending}
          className={`px-6 py-4 rounded-2xl font-bold transition ${
            currentPage === totalPages || isPending
              ? "opacity-50 bg-muted pointer-events-none"
              : "bg-muted hover:bg-accent"
          }`}
          aria-label={t("next")}
        >
          {t("next")}
        </button>
      </nav>

      {/* اطلاعات صفحه‌بندی */}
      <p className="text-xl text-muted-foreground text-center sm:text-right">
        {t("paginationInfo", {
          current: currentPage.toLocaleString("fa-IR"),
          total: totalPages.toLocaleString("fa-IR"),
          totalItems: totalItems.toLocaleString("fa-IR"),
          item: itemLabel,
        })}
      </p>
    </div>
  );
}