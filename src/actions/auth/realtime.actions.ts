// lib/actions/realtime.actions.ts
"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/app/[locale]/api/auth/[...nextauth]/route";
import { Server as ServerIO } from "socket.io";
import { NextApiResponseServerIO } from "@/types/socket";

let io: ServerIO | null = null;

// تابع کمکی برای گرفتن io instance
export function getSocketServer(): ServerIO | null {
  return io;
}

// فقط برای استفاده داخلی در API route
export function initSocketServer(res: NextApiResponseServerIO) {
  if (res.socket.server.io) {
    io = res.socket.server.io;
  }
  return io;
}

// اکشن: ارسال نوتیفیکیشن زنده
export async function sendRealtimeNotification({
  userId,
  courseId,
  groupId,
  title,
  message,
  type = "INFO",
  link,
}: {
  userId?: string;
  courseId?: string;
  groupId?: string;
  title: string;
  message: string;
  type?: "INFO" | "SUCCESS" | "WARNING" | "ERROR" | "ANNOUNCEMENT" | "PAYMENT" | "ENROLLMENT" | "ASSIGNMENT" | "CERTIFICATE" | "SUPPORT" | "SYSTEM";
  link?: string;
}) {
  if (!io) return;

  const payload = {
    title,
    message,
    type,
    link,
    timestamp: new Date().toISOString(),
  };

  // ارسال به کاربر خاص
  if (userId) {
    io.to(`user_${userId}`).emit("new_notification", payload);
  }

  // ارسال به همه اعضای دوره
  if (courseId) {
    io.to(`course_${courseId}`).emit("new_course_notification", payload);
  }

  // ارسال به گروه
  if (groupId) {
    io.to(`group_${groupId}`).emit("new_group_notification", payload);
  }

  // ارسال به همه (برای اطلاعیه‌های عمومی)
  if (!userId && !courseId && !groupId) {
    io.emit("global_notification", payload);
  }
}