// src/components/admin/ResourceHeader.tsx
// ← Server Component — بدون "use client"

import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
type StatItem = {
  key: string;
  count: number;
};

type BulkActionItem = {
  label: string;
  action: string;
  icon: React.ReactNode;
  color: string;
};

type ResourceHeaderProps = {
  resource: string;
  totalItems: number;
  stats?: StatItem[];
  translations: {
    pageTitle?: string;
    totalCount: string;
    statistics: string;
  };
  config: {
    label: string;
    singular: string;
    icon: LucideIcon;
    color: string;
    stats?: Record<
      string,
      { label: string; icon: LucideIcon; color: string }
    >;
  };
  // جدید: برای نمایش دکمه‌های عملیات دسته‌جمعی
  bulkActions?: BulkActionItem[];
};

export default function ResourceHeader({
  resource,
  totalItems,
  stats = [],
  translations,
  config,
  bulkActions = [],
}: ResourceHeaderProps) {
  // فرمت عدد فارسی با fallback ایمن
  const formatNumber = (num: number): string => {
    try {
      return num.toLocaleString("fa-IR");
    } catch {
      return num.toLocaleString("en-US");
    }
  };

  // فقط آمارهایی که تنظیمات دارن و شمارنده > 0
  const visibleStats = stats
    .filter((stat) => config.stats?.[stat.key] && stat.count > 0)
    .map((stat) => ({
      key: stat.key,
      count: stat.count,
      config: config.stats![stat.key]!,
    }));

  // تعیین کلاس گرید برای آمار
  const gridColsClass = (() => {
    if (visibleStats.length === 0) return "";
    if (visibleStats.length === 1) return "md:grid-cols-1";
    if (visibleStats.length === 2) return "md:grid-cols-2";
    if (visibleStats.length === 3) return "md:grid-cols-3";
    return "md:grid-cols-4";
  })();

  // تبدیل text- به to- برای گرادیان
  const getGradientToColor = (colorClass: string): string => {
    return colorClass.replace(/^text-/, "to-");
  };

  const MainIcon = config.icon;

  return (
    <section
      className="text-center space-y-24 py-12"
      aria-labelledby={`${resource}-header-title`}
    >
      <header className="space-y-10">
        <h1
          id={`${resource}-header-title`}
          className="text-7xl md:text-9xl font-black bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent leading-tight"
        >
          {translations.pageTitle || config.label}
        </h1>

        <p className="text-4xl md:text-5xl font-bold text-foreground/80">
          {translations.totalCount}{" "}
          <span className="text-primary font-black inline-block min-w-[180px] tabular-nums">
            {formatNumber(totalItems)}
          </span>{" "}
          {totalItems === 1 ? config.singular : config.label}
        </p>
      </header>

      {/* دکمه‌های عملیات دسته‌جمعی */}
      {bulkActions.length > 0 && (
        <div className="flex flex-wrap justify-center gap-6 max-w-5xl mx-auto px-6">
          {bulkActions.map((action) => (
            <Button
              key={action.action}
              size="lg"
              variant="outline"
              className={`
                relative overflow-hidden group
                px-10 py-8 text-2xl font-bold
                border-2 ${action.color}
                hover:shadow-2xl transition-all duration-500
                hover:scale-105 hover:border-primary/50
              `}
              // در حال حاضر فقط ظاهر هست — عملیات واقعی در ResourceManagementPage انجام می‌شه
              // بعداً می‌تونی onClick اضافه کنی یا از context استفاده کنی
            >
              <span className="relative z-10 flex items-center gap-4">
                {action.icon}
                <span>{action.label}</span>
              </span>
              {/* افکت گرادیان هاور */}
              <div
                className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                aria-hidden="true"
              >
                <div className={`absolute inset-0 bg-gradient-to-r ${action.color} opacity-10`} />
              </div>
            </Button>
          ))}
        </div>
      )}

      {/* آمار */}
      {visibleStats.length > 0 && (
        <dl
          className={`
            grid grid-cols-1 gap-12 md:gap-16 max-w-7xl mx-auto px-6
            ${gridColsClass}
            lg:gap-20
          `}
          role="list"
          aria-label={translations.statistics}
        >
          {visibleStats.map(({ key, count, config: statConf }) => {
            const Icon = statConf.icon;
            const gradientTo = getGradientToColor(statConf.color);

            return (
              <div
                key={key}
                className="group relative overflow-hidden bg-card/95 backdrop-blur-2xl rounded-3xl shadow-2xl border border-border/50 p-10 flex flex-col items-center gap-8 transition-all duration-500 hover:scale-105 hover:shadow-3xl hover:border-primary/40"
              >
                <div
                  className="absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100 pointer-events-none"
                  aria-hidden="true"
                >
                  <div className={`absolute inset-0 bg-gradient-to-br from-transparent ${gradientTo} opacity-20`} />
                </div>

                <Icon
                  className={`relative z-10 w-28 h-28 md:w-32 md:h-32 ${statConf.color} transition-transform duration-700 group-hover:scale-110`}
                  aria-hidden="true"
                />

                <div className="relative z-10 text-center space-y-4">
                  <dt className="sr-only">{statConf.label}</dt>
                  <dd
                    className={`text-6xl md:text-7xl font-black ${statConf.color} transition-all duration-500 group-hover:scale-110 tabular-nums`}
                    aria-labelledby={`stat-${key}-label`}
                  >
                    {formatNumber(count)}
                  </dd>
                  <dd
                    id={`stat-${key}-label`}
                    className="text-2xl md:text-3xl font-semibold text-foreground/80"
                  >
                    {statConf.label}
                  </dd>
                </div>
              </div>
            );
          })}
        </dl>
      )}

      {/* آیکن بزرگ پس‌زمینه */}
      <div className="relative -mt-12">
        <MainIcon
          className="w-64 h-64 md:w-80 md:h-80 mx-auto text-primary/5"
          aria-hidden="true"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent pointer-events-none" />
      </div>
    </section>
  );
}