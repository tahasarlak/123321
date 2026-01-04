import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import { Metadata } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/[locale]/api/auth/[...nextauth]/route"; // ← مهم: این خط رو حتماً اضافه کن
import { redirect, notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { LoadingSkeleton } from "@/components/dashboard/LoadingSkeleton";
import UniversalResourceFormAdmin from "@/components/admin/UniversalResourceFormAdmin";
import { RESOURCE_DISPLAY_CONFIG } from "@/config/resources";
import { FormField } from "@/types/resource-types";

type Props = {
  params: Promise<{ resource: string; id: string; locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { resource, locale } = await params;
  const config = RESOURCE_DISPLAY_CONFIG[resource as keyof typeof RESOURCE_DISPLAY_CONFIG];

  if (!("form" in config) || !config.form?.fields) {
    return { title: "صفحه یافت نشد" };
  }

  const t = await getTranslations({ locale, namespace: `admin.${resource}` });

  const title = t("edit_title") || `ویرایش ${config.singular || resource}`;

  return {
    title,
    // استفاده از ?? به جای || برای جلوگیری از fallback ناخواسته در صورت رشته خالی
    description: t("edit_desc") ?? `ویرایش ${config.singular || resource} در پنل مدیریت`,
  };
}

async function EditResourceContent({ params }: Props) {
  const { resource, id, locale } = await params;
  const config = RESOURCE_DISPLAY_CONFIG[resource as keyof typeof RESOURCE_DISPLAY_CONFIG];

  // چک وجود فرم و fetchOne
  if (!("form" in config) || !config.form?.fields?.length || !("fetchOne" in config)) {
    notFound();
  }

  // استفاده از authOptions برای دریافت session درست
  const session = await getServerSession(authOptions);

  const userRoles = (session?.user?.roles as string[] | undefined) ?? [];

  // لاگ برای دیباگ (در محیط توسعه نگه دار، بعداً حذف کن)
  console.log("[EDIT PAGE DEBUG] Session:", session ? "exists" : "null");
  console.log("[EDIT PAGE DEBUG] User roles:", userRoles);
  console.log("[EDIT PAGE DEBUG] Has admin access?", userRoles.some((r) => ["ADMIN", "SUPER_ADMIN"].includes(r)));

  if (!session || !userRoles.some((r) => ["ADMIN", "SUPER_ADMIN"].includes(r))) {
    console.log("[EDIT PAGE] No session or no admin role → redirect to auth");
    redirect(`/${locale}/auth?error=unauthorized`);
  }

  const t = await getTranslations({ locale, namespace: `admin.${resource}` });

  // fetchOne امن
  const fetchOne = config.fetchOne as (id: string) => Promise<any>;
  const itemData = await fetchOne(id);

  if (!itemData) {
    return (
      <div className="container mx-auto px-6 py-32 text-center">
        <h1 className="text-6xl font-black text-destructive mb-8">
          {t("item_not_found") || "آیتم یافت نشد"}
        </h1>
        <Link
          href={`/dashboard/admin/${resource}`}
          className="inline-block bg-primary text-white px-16 py-8 rounded-3xl text-3xl font-black hover:scale-105 transition-all shadow-2xl"
        >
          {t("back_to_list") || "بازگشت به لیست"}
        </Link>
      </div>
    );
  }

  // Preload امن
  let preloadData: Record<string, any> = {};
  if ("form" in config && config.form && "preload" in config.form && typeof config.form.preload === "function") {
    preloadData = await config.form.preload();
  }

  // تبدیل readonly array به mutable
  const fields = [...(config.form.fields as readonly FormField[])] as FormField[];

  return (
    <div className="container mx-auto px-6 py-12 md:py-20 max-w-7xl">
      <div className="mb-12 text-center">
        <h1 className="text-5xl md:text-7xl font-extrabold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
          {t("edit_title") || `ویرایش ${config.singular || resource}`}
        </h1>
        <div className="mt-8">
          <Link
            href={`/dashboard/admin/${resource}`}
            className="inline-flex items-center gap-3 text-xl md:text-2xl font-semibold text-primary hover:text-primary/80 transition-colors"
          >
            <ChevronLeft size={32} />
            {t("back_to_list") || "بازگشت به لیست"}
          </Link>
        </div>
      </div>

      <div className="bg-card/90 backdrop-blur-xl rounded-2xl shadow-xl border border-border/40 p-8 md:p-12 lg:p-16">
        <UniversalResourceFormAdmin
          resource={resource}
          initialData={itemData}
          preloadData={preloadData}
          fields={fields}
        />
      </div>
    </div>
  );
}

export default function EditResourcePage(props: Props) {
  return (
    <div className="min-h-screen bg-background">
      <Suspense fallback={<LoadingSkeleton />}>
        <EditResourceContent {...props} />
      </Suspense>
    </div>
  );
}