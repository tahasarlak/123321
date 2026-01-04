// src/app/[locale]/(protected)/dashboard/admin/[resource]/page.tsx
import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import { Metadata } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/[locale]/api/auth/[...nextauth]/route";
import { redirect, notFound } from "next/navigation";
import { LoadingSkeleton } from "@/components/dashboard/LoadingSkeleton";
import ResourceManagementClient from "@/components/admin/Resource/ResourceManagementClient";
import { RESOURCE_DISPLAY_CONFIG } from "@/config/resources";
import { sendGlobalNotification } from "@/actions/admin/notifications";
import { Send, Bell } from "lucide-react";

type Props = {
  params: Promise<{ resource: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

const ALLOWED_RESOURCES = new Set(Object.keys(RESOURCE_DISPLAY_CONFIG));

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { resource } = await params;
  if (!ALLOWED_RESOURCES.has(resource)) {
    return { title: "صفحه یافت نشد" };
  }

  try {
    const t = await getTranslations(`admin.${resource}`);
    return {
      title: t("pageTitle") || `مدیریت ${resource}`,
      description: t("pageDescription") || `مدیریت ${t("pageTitle") || resource}`,
    };
  } catch {
    return { title: `مدیریت ${resource}` };
  }
}

async function ResourceContent({ params, searchParams }: Props) {
  const { resource } = await params;
  const resolvedSearchParams = await searchParams;

  if (!ALLOWED_RESOURCES.has(resource)) {
    notFound();
  }

  const session = await getServerSession(authOptions);
  const userRoles: string[] = (session?.user?.roles || []) as string[];
  const hasAdminAccess = userRoles.includes("ADMIN") || userRoles.includes("SUPER_ADMIN");

  if (!session || !hasAdminAccess) {
    redirect("/auth");
  }

  let t = (key: string) => key;
  let commonT = (key: string) => key;

  try {
    const adminT = await getTranslations(`admin.${resource}`);
    const commonTranslations = await getTranslations("common");
    t = adminT;
    commonT = commonTranslations;
  } catch {}

  const search = (resolvedSearchParams.search as string)?.trim() || "";
  const page = Math.max(1, parseInt((resolvedSearchParams.page as string) || "1", 10));

  const config = RESOURCE_DISPLAY_CONFIG[resource as keyof typeof RESOURCE_DISPLAY_CONFIG];

  // داده‌های پیش‌فرض در صورت عدم وجود fetchAction
  let items: any[] = [];
  let totalItems = 0;
  let stats: { key: string; count: number }[] = [];

  // فقط اگر fetchAction وجود داشته باشد استفاده می‌کنیم
  if ("fetchAction" in config && typeof config.fetchAction === "function") {
    try {
      const result = await config.fetchAction({
        search,
        page,
        searchParams: resolvedSearchParams,
      });
      items = result.items ?? [];
      totalItems = result.totalItems ?? 0;
      stats = result.stats ?? [];
    } catch (error) {
      console.error(`خطا در دریافت داده برای منبع ${resource}:`, error);
    }
  }

  const totalPages = Math.ceil(totalItems / 12);

  // بخش خاص برای notifications
  if (resource === "notifications") {
    return (
      <div className="container mx-auto px-6 py-20 max-w-7xl space-y-24">
        {/* فرم ارسال نوتیفیکیشن جدید */}
        <section className="bg-card/95 backdrop-blur-2xl rounded-3xl shadow-3xl p-12 lg:p-20 border border-border/50">
          <h2 className="text-5xl md:text-6xl font-black text-center mb-16 flex items-center justify-center gap-6 text-foreground">
            <Send className="w-16 h-16 text-primary" />
            ارسال نوتیفیکیشن جدید به همه کاربران
          </h2>

          {/* 
            که نوع بازگشت را به Promise<void> تبدیل کند
          */}
          <form
            action={async (formData: FormData) => {
              "use server";
              await sendGlobalNotification(formData);
              // می‌تونید اینجا redirect یا revalidate هم اضافه کنید
            }}
            className="space-y-12 max-w-5xl mx-auto"
          >
            <div className="grid md:grid-cols-2 gap-12">
              <div>
                <label className="block text-3xl md:text-4xl font-black mb-6 text-foreground">
                  عنوان اعلان *
                </label>
                <input
                  name="title"
                  type="text"
                  required
                  placeholder="تخفیف ویژه بلک فرایدی ۲۰۲۵!"
                  className="w-full px-12 py-8 rounded-2xl border-4 border-border focus:border-primary outline-none text-2xl font-medium bg-background"
                />
              </div>
              <div>
                <label className="block text-3xl md:text-4xl font-black mb-6 text-foreground">
                  نوع اعلان
                </label>
                <select
                  name="type"
                  className="w-full px-12 py-8 rounded-2xl border-4 border-border focus:border-primary outline-none text-2xl font-medium bg-background"
                >
                  <option value="INFO">اطلاع‌رسانی</option>
                  <option value="SUCCESS">موفقیت</option>
                  <option value="WARNING">هشدار</option>
                  <option value="ERROR">خطا</option>
                  <option value="OFFER">تخفیف ویژه</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-3xl md:text-4xl font-black mb-6 text-foreground">
                متن اعلان *
              </label>
              <textarea
                name="message"
                required
                rows={6}
                placeholder="متن کامل اعلان را اینجا بنویسید..."
                className="w-full px-12 py-10 rounded-2xl border-4 border-border focus:border-primary outline-none text-2xl resize-none bg-background"
              />
            </div>

            <div>
              <label className="block text-3xl md:text-4xl font-black mb-6 text-foreground">
                لینک (اختیاری)
              </label>
              <input
                name="link"
                type="url"
                placeholder="https://rom.academy/offers"
                className="w-full px-12 py-8 rounded-2xl border-4 border-border focus:border-primary outline-none text-2xl bg-background"
              />
            </div>

            <div className="text-center pt-8">
              <button
                type="submit"
                className="inline-flex items-center gap-8 bg-gradient-to-r from-primary via-secondary to-pink-600 text-white px-32 py-12 rounded-3xl text-5xl font-black hover:scale-105 transition-all shadow-3xl"
              >
                <Bell className="w-20 h-20" />
                ارسال به همه کاربران
              </button>
            </div>
          </form>
        </section>

        {/* لیست نوتیفیکیشن‌ها */}
        <ResourceManagementClient
          resource={resource as keyof typeof RESOURCE_DISPLAY_CONFIG}
          items={items}
          totalItems={totalItems}
          currentPage={page}
          totalPages={totalPages}
          stats={stats}
          searchValue={search}
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

  // حالت عادی برای بقیه منابع
  return (
    <ResourceManagementClient
      resource={resource as keyof typeof RESOURCE_DISPLAY_CONFIG}
      items={items}
      totalItems={totalItems}
      currentPage={page}
      totalPages={totalPages}
      stats={stats}
      searchValue={search}
      translations={{
        pageTitle: t("pageTitle"),
        totalCount: t("totalCount") || commonT("totalCount"),
        statistics: t("statistics") || commonT("statistics"),
        bulkActions:
          "bulkActions" in config && Array.isArray(config.bulkActions)
            ? config.bulkActions.reduce((acc, action) => {
                const actionKey = action.action.charAt(0).toUpperCase() + action.action.slice(1);
                acc[`${resource}Bulk${actionKey}`] = action.label;
                return acc;
              }, {} as Record<string, string>)
            : {},
      }}
    />
  );
}

export default function AdminResourcePage(props: Props) {
  return (
    <div className="min-h-screen bg-background">
      <Suspense fallback={<LoadingSkeleton />}>
        <ResourceContent {...props} />
      </Suspense>
    </div>
  );
}