// src/app/api/contact/route.ts
import { NextRequest, NextResponse } from "next/server";
import { handleContactSubmission } from "@/server/public/Handler/contact";
import type { ContactFormData } from "@/types/contact";

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as ContactFormData;

    // فقط از x-forwarded-for استفاده می‌کنیم — امن و استاندارد در همه محیط‌ها
    const forwardedFor = req.headers.get("x-forwarded-for");
    const ip = forwardedFor ? forwardedFor.split(",")[0].trim() : null;

    const context = {
      ip,
      userAgent: req.headers.get("user-agent") || null,
    };

    const result = await handleContactSubmission(body, context);

    return NextResponse.json(result, {
      status: result.success ? 200 : 400,
    });
  } catch (error) {
    console.error("[API CONTACT] خطای سرور:", error);
    return NextResponse.json(
      { success: false, error: "خطای داخلی سرور" },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({ error: "Method Not Allowed" }, { status: 405 });
}