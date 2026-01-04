// src/types/bloggerPosts.ts
export type PostItem = {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  thumbnail: string | null;
  views: number;
  likes: number;     // اضافه شد
  comments: number;  // اضافه شد
  published: boolean;
};

export type PostResult =
  | { success: true; message?: string; post?: any; posts?: PostItem[] }
  | { success: false; error: string };