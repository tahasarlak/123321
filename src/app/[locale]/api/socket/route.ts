// src/app/api/socket/route.ts
import { NextRequest, NextResponse } from "next/server";
import { initSocket } from "@/server/public/Socket/socket";

const ioHandler = (req: NextRequest) => {
  const { socket } = req as any;

  if (!socket.server.io) {
    initSocket(socket.server);
  }

  return NextResponse.json({ message: "Socket.io آماده است" });
};

export { ioHandler as GET, ioHandler as POST };