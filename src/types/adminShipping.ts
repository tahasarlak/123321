// src/types/adminShipping.ts
export type ZoneItem = {
  id: string;
  name: string;
  countryCount: number;
  isActive: boolean;
};

export type MethodItem = {
  id: string;
  title: string;
  type: string;
  cost: number | null;
  costPercent: number | null;
  freeAbove: number | null;
  priority: number;
  isActive: boolean;
};

export type PickupItem = {
  id: string;
  title: string;
  address: string;
  city: { name: string };
  isActive: boolean;
};

export type ShippingResult =
  | { success: true; message?: string; item?: any }
  | { success: false; error: string };