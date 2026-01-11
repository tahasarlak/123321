// src/app/[locale]/(protected)/dashboard/[role]/[resource]/create/page.tsx
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
} from "@/config/resources";
import { hasFormConfig, ResourceConfigWithForm } from "@/types/resource-types";

type Props = {
  params: Promise<{ role: Role; resource: string }>;
};

const VALID_ROLES = new Set(Object.keys(RESOURCES_BY_ROLE) as Role[]);

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { role, resource } = await params;

  if (!VALID_ROLES.has(role)) {
    return { title: "صفحه یافت نشد" };
  }

  const resources = RESOURCES_BY_ROLE[role];

  if (!(resource in resources)) {
    return { title: "منبع یافت نشد" };
  }

  const rawConfig = resources[resource as keyof typeof resources];

  if (!hasFormConfig(rawConfig)) {
    return { title: "فرم ایجاد موجود نیست" };
  }

  // ← این خط رو اضافه کن (مهم!)
  const config = rawConfig as ResourceConfigWithForm<any>;

  const label = typeof config.label === "string" ? config.label : resource;

  try {
    const t = await getTranslations(`${role}.${resource}`);
    return {
      title: t("create_title") || `ایجاد ${label} جدید`,
      description: t("create_desc") || `افزودن ${label} جدید`,
    };
  } catch {
    return {
      title: `ایجاد ${label} جدید`,
      description: "پنل مدیریت",
    };
  }
}

async function CreateDynamicResourceContent({ params }: Props) {
  const { role, resource } = await params;

  if (!VALID_ROLES.has(role)) {
    notFound();
  }

  const resources = RESOURCES_BY_ROLE[role];

  if (!(resource in resources)) {
    notFound();
  }

const config = resources[resource as keyof typeof resources] as ResourceConfigWithForm<any>;

if (!hasFormConfig(config)) {
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

  const label = typeof config.label === "string" ? config.label : resource;

  // Preload داده‌ها
  let preloadData: Record<string, any> = {};
  if (config.form.preload && typeof config.form.preload === "function") {
    try {
      preloadData = await config.form.preload();
    } catch (error) {
      console.warn("خطا در preload:", error);
    }
  }

  return (
    <div className="container mx-auto px-6 py-12 md:py-20 max-w-7xl">
      <div className="mb-12 text-center">
        <h1 className="text-5xl md:text-7xl font-extrabold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
          {t("create_title") || `ایجاد ${label} جدید`}
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
            role={role}
            resource={resource}
            initialData={undefined}
            preloadData={preloadData}
          />
        </Suspense>
      </div>
    </div>
  );
}

export default function CreateDynamicResourcePage(props: Props) {
  return (
    <div className="min-h-screen bg-background">
      <Suspense fallback={<LoadingSkeleton />}>
        <CreateDynamicResourceContent {...props} />
      </Suspense>
    </div>
  );
}