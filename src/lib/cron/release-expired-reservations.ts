// lib/cron/release-expired-reservations.ts

import { prisma } from "@/lib/db/prisma";
import { NextResponse } from "next/server";

// تابع آزادسازی موجودی رزرو شده (کامل و مستقل)
async function releaseStock(cartItemId: string) {
  const reservation = await prisma.cartItemReservation.findUnique({
    where: { cartItemId },
    include: { cartItem: true },
  });

  if (!reservation || !reservation.cartItem?.productId) {
    // اگر رزرو وجود نداشته باشه یا محصول نداشته باشه، فقط حذف کن
    if (reservation) {
      await prisma.cartItemReservation.delete({ where: { cartItemId } });
    }
    return;
  }

  const productId = reservation.cartItem.productId;
  const quantity = reservation.reservedQuantity;

  try {
    await prisma.$transaction(async (tx) => {
      // ایجاد رکورد حرکت موجودی (آزادسازی)
      await tx.stockMovement.create({
        data: {
          productId,
          type: "RELEASE",
          quantity: quantity, // مثبت چون آزاد می‌شه
          reason: `RELEASE_EXPIRED_CART_ITEM_${cartItemId}`,
          cartItemId,
        },
      });

      // کاهش reservedStock در محصول
      await tx.product.update({
        where: { id: productId },
        data: {
          reservedStock: {
            decrement: quantity,
          },
        },
      });

      // حذف رزرو از جدول
      await tx.cartItemReservation.delete({
        where: { cartItemId },
      });
    });

    console.log(`Released ${quantity} reserved stock for product ${productId} (cartItem: ${cartItemId})`);
  } catch (error) {
    console.error(`Failed to release stock for cartItem ${cartItemId}:`, error);
    // حتی اگر خطا داد، سعی کن رزرو رو حذف کنی تا دوباره پردازش نشه
    await prisma.cartItemReservation.deleteMany({
      where: { cartItemId },
    });
  }
}

// API Route برای Vercel Cron Jobs
export async function GET() {
  try {
    console.log("Starting expired reservations cleanup...");

    const expired = await prisma.cartItemReservation.findMany({
      where: {
        reservedUntil: {
          lt: new Date(),
        },
      },
      select: {
        cartItemId: true,
      },
    });

    if (expired.length === 0) {
      console.log("No expired reservations found.");
      return NextResponse.json(
        { message: "No expired reservations to release." },
        { status: 200 }
      );
    }

    console.log(`Found ${expired.length} expired reservations. Processing...`);

    // پردازش موازی برای سرعت بیشتر (اختیاری — اگر تعداد زیاد بود)
    const promises = expired.map((res) => releaseStock(res.cartItemId));
    await Promise.all(promises);

    console.log(`Successfully released ${expired.length} expired reservations.`);

    return NextResponse.json({
      message: "Expired reservations released successfully",
      releasedCount: expired.length,
    });
  } catch (error) {
    console.error("Error in release-expired-reservations cron:", error);
    return NextResponse.json(
      { error: "Failed to release expired reservations" },
      { status: 500 }
    );
  }
}

