// src/components/product/SuggestedProducts.tsx
import { prisma } from "@/lib/db/prisma";
import Link from "next/link";
import Image from "next/image";

export default async function SuggestedProducts() {
  const suggestions = await prisma.product.findMany({
    where: { isActive: true, isVisible: true },
    take: 6,
    orderBy: { createdAt: "desc" }, // تغییر از views به createdAt (یا هر فیلد معتبر دیگر)
  });

  if (suggestions.length === 0) return null;

  return (
    <div className="mt-20">
      <h2 className="text-4xl md:text-5xl font-black text-center mb-12 text-foreground">
        محصولات پیشنهادی برای شما
      </h2>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-8">
        {suggestions.map((p) => (
          <Link key={p.id} href={`/products/${p.slug}`} className="group">
            <div className="bg-card rounded-3xl shadow-xl overflow-hidden hover:shadow-2xl transition transform hover:-translate-y-4 border border-border/50">
              <Image
                src={p.image || "/placeholder.jpg"}
                alt={p.title}
                width={300}
                height={300}
                className="w-full h-48 object-cover group-hover:scale-110 transition"
              />
              <div className="p-6">
                <h3 className="font-bold text-lg line-clamp-2 text-foreground">{p.title}</h3>
                <p className="text-2xl font-black text-primary mt-4">
                  {Number(p.price || 0).toLocaleString("fa-IR")} تومان
                </p>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}