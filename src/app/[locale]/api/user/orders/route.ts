// src/app/api/user/orders/route.ts

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/[locale]/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/db/prisma";
import { OrderStatus } from "@prisma/client";
import { ipRateLimit } from "@/lib/redis/rate-limit";
import { headers } from "next/headers";

const MAX_LIMIT = 50;
const DEFAULT_LIMIT = 10;
const SUCCESS_MESSAGE = "لیست سفارشات با موفقیت بارگذاری شد.";

const fakeDelay = () =>
  new Promise(resolve => setTimeout(resolve, Math.floor(Math.random() * 200) + 100)); // 100-300ms

const uniformSuccessResponse = async (
  orders: any[] = [],
  total: number = 0,
  page: number = 1,
  limit: number = DEFAULT_LIMIT
) => {
  await fakeDelay();
  return NextResponse.json(
    {
      message: SUCCESS_MESSAGE,
      orders,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
    { status: 200 }
  );
};

const emptyOrdersResponse = async (page: number = 1, limit: number = DEFAULT_LIMIT) =>
  uniformSuccessResponse([], 0, page, limit);

export async function GET(req: Request) {
  try {
    // === دریافت IP به روش استاندارد ===
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
      return await emptyOrdersResponse(1, DEFAULT_LIMIT);
    }

    // === چک جلسه ===
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return await emptyOrdersResponse(1, DEFAULT_LIMIT);
    }

    const userId = session.user.id;
    const { searchParams } = new URL(req.url);

    // === پارامترهای pagination ===
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    let limit = parseInt(searchParams.get("limit") || `${DEFAULT_LIMIT}`, 10);
    limit = Math.min(MAX_LIMIT, Math.max(1, limit));

    // === فیلتر وضعیت ===
    const statusParam = searchParams.get("status");
    let status: OrderStatus | undefined = undefined;
    if (statusParam && Object.values(OrderStatus).includes(statusParam as OrderStatus)) {
      status = statusParam as OrderStatus;
    }

    const where = {
      userId,
      ...(status && { status }),
    };

    // === گرفتن سفارشات و تعداد کل ===
    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        select: {
          id: true,
          status: true,
          finalAmount: true,
          currency: true,
          createdAt: true,
          items: {
            select: { quantity: true },
          },
        },
        orderBy: { createdAt: "desc" },
        take: limit,
        skip: (page - 1) * limit,
      }),
      prisma.order.count({ where }),
    ]);

    // فرمت کردن سفارشات
    const formattedOrders = orders.map(order => ({
      id: order.id,
      status: order.status,
      finalAmount: order.finalAmount,
      currency: order.currency,
      createdAt: order.createdAt,
      itemCount: order.items.reduce((sum, item) => sum + item.quantity, 0),
    }));

    return await uniformSuccessResponse(formattedOrders, total, page, limit);
  } catch (err) {
    console.error("[USER ORDERS LIST] خطای غیرمنتظره:", err);
    return await emptyOrdersResponse(1, DEFAULT_LIMIT);
  }
}