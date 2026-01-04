// src/app/[locale]/(auth)/AuthLayout.tsx
"use client";

import { useTranslations } from "next-intl";
import { CheckCircle } from "lucide-react";

type AuthLayoutProps = {
  children: React.ReactNode;
  isLogin: boolean;
};

export default function AuthLayout({ children, isLogin }: AuthLayoutProps) {
  const tb = useTranslations("branding");

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-accent/20 to-background flex flex-col items-center justify-center p-4">
      {/* برندینگ موبایل */}
      <div className="lg:hidden w-full max-w-md mb-8 text-center">
        <h1 className="text-4xl font-black text-foreground mb-3">{tb("title")}</h1>
        <p className="text-xl font-bold text-muted-foreground">{tb("subtitle")}</p>
      </div>

      <div className="w-full max-w-5xl grid lg:grid-cols-2 bg-card rounded-3xl shadow-2xl overflow-hidden border border-border/50">
        {/* برندینگ دسکتاپ */}
        <div className="hidden lg:flex flex-col justify-center p-12 bg-gradient-to-br from-primary to-secondary text-white">
          <h1 className="text-5xl xl:text-6xl font-black mb-6">{tb("title")}</h1>
          <p className="text-2xl xl:text-3xl font-bold mb-10">{tb("subtitle")}</p>
          <ul className="space-y-5 text-xl">
            <li className="flex items-center gap-4"><CheckCircle size={36} /> {tb("feature1")}</li>
            <li className="flex items-center gap-4"><CheckCircle size={36} /> {tb("feature2")}</li>
            <li className="flex items-center gap-4"><CheckCircle size={36} /> {tb("feature3")}</li>
            <li className="flex items-center gap-4"><CheckCircle size={36} /> {tb("feature4")}</li>
          </ul>
        </div>

        {/* فرم‌ها */}
        <div className="p-8 md:p-12 lg:p-16">
          {children}
        </div>
      </div>
    </div>
  );
}