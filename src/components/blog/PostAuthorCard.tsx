// src/components/blog/PostAuthorCard.tsx
import Image from "next/image";
import Link from "next/link";

type Props = {
  author: {
    name: string;
    image?: string | null;
    bio?: string | null;
  };
  t: (key: string) => string;
};

export default function PostAuthorCard({ author, t }: Props) {
  return (
    <div className="bg-card rounded-4xl shadow-4xl p-12 sticky top-32 border border-border/50">
      <h3 className="text-5xl font-black text-center mb-12 bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
        {t("about_author") || "درباره نویسنده"}
      </h3>
      <div className="text-center">
        <Image
          src={author.image || "/avatar.jpg"}
          alt={author.name}
          width={200}
          height={200}
          className="rounded-full mx-auto ring-8 ring-primary/10 shadow-2xl mb-8"
        />
        <h4 className="text-4xl font-black mb-6 text-foreground">{author.name}</h4>
        {author.bio && (
          <p className="text-xl text-muted-foreground leading-relaxed mb-10">
            {author.bio}
          </p>
        )}
        <Link
          href={`/blog?author=${encodeURIComponent(author.name)}`}
          className="inline-block bg-gradient-to-r from-primary to-secondary text-white px-12 py-6 rounded-2xl text-2xl font-black hover:scale-105 transition shadow-2xl"
        >
          {t("all_posts_author") || "همه مقالات این نویسنده"}
        </Link>
      </div>
    </div>
  );
}