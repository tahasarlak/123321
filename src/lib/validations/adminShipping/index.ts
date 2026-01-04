// src/validations/adminShipping/index.ts
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
  address: z.string().optional(),
  phone: z.string().optional(),
  icon: z.string().optional(),
  locationDetails: z.object({}).passthrough().optional(),
  zoneId: z.string().optional(),
  pickupId: z.string().optional(),
  honeypot: z.string().optional(),
}).refine((data) => data.type !== "PRESENTIAL" || data.address, {
  message: faAdminShippingMessages.address_required,
  path: ["address"],
});

export const editMethodSchema = createMethodSchema.partial().extend({
  id: z.string().min(1),
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