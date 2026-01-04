// src/app/[locale]/products/[id]/page.tsx
import { getTranslations } from "next-intl/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/[locale]/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/db/prisma";
import { notFound } from "next/navigation";
import { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import UniversalGallery from "@/components/common/UniversalGallery";
import DetailHeader from "@/components/common/DetailHeader";
import PriceBox from "@/components/price/PriceBox";
import ReadMore from "@/components/ui/ReadMore";
import ShareButton from "@/components/common/ShareButton";
import AddToCartButton from "@/components/common/AddToCartButton";
import ShippingModal from "@/components/shipping/ShippingModal";
import ItemsGrid from "@/components/common/ItemsGrid";
import Breadcrumb from "@/components/common/Breadcrumb";
import ReviewSection from "@/components/review/ReviewSection";
import ProductCard from "@/components/product/ProductCard";
import { Award, Package, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils/cn";

type Props = {
  params: { id: string; locale: string };
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id, locale } = params;
  const t = await getTranslations({ locale, namespace: "product" });

  const product = await prisma.product.findFirst({
    where: { OR: [{ slug: id }, { id }] },
    select: { title: true, description: true, image: true },
  });

  if (!product) {
    return { title: t("not_found") || "محصول یافت نشد" };
  }

  return {
    title: product.title,
    description: product.description || "",
    openGraph: {
      title: product.title,
      description: product.description || "",
      url: `https://rom.ir/${locale}/products/${id}`,
      images: [product.image || "/placeholder.jpg"],
    },
    alternates: {
      canonical: `/products/${id}`,
      languages: {
        fa: `/fa/products/${id}`,
        en: `/en/products/${id}`,
        ru: `/ru/products/${id}`,
      },
    },
  };
}

export default async function ProductDetailPage({ params }: Props) {
  const { id, locale } = params;
  const t = await getTranslations({ locale, namespace: "product" });
  const isRTL = locale === "fa";

  const session = await getServerSession(authOptions);

  const product = await prisma.product.findFirst({
    where: { OR: [{ slug: id }, { id }] },
    include: {
      reviews: {
        include: { user: { select: { name: true, image: true } } },
        orderBy: { createdAt: "desc" },
        take: 50,
      },
      category: true,
      tags: true,
      likes: session?.user?.id ? { where: { userId: session.user.id } } : false,
      shippingMethods: {
        where: { isActive: true },
        orderBy: { priority: "asc" },
        select: {
          id: true,
          title: true,
          type: true,
          cost: true,
          freeAbove: true,
          estimatedDays: true,
        },
      },
    },
  });

  if (!product || !product.isActive || !product.isVisible) notFound();

  const isLiked = product.likes.length > 0;

  const avgRating =
    product.reviews.length > 0
      ? Number(
          (product.reviews.reduce((sum, r) => sum + r.rating, 0) / product.reviews.length).toFixed(1)
        )
      : 0;

  const price = Number((product.price as any)?.IRR ?? 0);
  const discountPercent = product.discountPercent ?? 0;

  const relatedProducts = await prisma.product.findMany({
    where: {
      AND: [
        { isActive: true },
        { isVisible: true },
        { id: { not: product.id } },
        product.categoryId ? { categoryId: product.categoryId } : {},
        product.tags.length > 0
          ? { tags: { some: { id: { in: product.tags.map((t) => t.id) } } } }
          : {},
      ],
    },
    select: {
      id: true,
      title: true,
      slug: true,
      price: true,
      image: true,
      stock: true,
      brand: true,
      discountPercent: true,
      maxDiscountAmount: true,
      _count: { select: { reviews: true } },
      likes: session?.user?.id ? { where: { userId: session.user.id } } : false,
    },
    take: 12,
  });

  const breadcrumbItems = [
    { label: t("home") || "خانه", href: "/" },
    { label: t("products") || "محصولات", href: "/products" },
    product.category && {
      label: product.category.name,
      href: `/products?category=${product.category.slug}`,
    },
    { label: product.title, href: "" },
  ].filter(Boolean) as { label: string; href: string }[];

  // فیکس: gallery Json → string[]
  const galleryImages = [
    product.image,
    ...(Array.isArray(product.gallery)
      ? product.gallery.filter((img): img is string => typeof img === "string")
      : []),
  ].filter(Boolean) as string[];

  // فیکس: map shippingMethods به نوع مورد نیاز ShippingModal
  const shippingMethodsForModal = product.shippingMethods.map((m) => ({
    id: m.id,
    name: m.title,
    description: m.type, // یا هر فیلد دلخواه
    deliveryTime: m.estimatedDays || "نامشخص",
    cost: m.cost ?? 0,
    isFreeOver: m.freeAbove ?? undefined,
  }));

  return (
    <>
      <div className="relative min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/10 overflow-hidden">
        <div className="absolute inset-0 bg-grid-primary/5 [mask-image:radial-gradient(ellipse_at_center,transparent_10%,black)]" />
        <div className="relative container mx-auto max-w-7xl px-6 py-24 lg:py-32">
          <Breadcrumb items={breadcrumbItems} className="mb-16" />

          <div className="grid gap-16 lg:gap-24 lg:grid-cols-2 xl:gap-32">
            {/* گالری */}
            <div className="sticky top-28 self-start">
              <UniversalGallery
                images={galleryImages}
                discountBadge={discountPercent > 0 ? { type: "PERCENTAGE", value: discountPercent } : undefined}
                likeId={product.id}
                likeType="product"
                initialLiked={isLiked}
              />
            </div>

            {/* اطلاعات محصول */}
            <div className="space-y-20">
              <div className="rounded-4xl bg-card/96 backdrop-blur-3xl shadow-4xl ring-2 ring-primary/10 p-12 lg:p-20">
                <DetailHeader
                  title={product.title}
                  rating={avgRating}
                  reviewsCount={product.reviews.length}
                  items={[
                    { label: t("brand") || "برند", value: product.brand || t("unknown") || "نامشخص", color: "primary" },
                    { label: t("category") || "دسته‌بندی", value: product.category?.name || "-", color: "violet" },
                    { label: t("stock") || "موجودی", value: product.stock > 0 ? `${product.stock.toLocaleString("fa-IR")} عدد` : t("out_of_stock") || "ناموجود", color: product.stock > 0 ? "emerald" : "rose" },
                  ]}
                  tags={product.tags}
                />

                <div className="my-20">
                  <PriceBox price={price} discountPercent={discountPercent} size="xl" />
                </div>

                <div className="grid gap-12 md:grid-cols-2">
                  <ShippingModal shippingMethods={shippingMethodsForModal} />
                  <div className="flex items-center justify-center">
                    <ShareButton title={product.title} size="lg" />
                  </div>
                </div>

                <div className="mt-20">
                  <AddToCartButton productId={product.id} stock={product.stock} />
                </div>

                {/* توضیحات کامل */}
                <div className="mt-32 rounded-4xl bg-muted/60 backdrop-blur-xl p-16 ring-2 ring-border/50 shadow-3xl">
                  <h2 className="mb-12 text-6xl font-black bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent drop-shadow-2xl">
                    {t("description") || "توضیحات کامل محصول"}
                  </h2>
                  <ReadMore maxHeight={500}>
                    {product.description || t("no_description") || "توضیحات به‌زودی اضافه می‌شود..."}
                  </ReadMore>
                </div>

                {/* ویژگی‌های ویژه */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-12 mt-32">
                  <div className="group relative overflow-hidden rounded-4xl bg-gradient-to-br from-emerald-500/10 via-emerald-50/80 to-teal-50/80 p-10 shadow-3xl ring-2 ring-emerald-500/20 backdrop-blur-3xl transition-all duration-700 hover:shadow-4xl hover:scale-105 hover:ring-emerald-500/40">
                    <div className="relative flex items-center gap-8">
                      <div className="rounded-full bg-emerald-500/20 p-6 shadow-2xl ring-4 ring-emerald-500/30">
                        <Award className="h-20 w-20 text-emerald-600 drop-shadow-2xl" />
                      </div>
                      <div>
                        <p className="text-4xl font-black text-emerald-800 drop-shadow-md">
                          {t("return_guarantee") || "ضمانت بازگشت ۷ روزه"}
                        </p>
                        <p className="text-xl text-muted-foreground mt-2">
                          {t("unconditional") || "بدون قید و شرط"}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="group relative overflow-hidden rounded-4xl bg-gradient-to-br from-sky-500/10 via-sky-50/80 to-blue-50/80 p-10 shadow-3xl ring-2 ring-sky-500/20 backdrop-blur-3xl transition-all duration-700 hover:shadow-4xl hover:scale-105 hover:ring-sky-500/40">
                    <div className="relative flex items-center gap-8">
                      <div className="rounded-full bg-sky-500/20 p-6 shadow-2xl ring-4 ring-sky-500/30">
                        <Sparkles className="h-20 w-20 text-sky-600 drop-shadow-2xl" />
                      </div>
                      <div>
                        <p className="text-4xl font-black text-sky-800 drop-shadow-md">
                          {t("support_24") || "پشتیبانی ۲۴ ساعته"}
                        </p>
                        <p className="text-xl text-muted-foreground mt-2">
                          {t("expert_team") || "تیم متخصص ما"}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* نظرات */}
          <ReviewSection
            reviews={product.reviews.map((r) => ({
              id: r.id,
              rating: r.rating,
              comment: r.comment,
              createdAt: r.createdAt,
              user: { name: r.user.name ?? "کاربر", image: r.user.image ?? null },
            }))}
            averageRating={avgRating}
            totalReviews={product.reviews.length}
            entityId={product.id}
            entityType="product"
          />

          {/* محصولات مشابه */}
          {relatedProducts.length > 0 && (
            <ItemsGrid
              title={t("similar_products") || "محصولات مشابه"}
              subtitle={t("similar_subtitle") || "مشتریانی که این محصول را خریدند، این‌ها را هم پسندیدند"}
              columns={4}
              gap="lg"
              className="mt-48"
            >
              {relatedProducts.map((p) => {
                const pPrice = Number((p.price as any)?.IRR ?? 0);
                return (
                  <ProductCard
                    key={p.id}
                    id={p.id}
                    title={p.title}
                    slug={p.slug}
                    price={pPrice}
                    image={p.image}
                    stock={p.stock}
                    brand={p.brand || undefined}
                    reviewsCount={p._count.reviews}
                    isLiked={!!p.likes?.length}
                    discountPercent={p.discountPercent ?? 0}
                    maxDiscountAmount={p.maxDiscountAmount as any}
                  />
                );
              })}
            </ItemsGrid>
          )}

          {/* بازگشت به فروشگاه */}
          <div className="mt-48 text-center">
            <Link
              href="/products"
              className="group inline-flex items-center gap-12 rounded-full bg-gradient-to-r from-primary via-secondary to-primary px-48 py-20 text-7xl font-black text-white shadow-5xl ring-12 ring-primary/30 transition-all duration-700 hover:scale-110 hover:shadow-6xl hover:ring-primary/50"
            >
              <Package className="h-24 w-24 transition-all duration-700 group-hover:rotate-12 group-hover:scale-125" />
              {t("back_to_shop") || "بازگشت به فروشگاه"}
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}