// src/server/public/Socket/socket.ts
import { Server as SocketIOServer } from "socket.io";
import type { Server as HTTPServer } from "http";

let io: SocketIOServer | null = null;

export function initSocket(httpServer: HTTPServer): SocketIOServer {
  if (io) return io; // singleton

  console.log("راه‌اندازی Socket.io جدید");

  io = new SocketIOServer(httpServer, {
    path: "/api/socket",
    addTrailingSlash: false,
    cors: {
      origin: process.env.NEXT_PUBLIC_BASE_URL || "*",
      methods: ["GET", "POST"],
    },
  });

  io.on("connection", (socket) => {
    console.log("کاربر متصل شد:", socket.id);

    // مثال event ساده — بعداً گسترش بده (room, private, notification)
    socket.on("message", (msg) => {
      io?.emit("message", { id: socket.id, ...msg }); // broadcast به همه
    });

    socket.on("disconnect", () => {
      console.log("کاربر قطع شد:", socket.id);
    });
  });

  return io;
}

export function getSocket(): SocketIOServer | null {
  return io;
}