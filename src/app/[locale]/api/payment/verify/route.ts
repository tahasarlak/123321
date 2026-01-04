// src/app/api/payment/verify/route.ts
import { NextRequest, NextResponse } from "next/server";
import { handleVerifyPayment } from "@/server/public/Handler/payment";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const authority = searchParams.get("Authority");
  const orderId = searchParams.get("orderId");
  const status = searchParams.get("Status");

  if (status !== "OK" || !authority || !orderId) {
    return NextResponse.redirect(new URL("/payment/failed", req.url));
  }

  const result = await handleVerifyPayment(authority, orderId);

  if (result.success) {
    return NextResponse.redirect(new URL(`/payment/success?ref=${authority}`, req.url));
  }

  return NextResponse.redirect(new URL("/payment/failed", req.url));
}