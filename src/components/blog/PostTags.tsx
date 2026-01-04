// src/components/blog/PostTags.tsx
import Link from "next/link";

type Tag = {
  id: string;
  name: string;
  slug: string;
};

type Props = {
  tags: Tag[];
  t: (key: string) => string;
};

export default function PostTags({ tags, t }: Props) {
  return (
    <div className="pt-16 border-t-4 border-dashed border-border/30">
      <h3 className="text-4xl font-black mb-8 text-foreground">
        {t("tags") || "تگ‌های مقاله"}
      </h3>
      <div className="flex flex-wrap gap-4">
        {tags.map((tag) => (
          <Link
            key={tag.id}
            href={`/blog?tag=${tag.slug}`}
            className="px-8 py-4 bg-gradient-to-r from-primary/10 to-secondary/10 text-primary rounded-full text-xl font-bold hover:from-primary/20 hover:to-secondary/20 transition shadow-lg"
          >
            #{tag.name}
          </Link>
        ))}
      </div>
    </div>
  );
}