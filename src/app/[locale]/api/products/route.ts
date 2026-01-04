// src/app/api/products/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const page = parseInt(searchParams.get("page") || "1", 10);
  const limit = parseInt(searchParams.get("limit") || "12", 10);
  const search = searchParams.get("search")?.trim() || "";
  const categoryId = searchParams.get("categoryId") || undefined;
  const brand = searchParams.get("brand") || undefined;

  const where: any = {
    isActive: true,
    isVisible: true,
  };

  if (search) {
    where.OR = [
      { title: { contains: search, mode: "insensitive" } },
      { description: { contains: search, mode: "insensitive" } },
    ];
  }

  if (categoryId) where.categoryId = categoryId;
  if (brand) where.brand = { contains: brand, mode: "insensitive" };

  try {
    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        take: limit,
        skip: (page - 1) * limit,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          title: true,
          slug: true,
          image: true,
          price: true,
          discountPercent: true,
          stock: true,
          brand: true,
        },
      }),
      prisma.product.count({ where }),
    ]);

    return NextResponse.json({ products, total });
  } catch (error) {
    console.error("[PRODUCTS LIST] خطا:", error);
    return NextResponse.json({ error: "خطای سرور" }, { status: 500 });
  }
}

 ;