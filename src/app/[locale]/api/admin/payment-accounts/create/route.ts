// src/app/api/admin/payment-accounts/create/route.ts
import { prisma } from "@/lib/db/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/[locale]/api/auth/[...nextauth]/route";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userRoles = session.user.roles as string[] | undefined;

  if (
    !userRoles ||
    !userRoles.some((role) => ["ADMIN", "SUPERADMIN"].includes(role))
  ) {
    return NextResponse.json({ error: "دسترسی ممنوع" }, { status: 403 });
  }

  try {
    const formData = await request.formData();

    const title = (formData.get("title") as string)?.trim();
    const type = formData.get("type") as "CARD_TO_CARD" | "BANK_TRANSFER" | "CRYPTO";
    const countryId = formData.get("countryId") as string;
    const holderName = (formData.get("holderName") as string)?.trim();
    const bankName = (formData.get("bankName") as string)?.trim();
    const priorityRaw = formData.get("priority");
    const priority = priorityRaw ? Number(priorityRaw) : 0;
    const currency = (formData.get("currency") as string) || "IRR";
    const ownerType = formData.get("ownerType") as "SITE" | "INSTRUCTOR" | "CUSTOM";

    if (!title || !type || !countryId || !holderName || !bankName || !ownerType) {
      return NextResponse.json(
        { error: "فیلدهای ضروری پر نشده‌اند" },
        { status: 400 }
      );
    }

    // فیلدهای شرطی
    let cardNumber: string | null = null;
    let iban: string | null = null;

    if (type === "CARD_TO_CARD") {
      cardNumber = (formData.get("cardNumber") as string)?.trim() || null;
      if (!cardNumber) {
        return NextResponse.json({ error: "شماره کارت الزامی است" }, { status: 400 });
      }
    } else if (type === "BANK_TRANSFER") {
      iban = (formData.get("iban") as string)?.trim() || null;
      if (!iban) {
        return NextResponse.json({ error: "شماره شبا الزامی است" }, { status: 400 });
      }
    }

    // مدیریت ownerType
    let ownerId: string | null = null;
    let instructorId: string | null = null;

    if (ownerType === "INSTRUCTOR") {
      instructorId = formData.get("instructorId") as string;

      if (!instructorId) {
        return NextResponse.json({ error: "استاد انتخاب نشده است" }, { status: 400 });
      }

      // اول چک می‌کنیم که کاربر نقش INSTRUCTOR داشته باشه
      const hasInstructorRole = await prisma.userRole.findFirst({
        where: {
          userId: instructorId,
          role: "INSTRUCTOR",
        },
      });

      if (!hasInstructorRole) {
        return NextResponse.json(
          { error: "کاربر انتخاب‌شده نقش مدرس ندارد" },
          { status: 400 }
        );
      }

      // حالا که مطمئنیم instructorId معتبره
      ownerId = null; // برای INSTRUCTOR از ownerId استفاده نمی‌کنیم
    } else if (ownerType === "CUSTOM") {
      ownerId = (formData.get("customOwnerId") as string)?.trim() || null;
      if (!ownerId) {
        return NextResponse.json(
          { error: "شناسه صاحب حساب متفرقه الزامی است" },
          { status: 400 }
        );
      }
    }
    // SITE → ownerId = null

    const account = await prisma.paymentAccount.create({
      data: {
        title,
        type,
        cardNumber,
        iban,
        holderName,
        bankName,
        country: { connect: { id: countryId } },
        currency,
        priority,
        isActive: true,
        ownerType,
        ownerId: ownerType !== "SITE" ? ownerId : null,
        ...(instructorId && { instructor: { connect: { id: instructorId } } }),
      },
    });

    return NextResponse.json({
      success: true,
      message: "حساب پرداخت با موفقیت ایجاد شد!",
      data: account,
    });
  } catch (error: any) {
    console.error("PaymentAccount create error:", error);

    if (error.code === "P2002") {
      const field = error.meta?.target?.[0];
      if (field === "title") {
        return NextResponse.json({ error: "عنوان حساب تکراری است" }, { status: 409 });
      }
    }

    return NextResponse.json(
      { error: "خطای سرور هنگام ایجاد حساب پرداخت" },
      { status: 500 }
    );
  }
}
