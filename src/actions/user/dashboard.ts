// src/actions/user/dashboard.ts

"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/app/[locale]/api/auth/[...nextauth]/route";
import { revalidateTag, revalidatePath } from "next/cache";
import { prisma } from "@/lib/db/prisma";
import { headers } from "next/headers";
import { getTranslations } from "next-intl/server";

// ==== Cache Tags ====
const DASHBOARD_CACHE_TAG = "user:dashboard";
const USER_STATS_CACHE_TAG = "user:stats";

// ==== Helper: Invalidate Dashboard Caches ====
function invalidateDashboardCaches(userId: string) {
  revalidateTag(DASHBOARD_CACHE_TAG, "app");
  revalidateTag(`${DASHBOARD_CACHE_TAG}:${userId}`, "app");
  revalidateTag(USER_STATS_CACHE_TAG, "app");
  revalidateTag(`${USER_STATS_CACHE_TAG}:${userId}`, "app");
  revalidatePath("/dashboard", "page");
  revalidatePath("/profile", "page");
}

// ==== Basic User Guard ====
async function dashboardGuard() {
  const session = await getServerSession(authOptions);
  const t = await getTranslations("dashboard.actions");

  if (!session?.user?.id) {
    return { success: false, message: t("unauthorized") };
  }

  const userId = session.user.id as string;
  const roles = (session.user.roles as string[]) ?? [];

  const headersList = await headers();
  const ip =
    headersList.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    headersList.get("x-real-ip")?.trim() ||
    headersList.get("cf-connecting-ip")?.trim() ||
    headersList.get("x-vercel-forwarded-for")?.trim() ||
    "unknown-ip";

  const userAgent = headersList.get("user-agent") || "unknown";

  return { success: true, userId, roles, ip, userAgent };
}

// ==== Audit Log ====
async function logDashboardAction(
  userId: string,
  action: string,
  details?: object,
  ip?: string,
  userAgent?: string
) {
  try {
    await prisma.activityLog.create({
      data: {
        userId,
        action,
        entity: "Dashboard",
        entityId: userId,
        details: details ? (details as any) : undefined,
        ipAddress: ip ?? "unknown",
        userAgent: userAgent ?? "unknown",
        createdAt: new Date(),
      },
    });
  } catch (error) {
    console.error("[Dashboard Audit Log Failed]", { userId, action, error });
  }
}

// ====================== Server Actions ======================

/** پاک کردن کامل سبد خرید کاربر */
export async function clearCart() {
  const t = await getTranslations("dashboard.actions");
  const guard = await dashboardGuard();
  if (!guard.success) return { success: false, message: guard.message! };

  const { userId, ip, userAgent } = guard;

  try {
    await prisma.$transaction(async (tx) => {
      await tx.cartItem.deleteMany({
        where: { cart: { userId } },
      });

      await logDashboardAction(userId, "CART_CLEARED", {}, ip, userAgent);
    });

    invalidateDashboardCaches(userId);
    return { success: true, message: t("cartCleared") };
  } catch (error) {
    console.error("ClearCart Error", { userId, error });
    return { success: false, message: t("error") };
  }
}

/** بروزرسانی تصویر پروفایل کاربر */
export async function updateProfileImage(formData: FormData) {
  const t = await getTranslations("dashboard.actions");
  const guard = await dashboardGuard();
  if (!guard.success) return { success: false, message: guard.message! };

  const { userId, ip, userAgent } = guard;

  const imageUrlRaw = formData.get("imageUrl");

  // چک دقیق: باید string باشه و با مسیر مجاز شروع بشه
  if (typeof imageUrlRaw !== "string" || !imageUrlRaw.startsWith("/avatars/")) {
    return { success: false, message: t("invalidImage") };
  }

  const imageUrl = imageUrlRaw;

  try {
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { image: imageUrl },
      select: { image: true },
    });

    await logDashboardAction(
      userId,
      "PROFILE_IMAGE_UPDATED",
      { newImageUrl: imageUrl },
      ip,
      userAgent
    );

    invalidateDashboardCaches(userId);
    return { success: true, image: updatedUser.image };
  } catch (error) {
    console.error("UpdateProfileImage Error", { userId, error });
    return { success: false, message: t("error") };
  }
}

/** بروزرسانی نام کاربر */
export async function updateProfileName(formData: FormData) {
  const t = await getTranslations("dashboard.actions");
  const guard = await dashboardGuard();
  if (!guard.success) return { success: false, message: guard.message! };

  const { userId, ip, userAgent } = guard;

  const nameRaw = formData.get("name");

  // چک دقیق نوع و طول
  if (typeof nameRaw !== "string") {
    return { success: false, message: t("invalidName") };
  }

  const name = nameRaw.trim();

  if (name.length < 2 || name.length > 100) {
    return { success: false, message: t("invalidName") };
  }

  try {
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { name },
      select: { name: true },
    });

    await logDashboardAction(
      userId,
      "PROFILE_NAME_UPDATED",
      { newName: name },
      ip,
      userAgent
    );

    invalidateDashboardCaches(userId);
    return { success: true, name: updatedUser.name };
  } catch (error) {
    console.error("UpdateProfileName Error", { userId, error });
    return { success: false, message: t("error") };
  }
}

/** دریافت آمار سریع داشبورد */
export async function getDashboardStats() {
  const guard = await dashboardGuard();
  if (!guard.success) return { success: false, stats: null };

  const { userId } = guard;

  try {
    const [enrolledCount, cartCount, totalSpentResult] = await Promise.all([
      prisma.enrollment.count({ where: { userId } }),
      prisma.cartItem.count({ where: { cart: { userId } } }),
      prisma.payment.aggregate({
        where: { order: { userId }, status: "PAID" },
        _sum: { amount: true },
      }),
    ]);

    return {
      success: true,
      stats: {
        enrolledCount,
        cartCount,
        totalSpent: totalSpentResult._sum.amount || 0,
      },
    };
  } catch (error) {
    console.error("GetDashboardStats Error", { userId, error });
    return { success: false, stats: null };
  }
}