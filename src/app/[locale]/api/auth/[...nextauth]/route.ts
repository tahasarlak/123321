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

        // Honeypot
        if (credentials?.honeypot && credentials.honeypot.length > 0) {
          return null;
        }

        // Validation با Zod
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
            },
          });

          userExists = !!check && !check.isBanned && !!check.password;
          await redis.set(cacheKey, userExists ? "1" : "0", { ex: 600 });
        }

        if (!userExists) {
          // مقایسه با hash فیک — جلوگیری از timing attack
          await bcrypt.compare(password, "$2a$12$thisisafakehashthatwillnevermatch12345");
          return null;
        }

        // گرفتن اطلاعات کامل کاربر
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
            isEmailVerified: true,
            jwtVersion: true,
            roles: { select: { role: true } },
          },
        });

        // چک‌های امنیتی: بن، پسورد، تأیید ایمیل
        if (!user || user.isBanned || !user.password || !user.isEmailVerified) {
          return null;
        }

        // مقایسه پسورد — فقط یک بار!
        const passwordValid = await bcrypt.compare(password, user.password);
        if (!passwordValid) {
          return null;
        }

        // به‌روزرسانی کش
        await redis.set(cacheKey, "1", { ex: 600 });

        // حذف فیلدهای حساس قبل از برگرداندن
        const { password: _, isBanned: __, ...safeUser } = user;

        return {
          ...safeUser,
          roles: user.roles.map(r => r.role) || ["USER"],
          jwtVersion: user.jwtVersion ?? 0,
        };
      },
    }),

    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      allowDangerousEmailAccountLinking: true,
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
      if (account?.provider === "google" && user.email) {
        const dbUser = await prisma.user.findUnique({
          where: { email: user.email },
          include: { roles: true },
        });

        if (dbUser && !dbUser.roles.some(r => r.role === "USER")) {
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