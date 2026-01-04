// src/app/api/notification/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/[locale]/api/auth/[...nextauth]/route";
import { handleGetUserNotifications, handleMarkAsRead, handleMarkAllAsRead } from "@/server/public/Handler/notification";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ notifications: [], total: 0, unreadCount: 0 });

  const result = await handleGetUserNotifications(session.user.id);

  return NextResponse.json(result);
}

export async function PATCH(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { action } = body;

  if (action === "all") {
    const result = await handleMarkAllAsRead(session.user.id);
    return NextResponse.json(result);
  }

  const result = await handleMarkAsRead(body, session.user.id);
  return NextResponse.json(result);
}
