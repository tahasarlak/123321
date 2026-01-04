// src/components/providers/NextIntlClientProvider.tsx
"use client";

import { NextIntlClientProvider } from "next-intl";

type Props = {
  children: React.ReactNode;
  messages: Record<string, any>;
  locale: string;
};

export default function IntlClientProvider({ children, messages, locale }: Props) {
  return (
    <NextIntlClientProvider locale={locale} messages={messages} timeZone="Asia/Tehran">
      {children}
    </NextIntlClientProvider>
  );
}