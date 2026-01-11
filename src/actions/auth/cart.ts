// lib/actions/cart.actions.ts
"use server";
import { prisma } from "@/lib/db/prisma";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/[locale]/api/auth/[...nextauth]/route";
import { z } from "zod";
import { Prisma } from "@prisma/client";

type CartWithRelations = Prisma.CartGetPayload<{
  include: {
    items: {
      include: {
        product: { include: { taxRates: true } };
        course: true;
        shippingAssignment: { include: { shippingMethod: true } };
      };
    };
    appliedDiscounts: { include: { discount: true } };
    selectedAddress: true;
    selectedShippingMethod: true;
    user: { include: { wallet: true } };
  };
}>;

// ==================== SCHEMAS ====================
const baseItemSchema = z.object({
  productId: z.string().optional(),
  courseId: z.string().optional(),
  honeypot: z.string().optional(),
});

const addSubscriptionToCartSchema = z.object({
  subscriptionPlanId: z.string(),
  honeypot: z.string().optional(),
});

const lockCartSchema = z.object({
  lock: z.boolean(),
});

const addToCartSchema = baseItemSchema.extend({
  quantity: z.coerce.number().int().min(1).default(1),
  currency: z.string().default("IRR"),
  isGift: z.boolean().optional(),
  giftRecipientName: z.string().optional(),
  giftRecipientEmail: z.string().email().optional().or(z.literal("")),
  giftMessage: z.string().optional(),
});

const updateCartItemSchema = baseItemSchema.extend({
  quantity: z.coerce.number().int().min(0),
});

const applyCouponSchema = z.object({
  code: z.string().trim().min(1),
  honeypot: z.string().optional(),
});

const removeCouponSchema = z.object({
  code: z.string().trim().min(1),
  honeypot: z.string().optional(),
});

const assignShippingSchema = z.object({
  cartItemId: z.string(),
  addressId: z.string().optional(),
  temporaryAddress: z.object({
    recipientName: z.string(),
    phone: z.string(),
    province: z.string(),
    city: z.string(),
    postalCode: z.string(),
    address: z.string(),
  }).optional(),
  shippingMethodId: z.string().optional(),
  honeypot: z.string().optional(),
});

const shareCartSchema = z.object({
  mode: z.enum(["VIEW_ONLY", "EDIT", "CHECKOUT"]).default("VIEW_ONLY"),
  password: z.string().optional(),
  expiresInDays: z.coerce.number().int().min(1).max(90).optional(),
  maxUses: z.coerce.number().int().min(1).optional(),
  honeypot: z.string().optional(),
});

export type CartResult =
  | { success: true; message: string; cartCount?: number; data?: any }
  | { success: false; error: string };

// ==================== HELPER FUNCTIONS ====================
async function getCartWithItems(userId: string) {
  return await prisma.cart.findFirst({
    where: { userId, ownerType: "USER" },
    include: {
      items: {
        include: {
          product: { include: { taxRates: true } },
          course: true,
          shippingAssignment: { include: { shippingMethod: true } },
        },
      },
      appliedDiscounts: { include: { discount: true } },
      selectedAddress: true,
      selectedShippingMethod: true,
      user: { include: { wallet: true } },
    },
  });
}

async function getCurrentUserId() {
  const session = await getServerSession(authOptions);
  return session?.user?.id as string | undefined;
}

async function getCartByUserId(userId: string) {
  return await prisma.cart.findFirst({
    where: { userId, ownerType: "USER" },
  });
}

async function getOrCreateCart(userId?: string, guestToken?: string) {
  if (userId) {
    let cart = await getCartByUserId(userId);
    if (!cart) {
      cart = await prisma.cart.create({
        data: { userId, ownerType: "USER", currency: "IRR" },
      });
    }
    return cart;
  }
  if (guestToken) {
    let cart = await prisma.cart.findUnique({ where: { guestToken } });
    if (!cart || (cart.expiresAt && cart.expiresAt < new Date())) {
      cart = await prisma.cart.create({
        data: {
          guestToken,
          ownerType: "GUEST",
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          currency: "IRR",
        },
      });
    }
    return cart;
  }
  throw new Error("No user or guest token");
}

async function reserveStock(cartItemId: string, productId: string, quantity: number) {
  const reservedUntil = new Date(Date.now() + 30 * 60 * 1000); // ۳۰ دقیقه
  await prisma.$transaction(async (tx) => {
    await tx.cartItemReservation.upsert({
      where: { cartItemId },
      update: { reservedQuantity: quantity, reservedUntil },
      create: {
        cartItemId,
        cartId: (await tx.cartItem.findUnique({ where: { id: cartItemId } }))!.cartId,
        productId,
        reservedQuantity: quantity,
        reservedUntil,
      },
    });
    await tx.stockMovement.create({
      data: {
        productId,
        type: "RESERVE",
        quantity: -quantity,
        reason: `RESERVE_CART_ITEM_${cartItemId}`,
        cartItemId,
      },
    });
    await tx.product.update({
      where: { id: productId },
      data: { reservedStock: { increment: quantity } },
    });
  });
}

async function releaseStock(cartItemId: string) {
  const reservation = await prisma.cartItemReservation.findUnique({
    where: { cartItemId },
  });
  if (!reservation) return;
  await prisma.$transaction(async (tx) => {
    await tx.stockMovement.create({
      data: {
        productId: reservation.productId,
        type: "RELEASE",
        quantity: reservation.reservedQuantity,
        reason: `RELEASE_EXPIRED_${cartItemId}`,
        cartItemId,
      },
    });
    await tx.product.update({
      where: { id: reservation.productId },
      data: { reservedStock: { decrement: reservation.reservedQuantity } },
    });
    await tx.cartItemReservation.delete({ where: { cartItemId } });
  });
}

async function applyBundleAndAdvancedDiscounts(
  cartId: string,
  items: any[],
  subtotal: number
) {
  let bundleSavings = 0;
  let freeShippingApplied = false;
  // 1. بررسی باندل‌های تعریف‌شده در Discount (نوع BUNDLE)
  const bundleDiscounts = await prisma.discount.findMany({
    where: { type: "BUNDLE", isActive: true },
  });
  for (const disc of bundleDiscounts) {
    if (!disc.bundleItems || !Array.isArray(disc.bundleItems)) continue;
    const requiredItems: string[] = disc.bundleItems as string[];
    const hasAll = requiredItems.every((reqId) =>
      items.some((i) => i.productId === reqId || i.courseId === reqId)
    );
    if (hasAll) {
      await prisma.cartBundleApplication.upsert({
        where: { cartId_discountId: { cartId, discountId: disc.id } },
        update: { isApplied: true, isEligible: true, amountSaved: disc.bundlePrice || 0 },
        create: {
          cartId,
          discountId: disc.id,
          isApplied: true,
          isEligible: true,
          amountSaved: disc.bundlePrice || 0,
        },
      });
      if (disc.bundlePrice) bundleSavings += disc.bundlePrice;
      else if (disc.bundleDiscountPercent) {
        bundleSavings += Math.round((subtotal * disc.bundleDiscountPercent) / 100);
      }
    }
  }
  // 2. BUY_X_GET_Y
  const buyXDiscounts = await prisma.discount.findMany({
    where: { type: "BUY_X_GET_Y", isActive: true },
  });
  for (const disc of buyXDiscounts) {
    if (!disc.buyQuantity || !disc.getQuantity) continue;
    // گروه‌بندی آیتم‌ها بر اساس محصول/دوره
    const itemMap = new Map<string, number>();
    items.forEach((i) => {
      const key = i.productId || i.courseId;
      itemMap.set(key, (itemMap.get(key) || 0) + i.quantity);
    });
    for (const [key, qty] of itemMap) {
      const applicable = Math.floor(qty / (disc.buyQuantity + disc.getQuantity)) * disc.getQuantity;
      if (applicable > 0) {
        const itemPrice = items.find((i) => i.productId === key || i.courseId === key)?.priceAtAdd || 0;
        bundleSavings += applicable * itemPrice * (disc.getDiscountPercent ? disc.getDiscountPercent / 100 : 1);
      }
    }
  }
  // 3. FREE_SHIPPING
  const freeShippingDiscounts = await prisma.discount.findMany({
    where: { type: "FREE_SHIPPING", isActive: true },
  });
  for (const disc of freeShippingDiscounts) {
    if (disc.minimumAmount && subtotal >= disc.minimumAmount) {
      freeShippingApplied = true;
      break;
    }
  }
  return { bundleSavings, freeShippingApplied };
}

async function recalculateCart(cartId: string) {
  const cart: CartWithRelations | null = await prisma.cart.findUnique({
    where: { id: cartId },
    include: {
      items: {
        include: {
          product: { include: { taxRates: true } },
          course: true,
          shippingAssignment: { include: { shippingMethod: true } },
        },
      },
      appliedDiscounts: { include: { discount: true } },
      selectedAddress: true,
      selectedShippingMethod: true,
      user: { include: { wallet: true } },
    },
  });
  if (!cart) return;
  const items = cart.items;
  let subtotal = 0;
  let shippingTotal = 0;
  let taxTotal = 0;
  let discountTotal = 0;
  let bundleSavings = 0;
  // محاسبه subtotal
  for (const item of items) {
    subtotal += item.priceAtAdd * item.quantity;
  }
  // اعمال تخفیف‌های کوپن معمولی با چک stacking
  const sortedDiscounts = cart.appliedDiscounts.sort((a, b) => b.discount.stackPriority - a.discount.stackPriority);
  let stackCount = 0;
  for (const applied of sortedDiscounts) {
    const disc = applied.discount;
    if (!disc.allowStacking && stackCount > 0) continue;
    if (disc.maxStackableWith && stackCount >= disc.maxStackableWith) continue;
    if (disc.type === "PERCENT") {
      discountTotal += Math.round((subtotal * disc.value) / 100);
    } else if (disc.type === "FIXED") {
      discountTotal += disc.value;
    }
    stackCount++;
  }
  // اعمال باندل و BUY_X_GET_Y و FREE_SHIPPING
  const { bundleSavings: calculatedBundle, freeShippingApplied } =
    await applyBundleAndAdvancedDiscounts(cartId, items, subtotal);
  bundleSavings = calculatedBundle;
  // محاسبه ارسال
  let hasFreeShippingFromMethod = false;
  for (const item of items) {
    const method = item.shippingAssignment?.shippingMethod || cart.selectedShippingMethod;
    if (method) {
      if (method.freeAbove && subtotal >= method.freeAbove) {
        hasFreeShippingFromMethod = true;
      } else if (!freeShippingApplied) {
        shippingTotal += method.cost || 0;
      }
    }
  }
  if (freeShippingApplied || hasFreeShippingFromMethod) {
    shippingTotal = 0;
  }
  // مالیات
  if (cart.selectedAddress) {
    for (const item of items) {
      if (item.product?.taxRates.length) {
        const rate = item.product.taxRates[0].rate / 100;
        taxTotal += Math.round(item.priceAtAdd * item.quantity * rate);
      }
    }
  }
  const total = subtotal - discountTotal - bundleSavings + shippingTotal + taxTotal;
  // موجودی والت کاربر
  const walletBalance = cart.user?.wallet?.balance ?? BigInt(0);
  await prisma.cart.update({
    where: { id: cartId },
    data: {
      cachedSubtotal: subtotal,
      cachedDiscountAmount: discountTotal + bundleSavings,
      cachedShippingAmount: shippingTotal,
      cachedTaxAmount: taxTotal,
      cachedTotal: total,
      subtotal,
      shippingCost: shippingTotal,
      taxAmount: taxTotal,
      bundleSavings,
      walletAvailable: Number(walletBalance >= BigInt(total) ? total : walletBalance),
    },
  });
}

async function logCartActivity(cartId: string, action: string, details?: any) {
  await prisma.cartActivityLog.create({
    data: {
      cartId,
      action,
      details: details ? JSON.parse(JSON.stringify(details)) : undefined,
    },
  });
}

// ==================== ACTIONS ====================
export async function addSubscriptionToCartAction(
  formData: FormData
): Promise<CartResult> {
  const userId = await getCurrentUserId();
  if (!userId) return { success: false, error: "لطفاً وارد شوید" };
  const parsed = addSubscriptionToCartSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success || parsed.data.honeypot) return { success: false, error: "داده نامعتبر" };
  const { subscriptionPlanId } = parsed.data;
  const plan = await prisma.subscriptionPlan.findUnique({
    where: { id: subscriptionPlanId },
    include: { product: true, course: true },
  });
  if (!plan) return { success: false, error: "پلن یافت نشد" };
  const cart = await getCartWithItems(userId);
  if (!cart) return { success: false, error: "سبد خالی است" };
  const existing = cart.items.find((i: any) => i.subscriptionPlanId === subscriptionPlanId);
  if (existing) return { success: false, error: "این پلن قبلاً اضافه شده" };
  await prisma.cartItem.create({
    data: {
      cartId: cart.id,
      subscriptionPlanId,
      quantity: 1,
      priceAtAdd: plan.price,
      currencyAtAdd: plan.currency,
      currency: plan.currency,
      requiresShipping: false,
    },
  });
  await recalculateCart(cart.id);
  await logCartActivity(cart.id, "SUBSCRIPTION_ADDED", { subscriptionPlanId });
  revalidatePath("/cart");
  return { success: true, message: "اشتراک به سبد اضافه شد 📅" };
}

// جدید: قفل/باز کردن سبد (برای checkout)
export async function lockCartAction(formData: FormData): Promise<CartResult> {
  const userId = await getCurrentUserId();
  if (!userId) return { success: false, error: "نیاز به ورود" };
  const parsed = lockCartSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { success: false, error: "داده نامعتبر" };
  const cart = await getCartByUserId(userId);
  if (!cart) return { success: false, error: "سبد یافت نشد" };
  await prisma.cart.update({
    where: { id: cart.id },
    data: {
      isLocked: parsed.data.lock,
      lockedAt: parsed.data.lock ? new Date() : null,
    },
  });
  return { success: true, message: parsed.data.lock ? "سبد قفل شد 🔒" : "سبد باز شد 🔓" };
}

export async function addToCartAction(formData: FormData, guestToken?: string): Promise<CartResult> {
  const userId = await getCurrentUserId();
  const raw = Object.fromEntries(formData);
  const parsed = addToCartSchema.safeParse(raw);
  if (!parsed.success) return { success: false, error: "داده نامعتبر" };
  if (parsed.data.honeypot) return { success: true, message: "اضافه شد" };
  const { productId, courseId, quantity, currency, isGift, giftRecipientName, giftRecipientEmail, giftMessage } = parsed.data;
  if (!productId && !courseId) return { success: false, error: "محصول یا دوره انتخاب نشده" };
  try {
    const cart = await getOrCreateCart(userId, guestToken);
    if (cart.maxItems && (await prisma.cartItem.count({ where: { cartId: cart.id } })) >= cart.maxItems) {
      return { success: false, error: "حداکثر تعداد آیتم در سبد پر شده است" };
    }
    const currentTotal = cart.cachedSubtotal || 0;
    let priceAtAdd = 0;
    let currencyAtAdd = currency;
    if (productId) {
      const priceRecord =
        (await prisma.productPrice.findFirst({ where: { productId, currency } })) ||
        (await prisma.productPrice.findFirst({ where: { productId, isDefault: true } }));
      if (!priceRecord) return { success: false, error: "قیمت محصول یافت نشد" };
      priceAtAdd = priceRecord.amount;
      currencyAtAdd = priceRecord.currency;
      const product = await prisma.product.findUnique({
        where: { id: productId },
        select: { stock: true, reservedStock: true, maxPerOrder: true },
      });
      if (!product) return { success: false, error: "محصول یافت نشد" };
      if (product.stock - product.reservedStock < quantity) return { success: false, error: "موجودی کافی نیست" };
      if (product.maxPerOrder && quantity > product.maxPerOrder)
        return { success: false, error: `حداکثر ${product.maxPerOrder} مجاز است` };
    }
    if (courseId) {
      const priceRecord =
        (await prisma.coursePrice.findFirst({ where: { courseId, currency } })) ||
        (await prisma.coursePrice.findFirst({ where: { courseId, isDefault: true } }));
      if (!priceRecord) return { success: false, error: "قیمت دوره یافت نشد" };
      priceAtAdd = priceRecord.amount;
      currencyAtAdd = priceRecord.currency;
    }
    if (cart.maxTotalAmount && currentTotal + priceAtAdd * quantity > cart.maxTotalAmount) {
      return { success: false, error: "مبلغ کل سبد از حد مجاز بیشتر می‌شود" };
    }
    const existing = await prisma.cartItem.findUnique({
      where: {
        cartId_productId_courseId: {
          cartId: cart.id,
          productId: productId || "",
          courseId: courseId || "",
        },
      },
    });
    let cartItem;
    if (existing) {
      const newQuantity = existing.quantity + quantity;
      cartItem = await prisma.cartItem.update({
        where: { id: existing.id },
        data: { quantity: newQuantity },
      });
    } else {
      cartItem = await prisma.cartItem.create({
        data: {
          cartId: cart.id,
          productId: productId || null,
          courseId: courseId || null,
          quantity,
          priceAtAdd,
          currencyAtAdd,
          currency,
          requiresShipping: !!productId,
          isGiftItem: !!isGift,
          giftRecipientName,
          giftRecipientEmail,
          giftMessage,
        },
      });
    }
    if (productId) {
      await reserveStock(cartItem.id, productId, cartItem.quantity);
    }
    await recalculateCart(cart.id);
    await logCartActivity(cart.id, "ITEM_ADDED", { productId, courseId, quantity });
    revalidatePath("/cart");
    revalidatePath("/");
    const count = await prisma.cartItem.aggregate({
      where: { cartId: cart.id },
      _sum: { quantity: true },
    });
    return {
      success: true,
      message: "به سبد اضافه شد 🛒",
      cartCount: count._sum.quantity || 0,
    };
  } catch (error) {
    console.error("[CART] add error:", error);
    return { success: false, error: "خطا در اضافه کردن" };
  }
}

export async function updateCartItemAction(formData: FormData): Promise<CartResult> {
  const userId = await getCurrentUserId();
  if (!userId) return { success: false, error: "لطفاً وارد شوید" };
  const parsed = updateCartItemSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { success: false, error: "داده نامعتبر" };
  const { productId, courseId, quantity } = parsed.data;
  if (!productId && !courseId) return { success: false, error: "آیتم مشخص نشده" };
  try {
    const cart = await getCartByUserId(userId);
    if (!cart) return { success: false, error: "سبد خالی است" };
    const item = await prisma.cartItem.findUnique({
      where: {
        cartId_productId_courseId: {
          cartId: cart.id,
          productId: productId || "",
          courseId: courseId || "",
        },
      },
    });
    if (!item) return { success: false, error: "آیتم یافت نشد" };
    if (quantity === 0) {
      if (item.productId) await releaseStock(item.id);
      await prisma.cartItem.delete({ where: { id: item.id } });
      await recalculateCart(cart.id);
      await logCartActivity(cart.id, "ITEM_REMOVED", { itemId: item.id });
      revalidatePath("/cart");
      return { success: true, message: "از سبد حذف شد 🗑️" };
    }
    await prisma.cartItem.update({
      where: { id: item.id },
      data: { quantity },
    });
    if (item.productId) {
      await reserveStock(item.id, item.productId, quantity);
    }
    await recalculateCart(cart.id);
    await logCartActivity(cart.id, "ITEM_UPDATED", { quantity });
    revalidatePath("/cart");
    return { success: true, message: "به‌روزرسانی شد ✅" };
  } catch (error) {
    console.error("[CART] update error:", error);
    return { success: false, error: "خطا در به‌روزرسانی" };
  }
}

export async function applyCouponAction(formData: FormData): Promise<CartResult> {
  const userId = await getCurrentUserId();
  if (!userId) return { success: false, error: "لطفاً وارد شوید" };
  const parsed = applyCouponSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success || parsed.data.honeypot) return { success: false, error: "کد نامعتبر" };
  const { code } = parsed.data;
  try {
    const cart = await getCartByUserId(userId);
    if (!cart) return { success: false, error: "سبد خالی است" };
    const discount = await prisma.discount.findUnique({
      where: { code, isActive: true },
    });
    if (!discount) return { success: false, error: "کد نامعتبر" };
    if (discount.startsAt && new Date() < discount.startsAt) return { success: false, error: "هنوز فعال نشده" };
    if (discount.endsAt && new Date() > discount.endsAt) return { success: false, error: "کد منقضی شده" };
    if (discount.usageLimit && discount.usedCount >= discount.usageLimit) return { success: false, error: "حد استفاده تمام شده" };
    if (discount.oncePerUser) {
      const used = await prisma.discountUsage.findFirst({
        where: { discountId: discount.id, userId },
      });
      if (used) return { success: false, error: "این کد قبلاً استفاده شده" };
    }
    await prisma.cartAppliedDiscount.upsert({
      where: { cartId_discountId: { cartId: cart.id, discountId: discount.id } },
      update: { isValidated: true },
      create: {
        cartId: cart.id,
        discountId: discount.id,
        code,
        amountSaved: 0,
      },
    });
    await recalculateCart(cart.id);
    await logCartActivity(cart.id, "COUPON_APPLIED", { code });
    revalidatePath("/cart");
    return { success: true, message: `کد "${code}" اعمال شد 🎉` };
  } catch (error) {
    console.error("[CART] applyCoupon error:", error);
    return { success: false, error: "خطا در اعمال کد" };
  }
}

export async function removeCouponAction(formData: FormData): Promise<CartResult> {
  const userId = await getCurrentUserId();
  if (!userId) return { success: false, error: "نیاز به ورود" };
  const parsed = removeCouponSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { success: false, error: "کد نامعتبر" };
  try {
    const cart = await getCartByUserId(userId);
    if (!cart) return { success: false, error: "سبد خالی" };
    const discount = await prisma.discount.findUnique({
      where: { code: parsed.data.code },
    });
    if (discount) {
      await prisma.cartAppliedDiscount.deleteMany({
        where: { cartId: cart.id, discountId: discount.id },
      });
      await recalculateCart(cart.id);
      await logCartActivity(cart.id, "COUPON_REMOVED", { code: parsed.data.code });
      revalidatePath("/cart");
      return { success: true, message: "کد تخفیف حذف شد" };
    }
    return { success: false, error: "کد یافت نشد" };
  } catch (error) {
    return { success: false, error: "خطا" };
  }
}

export async function saveItemForLaterAction(cartItemId: string): Promise<CartResult> {
  const userId = await getCurrentUserId();
  if (!userId) return { success: false, error: "لطفاً وارد شوید" };
  try {
    const item = await prisma.cartItem.findUnique({
      where: { id: cartItemId },
      include: { cart: true },
    });
    if (!item) return { success: false, error: "آیتم در سبد یافت نشد" };
    if (item.cart.userId !== userId && item.cart.ownerType === "USER") {
      return { success: false, error: "دسترسی غیرمجاز به این آیتم" };
    }
    const alreadySaved = await prisma.cartSavedItem.findUnique({
      where: {
        cartId_productId_courseId: {
          cartId: item.cartId,
          productId: item.productId || "",
          courseId: item.courseId || "",
        },
      },
    });
    if (alreadySaved) {
      if (item.productId) await releaseStock(item.id);
      await prisma.cartItem.delete({ where: { id: cartItemId } });
      await recalculateCart(item.cartId);
      await logCartActivity(item.cartId, "ITEM_SAVED_FOR_LATER_DUPLICATE");
      revalidatePath("/cart");
      revalidatePath("/saved-for-later");
      return { success: true, message: "از سبد حذف شد (قبلاً ذخیره شده بود) ⭐" };
    }
    // ذخیره همه اطلاعات مهم
    await prisma.cartSavedItem.create({
      data: {
        cartId: item.cartId,
        productId: item.productId,
        courseId: item.courseId,
        originalPriceAtSave: item.priceAtAdd,
        originalCurrencyAtSave: item.currencyAtAdd,
        originalQuantity: item.quantity,
        isGiftItem: item.isGiftItem,
        giftRecipientName: item.giftRecipientName,
        giftRecipientEmail: item.giftRecipientEmail,
        giftMessage: item.giftMessage,
        note: `ذخیره شده در ${new Date().toLocaleDateString("fa-IR")}`,
        savedAt: new Date(),
      },
    });
    if (item.productId) {
      await releaseStock(item.id);
    }
    await prisma.cartItem.delete({ where: { id: cartItemId } });
    await recalculateCart(item.cartId);
    await logCartActivity(item.cartId, "ITEM_SAVED_FOR_LATER", {
      productId: item.productId,
      courseId: item.courseId,
      quantity: item.quantity,
      price: item.priceAtAdd,
      currency: item.currencyAtAdd,
    });
    revalidatePath("/cart");
    revalidatePath("/saved-for-later");
    const count = await prisma.cartItem.aggregate({
      where: { cartId: item.cartId },
      _sum: { quantity: true },
    });
    return {
      success: true,
      message: "به «ذخیره‌شده برای بعد» منتقل شد ⭐",
      cartCount: count._sum.quantity || 0,
    };
  } catch (error) {
    console.error("[CART] saveItemForLater error:", error);
    return { success: false, error: "خطایی در ذخیره آیتم رخ داد" };
  }
}

export async function moveSavedToCartAction(savedItemId: string): Promise<CartResult> {
  const userId = await getCurrentUserId();
  if (!userId) return { success: false, error: "لطفاً وارد شوید" };
  try {
    const saved = await prisma.cartSavedItem.findUnique({
      where: { id: savedItemId },
      include: { cart: true },
    });
    if (!saved) return { success: false, error: "آیتم ذخیره‌شده یافت نشد" };
    if (saved.cart.userId !== userId && saved.cart.ownerType === "USER") {
      return { success: false, error: "دسترسی غیرمجاز" };
    }
    const cart = saved.cart;
    if (!saved.productId && !saved.courseId) {
      return { success: false, error: "آیتم نامعتبر است" };
    }
    let priceAtAdd = 0;
    let currencyAtAdd = cart.currency || "IRR";
    const productId = saved.productId;
    const courseId = saved.courseId;
    if (productId) {
      const priceRecord =
        (await prisma.productPrice.findFirst({ where: { productId, currency: currencyAtAdd } })) ||
        (await prisma.productPrice.findFirst({ where: { productId, isDefault: true } }));
      if (!priceRecord) return { success: false, error: "قیمت محصول دیگر موجود نیست" };
      priceAtAdd = priceRecord.amount;
      currencyAtAdd = priceRecord.currency;
      const product = await prisma.product.findUnique({
        where: { id: productId },
        select: { stock: true, reservedStock: true, maxPerOrder: true, isActive: true },
      });
      if (!product) return { success: false, error: "محصول یافت نشد" };
      if (!product.isActive) return { success: false, error: "محصول غیرفعال است" };
      if (product.stock - product.reservedStock < 1) return { success: false, error: "موجودی کافی نیست" };
      if (product.maxPerOrder && 1 > product.maxPerOrder) {
        return { success: false, error: `حداکثر ${product.maxPerOrder} عدد مجاز است` };
      }
    }
    if (courseId) {
      const priceRecord =
        (await prisma.coursePrice.findFirst({ where: { courseId, currency: currencyAtAdd } })) ||
        (await prisma.coursePrice.findFirst({ where: { courseId, isDefault: true } }));
      if (!priceRecord) return { success: false, error: "قیمت دوره دیگر موجود نیست" };
      priceAtAdd = priceRecord.amount;
      currencyAtAdd = priceRecord.currency;
      const course = await prisma.course.findUnique({
        where: { id: courseId },
        select: { isSaleEnabled: true },
      });
      if (course && !course.isSaleEnabled) return { success: false, error: "فروش دوره متوقف شده" };
    }
    const existing = await prisma.cartItem.findUnique({
      where: {
        cartId_productId_courseId: {
          cartId: cart.id,
          productId: productId || "",
          courseId: courseId || "",
        },
      },
    });
    let cartItem;
    if (existing) {
      cartItem = await prisma.cartItem.update({
        where: { id: existing.id },
        data: { quantity: { increment: 1 } },
      });
    } else {
      cartItem = await prisma.cartItem.create({
        data: {
          cartId: cart.id,
          productId: productId || null,
          courseId: courseId || null,
          quantity: saved.originalQuantity || 1,
          priceAtAdd,
          currencyAtAdd,
          currency: currencyAtAdd,
          requiresShipping: !!productId,
          isGiftItem: saved.isGiftItem,
          giftRecipientName: saved.giftRecipientName,
          giftRecipientEmail: saved.giftRecipientEmail,
          giftMessage: saved.giftMessage,
        },
      });
    }
    if (productId) {
      await reserveStock(cartItem.id, productId, cartItem.quantity);
    }
    await prisma.cartSavedItem.delete({ where: { id: savedItemId } });
    await recalculateCart(cart.id);
    await logCartActivity(cart.id, "ITEM_MOVED_FROM_SAVED", {
      savedItemId,
      productId,
      courseId,
      newPrice: priceAtAdd,
    });
    revalidatePath("/cart");
    revalidatePath("/saved-for-later");
    const count = await prisma.cartItem.aggregate({
      where: { cartId: cart.id },
      _sum: { quantity: true },
    });
    return {
      success: true,
      message: "از ذخیره‌شده‌ها به سبد اضافه شد 🛒",
      cartCount: count._sum.quantity || 0,
    };
  } catch (error) {
    console.error("[CART] moveSavedToCart error:", error);
    return { success: false, error: "خطایی در انتقال به سبد رخ داد" };
  }
}

export async function assignShippingToItemAction(formData: FormData): Promise<CartResult> {
  const userId = await getCurrentUserId();
  if (!userId) return { success: false, error: "نیاز به ورود" };
  const parsed = assignShippingSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success || parsed.data.honeypot) return { success: false, error: "داده نامعتبر" };
  try {
    const { cartItemId, addressId, temporaryAddress, shippingMethodId } = parsed.data;
    await prisma.cartItemShippingAssignment.upsert({
      where: { cartItemId },
      update: {
        addressId,
        temporaryAddress: temporaryAddress ? (temporaryAddress as any) : null, // Json قبول می‌کنه
        shippingMethodId,
      },
      create: {
        cartItemId,
        addressId: addressId || null,
        temporaryAddress: temporaryAddress ? (temporaryAddress as any) : null,
        shippingMethodId: shippingMethodId || null,
        shippingCost: 0,
      },
    });
    const item = await prisma.cartItem.findUnique({ where: { id: cartItemId } });
    await recalculateCart(item!.cartId);
    await logCartActivity(item!.cartId, "SHIPPING_ASSIGNED", { cartItemId });
    revalidatePath("/cart");
    return { success: true, message: "روش ارسال تنظیم شد 🚚" };
  } catch (error) {
    return { success: false, error: "خطا در تنظیم ارسال" };
  }
}

export async function shareCartAction(formData: FormData): Promise<CartResult> {
  const userId = await getCurrentUserId();
  if (!userId) return { success: false, error: "نیاز به ورود" };
  const parsed = shareCartSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success || parsed.data.honeypot) return { success: false, error: "داده نامعتبر" };
  try {
    const cart = await getCartByUserId(userId);
    if (!cart) return { success: false, error: "سبد یافت نشد" };
    const expiresAt = parsed.data.expiresInDays
      ? new Date(Date.now() + parsed.data.expiresInDays * 24 * 60 * 60 * 1000)
      : undefined;
    const share = await prisma.cartShare.create({
      data: {
        cartId: cart.id,
        mode: parsed.data.mode,
        password: parsed.data.password,
        expiresAt,
        maxUses: parsed.data.maxUses,
        sharedById: userId,
      },
    });
    revalidatePath("/cart");
    return { success: true, message: "لینک اشتراک ساخته شد 🔗", data: { shareToken: share.token } };
  } catch (error) {
    console.error("[CART] shareCart error:", error);
    return { success: false, error: "خطا در ساخت لینک" };
  }
}

export async function clearCartAction(): Promise<CartResult> {
  const userId = await getCurrentUserId();
  if (!userId) return { success: false, error: "Unauthorized" };
  try {
    const cart = await getCartByUserId(userId);
    if (!cart) return { success: true, message: "سبد خالی است" };
    const items = await prisma.cartItem.findMany({ where: { cartId: cart.id } });
    for (const item of items) {
      if (item.productId) await releaseStock(item.id);
    }
    await prisma.cartItem.deleteMany({ where: { cartId: cart.id } });
    await recalculateCart(cart.id);
    await logCartActivity(cart.id, "CART_CLEARED");
    revalidatePath("/cart");
    return { success: true, message: "سبد پاک شد 🗑️" };
  } catch (error) {
    console.error("[CART] clear error:", error);
    return { success: false, error: "خطا" };
  }
}

export async function releaseExpiredReservationsCron() {
  const expired = await prisma.cartItemReservation.findMany({
    where: { reservedUntil: { lt: new Date() } },
  });
  for (const res of expired) {
    await releaseStock(res.cartItemId);
  }
}