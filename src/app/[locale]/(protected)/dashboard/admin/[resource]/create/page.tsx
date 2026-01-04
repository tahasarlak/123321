// src/app/[locale]/(protected)/dashboard/admin/[resource]/create/page.tsx
import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import { Metadata } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/[locale]/api/auth/[...nextauth]/route"; // ← اضافه شد
import { redirect, notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { LoadingSkeleton } from "@/components/dashboard/LoadingSkeleton";
import UniversalResourceFormAdmin from "@/components/admin/UniversalResourceFormAdmin";
import { RESOURCE_DISPLAY_CONFIG } from "@/config/resources";
import { FormField } from "@/types/resource-types";

type Props = {
  params: Promise<{ resource: string; locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { resource, locale } = await params;
  const config = RESOURCE_DISPLAY_CONFIG[resource as keyof typeof RESOURCE_DISPLAY_CONFIG];

  if (!config || !("form" in config) || !config.form?.fields?.length) {
    return { title: "صفحه یافت نشد" };
  }

  const t = await getTranslations({ locale, namespace: `admin.${resource}` });
  const tc = await getTranslations({ locale, namespace: "admin.common" });

  return {
    title: t("create_title") || tc("create_title"),
    description: t("create_desc") || `افزودن ${config.label?.toLowerCase() || resource} جدید`,
  };
}

async function CreateResourceContent({ params }: Props) {
  const { resource, locale } = await params;
  const config = RESOURCE_DISPLAY_CONFIG[resource as keyof typeof RESOURCE_DISPLAY_CONFIG];

  if (!config || !("form" in config) || !config.form?.fields?.length) {
    notFound();
  }

  // ← استفاده درست از authOptions
  const session = await getServerSession(authOptions);
  const userRoles = (session?.user?.roles as string[] | undefined) ?? [];

  if (!session || !userRoles.some((r) => ["ADMIN", "SUPER_ADMIN"].includes(r))) {
    redirect(`/${locale}/auth?error=unauthorized`);
  }

  const t = await getTranslations({ locale, namespace: `admin.${resource}` });
  const tc = await getTranslations({ locale, namespace: "admin.common" });

  // Preload امن
  let preloadData: Record<string, any> = {};
  if ("form" in config && config.form && "preload" in config.form && typeof config.form.preload === "function") {
    preloadData = await config.form.preload();
  }

  // تبدیل readonly به mutable برای جلوگیری از خطای TypeScript
  const fields = [...(config.form.fields as readonly FormField[])] as FormField[];

  return (
    <div className="container mx-auto px-6 py-12 md:py-20 max-w-7xl">
      <div className="mb-12 text-center">
        <h1 className="text-5xl md:text-7xl font-extrabold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
          {t("create_title") || tc("create_title")}
        </h1>
        <div className="mt-8">
          <Link
            href={`/dashboard/admin/${resource}`}
            className="inline-flex items-center gap-3 text-xl md:text-2xl font-semibold text-primary hover:text-primary/80 transition-colors"
          >
            <ChevronLeft size={32} />
            {tc("back_to_list")}
          </Link>
        </div>
      </div>

      <div className="bg-card/90 backdrop-blur-xl rounded-2xl shadow-xl border border-border/40 p-8 md:p-12 lg:p-16">
        <Suspense
          fallback={
            <div className="min-h-[50vh] flex items-center justify-center text-muted-foreground">
              در حال بارگذاری فرم...
            </div>
          }
        >
          <UniversalResourceFormAdmin
            resource={resource}
            initialData={undefined}
            preloadData={preloadData}
            fields={fields}
          />
        </Suspense>
      </div>
    </div>
  );
}

export default function CreateResourcePage(props: Props) {
  return (
    <div className="min-h-screen bg-background">
      <Suspense fallback={<LoadingSkeleton />}>
        <CreateResourceContent {...props} />
      </Suspense>
    </div>
  );
}