// src/config/resources/paymentAccounts.ts

import { CreditCard, Wallet, Globe, CheckCircle, XCircle, Trash2 } from "lucide-react";
import React from "react";
import {
  createEditAction,
  createDeleteAction,
  COMMON_CLASSES,
} from "./shared";
import { fetchPaymentAccounts } from "@/actions/admin/paymentAccounts";

interface PaymentAccount {
  id: string;
  title?: string;
  type: "CARD_TO_CARD" | "BANK_TRANSFER" | "CRYPTO";
  bankName?: string;
  holderName?: string;
  isActive: boolean;
  priority: number;
  country: { name: string };
  instructor?: { name: string };
}

export const paymentAccountsConfig = {
  label: "حساب‌های پرداخت",
  singular: "حساب پرداخت",
  icon: Wallet,
  color: "text-indigo-600",
  createHref: "/dashboard/admin/payment-accounts/create",
  stats: {
    active: { label: "فعال", icon: CheckCircle, color: "text-green-600" },
    inactive: { label: "غیرفعال", icon: XCircle, color: "text-orange-600" },
  },
  filters: [] as const,
  card: {
    title: (account: PaymentAccount) => account.title || "بدون عنوان",
    subtitle: (account: PaymentAccount) => account.bankName || account.holderName || "-",
    avatar: () => "💳",
    badge: (account: PaymentAccount) => ({
      text: account.isActive ? "فعال" : "غیرفعال",
      class: account.isActive ? "bg-green-600 text-white" : "bg-orange-600 text-white",
    }),
    tags: (account: PaymentAccount): { text: string; class: string }[] => [
      { text: account.type === "CARD_TO_CARD" ? "کارت به کارت" : account.type === "BANK_TRANSFER" ? "حواله" : "کریپتو", class: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300" },
      { text: account.country.name, class: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300" },
      account.instructor && { text: `استاد: ${account.instructor.name}`, class: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300" },
    ].filter(Boolean) as any,
    details: (account: PaymentAccount): { label: string; value: string }[] => [
      { label: "اولویت", value: account.priority.toString() },
      account.holderName && { label: "صاحب حساب", value: account.holderName },
    ].filter(Boolean) as any,
    status: (account: PaymentAccount) => ({
      text: account.isActive ? "فعال" : "غیرفعال",
      icon: account.isActive ? CheckCircle : XCircle,
      color: account.isActive ? "text-green-600" : "text-orange-600",
    }),
  },
  actions: (account: PaymentAccount, helpers?: any) => [
    createEditAction("payment-accounts", account, helpers),
    {
      label: account.isActive ? "غیرفعال کردن" : "فعال کردن",
      icon: account.isActive ? XCircle : CheckCircle,
      ...COMMON_CLASSES.toggle(!account.isActive),
      onClick: () => helpers?.onBulkAction?.([account.id], account.isActive ? "deactivate" : "activate"),
    },
    createDeleteAction(account, helpers),
  ],
  bulkActions: [
    {
      label: "فعال کردن دسته‌جمعی",
      action: "activate",
      icon: React.createElement(CheckCircle, { className: "w-6 h-6" }),
      color: "bg-green-600 text-white hover:bg-green-700",
    },
    {
      label: "غیرفعال کردن دسته‌جمعی",
      action: "deactivate",
      icon: React.createElement(XCircle, { className: "w-6 h-6" }),
      color: "bg-orange-600 text-white hover:bg-orange-700",
    },
    {
      label: "حذف دسته‌جمعی",
      action: "delete",
      icon: React.createElement(Trash2, { className: "w-6 h-6" }),
      color: "bg-destructive text-white hover:bg-destructive/90",
    },
  ],
  fetchAction: fetchPaymentAccounts,
} as const;