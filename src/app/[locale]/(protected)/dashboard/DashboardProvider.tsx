// src/app/[locale]/(protected)/dashboard/DashboardProvider.tsx
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/app/[locale]/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/db/prisma";
import DashboardLayoutClient from "@/components/dashboard/DashboardLayoutClient";
import { ROLES } from "@/config/roles";
import { DASHBOARD_MENU } from "@/config/dashboardMenu";
import { startOfDay } from "date-fns";
import { toZonedTime } from "date-fns-tz";

type IconKey =
  | "home"
  | "users"
  | "book-open"
  | "shopping-cart"
  | "dollar-sign"
  | "settings"
  | "trending-up"
  | "graduation-cap"
  | "gavel"
  | "play-circle"
  | "plus-circle"
  | "message-square"
  | "flag"
  | "default";

interface SubMenuItem {
  href: string;
  label: string;
  badge?: number;
}

interface MenuItem {
  href?: string;
  label: string;
  icon: IconKey;
  badge?: number;
  subItems?: SubMenuItem[];
}

interface DashboardProviderProps {
  children: (data: { session: any; currentRole: string }) => React.ReactNode;
  locale: string;
  searchParams: Promise<Record<string, string | string[] | undefined>>; // ← Promise!
}

export default async function DashboardProvider({
  children,
  locale,
  searchParams,
}: DashboardProviderProps) {
  // ← اینجا await می‌کنیم، چون داخل Server Component و زیر Suspense هستیم
  const resolvedSearchParams = await searchParams;

  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect(`/${locale}/auth/signin?callbackUrl=/${locale}/dashboard`);
  }

  const userId = session.user.id as string;
  const userRoles: string[] = (session.user.roles as string[]) || [];

  const validUserRoles = ROLES.filter((role) =>
    userRoles.includes(role.value)
  ).sort((a, b) => (a.order ?? 999) - (b.order ?? 999));

  if (validUserRoles.length === 0) {
    redirect(`/${locale}/courses`);
  }

  // حالا از resolvedSearchParams استفاده می‌کنیم
  const roleParam = resolvedSearchParams.role;
  const requestedRoleParam =
    typeof roleParam === "string" ? roleParam.toUpperCase() : null;

  const requestedRoleObj = requestedRoleParam
    ? validUserRoles.find((r) => r.value === requestedRoleParam)
    : null;

  const currentRoleObj = requestedRoleObj || validUserRoles[0];
  const currentRole = currentRoleObj.value;
  const hasMultipleRoles = validUserRoles.length > 1;

  // امروز در timezone ایران
  const todayInTehran = toZonedTime(new Date(), "Asia/Tehran");
  const todayStart = startOfDay(todayInTehran);

  // محاسبه badgeها
  let pendingCourses = 0;
  let pendingEnrollments = 0;
  let pendingOrders = 0;

  if (currentRole === "SUPERADMIN" || currentRole === "ADMIN") {
    [pendingCourses, pendingEnrollments, pendingOrders] = await Promise.all([
      prisma.course.count({ where: { status: "PENDING_REVIEW" } }),
      prisma.enrollment.count({ where: { status: "PENDING" } }),
      prisma.order.count({ where: { status: "PENDING" } }),
    ]);
  }

  const badges = {
    pendingCourses,
    pendingEnrollments,
    pendingOrders,
  };

  // محاسبه درآمد امروز
  let todayRevenue = 0;
  try {
    if (currentRole === "ADMIN" || currentRole === "SUPERADMIN") {
      const agg = await prisma.order.aggregate({
        where: { status: "PAID", createdAt: { gte: todayStart } },
        _sum: { finalAmount: true },
      });
      todayRevenue = agg._sum?.finalAmount || 0;
    } else if (currentRole === "INSTRUCTOR") {
      const agg = await prisma.payment.aggregate({
        where: {
          order: {
            items: { some: { course: { instructorId: userId } } },
            status: "PAID",
            createdAt: { gte: todayStart },
          },
        },
        _sum: { amount: true },
      });
      todayRevenue = agg._sum?.amount || 0;
    }
  } catch (error) {
    console.error("Error calculating revenue:", error);
  }

  // ساخت منو
  const menuItems: MenuItem[] = DASHBOARD_MENU.filter((item) =>
    item.roles.includes(currentRole)
  ).map((item) => ({
    label: item.label,
    href: item.href,
    icon: item.icon as IconKey,
    badge: item.badgeKey ? badges[item.badgeKey] : undefined,
    subItems: item.subItems?.map((sub) => ({
      label: sub.label,
      href: sub.href,
      badge: sub.badgeKey ? badges[sub.badgeKey] : undefined,
    })),
  }));

  // اضافه کردن locale به لینک‌ها
  const menuItemsWithLocale: MenuItem[] = menuItems.map((item) => ({
    ...item,
    href: item.href ? `/${locale}${item.href}` : undefined,
    subItems: item.subItems?.map((sub) => ({
      ...sub,
      href: `/${locale}${sub.href}`,
    })),
  }));

  const stats = { todayRevenue };

  return (
    <DashboardLayoutClient
      session={session}
      menuItems={menuItemsWithLocale}
      stats={stats}
      currentRole={currentRole}
      userRoles={userRoles}
      hasMultipleRoles={hasMultipleRoles}
    >
      {children({ session, currentRole })}
    </DashboardLayoutClient>
  );
}