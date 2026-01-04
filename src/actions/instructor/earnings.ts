// src/actions/instructor/earnings.ts
"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/app/[locale]/api/auth/[...nextauth]/route";
import { handleRequestWithdrawal } from "@/server/public/Handler/instructorEarnings";

export async function requestWithdrawalAction(formData: FormData) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return { success: false, error: "Unauthorized" };

  const data = Object.fromEntries(formData);
  return handleRequestWithdrawal(data, session.user.id);
}