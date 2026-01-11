// src/app/api/auth/verify-email/resend/route.ts
import { NextRequest, NextResponse } from "next/server";
import { resendVerificationAction } from "@/actions/auth/verifyEmail";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const formData = new FormData();
  if (body.email) formData.append("email", body.email);

  const result = await resendVerificationAction(body.email ? formData : undefined);

  return NextResponse.json({ success: result.success, message: result.i18nKey });
}