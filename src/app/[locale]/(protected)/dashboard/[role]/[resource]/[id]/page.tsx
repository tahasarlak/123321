// src/app/[locale]/(protected)/dashboard/[role]/[resource]/[id]/page.tsx

import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import { Metadata } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/[locale]/api/auth/[...nextauth]/route";
import { redirect, notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { LoadingSkeleton } from "@/components/dashboard/LoadingSkeleton";
import UniversalResourceFormAdmin from "@/components/admin/UniversalResourceFormAdmin";
import {
  RESOURCES_BY_ROLE,
  type Role,
  type ResourceByRole,
} from "@/config/resources";
import { FormField } from "@/types/resource-types";

type Props = {
  params: Promise<{ role: Role; resource: string; id: string }>;
};

const VALID_ROLES = new Set(Object.keys(RESOURCES_BY_ROLE) as Role[]);

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { role, resource, id } = await params;

  if (!VALID_ROLES.has(role)) {
    return { title: "صفحه یافت نشد" };
  }

  const resources = RESOURCES_BY_ROLE[role];
  const resourceKey = resource as ResourceByRole<typeof role>;

  if (!(resourceKey in resources)) {
    return { title: "منبع یافت نشد" };
  }

  const config = resources[resourceKey];

  if (!("form" in config) || !config.form?.fields?.length || !("fetchOne" in config)) {
    return { title: "فرم ویرایش موجود نیست" };
  }

  const label = "singular" in config && typeof config.singular === "string" ? config.singular : resource;

  try {
    const t = await getTranslations(`${role}.${resource}`);
    return {
      title: t("edit_title") || `ویرایش ${label} #${id}`,
      description: t("edit_desc") || `ویرایش اطلاعات ${label}`,
    };
  } catch {
    return {
      title: `ویرایش ${label} #${id}`,
      description: "پنل مدیریت",
    };
  }
}

async function EditDynamicResourceContent({ params }: Props) {
  const { role, resource, id } = await params;

  if (!VALID_ROLES.has(role)) {
    notFound();
  }

  const resources = RESOURCES_BY_ROLE[role];
  const resourceKey = resource as ResourceByRole<typeof role>;

  if (!(resourceKey in resources)) {
    notFound();
  }

  const config = resources[resourceKey];

  if (!("form" in config) || !config.form?.fields?.length || !("fetchOne" in config)) {
    notFound();
  }

  // چک دسترسی
  const session = await getServerSession(authOptions);
  if (!session) {
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

  const userId = session.user.id;

  // ترجمه‌ها
  let t = (key: string) => key;
  let tc = (key: string) => key;

  try {
    const resourceT = await getTranslations(`${role}.${resource}`);
    const commonT = await getTranslations("common");
    t = resourceT;
    tc = commonT;
  } catch (error) {
    console.warn(`ترجمه برای ${role}.${resource} بارگیری نشد`);
  }

  const label = "singular" in config && typeof config.singular === "string" ? config.singular : resource;

  // دریافت داده آیتم
  const fetchOne = config.fetchOne as (id: string, userId?: string) => Promise<any>;

  let itemData: any = null;
  try {
    itemData = await fetchOne(id, role === "instructor" ? userId : undefined);
  } catch (error) {
    console.warn("آیتم یافت نشد یا دسترسی ندارید");
  }

  if (!itemData) {
    return (
      <div className="container mx-auto px-6 py-32 text-center">
        <h1 className="text-6xl font-black text-destructive mb-8">
          {t("item_not_found") || "آیتم یافت نشد"}
        </h1>
        <p className="text-2xl text-muted-foreground mb-12">
          ممکن است حذف شده باشد یا دسترسی نداشته باشید.
        </p>
        <Link
          href={`/dashboard/${role}/${resource}`}
          className="inline-block bg-primary text-white px-16 py-8 rounded-3xl text-3xl font-black hover:scale-105 transition-all shadow-2xl"
        >
          {tc("back_to_list") || "بازگشت به لیست"}
        </Link>
      </div>
    );
  }

  // Preload داده‌ها
  let preloadData: Record<string, any> = {};

  if (config.form?.preload && typeof config.form.preload === "function") {
    try {
      preloadData = await config.form.preload();
    } catch (error) {
      console.warn("خطا در preload:", error);
    }
  }

  // فیلدها
  const fields = [...(config.form.fields as readonly FormField[])] as FormField[];

  return (
    <div className="container mx-auto px-6 py-12 md:py-20 max-w-7xl">
      <div className="mb-12 text-center">
        <h1 className="text-5xl md:text-7xl font-extrabold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
          {t("edit_title") || `ویرایش ${label}`}
        </h1>

        <div className="mt-8">
          <Link
            href={`/dashboard/${role}/${resource}`}
            className="inline-flex items-center gap-3 text-xl md:text-2xl font-semibold text-primary hover:text-primary/80 transition-colors"
          >
            <ChevronLeft size={32} />
            {tc("back_to_list") || "بازگشت به لیست"}
          </Link>
        </div>
      </div>

      <div className="bg-card/90 backdrop-blur-xl rounded-2xl shadow-xl border border-border/40 p-8 md:p-12 lg:p-16">
        <Suspense
          fallback={
            <div className="min-h-[50vh] flex items-center justify-center text-muted-foreground text-2xl">
              در حال بارگذاری فرم...
            </div>
          }
        >
          <UniversalResourceFormAdmin
            resource={resource}
            initialData={itemData}
            preloadData={preloadData}
            fields={fields}
          />
        </Suspense>
      </div>
    </div>
  );
}

export default function EditDynamicResourcePage(props: Props) {
  return (
    <div className="min-h-screen bg-background">
      <Suspense fallback={<LoadingSkeleton />}>
        <EditDynamicResourceContent {...props} />
      </Suspense>
    </div>
  );
}