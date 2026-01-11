"use server";

import { prisma } from "@/lib/db/prisma";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/[locale]/api/auth/[...nextauth]/route";
import { getTranslations } from "next-intl/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";

const PAGE_SIZE = 12;

// چک نقش‌ها
async function getUserRoles(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { roles: { select: { role: true } } },
  });
  return user?.roles.map(r => r.role) || [];
}

async function isAdmin(userId: string): Promise<boolean> {
  const roles = await getUserRoles(userId);
  return roles.includes("ADMIN") || roles.includes("SUPER_ADMIN");
}

async function isInstructor(userId: string): Promise<boolean> {
  const roles = await getUserRoles(userId);
  return roles.includes("INSTRUCTOR");
}

/* ==================== اسکیماها ==================== */
const baseAccountSchema = z.object({
  title: z.string().min(1),
  type: z.enum(["CARD_TO_CARD", "BANK_TRANSFER", "CRYPTO"]),
  bankName: z.string().optional(),
  holderName: z.string().optional(),
  cardNumber: z.string().optional(),
  iban: z.string().optional(),
  countryId: z.string(),
  priority: z.coerce.number().int().default(0),
  isActive: z.coerce.boolean().default(true),
  ownerType: z.enum(["SITE", "INSTRUCTOR", "CUSTOM"]).default("SITE"),
  instructorId: z.string().optional(),
  honeypot: z.string().optional(),
});

const createAccountSchema = baseAccountSchema;
const editAccountSchema = baseAccountSchema.extend({
  id: z.string(),
});

/* ==================== لیست حساب‌های پرداخت ==================== */
export async function fetchPaymentAccounts({
  search = "",
  page = 1,
  userId,
}: {
  search?: string;
  page?: number;
  userId: string;
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.id !== userId) {
    return { items: [], totalItems: 0, stats: [] };
  }

  const currentUserId = session.user.id as string;
  const userIsAdmin = await isAdmin(currentUserId);
  const userIsInstructor = await isInstructor(currentUserId);

  const where: Prisma.PaymentAccountWhereInput = {};

  // مدرس: فقط حساب‌های خودش
  if (!userIsAdmin && userIsInstructor) {
    where.instructorId = currentUserId;
  }

  // جستجو
  if (search.trim()) {
    const trimmed = search.trim();
    where.OR = [
      { title: { contains: trimmed, mode: "insensitive" } },
      { bankName: { contains: trimmed, mode: "insensitive" } },
      { holderName: { contains: trimmed, mode: "insensitive" } },
      { cardNumber: { contains: trimmed, mode: "insensitive" } },
      { iban: { contains: trimmed, mode: "insensitive" } },
      { country: { name: { contains: trimmed, mode: "insensitive" } } },
      { instructor: { name: { contains: trimmed, mode: "insensitive" } } },
    ];
  }

  const [accounts, total] = await Promise.all([
    prisma.paymentAccount.findMany({
      where,
      include: {
        country: { select: { name: true, flagEmoji: true } },
        instructor: { select: { id: true, name: true } },
      },
      orderBy: { priority: "desc", createdAt: "desc" },
      take: PAGE_SIZE,
      skip: (page - 1) * PAGE_SIZE,
    }),
    prisma.paymentAccount.count({ where }),
  ]);

  const items = accounts.map(a => ({
    id: a.id,
    title: a.title,
    type: a.type,
    typeLabel:
      a.type === "CARD_TO_CARD" ? "کارت به کارت" :
      a.type === "BANK_TRANSFER" ? "حواله بانکی" : "کریپتو",
    bankName: a.bankName || "-",
    holderName: a.holderName || "-",
    cardNumber: a.cardNumber ? `**** **** **** ${a.cardNumber.slice(-4)}` : "-",
    iban: a.iban || "-",
    country: a.country ? { name: a.country.name, flag: a.country.flagEmoji } : null,
    instructor: a.instructor ? { id: a.instructor.id, name: a.instructor.name } : null,
    ownerType: a.ownerType,
    priority: a.priority,
    isActive: a.isActive,
    createdAt: a.createdAt.toISOString(),
  }));

  const active = accounts.filter(a => a.isActive).length;
  const inactive = total - active;

  return {
    items,
    totalItems: total,
    stats: [
      { key: "total", count: total },
      { key: "active", count: active },
      { key: "inactive", count: inactive },
    ],
  };
}

/* ==================== ایجاد حساب پرداخت ==================== */
export async function createPaymentAccountAction(formData: FormData) {
  const session = await getServerSession(authOptions);
  const t = await getTranslations("common");

  if (!session?.user?.id) return { success: false, error: "لطفاً وارد شوید" };

  const currentUserId = session.user.id as string;
  const userIsAdmin = await isAdmin(currentUserId);
  const userIsInstructor = await isInstructor(currentUserId);

  if (!userIsAdmin && !userIsInstructor) {
    return { success: false, error: "دسترسی ممنوع" };
  }

  const raw = Object.fromEntries(formData);
  const parsed = createAccountSchema.safeParse(raw);
  if (!parsed.success) return { success: false, error: "داده‌های نامعتبر" };

  const data = parsed.data;
  if (data.honeypot && data.honeypot.length > 0) return { success: true };

  // مدرس فقط می‌تونه حساب خودش بسازه
  if (!userIsAdmin && data.instructorId !== currentUserId) {
    return { success: false, error: "فقط می‌توانید حساب خودتان را ایجاد کنید" };
  }

  await prisma.paymentAccount.create({
    data: {
      title: data.title,
      type: data.type,
      bankName: data.bankName || null,
      holderName: data.holderName || null,
      cardNumber: data.cardNumber || null,
      iban: data.iban || null,
      country: { connect: { id: data.countryId } },
      priority: data.priority,
      isActive: data.isActive,
      ownerType: userIsAdmin ? data.ownerType : "INSTRUCTOR",
      instructor: data.instructorId ? { connect: { id: data.instructorId } } : undefined,
    },
  });

  const path = userIsAdmin ? "/dashboard/admin/payment-accounts" : "/dashboard/instructor/payment-accounts";
  revalidatePath(path);
  return { success: true, message: "حساب پرداخت با موفقیت ایجاد شد" };
}

/* ==================== ویرایش حساب پرداخت ==================== */
export async function editPaymentAccountAction(formData: FormData) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return { success: false, error: "لطفاً وارد شوید" };

  const currentUserId = session.user.id as string;
  const userIsAdmin = await isAdmin(currentUserId);

  const raw = Object.fromEntries(formData);
  const parsed = editAccountSchema.safeParse(raw);
  if (!parsed.success || !parsed.data.id) return { success: false, error: "داده نامعتبر" };

  const data = parsed.data;

  const existing = await prisma.paymentAccount.findUnique({
    where: { id: data.id },
    select: { instructorId: true, ownerType: true },
  });
  if (!existing) return { success: false, error: "حساب یافت نشد" };

  // چک دسترسی مدرس
  if (!userIsAdmin && existing.instructorId !== currentUserId) {
    return { success: false, error: "دسترسی ممنوع" };
  }

  await prisma.paymentAccount.update({
    where: { id: data.id },
    data: {
      title: data.title,
      type: data.type,
      bankName: data.bankName || null,
      holderName: data.holderName || null,
      cardNumber: data.cardNumber || null,
      iban: data.iban || null,
      country: { connect: { id: data.countryId } },
      priority: data.priority,
      isActive: data.isActive,
      ownerType: userIsAdmin ? data.ownerType : existing.ownerType,
      instructor: data.instructorId ? { connect: { id: data.instructorId } } : undefined,
    },
  });

  const path = userIsAdmin ? "/dashboard/admin/payment-accounts" : "/dashboard/instructor/payment-accounts";
  revalidatePath(path);
  return { success: true, message: "حساب پرداخت با موفقیت ویرایش شد" };
}

/* ==================== عملیات گروهی ==================== */
export async function bulkPaymentAccountAction(
  selectedIds: string[],
  action: "activate" | "deactivate" | "delete",
  userId: string
) {
  const userIsAdmin = await isAdmin(userId);
  const userIsInstructor = await isInstructor(userId);

  if (!userIsAdmin && !userIsInstructor) {
    return { success: false, message: "دسترسی ممنوع" };
  }

  if (selectedIds.length === 0) return { success: false, message: "هیچ حسابی انتخاب نشده" };

  // چک مالکیت برای مدرس
  if (!userIsAdmin) {
    const accounts = await prisma.paymentAccount.findMany({
      where: { id: { in: selectedIds }, instructorId: userId },
    });
    if (accounts.length !== selectedIds.length) {
      return { success: false, message: "دسترسی به برخی حساب‌ها ممنوع است" };
    }
  }

  if (action === "delete") {
    await prisma.paymentAccount.deleteMany({ where: { id: { in: selectedIds } } });
  } else {
    await prisma.paymentAccount.updateMany({
      where: { id: { in: selectedIds } },
      data: { isActive: action === "activate" },
    });
  }

  const path = userIsAdmin ? "/dashboard/admin/payment-accounts" : "/dashboard/instructor/payment-accounts";
  revalidatePath(path);
  return { success: true, message: `${selectedIds.length} حساب با موفقیت ${action === "delete" ? "حذف" : action === "activate" ? "فعال" : "غیرفعال"} شدند` };
}

/* ==================== حذف تک حساب ==================== */
export async function deletePaymentAccountAction(accountId: string, userId: string) {
  const userIsAdmin = await isAdmin(userId);
  const userIsInstructor = await isInstructor(userId);

  if (!userIsAdmin && !userIsInstructor) return { success: false, error: "دسترسی ممنوع" };

  const account = await prisma.paymentAccount.findUnique({ where: { id: accountId } });
  if (!account) return { success: false, error: "حساب یافت نشد" };

  if (!userIsAdmin && account.instructorId !== userId) {
    return { success: false, error: "دسترسی ممنوع" };
  }

  await prisma.paymentAccount.delete({ where: { id: accountId } });

  const path = userIsAdmin ? "/dashboard/admin/payment-accounts" : "/dashboard/instructor/payment-accounts";
  revalidatePath(path);
  return { success: true, message: "حساب حذف شد" };
}

/* ==================== خروجی CSV (فقط ادمین) ==================== */
export async function exportPaymentAccountsCsv(userId: string) {
  if (!(await isAdmin(userId))) throw new Error("دسترسی ممنوع — فقط ادمین");

  const accounts = await prisma.paymentAccount.findMany({
    include: {
      country: true,
      instructor: { select: { name: true } },
    },
    orderBy: { priority: "desc" },
  });

  const headers = ["عنوان", "نوع", "کشور", "بانک", "صاحب حساب", "شماره کارت/آی‌بان", "وضعیت", "اولویت", "مدرس", "تاریخ ایجاد"];
  const rows = accounts.map(a => [
    a.title,
    a.type === "CARD_TO_CARD" ? "کارت به کارت" : a.type === "BANK_TRANSFER" ? "حواله" : "کریپتو",
    a.country.name,
    a.bankName || "-",
    a.holderName || "-",
    a.cardNumber || a.iban || "-",
    a.isActive ? "فعال" : "غیرفعال",
    a.priority.toString(),
    a.instructor?.name || "-",
    new Date(a.createdAt).toLocaleDateString("fa-IR"),
  ]);

  const csv = [headers.join(","), ...rows.map(r => r.map(c => `"${c}"`).join(","))].join("\n");
  return `\uFEFF${csv}`;
}