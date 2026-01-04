// src/app/[locale]/auth/reset/page.tsx
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import ResetForm from "@/components/auth/ResetForm";
import AuthLayout from "@/components/auth/AuthLayout";
import { Suspense } from "react";

type Props = {
  searchParams: Promise<{ token?: string }>;
};

export async function generateMetadata() {
  const t = await getTranslations("auth");
  return {
    title: t("reset_password") || "بازیابی رمز عبور",
    description: t("reset_password_desc") || "تنظیم رمز عبور جدید برای حساب شما",
    robots: { index: false, follow: false },
  };
}

// کامپوننت داینامیک که searchParams رو await می‌کنه
async function ResetContent({ searchParamsPromise }: { searchParamsPromise: Promise<{ token?: string }> }) {
  const searchParams = await searchParamsPromise;
  const t = await getTranslations("auth");

  const token = searchParams.token;

  if (!token) {
    redirect("/auth");
  }

  return (
    <div className="w-full max-w-md mx-auto">
      <ResetForm token={token} />
    </div>
  );
}

// fallback لودینگ ساده
function LoadingFallback() {
  return (
    <div className="w-full max-w-md mx-auto p-8 text-center">
      <div className="animate-pulse">
        <div className="h-8 bg-gray-300 dark:bg-gray-700 rounded w-3/4 mx-auto mb-4"></div>
        <div className="h-4 bg-gray-300 dark:bg-gray-700 rounded w-1/2 mx-auto"></div>
      </div>
    </div>
  );
}

export default function ResetPasswordPage({ searchParams }: Props) {
  return (
    <AuthLayout isLogin={false}>
      <Suspense fallback={<LoadingFallback />}>
        <ResetContent searchParamsPromise={searchParams} />
      </Suspense>
    </AuthLayout>
  );
}