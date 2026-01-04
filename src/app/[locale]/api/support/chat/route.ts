// src/app/api/support/chat/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/[locale]/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/db/prisma";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json([]);

  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("userId");

  const messages = await prisma.ticketMessage.findMany({
    where: { ticket: { userId } },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json(messages);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { userId, message } = await req.json();

  // ذخیره پیام کاربر
  const ticket = await prisma.ticket.upsert({
    where: { userId },
    update: {},
    create: { userId, title: "سوال از هوش مصنوعی", priority: "MEDIUM" },
  });

  await prisma.ticketMessage.create({
    data: {
      ticketId: ticket.id,
      sender: "USER",
      content: message,
    },
  });

  // دریافت پاسخ از هوش مصنوعی
  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: "شما دستیار هوشمند سایت روم هستید. به فارسی و مودبانه جواب دهید. اگر سوال فنی بود، دقیق جواب بده." },
      { role: "user", content: message },
    ],
  });

  const aiReply = completion.choices[0].message.content;

  // ذخیره پاسخ هوش مصنوعی
  await prisma.ticketMessage.create({
    data: {
      ticketId: ticket.id,
      sender: "AI",
      isAI: true,
      content: aiReply,
    },
  });

  return NextResponse.json({ reply: aiReply });
}