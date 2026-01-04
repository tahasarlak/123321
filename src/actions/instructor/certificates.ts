// src/actions/instructor/certificates.ts
"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/app/[locale]/api/auth/[...nextauth]/route";
import { handleIssueCertificateManual } from "@/server/public/Handler/instructorCertificates";

export async function issueCertificateManualAction(formData: FormData) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return { success: false, error: "Unauthorized" };

  const data = Object.fromEntries(formData);
  return handleIssueCertificateManual(data, session.user.id);
}