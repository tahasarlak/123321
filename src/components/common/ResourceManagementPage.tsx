// src/components/common/ResourceManagementPage.tsx
"use client";

import { useMemo, useCallback, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Loader2, Download, Plus, X } from "lucide-react";
import { toast } from "sonner";
import Swal from "sweetalert2";
import { cn } from "@/lib/utils/cn";
import { RESOURCE_DISPLAY_CONFIG } from "@/config/resources";
import ResourceFilters from "../admin/Resource/ResourceFilters";
import ResourceHeader from "../admin/Resource/ResourceHeader";
import ResourceCard from "../admin/Resource/ResourceCard";
import AdminGrid from "../admin/Resource/AdminGrid";
import Pagination from "@/components/ui/Pagination";

type ResourceManagementPageProps<T extends { id: string }> = {
  resource: keyof typeof RESOURCE_DISPLAY_CONFIG;
  items: T[];
  totalItems: number;
  currentPage: number;
  totalPages: number;
  stats: { key: string; count: number }[];
  searchValue: string;
  onExport: () => Promise<string | void>;
  onBulkAction: (ids: string[], action: string) => Promise<any>;
  getItemId: (item: T) => string;
  translations?: {
    pageTitle?: string;
    totalCount?: string;
    statistics?: string;
    bulkActions?: Record<string, string>;
  };
};

export default function ResourceManagementPage<T extends { id: string }>({
  resource,
  items,
  totalItems,
  currentPage,
  totalPages,
  stats,
  searchValue,
  onExport,
  onBulkAction,
  getItemId,
  translations = {},
}: ResourceManagementPageProps<T>) {
  const router = useRouter();
  const t = useTranslations(`admin.${resource}`);
  const commonT = useTranslations("common");

  const config = RESOURCE_DISPLAY_CONFIG[resource];

  if (!config) {
    return (
      <div className="p-20 text-center text-4xl text-destructive">
        {commonT("resourceNotFound", { resource })}
      </div>
    );
  }

  // انتخاب چندتایی
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isPending, startTransition] = useTransition();

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleSelectAll = useCallback(() => {
    if (selectedIds.size === items.length && items.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(items.map(getItemId)));
    }
  }, [items, selectedIds.size, getItemId]);

  const clearSelection = useCallback(() => setSelectedIds(new Set()), []);

  // bulk actions از config
  const bulkActions = useMemo(() => {
    if (!config.bulkActions?.length) return [];

    const bulkT = translations.bulkActions || {};

    return config.bulkActions.map((bulk) => ({
      ...bulk,
      label:
        bulkT[`${resource}Bulk${bulk.action.charAt(0).toUpperCase() + bulk.action.slice(1)}`] ||
        bulk.label,
    }));
  }, [config.bulkActions, translations.bulkActions, resource]);

  // handle bulk action
  const handleBulk = useCallback(
    async (action: string) => {
      if (selectedIds.size === 0) {
        toast.error(t("noItemSelected") || "هیچ آیتمی انتخاب نشده");
        return;
      }

      const result = await Swal.fire({
        title: t("bulkConfirmTitle") || "آیا مطمئن هستید؟",
        text: `${selectedIds.size} مورد انتخاب شده`,
        icon: "warning",
        showCancelButton: true,
        confirmButtonText: commonT("confirm"),
        cancelButtonText: commonT("cancel"),
      });

      if (!result.isConfirmed) return;

      startTransition(async () => {
        try {
          const res = await onBulkAction(Array.from(selectedIds), action);
          if (res.success) {
            toast.success(res.message);
            clearSelection();
            router.refresh();
          } else {
            toast.error(res.message);
          }
        } catch {
          toast.error(t("bulkError") || "خطا در عملیات گروهی");
        }
      });
    },
    [selectedIds, onBulkAction, t, commonT, router, clearSelection]
  );

  // handle export
  const [isExporting, setIsExporting] = useState(false);
  const handleExport = useCallback(async () => {
    setIsExporting(true);
    try {
      const csv = await onExport();
      if (typeof csv === "string" && csv) {
        const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${resource}-export-${new Date().toISOString().slice(0, 10)}.csv`;
        a.click();
        URL.revokeObjectURL(url);
        toast.success(t("exportSuccess") || "خروجی با موفقیت دانلود شد");
      }
    } catch {
      toast.error(t("exportError") || "خطا در خروجی گرفتن");
    } finally {
      setIsExporting(false);
    }
  }, [onExport, resource, t]);

  // helpers برای actions کارت
  const helpers = useMemo(() => ({
    router,
    onBanToggle: (ids: string[]) => onBulkAction(ids, "ban"),
    onUnbanToggle: (ids: string[]) => onBulkAction(ids, "unban"),
    onPublishToggle: (ids: string[]) => onBulkAction(ids, "publish"),
    onUnpublishToggle: (ids: string[]) => onBulkAction(ids, "unpublish"),
    onDelete: (ids: string[]) => onBulkAction(ids, "delete"),
  }), [router, onBulkAction]);

  // getCardActions با رفع خطای نوع
  const getCardActions = useCallback(
    (item: T) => {
      if (!config.actions) return [];
      try {
        const safeItem = item as any;
        const rawActions = config.actions(safeItem, helpers);
        return rawActions.map((action: any) => ({
          ...action,
          onClick: action.onClick ? () => action.onClick(safeItem, helpers) : undefined,
        }));
      } catch (err) {
        console.error("Card actions error:", err);
        return [];
      }
    },
    [config.actions, helpers]
  );

  const renderItem = useCallback(
    (item: T) => {
      const id = getItemId(item);
      const isSelected = selectedIds.has(id);
      return (
        <ResourceCard
          key={id}
          item={item}
          resource={resource}
          isSelected={isSelected}
          onToggleSelect={() => toggleSelect(id)}
          getActions={getCardActions}
        />
      );
    },
    [resource, selectedIds, toggleSelect, getCardActions, getItemId]
  );

  const allSelected = selectedIds.size > 0 && selectedIds.size === items.length;
  const hasItems = items.length > 0;

  return (
    <div className="container mx-auto px-6 py-12 md:py-20 max-w-7xl space-y-12 md:space-y-20">
      {/* هدر بدون bulkActions — تمیز و بدون تکرار */}
      <ResourceHeader
        resource={resource}
        totalItems={totalItems}
        stats={stats}
        translations={{
          pageTitle: translations.pageTitle || t("pageTitle"),
          totalCount: translations.totalCount || commonT("totalCount"),
          statistics: translations.statistics || commonT("statistics"),
        }}
        config={config}
      />

      <ResourceFilters resource={resource} initialSearch={searchValue} filterStats={stats} />

      {/* دکمه افزودن جدید + export + select all */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
        <div className="flex flex-wrap items-center gap-6">
          {config.createHref && (
            <a
              href={config.createHref}
              className="inline-flex items-center gap-3 px-8 py-4 bg-primary text-white rounded-2xl text-xl font-bold hover:scale-105 transition shadow-xl"
            >
              <Plus className="w-8 h-8" />
              {t("addNew") || "افزودن جدید"}
            </a>
          )}

          {hasItems && (
            <button
              onClick={handleExport}
              disabled={isPending || isExporting}
              className="inline-flex items-center gap-4 px-8 py-4 bg-blue-600 text-white rounded-2xl text-xl font-bold hover:scale-105 transition shadow-xl disabled:opacity-60"
            >
              {isExporting ? <Loader2 className="w-8 h-8 animate-spin" /> : <Download className="w-8 h-8" />}
              {t("exportCsv") || "خروجی CSV"}
            </button>
          )}
        </div>

        {hasItems && (
          <label className="flex items-center gap-3 cursor-pointer text-lg">
            <input
              type="checkbox"
              checked={allSelected}
              onChange={toggleSelectAll}
              className="w-6 h-6 rounded border-4 accent-primary"
            />
            <span>{t("selectAllOnPage") || "انتخاب همه در این صفحه"}</span>
          </label>
        )}
      </div>

      {/* گرید */}
      <AdminGrid columns={{ default: 1, md: 2, lg: 3, xl: 4 }} gap="lg">
        {hasItems ? items.map(renderItem) : null}
      </AdminGrid>

      {/* Empty State ساده */}
      {!hasItems && (
        <div className="py-20 text-center space-y-6">
          <h3 className="text-4xl font-bold text-muted-foreground">
            {t("noItemsFound") || "هیچ موردی یافت نشد"}
          </h3>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            {t("noItemsDescription") || "لیست خالی است یا جستجو نتیجه‌ای نداشت."}
          </p>
        </div>
      )}

      {/* صفحه‌بندی */}
      {totalPages > 1 && (
        <div className="mt-16">
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={totalItems}
            translationNamespace={`admin.${resource}`}
          />
        </div>
      )}

      {/* نوار ثابت bulk — با دکمه لغو انتخاب */}
      {selectedIds.size > 0 && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 bg-card/95 backdrop-blur-xl border border-border rounded-3xl shadow-2xl p-6 flex items-center gap-8 animate-in fade-in slide-in-from-bottom">
          <button
            onClick={clearSelection}
            className="text-muted-foreground hover:text-foreground transition font-medium flex items-center gap-2"
          >
            <X className="w-5 h-5" />
            لغو انتخاب
          </button>

          <span className="text-xl font-bold pr-6 border-r border-border">
            {selectedIds.size} مورد انتخاب شده
          </span>

          <div className="flex gap-4">
            {bulkActions.map((action) => (
              <button
                key={action.action}
                onClick={() => handleBulk(action.action)}
                disabled={isPending}
                className={cn(
                  "px-8 py-4 rounded-2xl flex items-center gap-3 font-medium transition disabled:opacity-60",
                  action.color || "bg-primary text-white hover:bg-primary/90"
                )}
              >
                {action.icon}
                {action.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}