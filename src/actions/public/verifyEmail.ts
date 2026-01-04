// src/actions/public/verifyEmail.ts
"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/app/[locale]/api/auth/[...nextauth]/route";
import { handleResendVerification } from "@/server/public/Handler/verifyEmail";

export async function resendVerificationAction() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return { success: false, error: "Unauthorized" };

  return handleResendVerification({ email: session.user.email });
}