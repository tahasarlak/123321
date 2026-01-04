// src/server/public/Handler/adminShipping.ts
"use server";

import { prisma } from "@/lib/db/prisma";
import {
  createZoneSchema,
  editZoneSchema,
  createMethodSchema,
  editMethodSchema,
  createPickupSchema,
  editPickupSchema,
} from "@/lib/validations/adminShipping";
import { faAdminShippingMessages } from "@/lib/validations/adminShipping/messages";
import type { ShippingResult } from "@/types/adminShipping";

async function hasAdminAccess(userId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { roles: { select: { role: true } } },
  });
  return user?.roles.some((r) => ["ADMIN", "SUPERADMIN"].includes(r.role)) ?? false;
}

// ---------- ZONES ----------
export async function handleCreateZone(data: unknown, adminUserId: string): Promise<ShippingResult> {
  if (!(await hasAdminAccess(adminUserId))) return { success: false, error: faAdminShippingMessages.unauthorized };

  const parsed = createZoneSchema.safeParse(data);
  if (!parsed.success) return { success: false, error: faAdminShippingMessages.server_error };

  const { name, countryIds, isActive, honeypot } = parsed.data;
  if (honeypot && honeypot.length > 0) return { success: true };

  const zone = await prisma.shippingZone.create({
    data: {
      name,
      isActive,
      countries: { connect: countryIds.map((id) => ({ id })) },
    },
  });

  return { success: true, message: "زون ارسال ایجاد شد", item: zone };
}

export async function handleEditZone(data: unknown, adminUserId: string): Promise<ShippingResult> {
  if (!(await hasAdminAccess(adminUserId))) return { success: false, error: faAdminShippingMessages.unauthorized };

  const parsed = editZoneSchema.safeParse(data);
  if (!parsed.success) return { success: false, error: faAdminShippingMessages.server_error };

  const { id, name, countryIds, isActive } = parsed.data;

  const updateData: any = {};
  if (name) updateData.name = name;
  if (isActive !== undefined) updateData.isActive = isActive;
  if (countryIds) updateData.countries = { set: [], connect: countryIds.map((id) => ({ id })) };

  const zone = await prisma.shippingZone.update({
    where: { id },
    data: updateData,
  });

  return { success: true, message: "زون ارسال ویرایش شد", item: zone };
}

export async function handleDeleteZone(zoneId: string, adminUserId: string): Promise<ShippingResult> {
  if (!(await hasAdminAccess(adminUserId))) return { success: false, error: faAdminShippingMessages.unauthorized };

  const usage = await prisma.shippingZone.findUnique({
    where: { id: zoneId },
    select: { methods: { take: 1 } },
  });

  if (usage?.methods.length) {
    return { success: false, error: faAdminShippingMessages.in_use };
  }

  await prisma.shippingZone.delete({ where: { id: zoneId } });

  return { success: true, message: "زون ارسال حذف شد" };
}

// ---------- METHODS ----------
export async function handleCreateMethod(data: unknown, adminUserId: string): Promise<ShippingResult> {
  if (!(await hasAdminAccess(adminUserId))) return { success: false, error: faAdminShippingMessages.unauthorized };

  const parsed = createMethodSchema.safeParse(data);
  if (!parsed.success) return { success: false, error: faAdminShippingMessages.server_error };

  const {
    title,
    type,
    cost,
    costPercent,
    freeAbove,
    estimatedDays,
    priority,
    isActive,
    address,
    phone,
    icon,
    locationDetails,
    zoneId,
    pickupId,
    honeypot,
  } = parsed.data;

  if (honeypot && honeypot.length > 0) return { success: true };

  const methodData: any = {
    title,
    type,
    cost,
    costPercent,
    freeAbove,
    estimatedDays,
    priority,
    isActive,
    zone: zoneId ? { connect: { id: zoneId } } : undefined,
    pickup: pickupId ? { connect: { id: pickupId } } : undefined,
  };

  if (type === "PRESENTIAL") {
    methodData.address = address;
    methodData.phone = phone;
    methodData.icon = icon;
    methodData.locationDetails = locationDetails;
  }

  const method = await prisma.shippingMethod.create({
    data: methodData,
  });

  return { success: true, message: "روش ارسال ایجاد شد", item: method };
}

export async function handleEditMethod(data: unknown, adminUserId: string): Promise<ShippingResult> {
  if (!(await hasAdminAccess(adminUserId))) return { success: false, error: faAdminShippingMessages.unauthorized };

  const parsed = editMethodSchema.safeParse(data);
  if (!parsed.success) return { success: false, error: faAdminShippingMessages.server_error };

  const { id, type, address, phone, icon, locationDetails, ...updateData } = parsed.data;

  const methodData: any = updateData;

  if (type === "PRESENTIAL") {
    methodData.address = address;
    methodData.phone = phone;
    methodData.icon = icon;
    methodData.locationDetails = locationDetails;
  } else {
    methodData.address = null;
    methodData.phone = null;
    methodData.icon = null;
    methodData.locationDetails = null;
  }

  const method = await prisma.shippingMethod.update({
    where: { id },
    data: methodData,
  });

  return { success: true, message: "روش ارسال ویرایش شد", item: method };
}

export async function handleDeleteMethod(methodId: string, adminUserId: string): Promise<ShippingResult> {
  if (!(await hasAdminAccess(adminUserId))) return { success: false, error: faAdminShippingMessages.unauthorized };

  const usage = await prisma.shippingMethod.findUnique({
    where: { id: methodId },
    select: { _count: { select: { products: true } } },
  });

  if ((usage?._count.products ?? 0) > 0) {
    return { success: false, error: faAdminShippingMessages.in_use };
  }

  await prisma.shippingMethod.delete({ where: { id: methodId } });

  return { success: true, message: "روش ارسال حذف شد" };
}

// ---------- PICKUPS ----------
export async function handleCreatePickup(data: unknown, adminUserId: string): Promise<ShippingResult> {
  if (!(await hasAdminAccess(adminUserId))) return { success: false, error: faAdminShippingMessages.unauthorized };

  const parsed = createPickupSchema.safeParse(data);
  if (!parsed.success) return { success: false, error: faAdminShippingMessages.server_error };

  const { title, address, phone, cityId, icon, isActive, honeypot } = parsed.data;
  if (honeypot && honeypot.length > 0) return { success: true };

  const pickup = await prisma.pickupLocation.create({
    data: {
      title,
      address,
      phone,
      cityId,
      icon,
      isActive,
    },
  });

  return { success: true, message: "مکان تحویل ایجاد شد", item: pickup };
}

export async function handleEditPickup(data: unknown, adminUserId: string): Promise<ShippingResult> {
  if (!(await hasAdminAccess(adminUserId))) return { success: false, error: faAdminShippingMessages.unauthorized };

  const parsed = editPickupSchema.safeParse(data);
  if (!parsed.success) return { success: false, error: faAdminShippingMessages.server_error };

  const { id, ...updateData } = parsed.data;

  const pickup = await prisma.pickupLocation.update({
    where: { id },
    data: updateData as any,
  });

  return { success: true, message: "مکان تحویل ویرایش شد", item: pickup };
}

export async function handleDeletePickup(pickupId: string, adminUserId: string): Promise<ShippingResult> {
  if (!(await hasAdminAccess(adminUserId))) return { success: false, error: faAdminShippingMessages.unauthorized };

  await prisma.pickupLocation.delete({ where: { id: pickupId } });

  return { success: true, message: "مکان تحویل حذف شد" };
}