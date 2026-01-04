// src/components/blog/PostContent.tsx
type Props = {
  content: string;
  excerpt?: string | null;
};

export default function PostContent({ content, excerpt }: Props) {
  return (
    <>
      {excerpt && (
        <div className="bg-gradient-to-r from-primary/10 to-secondary/10 rounded-3xl p-12 shadow-2xl mb-20">
          <p className="text-3xl leading-relaxed text-foreground italic text-center font-medium">
            {excerpt}
          </p>
        </div>
      )}

      <div
        className="prose prose-2xl max-w-none text-foreground leading-relaxed
          prose-headings:font-black prose-headings:text-foreground
          prose-a:text-primary prose-a:no-underline hover:prose-a:underline
          prose-blockquote:border-l-8 prose-blockquote:border-primary prose-blockquote:pl-8 prose-blockquote:italic prose-blockquote:bg-accent/20
          prose-img:rounded-2xl prose-img:shadow-2xl prose-img:my-12
          prose-li:text-xl prose-li:leading-loose"
        dangerouslySetInnerHTML={{ __html: content || "" }}
      />
    </>
  );
}