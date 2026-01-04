// src/types/next-auth.d.ts
import { DefaultSession, DefaultUser } from "next-auth";
import { JWT as DefaultJWT } from "next-auth/jwt";

declare module "next-auth" {
  /**
   * گسترش Session برای اضافه کردن فیلدهای سفارشی
   */
  interface Session {
    user: {
      id: string;
      roles: string[]; // مثل ["USER", "INSTRUCTOR", "ADMIN"]
      phone?: string | null;
      gender?: "MALE" | "FEMALE" | "OTHER" | null;
      // فیلدهای اصلی next-auth (name, email, image) هم حفظ می‌شن
    } & DefaultSession["user"];
  }

  /**
   * گسترش User که از adapter یا database میاد
   */
  interface User extends DefaultUser {
    id: string;
    roles: string[];
    phone?: string | null;
    gender?: "MALE" | "FEMALE" | "OTHER" | null;
  }
}

declare module "next-auth/jwt" {
  /**
   * گسترش JWT برای وقتی session در کوکی ذخیره می‌شه
   */
  interface JWT extends DefaultJWT {
    id: string;
    roles: string[];
    phone?: string | null;
    gender?: "MALE" | "FEMALE" | "OTHER" | null;
  }
}