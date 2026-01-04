// src/server/public/Handler/orders.ts
"use server";

import { prisma } from "@/lib/db/prisma";
import { getSocket } from "@/server/public/Socket/socket";
import { changeOrderStatusSchema } from "@/lib/validations/orders";
import { faOrdersMessages } from "@/lib/validations/orders/messages"; 
import type { OrderResult, OrderListResponse } from "@/types/orders";

async function hasAdminAccess(userId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { roles: { select: { role: true } } },
  });
  return user?.roles.some((r) => ["ADMIN", "SUPERADMIN"].includes(r.role)) ?? false;
}

export async function handleGetUserOrders(userId: string, search?: string, status?: string): Promise<OrderListResponse> {
  const where: any = { userId };

  if (search) where.id = { contains: search, mode: "insensitive" };
  if (status) where.status = status;

  const [orders, total] = await Promise.all([
    prisma.order.findMany({
      where,
      select: {
        id: true,
        status: true,
        finalAmount: true,
        createdAt: true,
        items: { select: { quantity: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
    prisma.order.count({ where }),
  ]);

  const formatted = orders.map(o => ({
    id: o.id,
    status: o.status,
    finalAmount: o.finalAmount,
    createdAt: o.createdAt,
    itemCount: o.items.reduce((sum, i) => sum + i.quantity, 0),
  }));

  return { orders: formatted, total };
}

export async function handleGetAdminOrders(search?: string, status?: string, paymentMethod?: string): Promise<OrderListResponse> {
  const where: any = {};

  if (search) {
    where.OR = [
      { id: { contains: search, mode: "insensitive" } },
      { user: { name: { contains: search, mode: "insensitive" } } },
      { user: { email: { contains: search, mode: "insensitive" } } },
      { user: { phone: { contains: search, mode: "insensitive" } } },
    ];
  }

  if (status) where.status = status;
  if (paymentMethod) where.payment = { method: paymentMethod };

  const [ordersRaw, totalOrders, pendingOrders, todayRevenue] = await Promise.all([
    prisma.order.findMany({
      where,
      include: {
        user: { select: { id: true, name: true, email: true, phone: true } },
        items: {
          include: {
            product: { select: { id: true, title: true, image: true } },
            course: { select: { id: true, title: true, image: true } },
          },
        },
        payment: true,
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.order.count(),
    prisma.order.count({ where: { status: "PENDING" } }),
    prisma.order.aggregate({
      where: {
        status: "PAID",
        createdAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) },
      },
      _sum: { finalAmount: true },
    }),
  ]);

  const formattedOrders = ordersRaw.map(o => ({
    id: o.id,
    status: o.status,
    finalAmount: o.finalAmount,
    createdAt: o.createdAt,
    itemCount: o.items.reduce((sum, i) => sum + i.quantity, 0),
    user: o.user,
    items: o.items,
    payment: o.payment,
  }));

  return {
    orders: formattedOrders,
    total: totalOrders,
    stats: {
      totalOrders,
      pendingOrders,
      todayRevenue: todayRevenue._sum.finalAmount || 0,
    },
  };
}

export async function handleChangeOrderStatus(data: unknown, adminUserId: string): Promise<OrderResult> {
  if (!(await hasAdminAccess(adminUserId))) return { success: false, error: faOrdersMessages.unauthorized };

  const parsed = changeOrderStatusSchema.safeParse(data);
  if (!parsed.success) return { success: false, error: faOrdersMessages.server_error };

  const { orderId, newStatus, honeypot } = parsed.data;
  if (honeypot && honeypot.length > 0) return { success: true };

  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) return { success: false, error: faOrdersMessages.order_not_found };

  await prisma.order.update({
    where: { id: orderId },
    data: { status: newStatus },
  });

  await prisma.notification.create({
    data: {
      userId: order.userId,
      title: "وضعیت سفارش تغییر کرد",
      message: `سفارش #${orderId} به ${newStatus} تغییر کرد.`,
      type: "order",
      link: `/orders/${orderId}`,
    },
  });

  const io = getSocket();
  io?.to(order.userId).emit("order_updated", { orderId, newStatus });

  return { success: true, message: "وضعیت سفارش تغییر کرد" };
}