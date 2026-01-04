// src/app/api/blogger/posts/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/[locale]/api/auth/[...nextauth]/route";
import { handleGetBloggerPosts } from "@/server/public/Handler/bloggerPosts";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const result = await handleGetBloggerPosts(session.user.id);

  return NextResponse.json(result);
}