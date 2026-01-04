// src/app/api/user/orders/[id]/route.ts

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/[locale]/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/db/prisma";
import { ipRateLimit } from "@/lib/redis/rate-limit";
import { headers } from "next/headers";

const SUCCESS_MESSAGE = "جزئیات سفارش با موفقیت بارگذاری شد.";

const fakeDelay = () =>
  new Promise(resolve => setTimeout(resolve, Math.floor(Math.random() * 200) + 100));

const uniformSuccessResponse = async (order: any | null = null) => {
  await fakeDelay();
  return NextResponse.json(
    {
      message: SUCCESS_MESSAGE,
      order,
    },
    { status: 200 }
  );
};

export async function GET(req: Request, { params }: { params: { id: string } }) {
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
    const orderId = params.id;

    // === چک اولیه id ===
    if (!orderId || orderId.length < 10) {
      return await uniformSuccessResponse(null);
    }

    // === گرفتن سفارش با select کامل (بدون include) ===
    const order = await prisma.order.findUnique({
      where: {
        id: orderId,
        userId, 
      },
      select: {
        id: true,
        status: true,
        totalAmount: true,
        currency: true,
        discountAmount: true,
        finalAmount: true,
        paymentMethod: true,
        trackingCode: true,
        createdAt: true,
        updatedAt: true,

        // آیتم‌های سفارش
        items: {
          select: {
            quantity: true,
            price: true,
            currency: true,

            // محصول
            product: {
              select: {
                id: true,
                title: true,
                image: true,
                price: true,
              },
            },

            // دوره
            course: {
              select: {
                id: true,
                title: true,
                image: true,
                price: true,
              },
            },
          },
        },

        // پرداخت
        payment: {
          select: {
            status: true,
            method: true,
            amount: true,
            currency: true,
            refId: true,
            createdAt: true,
          },
        },
      },
    });

    return await uniformSuccessResponse(order || null);
  } catch (err) {
    console.error("[USER ORDER DETAIL] خطای غیرمنتظره:", err);
    return await uniformSuccessResponse(null);
  }
}