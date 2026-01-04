// src/components/admin/Resource/ResourceManagementClient.tsx
"use client";

import {
  exportResourceCsv,
  bulkResourceAction,
} from "@/actions/admin/resourceActions";

import ResourceManagementPage from "@/components/common/ResourceManagementPage";

type ResourceManagementClientProps<T extends { id: string }> = {
  resource: keyof typeof import("@/config/resources").RESOURCE_DISPLAY_CONFIG;
  items: T[];
  totalItems: number;
  currentPage: number;
  totalPages: number;
  stats: { key: string; count: number }[];
  searchValue: string;
  translations?: {
    pageTitle?: string;
    totalCount?: string;
    statistics?: string;
    bulkActions?: Record<string, string>;
  };
};

export default function ResourceManagementClient<T extends { id: string }>({
  resource,
  items,
  totalItems,
  currentPage,
  totalPages,
  stats,
  searchValue,
  translations = {},
}: ResourceManagementClientProps<T>) {
  const getItemId = (item: T) => item.id;

  const handleBulkAction = async (ids: string[], action: string) => {
    return await bulkResourceAction(resource, ids, action);
  };

  const handleExport = async () => {
    return await exportResourceCsv(resource, {});
  };

  return (
    <ResourceManagementPage
      resource={resource}
      items={items}
      totalItems={totalItems}
      currentPage={currentPage}
      totalPages={totalPages}
      stats={stats}
      searchValue={searchValue}
      onExport={handleExport}
      onBulkAction={handleBulkAction}
      getItemId={getItemId}
      translations={translations}
    />
  );
}