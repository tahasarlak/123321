// src/app/api/admin/payment-accounts/edit/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/[locale]/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/db/prisma";

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
    return NextResponse.json(
      { error: "دسترسی ممنوع – فقط ادمین مجاز است" },
      { status: 403 }
    );
  }

  try {
    const formData = await request.formData();

    const id = formData.get("id") as string;
    if (!id) {
      return NextResponse.json({ error: "شناسه حساب الزامی است" }, { status: 400 });
    }

    const title = (formData.get("title") as string)?.trim();
    const type = formData.get("type") as "CARD_TO_CARD" | "BANK_TRANSFER" | "CRYPTO";
    const countryId = formData.get("countryId") as string;
    const holderName = (formData.get("holderName") as string)?.trim();
    const bankName = (formData.get("bankName") as string)?.trim();
    const priority = Number(formData.get("priority")) || 0;
    const currency = (formData.get("currency") as string) || "IRR";
    const ownerType = formData.get("ownerType") as "SITE" | "INSTRUCTOR" | "CUSTOM";
    const isActive = formData.get("isActive") === "true";

    if (!title || !type || !countryId || !holderName || !bankName || !ownerType) {
      return NextResponse.json(
        { error: "فیلدهای ضروری پر نشده‌اند" },
        { status: 400 }
      );
    }

    // مدیریت فیلدهای شرطی
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

    // مدیریت مالکیت
    let instructorConnect = {};
    let ownerId: string | null = null;

    if (ownerType === "INSTRUCTOR") {
      const instructorId = formData.get("instructorId") as string;
      if (!instructorId) {
        return NextResponse.json({ error: "استاد انتخاب نشده است" }, { status: 400 });
      }

      // چک کردن نقش INSTRUCTOR از جدول UserRole
      const hasInstructorRole = await prisma.userRole.findFirst({
        where: { userId: instructorId, role: "INSTRUCTOR" },
      });

      if (!hasInstructorRole) {
        return NextResponse.json(
          { error: "کاربر انتخاب‌شده نقش مدرس ندارد" },
          { status: 400 }
        );
      }

      instructorConnect = { instructor: { connect: { id: instructorId } } };
      ownerId = null; // برای INSTRUCTOR از ownerId استفاده نمی‌کنیم
    } else {
      // قطع ارتباط با instructor
      instructorConnect = { instructor: { disconnect: true } };

      if (ownerType === "CUSTOM") {
        ownerId = (formData.get("customOwnerId") as string)?.trim() || null;
        if (!ownerId) {
          return NextResponse.json(
            { error: "شناسه صاحب حساب متفرقه الزامی است" },
            { status: 400 }
          );
        }
      } else {
        // SITE
        ownerId = null;
      }
    }

    const updatedAccount = await prisma.paymentAccount.update({
      where: { id },
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
        isActive,
        ownerType,
        ownerId,
        ...instructorConnect,
      },
    });

    return NextResponse.json({
      success: true,
      message: "حساب پرداخت با موفقیت ویرایش شد!",
      account: updatedAccount,
    });
  } catch (error: any) {
    console.error("خطا در ویرایش حساب پرداخت:", error);
    return NextResponse.json(
      { error: error.message || "خطای سرور هنگام ویرایش حساب" },
      { status: 500 }
    );
  }
}
