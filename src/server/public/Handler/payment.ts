// src/server/public/Handler/payment.ts
"use server";

import { prisma } from "@/lib/db/prisma";
import { ZarinPal } from "zarinpal-checkout";
import { createPaymentSchema } from "@/lib/validations/payment";
import { faPaymentMessages } from "@/lib/validations/payment/messages";
import type { PaymentResult } from "@/types/payment";

const zarinpal = ZarinPal.create(process.env.ZARINPAL_MERCHANT_ID!, process.env.NODE_ENV !== "production");

export async function handleCreatePayment(data: unknown, userId: string): Promise<PaymentResult> {
  const parsed = createPaymentSchema.safeParse(data);
  if (!parsed.success) return { success: false, error: faPaymentMessages.server_error };

  const { orderId, method, honeypot } = parsed.data;
  if (honeypot && honeypot.length > 0) return { success: true, message: "" };

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { user: true },
  });

  if (!order || order.userId !== userId) return { success: false, error: faPaymentMessages.order_not_found };

  if (method === "ONLINE") {
    const payment = await zarinpal.PaymentRequest({
      Amount: order.finalAmount,
      CallbackURL: `${process.env.NEXT_PUBLIC_BASE_URL}/api/payment/verify?orderId=${orderId}`,
      Description: `پرداخت سفارش #${orderId}`,
      Email: order.user.email ?? undefined,
      Mobile: order.user.phone?.replace("0", "98") ?? undefined,
    });

    if (payment.status !== 100) return { success: false, error: faPaymentMessages.gateway_error };

    await prisma.payment.create({
      data: {
        orderId,
        amount: order.finalAmount,
        method: "ONLINE",
        authority: payment.authority,
        status: "PENDING",
      },
    });

    return { success: true, url: payment.url };
  }

  // OFFLINE
  await prisma.payment.create({
    data: {
      orderId,
      amount: order.finalAmount,
      method: "OFFLINE",
      status: "PENDING_APPROVAL",
    },
  });

  return { success: true, message: "سفارش ثبت شد. لطفاً فیش را آپلود کنید" };
}

export async function handleVerifyPayment(authority: string, orderId: string): Promise<PaymentResult> {
  const payment = await prisma.payment.findFirst({
    where: { orderId, authority },
    include: { order: true },
  });

  if (!payment) return { success: false, error: faPaymentMessages.server_error };

  const verify = await zarinpal.PaymentVerification({
    Amount: payment.amount,
    Authority: authority,
  });

  if (verify.status === 100) {
    await prisma.$transaction([
      prisma.payment.update({
        where: { id: payment.id },
        data: { status: "PAID", refId: verify.RefID.toString() },
      }),
      prisma.order.update({
        where: { id: orderId },
        data: { status: "PAID" },
      }),
    ]);

    await prisma.notification.create({
      data: {
        userId: payment.order.userId,
        title: "پرداخت موفق",
        message: `سفارش شما با شماره #${orderId} با موفقیت پرداخت شد.`,
        type: "success",
        link: `/orders/${orderId}`,
      },
    });

    return { success: true, message: "پرداخت موفق" };
  }

  return { success: false, error: "پرداخت ناموفق" };
}