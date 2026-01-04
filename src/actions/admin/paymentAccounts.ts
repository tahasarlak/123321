// src/actions/admin/paymentAccounts.ts
"use server";

import { prisma } from "@/lib/db/prisma";
import { Prisma } from "@prisma/client";

const PAGE_SIZE = 12;

/**
 * دریافت داده‌های حساب‌های پرداخت برای نمایش در لیست
 */
export async function fetchPaymentAccounts({
  search = "",
  page = 1,
  searchParams = {},
}: {
  search?: string;
  page?: number;
  searchParams?: Record<string, string | string[] | undefined>;
}) {
  const where: Prisma.PaymentAccountWhereInput = {};

  if (search.trim()) {
    const trimmedSearch = search.trim();
    where.OR = [
      { title: { contains: trimmedSearch, mode: "insensitive" } },
      { bankName: { contains: trimmedSearch, mode: "insensitive" } },
      { holderName: { contains: trimmedSearch, mode: "insensitive" } },
      { cardNumber: { contains: trimmedSearch, mode: "insensitive" } },
      { iban: { contains: trimmedSearch, mode: "insensitive" } },
      { country: { name: { contains: trimmedSearch, mode: "insensitive" } } },
      { instructor: { name: { contains: trimmedSearch, mode: "insensitive" } } },
    ];
  }

  const [accountsRaw, totalAccounts] = await Promise.all([
    prisma.paymentAccount.findMany({
      where,
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: {
        country: true,
        instructor: { select: { name: true } },
      },
      orderBy: { priority: "desc" },
    }),
    prisma.paymentAccount.count({ where }),
  ]);

  const items = accountsRaw;

  // آمار وضعیت
  const active = accountsRaw.filter(a => a.isActive).length;
  const inactive = totalAccounts - active;

  const stats = [
    { key: "active", count: active },
    { key: "inactive", count: inactive },
  ];

  return { items, totalItems: totalAccounts, stats };
}

/**
 * عملیات گروهی فعال/غیرفعال/حذف حساب‌های پرداخت
 */
export async function bulkPaymentAccountAction(
  selectedIds: string[],
  action: "activate" | "deactivate" | "delete"
) {
  if (selectedIds.length === 0) {
    return {
      success: false,
      message: "هیچ حسابی انتخاب نشده است.",
    };
  }

  try {
    if (action === "delete") {
      await prisma.paymentAccount.deleteMany({
        where: { id: { in: selectedIds } },
      });
      return {
        success: true,
        message: `${selectedIds.length} حساب پرداخت با موفقیت حذف شدند.`,
      };
    }

    const isActive = action === "activate";

    await prisma.paymentAccount.updateMany({
      where: { id: { in: selectedIds } },
      data: { isActive },
    });

    return {
      success: true,
      message: `${selectedIds.length} حساب پرداخت با موفقیت ${isActive ? "فعال" : "غیرفعال"} شدند.`,
    };
  } catch (error) {
    console.error("خطا در عملیات گروهی حساب‌های پرداخت:", error);
    return {
      success: false,
      message: "خطایی در انجام عملیات گروهی رخ داد.",
    };
  }
}

/**
 * خروجی CSV از حساب‌های پرداخت
 */
export async function exportPaymentAccountsCsv(where: Prisma.PaymentAccountWhereInput = {}) {
  try {
    const accounts = await prisma.paymentAccount.findMany({
      where,
      include: {
        country: true,
        instructor: { select: { name: true } },
      },
      orderBy: { priority: "desc" },
    });

    const headers = [
      "عنوان",
      "نوع",
      "کشور",
      "بانک",
      "صاحب حساب",
      "وضعیت",
      "اولویت",
      "متعلق به استاد",
      "تاریخ ایجاد",
    ];

    const rows = accounts.map((acc) => [
      acc.title || "-",
      acc.type === "CARD_TO_CARD" ? "کارت به کارت" : acc.type === "BANK_TRANSFER" ? "حواله بانکی" : "کریپتو",
      acc.country.name || "-",
      acc.bankName || "-",
      acc.holderName || "-",
      acc.isActive ? "فعال" : "غیرفعال",
      acc.priority,
      acc.instructor?.name || "-",
      new Date(acc.createdAt).toLocaleDateString("fa-IR"),
    ]);

    const csvLines = [
      headers.join(","),
      ...rows.map((row) =>
        row
          .map((cell) => `"${String(cell).replace(/"/g, '""')}"`)
          .join(",")
      ),
    ].join("\n");

    return `\uFEFF${csvLines}`;
  } catch (error) {
    console.error("خطا در خروجی CSV حساب‌های پرداخت:", error);
    throw new Error("خطایی در تولید فایل CSV رخ داد.");
  }
}