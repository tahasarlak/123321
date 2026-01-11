// src/app/api/socket/route.ts
import { Server as NetServer } from "http";
import { NextApiResponseServerIO } from "@/types/socket";
import { Server as ServerIO } from "socket.io";

export const config = {
  api: {
    bodyParser: false,
  },
};

const ioHandler = (req: any, res: NextApiResponseServerIO) => {
  if (!res.socket.server.io) {
    console.log("🚀 راه‌اندازی سرور Socket.IO جدید");

    const httpServer: NetServer = res.socket.server as any;
    const io = new ServerIO(httpServer, {
      path: "/api/socket",
      addTrailingSlash: false,
      cors: {
        origin: process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000",
        methods: ["GET", "POST"],
      },
    });

    // ذخیره io در سرور برای دسترسی بعدی
    res.socket.server.io = io;

    // رویدادهای اصلی
    io.on("connection", (socket) => {
      console.log(`کاربر متصل شد: ${socket.id}`);

      // جوین به اتاق شخصی کاربر (برای نوتیفیکیشن خصوصی)
      socket.on("join_user_room", ({ userId }: { userId: string }) => {
        socket.join(`user_${userId}`);
        console.log(`کاربر ${userId} به اتاق user_${userId} جوین شد`);
      });

      // جوین به اتاق دوره (برای نوتیفیکیشن گروهی)
      socket.on("join_course_room", ({ courseId }: { courseId: string }) => {
        socket.join(`course_${courseId}`);
      });

      // جوین به اتاق گروه
      socket.on("join_group_room", ({ groupId }: { groupId: string }) => {
        socket.join(`group_${groupId}`);
      });

      // چت پشتیبانی (اختیاری)
      socket.on("join_support", ({ userId }: { userId: string }) => {
        socket.join("support_room");
        socket.emit("support_joined", { message: "به پشتیبانی متصل شدید" });
      });

      socket.on("disconnect", () => {
        console.log(`کاربر قطع شد: ${socket.id}`);
      });
    });
  }

  res.end();
};

export { ioHandler as GET, ioHandler as POST };