"use client";

import {
  useState,
  useEffect,
  useMemo,
  useCallback,
  startTransition,
} from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useDebouncedCallback } from "use-debounce";
import { Search, Plus, X, ChevronDown } from "lucide-react";
import { useTranslations } from "next-intl";

import {
  ALL_FILTERABLE_RESOURCES,
  type FilterableResourceKey,
} from "@/config/resources";

import {
  FilterOption,
  FilterOptionWithCount,
  FiltersState,
  FilterStatsItem,
  ResourceAction,
} from "@/types/resource-types";

import ResourceActions from "./ResourceActions";

interface ResourceFiltersProps {
  resourceKey?: FilterableResourceKey; // اختیاری شد
  initialSearch?: string;
  filterStats?: FilterStatsItem[];
}

const DEBOUNCE_DELAY = 300;

export default function ResourceFilters({
  resourceKey,
  initialSearch = "",
  filterStats = [],
}: ResourceFiltersProps) {
  // اگر resourceKey ندادن یا فیلتر نداره → رندر نکن
  if (!resourceKey || !ALL_FILTERABLE_RESOURCES[resourceKey]) {
    return null;
  }

  const config = ALL_FILTERABLE_RESOURCES[resourceKey];

  const tCommon = useTranslations("common");
  const tResource = useTranslations(resourceKey);

  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const urlState = useMemo<FiltersState>(() => {
    const search = searchParams.get("search")?.trim() || initialSearch.trim();
    const filters: Record<string, string> = {};

    config.filters.forEach((f) => {
      const val = searchParams.get(f.param)?.trim();
      if (val) filters[f.param] = val;
    });

    return { search, filters };
  }, [searchParams, config.filters, initialSearch]);

  const [state, setState] = useState<FiltersState>(urlState);
  const [isPending, setIsPending] = useState(false);

  useEffect(() => {
    startTransition(() => setState(urlState));
  }, [urlState]);

  const createQueryString = useCallback(
    (nextState: FiltersState): string => {
      const params = new URLSearchParams(searchParams.toString());

      const trimmedSearch = nextState.search.trim();
      if (trimmedSearch) {
        params.set("search", trimmedSearch);
      } else {
        params.delete("search");
      }

      config.filters.forEach((f) => params.delete(f.param));

      Object.entries(nextState.filters).forEach(([key, value]) => {
        const trimmed = value.trim();
        if (trimmed) params.set(key, trimmed);
      });

      params.set("page", "1");
      return params.toString();
    },
    [searchParams, config.filters]
  );

  const updateUrl = useDebouncedCallback(
    (query: string) => {
      setIsPending(true);
      router.replace(`${pathname}?${query}`, { scroll: false });
      setTimeout(() => setIsPending(false), 200);
    },
    DEBOUNCE_DELAY
  );

  useEffect(() => () => updateUrl.cancel(), [updateUrl]);

  const updateFilters = useCallback(
    (updater: (prev: FiltersState) => FiltersState) => {
      setState((prev) => {
        const next = updater(prev);
        const newQuery = createQueryString(next);
        const currentQuery = createQueryString(prev);

        if (newQuery !== currentQuery) {
          updateUrl(newQuery);
        }
        return next;
      });
    },
    [createQueryString, updateUrl]
  );

  const handleSearchChange = useCallback(
    (value: string) => {
      const normalized = value.trimStart().replace(/\s{2,}/g, " ");
      updateFilters((prev) => ({ ...prev, search: normalized }));
    },
    [updateFilters]
  );

  const handleFilterChange = useCallback(
    (param: string) => (value: string) => {
      updateFilters((prev) => {
        const filters = { ...prev.filters };
        const trimmed = value.trim();
        if (trimmed) {
          filters[param] = trimmed;
        } else {
          delete filters[param];
        }
        return { ...prev, filters };
      });
    },
    [updateFilters]
  );

  const handleReset = useCallback(() => {
    updateUrl.cancel();
    setIsPending(true);
    const emptyState: FiltersState = { search: "", filters: {} };
    setState(emptyState);
    router.replace(`${pathname}?page=1`, { scroll: false });
    setTimeout(() => setIsPending(false), 200);
  }, [router, pathname, updateUrl]);

  const hasActiveFilters =
    state.search.trim().length > 0 || Object.keys(state.filters).length > 0;

  const filterOptionsMap = useMemo<Record<string, FilterOptionWithCount[]>>(
    () => {
      const map: Record<string, FilterOptionWithCount[]> = {};

      config.filters.forEach((filter) => {
        const rawOptions =
          typeof filter.options === "function"
            ? filter.options(filterStats)
            : filter.options;

        if (rawOptions.length === 0) return;

        const normalizedOptions = Array.isArray(rawOptions)
          ? rawOptions.map((item): FilterOption => {
              if (typeof item === "string") {
                return { value: item, label: item };
              }
              const { icon, ...rest } = item as any;
              return {
                ...rest,
                ...(typeof icon === "function" ? { icon } : {}),
              };
            })
          : [];

        const optionsWithCount = normalizedOptions.map((opt) => ({
          ...opt,
          count: filterStats.find((s) => s.key === opt.value)?.count,
        }));

        map[filter.param] = optionsWithCount;
      });

      return map;
    },
    [config.filters, filterStats]
  );

  const visibleFilters = useMemo(() => {
    return config.filters.filter(
      (f) => filterOptionsMap[f.param]?.length > 0
    );
  }, [config.filters, filterOptionsMap]);

  const searchPlaceholder =
    tResource("searchPlaceholder") ||
    tResource("search_placeholder") ||
    tCommon("searchPlaceholder") ||
    "جستجو...";

  const allText = tCommon("all") || "همه";
  const addNewText =
    tResource("add_new") || tResource("addNew") || tCommon("addNew") || "افزودن جدید";
  const resetText = tCommon("resetFilters") || "بازنشانی فیلترها";

  const actions = useMemo<ResourceAction[]>(() => {
    const base: ResourceAction[] = [];

    if (config.createHref) {
      base.push({
        label: addNewText,
        text: addNewText,
        icon: Plus,
        href: config.createHref,
        variant: "default",
        size: "default",
      });
    }

    base.push({
      label: resetText,
      icon: X,
      onClick: handleReset,
      destructive: true,
      disabled: !hasActiveFilters || isPending,
      size: "icon",
    });

    return base;
  }, [
    config.createHref,
    addNewText,
    resetText,
    handleReset,
    hasActiveFilters,
    isPending,
  ]);

  return (
    <div className="bg-card/90 backdrop-blur-xl rounded-3xl shadow-xl p-6 md:p-8 border border-border/40">
      <form
        onSubmit={(e) => e.preventDefault()}
        className="flex flex-col lg:flex-row gap-6 items-stretch lg:items-end"
        noValidate
      >
        <div className="relative flex-1 min-w-0">
          <label htmlFor={`search-${resourceKey}`} className="sr-only">
            {searchPlaceholder}
          </label>
          <Search className="absolute inset-y-0 left-4 h-6 w-6 text-muted-foreground pointer-events-none" />
          <input
            id={`search-${resourceKey}`}
            type="search"
            value={state.search}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder={searchPlaceholder}
            className="w-full pl-14 pr-5 py-3 rounded-2xl border border-input bg-background text-base focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition placeholder:text-muted-foreground/70 disabled:opacity-50"
            disabled={isPending}
          />
          {isPending && (
            <div className="absolute inset-y-0 right-4 flex items-center">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          )}
        </div>

        {visibleFilters.map((filter) => {
          const options = filterOptionsMap[filter.param] ?? [];

          const label =
            tResource(`filters.${filter.param}.label`) ||
            ("label" in filter && filter.label) ||
            filter.param;

          const allOptionText =
            tResource(`filters.${filter.param}.all`) || allText;

          return (
            <div key={filter.param} className="relative min-w-[200px]">
              <label htmlFor={`filter-${filter.param}`} className="sr-only">
                {label}
              </label>
              <select
                id={`filter-${filter.param}`}
                value={state.filters[filter.param] ?? ""}
                onChange={(e) => handleFilterChange(filter.param)(e.target.value)}
                className="w-full px-4 py-3 pr-12 rounded-2xl border border-input bg-background text-base focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition cursor-pointer appearance-none disabled:opacity-50"
                disabled={isPending}
              >
                <option value="">{allOptionText}</option>
                {options.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                    {opt.count !== undefined && ` (${opt.count})`}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground pointer-events-none" />
            </div>
          );
        })}

        <div className="flex items-center gap-3 flex-shrink-0">
          <ResourceActions actions={actions} />
        </div>
      </form>
    </div>
  );
}