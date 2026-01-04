import { Prisma } from "@prisma/client";

export function buildSearchCondition(
  search?: string
): Prisma.UserWhereInput | undefined {
  const trimmed = search?.trim();
  if (!trimmed) return undefined;

  return {
    OR: [
      { name: { contains: trimmed, mode: "insensitive" } },
      { email: { contains: trimmed, mode: "insensitive" } },
      { studentId: { contains: trimmed, mode: "insensitive" } },
    ],
  };
}