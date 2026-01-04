export type Discount = {
  id: string;
  type: "PERCENTAGE" | "FIXED";
  value: number;
  isActive: boolean;
  startsAt?: string | Date | null;
  endsAt?: string | Date | null;
  maxDiscount?: number | null; // فقط برای PERCENTAGE
};

export function calculateDiscountedPrice(
  originalPrice: number,
  discounts: Discount[] = []
): { finalPrice: number; activeDiscount: Discount | null; savedAmount: number } {
  if (originalPrice <= 0 || discounts.length === 0) {
    return { finalPrice: originalPrice, activeDiscount: null, savedAmount: 0 };
  }

  let bestDiscount: Discount | null = null;
  let maxSaved = 0;
  let finalPrice = originalPrice;
  const now = new Date();

  for (const d of discounts) {
    if (!d.isActive) continue;
    if (d.startsAt && new Date(d.startsAt) > now) continue;
    if (d.endsAt && new Date(d.endsAt) < now) continue;

    let saved = 0;
    if (d.type === "PERCENTAGE") {
      saved = (originalPrice * d.value) / 100;
      if (d.maxDiscount && saved > d.maxDiscount) saved = d.maxDiscount;
    } else if (d.type === "FIXED") {
      saved = Math.min(d.value, originalPrice);
    }

    if (saved > maxSaved) {
      maxSaved = saved;
      bestDiscount = d;
      finalPrice = originalPrice - saved;
    }
  }

  return {
    finalPrice: Math.max(0, finalPrice),
    activeDiscount: bestDiscount,
    savedAmount: maxSaved,
  };
}