// src/app/[locale]/ClientLayout.tsx
"use client";

import { useLocale } from "next-intl";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import SupportChatWidget from "@/components/support/SupportChatWidget";

export default function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const locale = useLocale();
  const dir = locale === "fa" ? "rtl" : "ltr";

  return (
    <div dir={dir} className="flex min-h-screen flex-col bg-background text-foreground">
      <Header />
      <main className="flex-1 pt-20 pb-32">{children}</main>
      <Footer />
      <SupportChatWidget />
    </div>
  );
}