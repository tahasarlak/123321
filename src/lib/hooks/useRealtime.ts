// src/hooks/useRealtime.ts
"use client";

import { useEffect, useState } from "react";
import { io, Socket } from "socket.io-client";

let socket: Socket | null = null;

export function useRealtime(userId: string | undefined): Socket | null;
export function useRealtime(event: string, callback: (data: any) => void): boolean;
export function useRealtime(
  arg1: string | undefined,
  arg2?: (data: any) => void
): Socket | null | boolean {
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (!socket) {
      socket = io(process.env.NEXT_PUBLIC_SOCKET_URL || "", {
        reconnectionAttempts: 5,
        timeout: 10000,
      });
    }

    socket.on("connect", () => setConnected(true));
    socket.on("disconnect", () => setConnected(false));

    // اگر فقط userId داده شده → join room پشتیبانی
    if (typeof arg1 === "string" && arg1 && !arg2) {
      socket.emit("join-support", { userId: arg1 });
    }

    // اگر event + callback → listen کن
    if (typeof arg1 === "string" && arg2) {
      socket.on(arg1, arg2);
      return () => {
        socket?.off(arg1, arg2);
      };
    }

    return () => {
      if (typeof arg1 === "string" && arg1 && !arg2) {
        socket?.emit("leave-support", { userId: arg1 });
      }
    };
  }, [arg1, arg2]);

  // اگر فقط userId → socket instance برگردون
  if (typeof arg1 === "string" && !arg2) {
    return socket;
  }

  // اگر event → connected status برگردون
  return connected;
}

// کمک‌کننده برای دسترسی مستقیم به socket (در کامپوننت‌ها)
let globalSocket: Socket | null = null;
export function getSocket() {
  if (!globalSocket) {
    globalSocket = io(process.env.NEXT_PUBLIC_SOCKET_URL || "");
  }
  return globalSocket;
}