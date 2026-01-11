// src/config/resources/products.ts
import { Package, CheckCircle, AlertCircle, Trash2 } from "lucide-react";
import {
  createEditAction,
  createDeleteAction,
  STOCK_BADGE_MAP,
  COMMON_CLASSES,
} from "./shared";
import { fetchProducts } from "@/actions/products/products";

interface Product {
  id: string;
  title?: string;
  brand?: string;
  sku?: string;
  stock: number;
  price: { IRR?: number };
  isActive: boolean;
  discountPercent?: number;
  category?: { name: string };
  tags?: { name: string }[];
  _count?: { orderItems: number };
}

export const productsConfig = {
  label: "محصولات",
  singular: "محصول",
  icon: Package,
  color: "text-indigo-600",
  createHref: "/dashboard/admin/products/create",
  stats: {
    inStock: { label: "موجود", icon: CheckCircle, color: "text-green-600" },
    outOfStock: { label: "ناموجود", icon: AlertCircle, color: "text-red-600" },
  },
  card: {
    title: (product: Product) => product.title || "بدون نام",
    subtitle: (product: Product) => product.sku || product.brand || "بدون کد",
    avatar: (product: Product) => product.title?.[0]?.toUpperCase() ?? "م",
    badge: (product: Product) =>
      STOCK_BADGE_MAP[product.stock > 0 ? "inStock" : "outOfStock"],
    tags: (product: Product): { text: string; class: string }[] => [
      product.category && {
        text: product.category.name,
        class: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300",
      },
      product.discountPercent && {
        text: `${product.discountPercent}% تخفیف`,
        class: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
      },
    ].filter(Boolean) as { text: string; class: string }[],
    details: (product: Product): { label: string; value: string }[] => [
      {
        label: "قیمت",
        value: `${Number(product.price?.IRR || 0).toLocaleString("fa-IR")} تومان`,
      },
      { label: "موجودی", value: product.stock.toLocaleString("fa-IR") },
      {
        label: "تعداد فروش",
        value: (product._count?.orderItems ?? 0).toLocaleString("fa-IR"),
      },
    ],
    status: (product: Product) => ({
      text: product.isActive ? "فعال" : "غیرفعال",
      icon: product.isActive ? CheckCircle : AlertCircle,
      color: product.isActive ? "text-green-600" : "text-orange-600",
    }),
  },
  actions: (product: Product, helpers?: any) => [
    createEditAction("products", product, helpers),
    {
      label: product.isActive ? "غیرفعال کردن" : "فعال کردن",
      icon: product.isActive ? AlertCircle : CheckCircle,
      ...COMMON_CLASSES.toggle(!product.isActive),
      onClick: () =>
        helpers?.onBulkAction?.([product.id], product.isActive ? "deactivate" : "activate"),
    },
    createDeleteAction(product, helpers),
  ],
  bulkActions: [
    {
      label: "فعال کردن دسته‌جمعی",
      action: "activate",
      icon: CheckCircle, // ← اصلاح شد
      color: "bg-green-600 text-white hover:bg-green-700",
    },
    {
      label: "غیرفعال کردن دسته‌جمعی",
      action: "deactivate",
      icon: AlertCircle, // ← اصلاح شد
      color: "bg-orange-600 text-white hover:bg-orange-700",
    },
    {
      label: "حذف دسته‌جمعی",
      action: "delete",
      icon: Trash2, // ← اصلاح شد
      color: "bg-destructive text-white hover:bg-destructive/90",
    },
  ],
  fetchAction: fetchProducts,
  form: {
    fields: [
      { type: "text", name: "title", label: "عنوان محصول", required: true },
      { type: "text", name: "slug", label: "اسلاگ", required: true },
      { type: "text", name: "brand", label: "برند" },
      {
        type: "select",
        name: "categoryId",
        label: "دسته‌بندی",
        required: true,
        options: "preload.categories" as const,
      },
      {
        type: "textarea",
        name: "description",
        label: "توضیحات کامل محصول",
        required: true,
        rows: 8,
      },
      { type: "number", name: "price.IRR", label: "قیمت (تومان)", required: true },
      { type: "number", name: "discountPercent", label: "درصد تخفیف عمومی محصول" },
      { type: "number", name: "stock", label: "موجودی انبار", required: true },
      { type: "text", name: "tags", label: "تگ‌ها (با کاما جدا کنید)" },
      { type: "image", name: "image", label: "تصویر اصلی محصول", required: true },
      { type: "gallery", name: "gallery", label: "گالری تصاویر محصول" },
      {
        type: "multi-select",
        name: "paymentAccountIds",
        label: "حساب‌های پرداخت مجاز",
        options: "preload.paymentAccounts" as const,
      },
      {
        type: "multi-select",
        name: "shippingMethodIds",
        label: "روش‌های ارسال مجاز",
        options: "preload.shippingMethods" as const,
      },
      { type: "checkbox", name: "isActive", label: "محصول فعال", defaultChecked: true },
    ],
  },
} as const;