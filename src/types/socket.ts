// src/types/socket.ts
import { Server as NetServer } from "http";
import { NextApiResponse } from "next";
import { Server as ServerIO } from "socket.io";
import { Socket } from "socket.io";

export type NextApiResponseServerIO = NextApiResponse & {
  socket: NetServer & {
    server: NetServer & {
      io: ServerIO;
    };
  };
};

export type SocketWithUser = Socket & {
  userId?: string;
};