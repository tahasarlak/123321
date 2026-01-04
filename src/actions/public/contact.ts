"use server";

import { headers } from "next/headers";
import { ipRateLimit } from "@/lib/redis/rate-limit"; 
import { handleContactSubmission } from "@/server/public/Handler/contact";
import { ContactFormData } from "@/types/contact";

export async function submitContactForm(data: ContactFormData) {
  const headersList = await headers();
  const ip = headersList.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";

  // ← اینجا استفاده می‌شه
  const { success } = await ipRateLimit.limit(ip);
  if (!success) {
    return { success: false, error: "تعداد درخواست‌ها بیش از حد است. لطفاً بعداً تلاش کنید." };
  }

  return handleContactSubmission(data, { ip });
}