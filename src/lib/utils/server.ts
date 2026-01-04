// src/lib/utils/server.ts
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/[locale]/api/auth/[...nextauth]/route";

export async function getCurrentUser() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    throw new Error("دسترسی غیرمجاز");
  }
  return session.user;
}