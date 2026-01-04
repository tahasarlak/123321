// src/actions/blogger/posts.ts
"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/app/[locale]/api/auth/[...nextauth]/route";
import { handleCreatePost, handleEditPost } from "@/server/public/Handler/bloggerPosts";

export async function createPostAction(formData: FormData) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return { success: false, error: "Unauthorized" };

  const data = Object.fromEntries(formData);
  return handleCreatePost(data, session.user.id);
}

export async function editPostAction(formData: FormData) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return { success: false, error: "Unauthorized" };

  const data = Object.fromEntries(formData);
  return handleEditPost(data, session.user.id);
}