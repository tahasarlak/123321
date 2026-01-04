// src/app/api/upload/route.ts

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/[locale]/api/auth/[...nextauth]/route";
import { handleUpload } from "@/server/public/Handler/upload";
import { ipRateLimit } from "@/lib/redis/rate-limit";
import { headers } from "next/headers";

const SUCCESS_MESSAGE = "فایل با موفقیت آپلود شد.";

const fakeDelay = () =>
  new Promise(resolve => setTimeout(resolve, Math.floor(Math.random() * 200) + 100));

const uniformSuccessResponse = async (url: string | null = null) => {
  await fakeDelay();
  return NextResponse.json(
    {
      message: SUCCESS_MESSAGE,
      url,
    },
    { status: 200 }
  );
};

export async function POST(req: NextRequest) {
  try {
    // === دریافت IP ===
    const headersList = await headers();
    const ip =
      headersList.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      headersList.get("x-real-ip")?.trim() ||
      headersList.get("cf-connecting-ip")?.trim() ||
      headersList.get("x-vercel-forwarded-for")?.trim() ||
      "unknown";

    // === Rate Limit ===
    const { success: rateLimitSuccess } = await ipRateLimit.limit(ip);
    if (!rateLimitSuccess) {
      return await uniformSuccessResponse(null);
    }

    // === چک جلسه ===
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return await uniformSuccessResponse(null);
    }

    const userId = session.user.id;

    // === پارس فایل ===
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file || !(file instanceof File) || file.size === 0) {
      return await uniformSuccessResponse(null);
    }

    // === آپلود با handler ===
    const result = await handleUpload({ file, userId });

    return await uniformSuccessResponse(result.success ? result.url : null);
  } catch (error) {
    console.error("[API UPLOAD] خطای غیرمنتظره:", error);
    return await uniformSuccessResponse(null);
  }
}

export const config = {
  api: {
    bodyParser: false,
  },
};