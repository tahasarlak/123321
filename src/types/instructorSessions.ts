// src/types/instructorSessions.ts
export type SessionItem = {
  id: string;
  title: string;
  type: string;
  startTime: Date;
  endTime: Date;
  meetLink: string | null;
  recordingLink: string | null;
};

export type SessionResult =
  | { success: true; sessions?: SessionItem[]; session?: SessionItem; message?: string }
  | { success: false; error: string };