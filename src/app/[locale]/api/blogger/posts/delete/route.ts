// src/app/api/blogger/posts/delete/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/[locale]/api/auth/[...nextauth]/route";
import { handleDeletePost } from "@/server/public/Handler/bloggerPosts";

export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "شناسه پست الزامی است" }, { status: 400 });

  const result = await handleDeletePost(id, session.user.id);

  return NextResponse.json(result);
}