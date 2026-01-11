// src/lib/validations/adminShipping/index.ts
// کامل جایگزین کن با این کد (سازگار با Zod v3 — بدون هیچ خطای extend/required/partial)

import { z } from "zod";
import { faAdminShippingMessages } from "./messages";

const methodTypes = ["POST", "COURIER", "TIPAX", "INTERNATIONAL", "PRESENTIAL", "FREE"] as const;

export const createZoneSchema = z.object({
  name: z.string().min(2, faAdminShippingMessages.name_min),
  countryIds: z.array(z.string()).min(1, faAdminShippingMessages.countries_required),
  isActive: z.boolean().default(true),
  honeypot: z.string().optional(),
});

export const editZoneSchema = createZoneSchema.partial().extend({
  id: z.string().min(1),
});

export const createMethodSchema = z.object({
  title: z.string().min(3, faAdminShippingMessages.name_min),
  type: z.enum(methodTypes, { message: faAdminShippingMessages.type_required }),
  cost: z.number().optional(),
  costPercent: z.number().optional(),
  freeAbove: z.number().optional(),
  estimatedDays: z.string().optional(),
  priority: z.number().int().default(0),
  isActive: z.boolean().default(true),
  description: z.string().optional(),
  address: z.string().optional(),
  phone: z.string().optional(),
  icon: z.string().optional(),
  locationDetails: z.object({}).passthrough().optional(),
  zoneId: z.string().optional(),
  pickupId: z.string().optional(),
  honeypot: z.string().optional(),
}).refine((data) => data.type !== "PRESENTIAL" || !!data.address, {
  message: faAdminShippingMessages.address_required,
  path: ["address"],
});

// برای edit: همه فیلدها optional هستند جز id که اجباری است
// refine رو دوباره اضافه کردیم چون وقتی type ارسال نشود، شرط رو چک نکنیم
export const editMethodSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(3, faAdminShippingMessages.name_min).optional(),
  type: z.enum(methodTypes).optional(),
  cost: z.number().optional(),
  costPercent: z.number().optional(),
  freeAbove: z.number().optional(),
  estimatedDays: z.string().optional(),
  priority: z.number().int().optional(),
  isActive: z.boolean().optional(),
  description: z.string().optional(),
  address: z.string().optional(),
  phone: z.string().optional(),
  icon: z.string().optional(),
  locationDetails: z.object({}).passthrough().optional(),
  zoneId: z.string().optional(),
  pickupId: z.string().optional(),
  honeypot: z.string().optional(),
}).refine((data) => {
  // اگر type ارسال نشده یا PRESENTIAL نباشد → ok
  if (!data.type || data.type !== "PRESENTIAL") return true;
  // اگر type === PRESENTIAL باشد، address باید وجود داشته باشد
  return !!data.address;
}, {
  message: faAdminShippingMessages.address_required,
  path: ["address"],
});

export const createPickupSchema = z.object({
  title: z.string().min(3, faAdminShippingMessages.name_min),
  address: z.string().min(5, faAdminShippingMessages.address_required),
  phone: z.string().optional(),
  cityId: z.string().min(1),
  icon: z.enum(["METRO", "UNIVERSITY", "HOSPITAL", "OFFICE", "STORE", "WAREHOUSE", "CAFE", "PHARMACY", "AIRPORT", "CUSTOM"]).default("CUSTOM"),
  isActive: z.boolean().default(true),
  honeypot: z.string().optional(),
});

export const editPickupSchema = createPickupSchema.partial().extend({
  id: z.string().min(1),
});