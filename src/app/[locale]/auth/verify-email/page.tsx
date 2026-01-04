import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { prisma } from "@/lib/db/prisma";
import { Metadata } from "next";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle } from "lucide-react";
import Link from "next/link";

type Props = {
  searchParams: Promise<{ token?: string }>; // ← Promise بودن رو مشخص کردیم
};

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("auth");
  return {
    title: t("verify_email_title") || "تأیید ایمیل",
    description: t("verify_email_desc") || "در حال تأیید ایمیل شما...",
    robots: { index: false, follow: false },
  };
}

export default async function VerifyPage({ searchParams }: Props) {
  const t = await getTranslations("auth");
  const params = await searchParams; // ← await درست اینجا
  const token = params.token;

  // توکن وجود نداره
  if (!token) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-accent/20 to-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md shadow-2xl border-border/50">
          <CardHeader className="text-center pb-8">
            <AlertCircle className="size-20 mx-auto text-destructive mb-6" />
            <CardTitle className="text-3xl md:text-4xl font-black text-destructive">
              {t("invalid_token") || "توکن نامعتبر"}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-6">
            <CardDescription className="text-lg leading-relaxed">
              {t("invalid_token_desc") || "لینک تأیید ایمیل معتبر نیست یا قبلاً استفاده شده است."}
            </CardDescription>
            <Button asChild size="lg" className="w-full max-w-xs mx-auto">
              <Link href="/auth">{t("back_to_login") || "بازگشت به صفحه ورود"}</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  try {
    const verificationToken = await prisma.verificationToken.findUnique({
      where: { token },
      include: { user: { select: { preferredLocale: true, isEmailVerified: true } } },
    });

    // توکن نامعتبر یا منقضی
    if (!verificationToken || verificationToken.expiresAt < new Date()) {
      if (verificationToken) {
        await prisma.verificationToken.delete({ where: { token } }).catch(() => {});
      }

      return (
        <div className="min-h-start bg-gradient-to-br from-background via-accent/20 to-background flex items-center justify-center p-4">
          <Card className="w-full max-w-md shadow-2xl border-border/50">
            <CardHeader className="text-center pb-8">
              <AlertCircle className="size-20 mx-auto text-destructive mb-6" />
              <CardTitle className="text-3xl md:text-4xl font-black text-destructive">
                {t("expired_token") || "لینک منقضی شده"}
              </CardTitle>
            </CardHeader>
            <CardContent className="text-center space-y-6">
              <CardDescription className="text-lg leading-relaxed">
                {t("expired_token_desc") || "این لینک دیگر معتبر نیست. لطفاً درخواست لینک تأیید جدید کنید."}
              </CardDescription>
              <div className="space-y-4">
                <Button asChild size="lg" className="w-full max-w-xs mx-auto">
                  <Link href="/auth">{t("back_to_login") || "بازگشت به ورود"}</Link>
                </Button>
                <p className="text-sm text-muted-foreground">
                  {t("resend_verification_hint") || "یا از صفحه ورود درخواست ارسال مجدد کنید"}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    // اگر قبلاً تأیید شده باشه
    if (verificationToken.user.isEmailVerified) {
      const userLocale = verificationToken.user.preferredLocale || "fa";
      redirect(`/${userLocale}/auth?verified=true`);
    }

    // تأیید موفق
    await prisma.$transaction([
      prisma.user.update({
        where: { id: verificationToken.userId },
        data: { isEmailVerified: true },
      }),
      prisma.verificationToken.delete({ where: { token } }),
    ]);

    const userLocale = verificationToken.user.preferredLocale || "fa";
    redirect(`/${userLocale}/auth?verified=true`);

  } catch (error: any) {
    // فقط خطاهای واقعی رو بگیر — NEXT_REDIRECT رو نگیر
    if (error?.digest?.includes("NEXT_REDIRECT")) {
      throw error;
    }

    console.error("[VERIFY EMAIL PAGE] خطای غیرمنتظره:", error);

    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-accent/20 to-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md shadow-2xl border-border/50">
          <CardHeader className="text-center pb-8">
            <AlertCircle className="size-20 mx-auto text-destructive mb-6" />
            <CardTitle className="text-3xl md:text-4xl font-black text-destructive">
              {t("server_error") || "خطای سرور"}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-6">
            <CardDescription className="text-lg leading-relaxed">
              {t("server_error_desc") || "مشکلی در پردازش درخواست پیش آمد. لطفاً دوباره تلاش کنید."}
            </CardDescription>
            <Button asChild size="lg" className="w-full max-w-xs mx-auto">
              <Link href="/auth">{t("back_to_login") || "بازگشت به ورود"}</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }
}