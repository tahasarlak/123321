// src/lib/utils/slugify.ts
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[\s\W-]+/g, "-") // جایگزینی فاصله و کاراکترهای غیرحرفی با -
    .replace(/^-+|-+$/g, ""); // حذف - از ابتدا و انتها
}