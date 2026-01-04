// src/actions/admin/resourceActions.ts
"use server";

/**
 * خروجی CSV — wrapper برای فراخوانی export هر منبع
 */
export async function exportResourceCsv(resource: string, where: any = {}) {
  try {
    switch (resource) {
      case "users":
        const { exportUsersCsv } = await import("./users");
        return await exportUsersCsv(where);

      case "courses":
        const { exportCoursesCsv } = await import("./courses");
        return await exportCoursesCsv(where);

      case "blogs":
        const { exportBlogsCsv } = await import("./blogs");
        return await exportBlogsCsv(where);

      case "orders":
        const { exportOrdersCsv } = await import("./orders");
        return await exportOrdersCsv(where);

      case "discounts":
        const { exportDiscountsCsv } = await import("./discounts");
        return await exportDiscountsCsv(where);

      default:
        console.warn(`CSV export برای منبع ${resource} پیاده‌سازی نشده است.`);
        return "";
    }
  } catch (error) {
    console.error(`خطا در خروجی CSV برای ${resource}:`, error);
    return "";
  }
}

/**
 * عملیات گروهی — wrapper برای فراخوانی bulk action هر منبع
 */
export async function bulkResourceAction(resource: string, ids: string[], action: string) {
  if (ids.length === 0) {
    return { success: false, message: "هیچ آیتمی انتخاب نشده است." };
  }

  try {
    switch (resource) {
      case "users":
        const { bulkBanUsers } = await import("./users");
        if (action === "ban" || action === "unban") {
          return await bulkBanUsers(ids, action as "ban" | "unban");
        }
        break;

      case "courses":
        const { bulkPublishCourses } = await import("./courses");
        if (["publish", "unpublish", "delete"].includes(action)) {
          return await bulkPublishCourses(ids, action as any);
        }
        break;

      case "blogs":
        const { bulkBlogAction } = await import("./blogs");
        if (["publish", "unpublish", "delete"].includes(action)) {
          return await bulkBlogAction(ids, action as any);
        }
        break;

      case "orders":
        const { bulkOrderStatus } = await import("./orders");
        if (["PAID", "PROCESSING", "SHIPPED", "DELIVERED", "CANCELLED", "REFUNDED"].includes(action)) {
          return await bulkOrderStatus(ids, action as any);
        }
        break;

      case "discounts":
        const { bulkDiscountAction } = await import("./discounts");
        if (["activate", "deactivate", "delete"].includes(action)) {
          return await bulkDiscountAction(ids, action as any);
        }
        break;

      // برای منابع جدید فقط یک case اضافه کنید
      default:
        console.warn(`عملیات گروهی برای منبع ${resource} پیاده‌سازی نشده است.`);
        break;
    }
  } catch (error) {
    console.error(`خطا در عملیات گروهی برای ${resource}:`, error);
  }

  return { success: false, message: "عملیات برای این منبع پشتیبانی نمی‌شود." };
}