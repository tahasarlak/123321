// src/app/api/zego/token/route.ts

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/[locale]/api/auth/[...nextauth]/route";
import { ZegoUIKitPrebuilt } from "@zegocloud/zego-uikit-prebuilt";
import { ipRateLimit } from "@/lib/redis/rate-limit";
import { headers } from "next/headers";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";

const appID = Number(process.env.ZEGO_APP_ID);
const serverSecret = process.env.ZEGO_SERVER_SECRET!;

if (!appID || !serverSecret) {
  throw new Error("ZEGO_APP_ID or ZEGO_SERVER_SECRET is missing");
}

const tokenSchema = z.object({
  roomId: z.string().min(1).max(100),
});

const SUCCESS_MESSAGE = "توکن با موفقیت تولید شد.";

const fakeDelay = () =>
  new Promise(resolve => setTimeout(resolve, Math.floor(Math.random() * 200) + 100));

const uniformSuccessResponse = async (token: string | null = null) => {
  await fakeDelay();
  return NextResponse.json(
    {
      message: SUCCESS_MESSAGE,
      token,
    },
    { status: 200 }
  );
};

export async function POST(req: NextRequest) {
  try {
    // === Rate Limit ===
    const headersList = await headers();
    const ip =
      headersList.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      headersList.get("x-real-ip")?.trim() ||
      headersList.get("cf-connecting-ip")?.trim() ||
      headersList.get("x-vercel-forwarded-for")?.trim() ||
      "unknown";

    const { success: rateLimitSuccess } = await ipRateLimit.limit(ip);
    if (!rateLimitSuccess) {
      return await uniformSuccessResponse(null);
    }

    // === چک جلسه ===
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || !session.user.name) {
      return await uniformSuccessResponse(null);
    }

    const userId = session.user.id.toString();
    const userName = session.user.name;

    // === ولیدیشن roomId ===
    const body = await req.json();
    const parsed = tokenSchema.safeParse(body);
    if (!parsed.success) {
      return await uniformSuccessResponse(null);
    }

    const { roomId } = parsed.data;

    // === چک دسترسی: کاربر باید در گروه جلسه باشه + ثبت‌نام تأییدشده داشته باشه ===
    const classSession = await prisma.classSession.findFirst({
      where: {
        zegoRoomId: roomId,
        group: {
          members: {
            some: {
              userId: session.user.id,
            },
          },
          course: {
            enrollments: {
              some: {
                userId: session.user.id,
                status: "APPROVED",
              },
            },
          },
        },
      },
    });

    if (!classSession) {
      return await uniformSuccessResponse(null);
    }

    // === تولید توکن ===
    const token = ZegoUIKitPrebuilt.generateKitTokenForProduction(
      appID,
      serverSecret,
      roomId,
      userId,
      userName
    );

    return await uniformSuccessResponse(token);
  } catch (err) {
    console.error("[ZEGO TOKEN] خطای غیرمنتظره:", err);
    return await uniformSuccessResponse(null);
  }
}