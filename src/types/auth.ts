// src/types/auth.ts
/**
 * تایپ‌های مشترک احراز هویت
 * استفاده شده در: NextAuth، handlerها، APIها، Server Actionها، فرانت‌اند
 */

export type LoginCredentials = {
  email: string;
  password: string;
  honeypot?: string;
};

export type RegisterData = {
  name: string;
  email: string;
  phone: string;
  password: string;
  passwordConfirm: string;
  gender: "MALE" | "FEMALE" | "OTHER";
  honeypot?: string;
};

export type ForgotData = {
  email: string;
  honeypot?: string;
};

export type ResetData = {
  token: string;
  password: string;
  passwordConfirm: string;
  honeypot?: string;
};

export type AuthResult =
  | { success: true; message?: string }
  | { success: false; error: string };

export type AuthUser = {
  id: string;
  name: string | null;
  email: string | null;
  image?: string | null;
  phone?: string | null;
  gender?: "MALE" | "FEMALE" | "OTHER" | null;
  roles: string[];
  jwtVersion?: number; 

};