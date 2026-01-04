export const DEFAULT_CURRENCY = "IRR" as const;

export const getPriceInIRR = (
  price: Record<string, number> | null | undefined
): number | null => {
  if (!price || typeof price !== "object") return null;
  return price[DEFAULT_CURRENCY] ?? null;
};