// src/app/api/auth/[...nextauth]/route.ts
import NextAuth, { NextAuthOptions, type DefaultSession } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/db/prisma";
import bcrypt from "bcryptjs";
import { loginSchema } from "@/lib/validations/auth";
import type { AuthUser } from "@/types/auth";
import { redis } from "@/lib/redis/redis";
import { emailRateLimit } from "@/lib/redis/rate-limit";

const getUserLoginCacheKey = (email: string) => `cache:user:login:${email.toLowerCase()}`;

const fakeDelay = () =>
  new Promise(resolve => setTimeout(resolve, Math.floor(Math.random() * 300) + 400)); // 400-700ms

declare module "next-auth" {
  interface User extends AuthUser {}
  interface Session extends DefaultSession {
    user: AuthUser;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    roles: string[];
    gender?: "MALE" | "FEMALE" | "OTHER" | null;
    jwtVersion: number;
  }
}

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma) as any,
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "ایمیل", type: "email" },
        password: { label: "رمز عبور", type: "password" },
        honeypot: { label: "Honeypot", type: "text" },
      },
      async authorize(credentials): Promise<AuthUser | null> {
        // همیشه delay اول کار — جلوگیری از timing attack
        await fakeDelay();

        // Honeypot ضد ربات
        if (credentials?.honeypot && credentials.honeypot.length > 0) {
          return null;
        }

        // اعتبارسنجی با Zod
        const parsed = loginSchema.safeParse(credentials);
        if (!parsed.success) {
          return null;
        }

        const { email: rawEmail, password } = parsed.data;
        const email = rawEmail.toLowerCase().trim();

        // Rate Limit بر اساس ایمیل
        const { success: emailSuccess } = await emailRateLimit.limit(email);
        if (!emailSuccess) {
          return null;
        }

        const cacheKey = getUserLoginCacheKey(email);

        // کش برای چک وجود کاربر (جلوگیری از enumeration attack)
        const cached = await redis.get(cacheKey);
        let userExists = false;

        if (cached !== null) {
          userExists = cached === "1";
        } else {
          const check = await prisma.user.findUnique({
            where: { email },
            select: {
              id: true,
              isBanned: true,
              password: true,
              emailVerified: true,
              isActive: true,
            },
          });

          userExists =
            !!check &&
            !check.isBanned &&
            !!check.password &&
            !!check.emailVerified &&
            check.isActive === true;

          await redis.set(cacheKey, userExists ? "1" : "0", { ex: 600 }); // 10 دقیقه کش
        }

        if (!userExists) {
          // مقایسه با hash فیک برای جلوگیری از timing attack
          await bcrypt.compare(password, "$2a$12$thisisafakehashthatwillnevermatch12345");
          return null;
        }

        // دریافت اطلاعات کامل کاربر
        const user = await prisma.user.findUnique({
          where: { email },
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
            phone: true,
            gender: true,
            password: true,
            isBanned: true,
            emailVerified: true,
            isActive: true,
            jwtVersion: true,
            roles: { select: { role: true } },
          },
        });

        // چک‌های امنیتی نهایی
        if (
          !user ||
          user.isBanned ||
          !user.password ||
          !user.emailVerified ||
          !user.isActive
        ) {
          return null;
        }

        // مقایسه رمز عبور
        const passwordValid = await bcrypt.compare(password, user.password);
        if (!passwordValid) {
          return null;
        }

        // به‌روزرسانی زمان آخرین ورود
        await prisma.user.update({
          where: { id: user.id },
          data: { lastLoginAt: new Date() },
        });

        // به‌روزرسانی کش
        await redis.set(cacheKey, "1", { ex: 600 });

        // حذف فیلدهای حساس
        const { password: _, ...safeUser } = user;

        return {
          ...safeUser,
          roles: user.roles.map((r) => r.role) || ["USER"],
          jwtVersion: user.jwtVersion ?? 0,
        };
      },
    }),
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      allowDangerousEmailAccountLinking: false, // توصیه: امن‌تره که false باشه
    }),
  ],
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/auth",
    error: "/auth/error",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.roles = user.roles;
        token.gender = user.gender ?? null;
        token.jwtVersion = user.jwtVersion ?? 0;
      }
      return token;
    },
    async session({ session, token }) {
      session.user.id = token.id as string;
      session.user.roles = token.roles as string[];
      if (token.gender !== undefined) {
        session.user.gender = token.gender;
      }
      (session.user as any).jwtVersion = token.jwtVersion;
      return session;
    },
    async signIn({ user, account }) {
      // اگر با گوگل وارد شد و نقش نداشت، نقش USER بده
      if (account?.provider === "google" && user.email) {
        const dbUser = await prisma.user.findUnique({
          where: { email: user.email },
          include: { roles: true },
        });

        if (dbUser && !dbUser.roles.some((r) => r.role === "USER")) {
          await prisma.userRole.create({
            data: { userId: dbUser.id, role: "USER" },
          });
        }
      }
      return true;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
  debug: process.env.NODE_ENV === "development",
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };