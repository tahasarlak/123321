// src/lib/utils/resource-utils.ts

import { RESOURCE_DISPLAY_CONFIG } from "@/config/resources";
import { FilterOption } from "@/types/resource-types";

export const createStatFilterOptions = (
  resourceKey: keyof typeof RESOURCE_DISPLAY_CONFIG,
  stats: { key: string; count: number }[],
  valueMap: Record<string, string> = {}
): FilterOption[] => {
  const config = RESOURCE_DISPLAY_CONFIG[resourceKey];

  const total = stats.reduce((sum, s) => sum + s.count, 0);

  // اگر stats تعریف نشده باشد
  if (!config.stats) {
    return [{ value: "", label: `همه (${total.toLocaleString("fa-IR")})` }];
  }

  const statsConfig = config.stats as Record<string, { label: string; icon?: any; color?: string }>;

  const options = stats
    .filter((s) => s.count > 0)
    .map((s): FilterOption | null => {
      if (!(s.key in statsConfig)) {
        return null;
      }

      const statConfig = statsConfig[s.key];
      const value = valueMap[s.key] ?? s.key;

      return {
        value,
        label: `${statConfig.label} (${s.count.toLocaleString("fa-IR")})`,
      };
    })
    .filter((opt): opt is FilterOption => opt !== null);

  return [
    { value: "", label: `همه (${total.toLocaleString("fa-IR")})` },
    ...options,
  ];
};