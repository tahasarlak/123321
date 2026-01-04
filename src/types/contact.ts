// src/types/contact.ts
export type ContactFormData = {
  name: string;
  email: string;
  subject: string;
  message: string;
  honeypot: string;
};

export type ContactResult =
  | { success: true }
  | { success: false; error: string };

export type ContactMessageForEmail = {
  id: number;
  name: string;
  email: string;
  subject: string;
  message: string;
  createdAt: Date;
  ipAddress?: string | null;
};