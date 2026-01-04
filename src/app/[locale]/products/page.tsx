// src/app/[locale]/products/page.tsx
import { getTranslations } from "next-intl/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/[locale]/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/db/prisma";
import { Metadata } from "next";
import Link from "next/link";
import { Filter, X, Package, Plus } from "lucide-react";
import ProductCard from "@/components/product/ProductCard";
import { cn } from "@/lib/utils/cn";

type Props = {
  params: { locale: string };
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = params;
  const t = await getTranslations({ locale, namespace: "product" });

  const titles: Record<string, string> = {
    fa: t("products_title_fa") || "محصولات دندانپزشکی اورجینال | روم آکادمی",
    en: t("products_title_en") || "Original Dental Products | Room Academy",
    ru: t("products_title_ru") || "Оригинальные стоматологические товары | Room Academy",
  };

  const descriptions: Record<string, string> = {
    fa: t("products_desc_fa") || "تجهیزات حرفه‌ای دندانپزشکی با ضمانت اصالت، ارسال سریع و قیمت رقابتی",
    en: t("products_desc_en") || "Professional dental equipment with authenticity guarantee, fast shipping and competitive prices",
    ru: t("products_desc_ru") || "Профессиональное стоматологическое оборудование с гарантией подлинности, быстрая доставка и конкурентные цены",
  };

  return {
    title: titles[locale] || titles.fa,
    description: descriptions[locale] || descriptions.fa,
    openGraph: {
      title: titles[locale] || titles.fa,
      description: descriptions[locale] || descriptions.fa,
      url: `https://rom.ir/${locale}/products`,
      images: ["/products-hero.jpg"],
    },
    alternates: {
      canonical: "/products",
      languages: {
        fa: "/fa/products",
        en: "/en/products",
        ru: "/ru/products",
      },
    },
  };
}

export default async function ProductsPage({ params, searchParams }: Props) {
  const { locale } = params;
  const t = await getTranslations({ locale, namespace: "product" });
  const isRTL = locale === "fa";

  const session = await getServerSession(authOptions);
  const resolvedSearchParams = await searchParams;

  const category = resolvedSearchParams.category as string | undefined;
  const brand = resolvedSearchParams.brand as string | undefined;
  const tag = resolvedSearchParams.tag as string | undefined;
  const minPrice = resolvedSearchParams.minPrice ? Number(resolvedSearchParams.minPrice) : undefined;
  const maxPrice = resolvedSearchParams.maxPrice ? Number(resolvedSearchParams.maxPrice) : undefined;
  const inStock = resolvedSearchParams.inStock === "true" ? true : resolvedSearchParams.inStock === "false" ? false : undefined;
  const discount = resolvedSearchParams.discount === "true";
  const liked = resolvedSearchParams.liked === "true";
  const sort = (resolvedSearchParams.sort as "newest" | "expensive" | "cheap" | "bestseller" | "popular") || "newest";

  const where: any = { isActive: true, isVisible: true };

  if (category) where.category = { slug: category };
  if (brand) where.brand = { contains: brand, mode: "insensitive" };
  if (tag) where.tags = { some: { slug: tag } };
  if (minPrice !== undefined || maxPrice !== undefined) {
    where.price = {
      path: ["IRR"],
      ...(minPrice !== undefined && { gte: minPrice }),
      ...(maxPrice !== undefined && { lte: maxPrice }),
    };
  }
  if (inStock !== undefined) where.stock = inStock ? { gt: 0 } : { equals: 0 };
  if (discount) where.discountPercent = { gt: 0 };
  if (liked && session?.user?.id) where.likes = { some: { userId: session.user.id } };

  const orderBy: any =
    sort === "newest"
      ? { createdAt: "desc" }
      : sort === "expensive"
      ? { price: { path: ["IRR"], sort: "desc" } }
      : sort === "cheap"
      ? { price: { path: ["IRR"], sort: "asc" } }
      : sort === "bestseller"
      ? { orderItems: { _count: "desc" } }
      : sort === "popular"
      ? { likes: { _count: "desc" } }
      : { createdAt: "desc" };

  const [products, categories, brandsList, tagsList] = await Promise.all([
    prisma.product.findMany({
      where,
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
        _count: { select: { reviews: true, orderItems: true } },
        likes: session?.user?.id ? { where: { userId: session.user.id }, select: { id: true } } : false,
      },
      orderBy,
    }),
    prisma.category.findMany({
      where: { products: { some: { isActive: true, isVisible: true } } },
      select: { id: true, name: true, slug: true },
      orderBy: { name: "asc" },
    }),
    prisma.product.findMany({
      distinct: ["brand"],
      where: { brand: { not: null }, isActive: true, isVisible: true },
      select: { brand: true },
      orderBy: { brand: "asc" },
    }),
    prisma.tag.findMany({
      where: { products: { some: { isActive: true, isVisible: true } } },
      select: { id: true, name: true, slug: true },
      orderBy: { name: "asc" },
      take: 30,
    }),
  ]);

  // فیکس نهایی: r.role (چون roles آرایه از UserRole { role: string })
  const isAdmin = session?.user?.roles?.some((r) => ["ADMIN", "SUPERADMIN"].includes(r.role));

  const createFilterUrl = (key: string, value?: string) => {
    const newParams = new URLSearchParams(resolvedSearchParams as any);
    if (value !== undefined) {
      if (newParams.get(key) === value) {
        newParams.delete(key);
      } else {
        newParams.set(key, value);
      }
    } else {
      newParams.delete(key);
    }
    const query = newParams.toString();
    return query ? `/products?${query}` : "/products";
  };

  const activeFilters = Object.entries(resolvedSearchParams).filter(
    ([key, value]) => value && key !== "sort" && value !== ""
  );

  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-primary/10 via-background to-secondary/10 py-32">
        <div className="absolute inset-0 bg-grid-primary/5 [mask-image:radial-gradient(ellipse_at_center,transparent_20%,black)]" />
        <div className="container mx-auto px-6 text-center relative">
          <h1 className="text-6xl md:text-8xl font-black mb-8 bg-gradient-to-r from-primary via-secondary to-primary bg-clip-text text-transparent leading-tight">
            {t("products_title") || "محصولات دندانپزشکی اورجینال"}
          </h1>
          <p className="mt-8 text-2xl md:text-3xl text-foreground/80 font-medium max-w-4xl mx-auto">
            {t("products_subtitle") || "تجهیزات حرفه‌ای با ضمانت اصالت، ارسال سریع به سراسر ایران و قیمت رقابتی"}
          </p>
          {isAdmin && (
            <Link
              href="/admin/products/create"
              className="mt-12 inline-block rounded-3xl bg-gradient-to-r from-emerald-500 to-teal-600 px-12 py-6 text-2xl font-black text-white shadow-3xl transition-all hover:scale-105"
            >
              <Plus size={32} className="inline mr-4" />
              {t("add_product") || "افزودن محصول جدید"}
            </Link>
          )}
        </div>
      </section>

      <div className="container mx-auto px-6 py-20 max-w-7xl">
        {/* تعداد نتایج + فیلترهای فعال */}
        <div className="mb-16 flex flex-wrap items-center justify-between gap-8">
          <p className="text-3xl font-black text-foreground">
            <span className="text-primary">{products.length.toLocaleString("fa-IR")}</span> {t("products_found") || "محصول یافت شد"}
          </p>
          {activeFilters.length > 0 && (
            <div className="flex flex-wrap gap-4">
              {activeFilters.map(([key, value]) => (
                <Link
                  key={key}
                  href={createFilterUrl(key, value as string)}
                  className="flex items-center gap-3 rounded-full bg-primary/10 px-6 py-3.5 text-base font-bold text-primary transition hover:bg-primary/20"
                >
                  {key === "category" && t("category") + ": "}
                  {key === "brand" && t("brand") + ": "}
                  {key === "discount" && t("discount") || "تخفیف‌دار"}
                  {key === "inStock" && (value === "true" ? t("in_stock") || "موجود" : t("out_of_stock") || "ناموجود")}
                  {key === "liked" && t("liked") || "علاقه‌مندی‌ها"}
                  {value}
                  <X className="h-5 w-5" />
                </Link>
              ))}
              <Link
                href="/products"
                className="rounded-full bg-muted px-8 py-3.5 text-base font-bold text-muted-foreground transition hover:bg-muted/80"
              >
                {t("clear_filters") || "حذف همه فیلترها"}
              </Link>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-12">
          {/* سایدبار فیلتر */}
          <aside className="hidden lg:block">
            <div className="rounded-4xl bg-card/95 backdrop-blur-3xl shadow-3xl ring-2 ring-primary/10 p-10 sticky top-32">
              <h2 className="mb-12 flex items-center gap-4 text-4xl font-black text-foreground">
                <Filter className="h-10 w-10 text-primary" />
                {t("filters") || "فیلترها"}
              </h2>

              {/* دسته‌بندی */}
              <div className="mb-12">
                <h3 className="mb-6 text-2xl font-bold text-foreground/80">{t("category") || "دسته‌بندی"}</h3>
                <div className="space-y-4">
                  <Link
                    href="/products"
                    className={!category ? "block font-black text-primary text-xl" : "block text-foreground/70 hover:text-primary text-xl transition"}
                  >
                    {t("all_products") || "همه محصولات"}
                  </Link>
                  {categories.map((cat) => (
                    <Link
                      key={cat.id}
                      href={createFilterUrl("category", cat.slug)}
                      className={category === cat.slug ? "block font-black text-primary text-xl" : "block text-foreground/70 hover:text-primary text-xl transition"}
                    >
                      {cat.name}
                    </Link>
                  ))}
                </div>
              </div>

              {/* برند */}
              <div className="mb-12">
                <h3 className="mb-6 text-2xl font-bold text-foreground/80">{t("brand") || "برند"}</h3>
                <div className="space-y-4">
                  {brandsList.map((b) => b.brand && (
                    <Link
                      key={b.brand}
                      href={createFilterUrl("brand", b.brand)}
                      className={brand === b.brand ? "block font-black text-primary text-xl" : "block text-foreground/70 hover:text-primary text-xl transition"}
                    >
                      {b.brand}
                    </Link>
                  ))}
                </div>
              </div>

              {/* فیلترهای سریع */}
              <div className="space-y-6">
                <Link
                  href={createFilterUrl("inStock", "true")}
                  className={cn(
                    "block rounded-3xl px-10 py-6 text-center text-2xl font-black transition",
                    inStock === true ? "bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-2xl" : "bg-muted hover:bg-emerald-50"
                  )}
                >
                  {t("in_stock_only") || "فقط موجودها"}
                </Link>
                <Link
                  href={createFilterUrl("discount", "true")}
                  className={cn(
                    "block rounded-3xl px-10 py-6 text-center text-2xl font-black transition",
                    discount ? "bg-gradient-to-r from-orange-500 to-red-600 text-white shadow-2xl" : "bg-muted hover:bg-orange-50"
                  )}
                >
                  {t("discount_only") || "فقط تخفیف‌دارها"}
                </Link>
                {session && (
                  <Link
                    href={createFilterUrl("liked", "true")}
                    className={cn(
                      "block rounded-3xl px-10 py-6 text-center text-2xl font-black transition",
                      liked ? "bg-gradient-to-r from-pink-500 to-rose-600 text-white shadow-2xl" : "bg-muted hover:bg-pink-50"
                    )}
                  >
                    {t("liked_only") || "علاقه‌مندی‌ها"}
                  </Link>
                )}
              </div>
            </div>
          </aside>

          {/* لیست محصولات */}
          <div className="lg:col-span-3">
            {products.length === 0 ? (
              <div className="py-40 text-center">
                <div className="mx-auto mb-16 h-64 w-64 rounded-full bg-gradient-to-br from-primary/10 to-secondary/10 p-20 shadow-2xl">
                  <Package className="h-full w-full text-primary/30" />
                </div>
                <h3 className="mb-8 text-5xl font-black text-foreground/60">{t("no_products") || "محصولی یافت نشد"}</h3>
                <p className="mb-12 text-2xl text-muted-foreground">
                  {t("change_filters") || "فیلترها را تغییر دهید یا همه محصولات را ببینید"}
                </p>
                <Link
                  href="/products"
                  className="inline-block rounded-3xl bg-gradient-to-r from-primary to-secondary px-16 py-8 text-3xl font-black text-white shadow-3xl transition-all hover:scale-105"
                >
                  {t("show_all") || "نمایش همه محصولات"}
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-10">
                {products.map((product) => (
                  <ProductCard
                    key={product.id}
                    id={product.id}
                    title={product.title}
                    slug={product.slug}
                    price={product.price as any}
                    image={product.image}
                    stock={product.stock}
                    brand={product.brand || undefined}
                    reviewsCount={product._count.reviews}
                    isLiked={!!product.likes?.length}
                    discountPercent={product.discountPercent ?? 0}
                    maxDiscountAmount={product.maxDiscountAmount as any}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}