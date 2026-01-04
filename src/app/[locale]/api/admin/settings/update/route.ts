// src/app/api/admin/settings/update/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/[locale]/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/db/prisma";
import { z } from "zod";

// اسکیما ولیدیشن با Zod (کاملاً امن و حرفه‌ای)
const settingsSchema = z.object({
  siteName: z.string().min(2).max(100),
  siteDescription: z.string().max(500).optional(),
  primaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "رنگ باید هگز باشه"),
  currency: z.string().default("IRR"),
  taxRate: z.coerce.number().min(0).max(100),
  freeShippingThreshold: z.coerce.number().min(0),
  contactEmail: z.string().email(),
  contactPhone: z.string().optional(),
  instagram: z.string().optional(),
  telegram: z.string().optional(),
  whatsapp: z.string().optional(),
  maintenanceMode: z.enum(["on", "off"]).transform((v) => v === "on"),
  allowRegistration: z.enum(["on", "off"]).transform((v) => v === "on"),
  smtpHost: z.string().optional(),
  smtpPort: z.coerce.number().optional(),
  smtpUser: z.string().email().optional(),
  smtpPass: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    // فقط سوپرادمین و ادمین اجازه دارن
    const userRoles = session?.user?.roles as string[] | undefined;
if (
  !session ||
  !userRoles ||
  !["ADMIN", "SUPERADMIN"].some((r) => userRoles.includes(r))
) {
      return NextResponse.json(
        { success: false, message: "دسترسی غیرمجاز" },
        { status: 403 }
      );
    }

    const formData = await req.formData();
    const rawData = Object.fromEntries(formData.entries());

    // ولیدیشن کامل
    const validated = settingsSchema.safeParse(rawData);
    if (!validated.success) {
      return NextResponse.json(
        {
          success: false,
          message: "داده‌های ارسالی معتبر نیست",
          errors: validated.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const data = validated.data;

    // ذخیره در دیتابیس (جدول settings یا JSON در یک ردیف)
    // روش ۱: اگر جدول settings داری
    await prisma.setting.upsert({
      where: { key: "site_settings" },
      update: {
        value: JSON.stringify({
          siteName: data.siteName,
          siteDescription: data.siteDescription || "",
          primaryColor: data.primaryColor,
          currency: data.currency,
          taxRate: data.taxRate,
          freeShippingThreshold: data.freeShippingThreshold,
          contactEmail: data.contactEmail,
          contactPhone: data.contactPhone || "",
          social: {
            instagram: data.instagram || "",
            telegram: data.telegram || "",
            whatsapp: data.whatsapp || "",
          },
          features: {
            maintenanceMode: data.maintenanceMode,
            allowRegistration: data.allowRegistration,
          },
          smtp: {
            host: data.smtpHost || null,
            port: data.smtpPort || null,
            user: data.smtpUser || null,
            pass: data.smtpPass || null,
          },
          updatedAt: new Date(),
          updatedBy: session.user.id,
        }),
      },
      create: {
        key: "site_settings",
        value: JSON.stringify({
          siteName: data.siteName,
          siteDescription: data.siteDescription || "",
          primaryColor: data.primaryColor,
          currency: data.currency,
          taxRate: data.taxRate,
          freeShippingThreshold: data.freeShippingThreshold,
          contactEmail: data.contactEmail,
          contactPhone: data.contactPhone || "",
          social: { instagram: "", telegram: "", whatsapp: "" },
          features: { maintenanceMode: false, allowRegistration: true },
          smtp: { host: null, port: null, user: null, pass: null },
          updatedAt: new Date(),
          updatedBy: session.user.id,
        }),
      },
    });

    // روش ۲: اگر جدول settings نداری، می‌تونی از فایل JSON هم استفاده کنی (اختیاری)

    return NextResponse.json(
      {
        success: true,
        message: "تنظیمات با موفقیت ذخیره شد",
        data: {
          updatedAt: new Date().toLocaleString("fa-IR"),
        },
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("خطا در ذخیره تنظیمات:", error);
    return NextResponse.json(
      {
        success: false,
        message: "خطای سرور",
        error: error.message || "مشکلی پیش آمد",
      },
      { status: 500 }
    );
  }
}