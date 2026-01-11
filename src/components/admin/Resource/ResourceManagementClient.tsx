"use client";

import dynamic from "next/dynamic";
import { NextIntlClientProvider } from "next-intl";
import type { Messages } from "next-intl";

import {
  exportResourceCsv,
  bulkResourceAction,
} from "@/actions/resourceActions";

const ResourceManagementPage = dynamic(
  () => import("@/components/common/ResourceManagementPage"),
  { ssr: false }
);

import { RESOURCES_BY_ROLE } from "@/config/resources";

type AllResourceKeys =
  | keyof typeof RESOURCES_BY_ROLE.admin
  | keyof typeof RESOURCES_BY_ROLE.instructor
  | keyof typeof RESOURCES_BY_ROLE.blogger;

type ResourceManagementClientProps<T extends { id: string }> = {
  resourceKey: AllResourceKeys;
  items: T[];
  totalItems: number;
  currentPage: number;
  totalPages: number;
  stats: { key: string; count: number }[];
  searchValue: string;
  locale: string;
  messages: Messages;
  translations?: {
    pageTitle?: string;
    totalCount?: string;
    statistics?: string;
    bulkActions?: Record<string, string>;
  };
};

export default function ResourceManagementClient<T extends { id: string }>({
  resourceKey,
  items,
  totalItems,
  currentPage,
  totalPages,
  stats,
  searchValue,
  locale,
  messages,
  translations = {},
}: ResourceManagementClientProps<T>) {
  // ایمن و بدون خطای TS
  const getItemId = (item: T): string => {
    return (item as any).id;
  };

  const handleBulkAction = async (ids: string[], action: string) => {
    return await bulkResourceAction(resourceKey, ids, action);
  };

  const handleExport = async () => {
    return await exportResourceCsv(resourceKey, {});
  };

  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      <ResourceManagementPage
        resourceKey={resourceKey}
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
    </NextIntlClientProvider>
  );
}