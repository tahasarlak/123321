// src/app/[locale]/(protected)/dashboard/page.tsx
import { Suspense } from "react";
import DashboardProvider from "./DashboardProvider";
import { LoadingSkeleton } from "@/components/dashboard/LoadingSkeleton";

import AdminDashboardContent from "@/components/dashboard/AdminDashboardContent";
import InstructorDashboardContent from "@/components/dashboard/InstructorDashboardContent";
import UserDashboardContent from "@/components/dashboard/UserDashboardContent";
import BlogAuthorDashboardContent from "@/components/dashboard/BlogAuthorDashboardContent";

async function DashboardContent({
  currentRole,
  session,
  locale,
}: {
  currentRole: string;
  session: any;
  locale: string;
}) {
  switch (currentRole) {
    case "SUPERADMIN":
    case "ADMIN":
      return <AdminDashboardContent session={session} locale={locale} />;
    case "INSTRUCTOR":
      return <InstructorDashboardContent session={session} />;
    case "BLOG_AUTHOR":
      return <BlogAuthorDashboardContent session={session} />;
    case "USER":
    default:
      return <UserDashboardContent session={session} locale={locale} />;
  }
}

export default async function ProtectedDashboardPage({
  params,
  searchParams, // ← اینجا دیگه await نکن! مستقیم پاس بده
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { locale } = await params;

  return (
    <Suspense fallback={<LoadingSkeleton />}>
      <DashboardProvider locale={locale} searchParams={searchParams}>
        {(data) => (
          <Suspense fallback={<LoadingSkeleton />}>
            <DashboardContent
              currentRole={data.currentRole}
              session={data.session}
              locale={locale}
            />
          </Suspense>
        )}
      </DashboardProvider>
    </Suspense>
  );
}