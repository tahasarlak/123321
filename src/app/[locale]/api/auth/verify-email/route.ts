// src/app/api/auth/verify-email/route.ts
import { NextRequest, NextResponse } from "next/server";
import { verifyEmailTokenAction } from "@/actions/auth/verifyEmail";

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");
  if (!token) return NextResponse.redirect(new URL("/auth?error=token_invalid", request.url));

  const result = await verifyEmailTokenAction(token);

  if (!result.success) {
    return NextResponse.redirect(new URL(`/auth?error=${result.i18nKey}`, request.url));
  }

  return NextResponse.redirect(new URL("/dashboard?success=email_verified", request.url));
}