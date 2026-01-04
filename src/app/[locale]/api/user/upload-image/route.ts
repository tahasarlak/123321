// src/app/api/user/upload-image/route.ts

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/[locale]/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/db/prisma";
import { ipRateLimit } from "@/lib/redis/rate-limit";
import fs from "fs/promises";
import path from "path";
import { v4 as uuidv4 } from "uuid";
import { headers } from "next/headers";

const UPLOAD_DIR = path.join(process.cwd(), "public", "avatars", "user");
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;

const SUCCESS_MESSAGE = "عکس پروفایل شما با موفقیت آپلود و بروزرسانی شد.";

const fakeDelay = () =>
  new Promise(resolve => setTimeout(resolve, Math.floor(Math.random() * 200) + 100));

const uniformSuccessResponse = async (imageUrl: string | null = null) => {
  await fakeDelay();
  return NextResponse.json(
    {
      message: SUCCESS_MESSAGE,
      imageUrl,
    },
    { status: 200 }
  );
};

async function ensureUploadDir() {
  try {
    await fs.access(UPLOAD_DIR);
  } catch {
    await fs.mkdir(UPLOAD_DIR, { recursive: true });
  }
}

function getSafeExtension(mimeType: string): string | null {
  switch (mimeType) {
    case "image/jpeg":
      return "jpg";
    case "image/png":
      return "png";
    case "image/webp":
      return "webp";
    default:
      return null;
  }
}

async function safelyDeleteOldImage(oldImagePath: string | null) {
  if (!oldImagePath) return;

  const normalized = path.normalize(oldImagePath);
  const fullPath = path.join(process.cwd(), "public", normalized);

  if (!fullPath.startsWith(UPLOAD_DIR)) {
    console.warn("تلاش برای حذف فایل خارج از دایرکتوری مجاز:", fullPath);
    return;
  }

  try {
    await fs.unlink(fullPath);
    console.log("عکس قدیمی پاک شد:", fullPath);
  } catch (err: any) {
    if (err.code !== "ENOENT") {
      console.warn("خطا در حذف عکس قدیمی:", err.message);
    }
  }
}

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
    const image = formData.get("image") as File | null;

    if (!image || !(image instanceof File) || image.size === 0) {
      return await uniformSuccessResponse(null);
    }

    if (!ALLOWED_MIME_TYPES.includes(image.type as any)) {
      return await uniformSuccessResponse(null);
    }

    if (image.size > MAX_FILE_SIZE) {
      return await uniformSuccessResponse(null);
    }

    // === عکس قدیمی ===
    const currentUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { image: true },
    });

    // === ذخیره فایل جدید ===
    const ext = getSafeExtension(image.type);
    if (!ext) {
      return await uniformSuccessResponse(null);
    }

    const filename = `${userId}-${uuidv4()}.${ext}`;
    const filepath = path.join(UPLOAD_DIR, filename);

    await ensureUploadDir();
    const buffer = Buffer.from(await image.arrayBuffer());
    await fs.writeFile(filepath, buffer);

    const imageUrl = `/avatars/user/${filename}`;

    await prisma.user.update({
      where: { id: userId },
      data: { image: imageUrl },
    });

    // === پاک کردن عکس قدیمی ===
    if (currentUser?.image) {
      await safelyDeleteOldImage(currentUser.image);
    }

    return await uniformSuccessResponse(imageUrl);
  } catch (err) {
    console.error("[USER UPLOAD IMAGE] خطای غیرمنتظره:", err);
    return await uniformSuccessResponse(null);
  }
}

export const config = {
  api: {
    bodyParser: false,
  },
};