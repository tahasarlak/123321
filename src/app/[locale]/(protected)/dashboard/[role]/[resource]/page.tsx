import { Suspense } from "react";
import { Metadata } from "next";
import { getServerSession } from "next-auth";
import { getTranslations, getMessages } from "next-intl/server";
import { notFound, redirect } from "next/navigation";
import { authOptions } from "@/app/[locale]/api/auth/[...nextauth]/route";
import { LoadingSkeleton } from "@/components/dashboard/LoadingSkeleton";
import ResourceManagementClient from "@/components/admin/Resource/ResourceManagementClient";
import { RESOURCES_BY_ROLE } from "@/config/resources";

type Props = {
  params: Promise<{ locale: string; role: string; resource: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

const VALID_ROLES = ["admin", "instructor", "blogger"] as const;
type ValidRole = typeof VALID_ROLES[number];

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, role, resource } = await params;

  if (!VALID_ROLES.includes(role as ValidRole)) {
    return { title: "صفحه یافت نشد" };
  }

  const resources = RESOURCES_BY_ROLE[role as ValidRole];
  if (!resources || !(resource in resources)) {
    return { title: "منبع یافت نشد" };
  }

  const config = resources[resource as keyof typeof resources] as any;
  const label = config.label || resource;

  try {
    const t = await getTranslations({ locale, namespace: `${role}.${resource}` });
    return {
      title: t("pageTitle") || label,
      description: t("pageDescription") || `مدیریت ${label}`,
    };
  } catch {
    return {
      title: label,
      description: "پنل مدیریت",
    };
  }
}

async function DynamicResourceContent({ params, searchParams }: Props) {
  const { locale, role, resource } = await params;
  const resolvedSearchParams = await searchParams;

  if (!VALID_ROLES.includes(role as ValidRole)) {
    notFound();
  }

  const resources = RESOURCES_BY_ROLE[role as ValidRole];
  if (!resources || !(resource in resources)) {
    notFound();
  }

  const config = resources[resource as keyof typeof resources] as any;
  if (typeof config.fetchAction !== "function") {
    notFound();
  }

  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    redirect("/auth");
  }

  const userRoles = (session.user.roles as string[]) || [];
  const hasAccess =
    (role === "admin" && (userRoles.includes("ADMIN") || userRoles.includes("SUPER_ADMIN"))) ||
    (role === "instructor" && userRoles.includes("INSTRUCTOR")) ||
    (role === "blogger" && userRoles.includes("BLOG_AUTHOR"));

  if (!hasAccess) {
    redirect("/auth");
  }

  const userId = session.user.id as string;

  // ترجمه‌های سمت سرور
  const t = await getTranslations({ locale, namespace: `${role}.${resource}` });
  const commonT = await getTranslations({ locale, namespace: "common" });

  // برای useTranslations در کلاینت
  const messages = await getMessages({ locale });

  // پارامترهای جستجو
  const search = (resolvedSearchParams.search as string)?.trim() || "";
  const page = Math.max(1, parseInt((resolvedSearchParams.page as string) || "1", 10));

  // دریافت داده‌ها
  let items: any[] = [];
  let totalItems = 0;
  let stats: { key: string; count: number }[] = [];

  try {
    const result = await config.fetchAction({
      search,
      page,
      searchParams: resolvedSearchParams,
      ...(role === "instructor" ? { userId } : {}),
    });

    items = result.items ?? [];
    totalItems = result.totalItems ?? result.total ?? 0;

    const rawStats = result.stats ?? [];
    if (Array.isArray(rawStats)) {
      stats = rawStats;
    } else if (typeof rawStats === "object" && rawStats !== null) {
      stats = Object.entries(rawStats)
        .filter(([_, count]) => typeof count === "number")
        .map(([key, count]) => ({ key, count: count as number }));
    }
  } catch (error) {
    console.error(`خطا در دریافت داده برای ${role}/${resource}:`, error);
  }

  const totalPages = Math.ceil(totalItems / 12);

  return (
    <div className="container mx-auto px-6 py-20 max-w-7xl">
      <ResourceManagementClient
        resourceKey={resource as any}
        items={items}
        totalItems={totalItems}
        currentPage={page}
        totalPages={totalPages}
        stats={stats}
        searchValue={search}
        locale={locale}
        messages={messages}
        translations={{
          pageTitle: t("pageTitle"),
          totalCount: t("totalCount") || commonT("totalCount"),
          statistics: t("statistics") || commonT("statistics"),
          bulkActions: {},
        }}
      />
    </div>
  );
}

export default function DynamicDashboardPage(props: Props) {
  return (
    <div className="min-h-screen bg-background">
      <Suspense fallback={<LoadingSkeleton />}>
        <DynamicResourceContent {...props} />
      </Suspense>
    </div>
  );
}