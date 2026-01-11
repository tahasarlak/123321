// app/actions/notification.actions.ts
"use server";

import { prisma } from "@/lib/db/prisma";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/[locale]/api/auth/[...nextauth]/route";
import { getTranslations } from "next-intl/server";
import { z } from "zod";
import sanitizeHtml from "sanitize-html";
import { sendRealtimeNotification } from "./realtime.actions";

// ==================== Types & Enums ====================
import { NotificationType, NotificationPriority } from "@prisma/client";

type NotificationPayload = {
  userIds: string[];
  title: string;
  message: string;
  type?: NotificationType;
  priority?: NotificationPriority;
  link?: string | null;
  data?: Record<string, any> | null;
  courseId?: string | null;
  runId?: string | null;
  groupId?: string | null;
  sessionId?: string | null;
  sentById?: string | null;
};

// ==================== Rate Limiting ====================
const RATE_LIMIT_PER_MINUTE = 15;
const RATE_LIMIT_WINDOW_MS = 60 * 1000;

async function checkRateLimit(userId: string): Promise<boolean> {
  const recent = await prisma.notification.count({
    where: {
      sentById: userId,
      createdAt: { gte: new Date(Date.now() - RATE_LIMIT_WINDOW_MS) },
    },
  });
  return recent < RATE_LIMIT_PER_MINUTE;
}

// ==================== Input Sanitization ====================
function sanitizeInput(text: string, maxLength: number = 800): string {
  return sanitizeHtml(text.trim(), {
    allowedTags: ["b", "i", "em", "strong", "a", "br", "p"],
    allowedAttributes: { a: ["href", "target", "rel"] },
    allowedSchemes: ["https", "http", "mailto"],
  }).substring(0, maxLength);
}

// ==================== Permission Check ====================
async function hasPermissionToNotify(
  currentUserId: string,
  courseId?: string | null,
  isGlobal = false
): Promise<boolean> {
  const adminRoles = await prisma.userRole.findMany({
    where: { userId: currentUserId, role: { in: ["ADMIN", "SUPER_ADMIN"] } },
  });
  if (adminRoles.length > 0) return true;

  if (isGlobal) return false;
  if (!courseId) return false;

  const course = await prisma.course.findUnique({
    where: { id: courseId },
    select: {
      instructorId: true,
      coInstructors: { select: { id: true } },
    },
  });

  if (!course) return false;

  return (
    course.instructorId === currentUserId ||
    course.coInstructors.some((c) => c.id === currentUserId)
  );
}

// ==================== Core: Create & Send Notifications ====================
async function createAndSendNotifications(payload: NotificationPayload) {
  const {
    userIds,
    title,
    message,
    type = NotificationType.INFO,
    priority = NotificationPriority.MEDIUM,
    link = null,
    data = null,
    courseId = null,
    runId = null,
    groupId = null,
    sessionId = null,
    sentById = null,
  } = payload;

  if (userIds.length === 0) return { count: 0 };

  const cleanTitle = sanitizeInput(title, 120);
  const cleanMessage = sanitizeInput(message);

  try {
    const result = await prisma.$transaction(async (tx) => {
      const notifications = await tx.notification.createMany({
        data: userIds.map((userId) => ({
          userId,
          title: cleanTitle,
          message: cleanMessage,
          type,
          priority,
          link,
          data: data ? JSON.parse(JSON.stringify(data)) : null,
          courseId,
          runId,
          groupId,
          sessionId,
          sentById,
        })),
      });

      await sendRealtimeNotification({
        userIds,
        title: cleanTitle,
        message: cleanMessage,
        type,
        link,
        courseId,
        runId,
        groupId,
        sessionId,
      });

      return notifications;
    });

    return { count: result.count };
  } catch (err) {
    console.error("[NOTIFICATION] Transaction failed:", err);
    throw new Error("خطا در ثبت و ارسال اعلان‌ها");
  }
}

// ==================== 1. ارسال دستی توسط ادمین یا مدرس ====================
const manualNotificationSchema = z.object({
  userIds: z.array(z.string()).optional(),
  courseId: z.string().optional(),
  groupId: z.string().optional(),
  runId: z.string().optional(),
  sendToAll: z.boolean().optional(),
  title: z.string().min(1).max(120),
  message: z.string().min(1).max(800),
  type: z.nativeEnum(NotificationType).optional().default(NotificationType.INFO),
  priority: z.nativeEnum(NotificationPriority).optional().default(NotificationPriority.MEDIUM),
  link: z.string().url().optional().nullable(),
  honeypot: z.string().optional(),
});

export async function sendManualNotification(formData: FormData) {
  const session = await getServerSession(authOptions);
  const t = await getTranslations("common");

  if (!session?.user?.id) return { success: false, error: t("please_login") };

  const currentUserId = session.user.id as string;

  if (!(await checkRateLimit(currentUserId))) {
    return { success: false, error: "لطفاً چند دقیقه صبر کنید (محدودیت ارسال)" };
  }

  const raw = Object.fromEntries(formData);
  const parsed = manualNotificationSchema.safeParse(raw);
  if (!parsed.success) return { success: false, error: parsed.error.errors[0].message };

  const { userIds, courseId, groupId, runId, sendToAll, title, message, type, priority, link, honeypot } = parsed.data;

  if (honeypot && honeypot.length > 0) return { success: true, count: 0 };

  let targetUserIds: string[] = [];

  if (sendToAll) {
    if (!(await hasPermissionToNotify(currentUserId, null, true))) {
      return { success: false, error: "فقط مدیران ارشد می‌توانند به همه ارسال کنند" };
    }
    const users = await prisma.user.findMany({
      where: { isActive: true, isBanned: false },
      select: { id: true },
    });
    targetUserIds = users.map((u) => u.id);
  } else if (userIds && userIds.length > 0) {
    targetUserIds = userIds;
  } else if (groupId) {
    if (!(await hasPermissionToNotify(currentUserId, courseId))) {
      return { success: false, error: "شما اجازه ارسال به این گروه را ندارید" };
    }
    const members = await prisma.courseGroupMember.findMany({
      where: { groupId },
      select: { userId: true },
    });
    targetUserIds = members.map((m) => m.userId);
  } else if (runId) {
    const run = await prisma.courseRun.findUnique({
      where: { id: runId },
      select: { courseId: true },
    });
    if (!(await hasPermissionToNotify(currentUserId, run?.courseId))) {
      return { success: false, error: "دسترسی به این دوره ندارید" };
    }
    const enrollments = await prisma.enrollment.findMany({
      where: { runId, status: "APPROVED" },
      select: { userId: true },
    });
    targetUserIds = enrollments.map((e) => e.userId);
  } else if (courseId) {
    if (!(await hasPermissionToNotify(currentUserId, courseId))) {
      return { success: false, error: "شما مدرس یا هم‌مدرس این دوره نیستید" };
    }
    const enrollments = await prisma.enrollment.findMany({
      where: { run: { courseId }, status: "APPROVED" },
      select: { userId: true },
    });
    targetUserIds = enrollments.map((e) => e.userId);
  } else {
    return { success: false, error: "گیرنده(ها) مشخص نشده‌اند" };
  }

  if (targetUserIds.length === 0) {
    return { success: false, error: "هیچ کاربری برای ارسال پیدا نشد" };
  }

  const finalIds = [...new Set(targetUserIds.filter((id) => id !== currentUserId))];

  const result = await createAndSendNotifications({
    userIds: finalIds,
    title,
    message,
    type,
    priority,
    link,
    courseId,
    runId,
    groupId,
    sentById: currentUserId,
  });

  revalidatePath("/dashboard/notifications");
  if (courseId) revalidatePath(`/dashboard/courses/${courseId}`);
  if (groupId) revalidatePath(`/dashboard/groups/${groupId}`);
  if (runId) revalidatePath(`/dashboard/runs/${runId}`);

  return {
    success: true,
    count: result.count,
    message: `اعلان با موفقیت برای ${result.count} نفر ارسال شد`,
  };
}

// ==================== 2. اطلاع‌رسانی نمره‌دهی ====================
export async function notifyGradeAssigned({
  userId,
  courseId,
  score,
  maxScore,
  categoryTitle,
  feedback,
  gradedById,
  type = "ASSIGNMENT",
}: {
  userId: string;
  courseId: string;
  score: number;
  maxScore: number;
  categoryTitle: string;
  feedback?: string;
  gradedById: string;
  type?: "ASSIGNMENT" | "EXAM" | "ATTENDANCE";
}) {
  const cleanCategory = sanitizeInput(categoryTitle);
  const cleanFeedback = feedback ? sanitizeInput(feedback) : undefined;

  const title = type === "EXAM" ? "نمره آزمون شما مشخص شد 🎯" : "نمره جدید دریافت کردید 📝";
  const message = cleanFeedback
    ? `${cleanCategory}\nنمره: ${score} از ${maxScore}\n\nبازخورد: ${cleanFeedback}`
    : `${cleanCategory}\nنمره: ${score} از ${maxScore}`;

  await createAndSendNotifications({
    userIds: [userId],
    title,
    message,
    type: type === "EXAM" ? NotificationType.EXAM : NotificationType.ASSIGNMENT,
    link: `/dashboard/courses/${courseId}/grades`,
    courseId,
    sentById: gradedById,
  });
}

// ==================== 3. اطلاع‌رسانی صدور گواهینامه ====================
export async function notifyCertificateIssued(userId: string, courseId: string) {
  await createAndSendNotifications({
    userIds: [userId],
    title: "گواهینامه جدید صادر شد 🎉",
    message: "تبریک می‌گوییم! گواهینامه دوره با موفقیت صادر گردید. می‌توانید آن را دانلود و به اشتراک بگذارید.",
    type: NotificationType.CERTIFICATE,
    link: `/dashboard/courses/${courseId}/certificate`,
    courseId,
  });
}

// ==================== 4. تغییر وضعیت ثبت‌نام ====================
export async function notifyEnrollmentStatus(
  userId: string,
  courseId: string,
  status: "APPROVED" | "PENDING" | "REJECTED"
) {
  const titles = {
    APPROVED: "ثبت‌نام شما تأیید شد ✅",
    PENDING: "درخواست ثبت‌نام ارسال شد ⏳",
    REJECTED: "درخواست ثبت‌نام رد شد ❌",
  };

  const messages = {
    APPROVED: "تبریک! حالا به محتوای دوره دسترسی دارید.",
    PENDING: "درخواست شما ارسال شد. منتظر تأیید مدرس باشید.",
    REJECTED: "متأسفانه درخواست ثبت‌نام شما تأیید نشد.",
  };

  await createAndSendNotifications({
    userIds: [userId],
    title: titles[status],
    message: messages[status],
    type: NotificationType.ENROLLMENT,
    link: `/dashboard/courses/${courseId}`,
    courseId,
  });
}

// ==================== 5. تغییر وضعیت سفارش ====================
export async function notifyOrderStatus(
  userId: string,
  orderId: string,
  status: "PAID" | "SHIPPED" | "DELIVERED" | "CANCELLED" | "REFUNDED"
) {
  const titles = {
    PAID: "پرداخت موفق ✅",
    SHIPPED: "سفارش ارسال شد 🚚",
    DELIVERED: "سفارش تحویل داده شد 📦",
    CANCELLED: "سفارش لغو شد",
    REFUNDED: "وجه سفارش برگشت داده شد 💰",
  };

  await createAndSendNotifications({
    userIds: [userId],
    title: titles[status],
    message: `سفارش #${orderId} به وضعیت "${titles[status]}" تغییر کرد.`,
    type: NotificationType.PAYMENT,
    link: `/dashboard/orders/${orderId}`,
    data: { orderId },
  });
}

// ==================== 6. شروع کلاس زنده ====================
export async function notifyLiveSessionStarting({
  sessionId,
  title,
  startTime,
  meetLink,
  userIds,
  courseId,
}: {
  sessionId: string;
  title: string;
  startTime: Date;
  meetLink?: string;
  userIds: string[];
  courseId: string;
}) {
  const cleanTitle = sanitizeInput(title);
  const timeStr = startTime.toLocaleTimeString("fa-IR", {
    hour: "2-digit",
    minute: "2-digit",
  });

  const message = `کلاس "${cleanTitle}" ساعت ${timeStr} شروع می‌شود.\n${
    meetLink ? "لینک ورود: " + meetLink : ""
  }`;

  await createAndSendNotifications({
    userIds,
    title: "کلاس زنده در حال شروع است 🔔",
    message,
    type: NotificationType.LIVE_CLASS,
    link: meetLink || `/dashboard/courses/${courseId}/sessions/${sessionId}`,
    courseId,
    sessionId,
  });
}

// ==================== 7. پاسخ به تیکت پشتیبانی ====================
export async function notifyTicketReply(userId: string, ticketId: string) {
  await createAndSendNotifications({
    userIds: [userId],
    title: "پاسخ جدید به تیکت شما",
    message: "پشتیبانی به تیکت شما پاسخ داده است. لطفاً بررسی کنید.",
    type: NotificationType.SUPPORT,
    link: `/dashboard/tickets/${ticketId}`,
  });
}

// ==================== 8. خوش‌آمدگویی به کاربر جدید ====================
export async function notifyWelcome(userId: string) {
  await createAndSendNotifications({
    userIds: [userId],
    title: "به پلتفرم خوش آمدید 👋",
    message: "ثبت‌نام شما با موفقیت انجام شد. حالا می‌توانید دوره‌ها را ببینید و خرید کنید.",
    type: NotificationType.SUCCESS,
    link: "/dashboard",
  });
}

// ==================== 9. تغییر رمز عبور ====================
export async function notifyPasswordChanged(userId: string) {
  await createAndSendNotifications({
    userIds: [userId],
    title: "رمز عبور تغییر کرد 🔐",
    message: "رمز عبور حساب شما با موفقیت تغییر یافت.",
    type: NotificationType.INFO,
  });
}