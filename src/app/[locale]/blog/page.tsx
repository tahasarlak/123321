// src/app/[locale]/blog/page.tsx
import { getTranslations } from "next-intl/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/[locale]/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/db/prisma";
import Link from "next/link";
import PostCard from "@/components/blog/PostCard";
import { Search, Plus, Heart } from "lucide-react";
import { cn } from "@/lib/utils/cn";

type Props = {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

export default async function BlogPage(props: Props) {
  const t = await getTranslations("blog");
  const session = await getServerSession(authOptions);
  const searchParams = await props.searchParams;

  const q = (searchParams.q as string) || "";
  const category = searchParams.category as string | undefined;
  const tag = searchParams.tag as string | undefined;
  const author = searchParams.author as string | undefined;
  const liked = searchParams.liked === "true";
  const sort =
    (searchParams.sort as "newest" | "oldest" | "popular" | "liked") || "newest";

  const where: any = {
    published: true,
    publishedAt: { not: null },
  };

  if (q) {
    where.OR = [
      { title: { contains: q, mode: "insensitive" } },
      { excerpt: { contains: q, mode: "insensitive" } },
      { content: { contains: q, mode: "insensitive" } },
    ];
  }
  if (category) where.category = { slug: category };
  if (tag) where.tags = { some: { slug: tag } };
  if (author) where.author = { name: { contains: author, mode: "insensitive" } };
  if (liked && session?.user?.id)
    where.likes = { some: { userId: session.user.id } };

  const orderBy: any =
    sort === "newest"
      ? { publishedAt: "desc" }
      : sort === "oldest"
      ? { publishedAt: "asc" }
      : sort === "popular"
      ? { views: "desc" }
      : { likes: { _count: "desc" } };

  const [posts, total, categories, popularTags, authors] = await Promise.all([
    prisma.post.findMany({
      where,
      include: {
        author: { select: { id: true, name: true, image: true } },
        category: { select: { name: true, slug: true, color: true } },
        tags: { select: { name: true, slug: true } },
        _count: { select: { likes: true, comments: true } },
        likes: session?.user?.id
          ? { where: { userId: session.user.id }, select: { id: true } }
          : false,
      },
      orderBy,
      take: 20,
    }),
    prisma.post.count({ where }),
    prisma.blogCategory.findMany({
      include: { _count: { select: { posts: true } } },
      orderBy: { name: "asc" },
    }),
    prisma.blogTag.findMany({
      where: { posts: { some: { published: true } } },
      orderBy: { posts: { _count: "desc" } },
      take: 15,
    }),
    prisma.user.findMany({
      where: { posts: { some: { published: true } } },
      select: { id: true, name: true },
      distinct: ["name"],
      orderBy: { posts: { _count: "desc" } },
      take: 8,
    }),
  ]);

  const isAdmin =
    session?.user?.roles?.includes("ADMIN") ||
    session?.user?.roles?.includes("SUPERADMIN");

  // تابع جدید createFilterUrl – حالا key اختیاریه
  const createFilterUrl = (key?: string, value?: string) => {
    const newParams = new URLSearchParams(searchParams as any);

    if (key !== undefined) {
      if (value !== undefined) {
        // اگر همون مقدار فعلی باشه → حذف کن (toggle)
        if (newParams.get(key) === value) {
          newParams.delete(key);
        } else {
          newParams.set(key, value);
        }
      } else {
        // فقط کلید داده شده → حذفش کن
        newParams.delete(key);
      }
    } else {
      // هیچ کلیدی داده نشده → همه فیلترها رو پاک کن
      newParams.forEach((_, k) => newParams.delete(k));
    }

    const query = newParams.toString();
    return query ? `/blog?${query}` : "/blog";
  };

  return (
    <div className="container mx-auto px-6 py-32 max-w-7xl">
      {/* عنوان + دکمه ادمین */}
      <div className="flex justify-between items-center mb-16">
        <h1 className="text-6xl md:text-8xl font-black bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
          {t("blog_title") || "وبلاگ روم آکادمی"}
        </h1>
        {isAdmin && (
          <Link
            href="/admin/blog/create"
            className="bg-gradient-to-r from-emerald-500 to-teal-600 text-white px-10 py-6 rounded-2xl text-2xl font-black hover:shadow-2xl transition transform hover:scale-105 shadow-2xl flex items-center gap-4"
          >
            <Plus size={32} />
            {t("add_new_post") || "افزودن مقاله جدید"}
          </Link>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-12">
        {/* فیلترهای سمت چپ */}
        <aside className="bg-card rounded-3xl shadow-2xl p-10 h-fit sticky top-32 space-y-12 border border-border/50">
          <h2 className="text-4xl font-black mb-10 text-foreground">
            {t("filters") || "فیلترها"}
          </h2>

          {/* جستجو */}
          <form action="/blog" method="GET" className="mb-10">
            <div className="relative">
              <Search className="absolute right-8 top-1/2 -translate-y-1/2 text-primary" size={32} />
              <input
                name="q"
                defaultValue={q}
                placeholder={t("search_placeholder") || "جستجو در مقالات..."}
                className="w-full pr-20 pl-8 py-8 rounded-2xl border-4 border-border focus:border-primary outline-none text-2xl font-medium bg-background"
              />
            </div>
          </form>

          {/* مرتب‌سازی */}
          <div>
            <h3 className="text-2xl md:text-3xl font-bold mb-6 text-foreground">
              {t("sort_by") || "مرتب‌سازی"}
            </h3>
            <div className="space-y-4">
              {[
                { key: "newest", label: t("newest") || "جدیدترین" },
                { key: "popular", label: t("popular") || "پربازدید" },
                { key: "liked", label: t("most_liked") || "محبوب‌ترین" },
                { key: "oldest", label: t("oldest") || "قدیمی‌ترین" },
              ].map((item) => (
                <Link
                  key={item.key}
                  href={createFilterUrl("sort", item.key)}
                  className={cn(
                    "block text-xl transition-all",
                    sort === item.key ? "font-black text-primary" : "hover:text-primary"
                  )}
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </div>

          {/* دسته‌بندی */}
          <div>
            <h3 className="text-2xl md:text-3xl font-bold mb-6 text-foreground">
              {t("categories") || "دسته‌بندی"}
            </h3>
            <div className="space-y-4">
              {/* حالا بدون آرگومان صدا می‌زنیم → همه فیلترها پاک می‌شن */}
              <Link
                href={createFilterUrl()}
                className={cn(
                  "block text-xl",
                  !category ? "font-black text-primary" : "hover:text-primary"
                )}
              >
                {t("all_posts") || "همه مقالات"} ({total.toLocaleString("fa-IR")})
              </Link>
              {categories.map((cat) => (
                <Link
                  key={cat.slug}
                  href={createFilterUrl("category", cat.slug)}
                  className={cn(
                    "block text-xl",
                    category === cat.slug ? "font-black text-primary" : "hover:text-primary"
                  )}
                >
                  {cat.name} ({cat._count.posts})
                </Link>
              ))}
            </div>
          </div>

          {/* تگ‌های محبوب */}
          <div>
            <h3 className="text-2xl md:text-3xl font-bold mb-6 text-foreground">
              {t("popular_tags") || "تگ‌های محبوب"}
            </h3>
            <div className="flex flex-wrap gap-4">
              {popularTags.map((tg) => (
                <Link
                  key={tg.slug}
                  href={createFilterUrl("tag", tg.slug)}
                  className={cn(
                    "px-6 py-3 rounded-full text-lg font-bold transition-all",
                    tag === tg.slug
                      ? "bg-primary text-white shadow-lg"
                      : "bg-muted hover:bg-accent text-muted-foreground"
                  )}
                >
                  #{tg.name}
                </Link>
              ))}
            </div>
          </div>

          {/* نویسندگان */}
          <div>
            <h3 className="text-2xl md:text-3xl font-bold mb-6 text-foreground">
              {t("authors") || "نویسندگان"}
            </h3>
            <div className="space-y-4">
              {authors.map((a) => (
                <Link
                  key={a.id}
                  href={createFilterUrl("author", a.name)}
                  className={cn(
                    "block text-lg",
                    author === a.name ? "font-black text-primary" : "hover:text-primary"
                  )}
                >
                  {a.name}
                </Link>
              ))}
            </div>
          </div>

          {/* فقط علاقه‌مندی‌ها */}
          {session && (
            <Link
              href={createFilterUrl("liked", liked ? undefined : "true")}
              className={cn(
                "block text-center py-8 px-12 rounded-3xl font-black text-2xl transition-all mt-12",
                liked ? "bg-primary text-white shadow-2xl" : "bg-muted hover:bg-accent"
              )}
            >
              <Heart className="inline-block ml-3" size={36} fill={liked ? "white" : "none"} />
              {t("my_likes") || "فقط علاقه‌مندی‌ها"}
            </Link>
          )}
        </aside>

        {/* لیست پست‌ها */}
        <div className="lg:col-span-3">
          <div className="mb-12">
            <p className="text-3xl text-muted-foreground">
              <strong className="text-primary">{total.toLocaleString("fa-IR")}</strong>{" "}
              {t("posts_found") || "مقاله یافت شد"}
            </p>
          </div>

          {posts.length === 0 ? (
            <div className="text-center py-40 bg-card/80 backdrop-blur rounded-3xl shadow-2xl">
              <p className="text-5xl md:text-6xl text-muted-foreground mb-12">
                {t("no_posts_found") || "مقاله‌ای با این فیلتر یافت نشد"}
              </p>
              <Link
                href="/blog"
                className="inline-block px-20 py-10 bg-primary text-white rounded-3xl text-3xl font-black hover:shadow-2xl transition-all"
              >
                {t("show_all_posts") || "نمایش همه مقالات"}
              </Link>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-10">
              {posts.map((post) => (
                <PostCard
                  key={post.id}
                  id={post.id}
                  slug={post.slug}
                  title={post.title}
                  excerpt={post.excerpt}
                  thumbnail={post.thumbnail}
                  featuredImage={post.featuredImage}
                  readingTime={post.readingTime || 5}
                  publishedAt={post.publishedAt}
                  author={post.author}
                  category={post.category}
                  tags={post.tags}
                  likesCount={post._count.likes}
                  commentsCount={post._count.comments}
                  isLiked={Array.isArray(post.likes) && post.likes.length > 0}
                  views={post.views}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}