// src/app/api/user/update/route.ts

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/[locale]/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/db/prisma";
import { z } from "zod";
import { ipRateLimit } from "@/lib/redis/rate-limit";

const updateSchema = z.object({
  name: z.string().min(3, "نام باید حداقل ۳ کاراکتر باشد").max(100).optional(),
  bio: z.string().max(500, "بیوگرافی حداکثر ۵۰۰ کاراکتر").optional(),
  city: z.string().max(100, "نام شهر حداکثر ۱۰۰ کاراکتر").optional(),
  birthDate: z
    .string()
    .transform((str) => (str ? new Date(str) : undefined))
    .pipe(z.date().optional())
    .optional(),
  instagram: z
    .string()
    .regex(/^@?([a-zA-Z0-9._]{1,30})$/, "نام کاربری اینستاگرام نامعتبر است")
    .or(z.literal(""))
    .transform((val) => (val.startsWith("@") ? val : val ? `@${val}` : null))
    .optional(),
  // اگر بعداً آپلود عکس پروفایل اضافه کردی:
  // image: z.string().url().optional(),
});

const SUCCESS_MESSAGE = "پروفایل شما با موفقیت بروزرسانی شد.";

const fakeDelay = () =>
  new Promise(resolve => setTimeout(resolve, Math.floor(Math.random() * 200) + 100)); // 100-300ms

const uniformSuccessResponse = async () => {
  await fakeDelay();
  return NextResponse.json({ message: SUCCESS_MESSAGE }, { status: 200 });
};

export async function PATCH(req: NextRequest) {
  try {
    // === Rate Limit بر اساس IP ===
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    const { success: rateLimitSuccess } = await ipRateLimit.limit(ip);
    if (!rateLimitSuccess) {
      return await uniformSuccessResponse();
    }

    // === چک جلسه ===
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return await uniformSuccessResponse();
    }

    const userId = session.user.id;

    // === پارس و ولیدیشن بدنه ===
    const body = await req.json();
    const parsed = updateSchema.safeParse(body);

    if (!parsed.success) {
      return await uniformSuccessResponse();
    }

    const data = parsed.data;

    // === بروزرسانی کاربر ===
    await prisma.user.update({
      where: { id: userId },
      data: {
        name: data.name?.trim(),
        bio: data.bio?.trim() || null,
        city: data.city?.trim() || null,
        birthDate: data.birthDate || null,
        instagram: data.instagram || null,
      },
    });

    return await uniformSuccessResponse();
  } catch (err) {
    console.error("[USER UPDATE PROFILE] خطای غیرمنتظره:", err);
    return await uniformSuccessResponse();
  }
}