// src/app/layout.tsx
import "./globals.css";
import { Toaster } from "sonner";
import { ThemeProvider } from "@/components/providers/ThemeProvider";
import SessionProvider from "@/components/providers/SessionProvider";
import QueryProvider from "@/components/providers/QueryProvider"; // اگر react-query استفاده می‌کنی (اختیاری)

export const metadata = {
  title: "روم آکادمی",
  description: "بزرگ‌ترین پلتفرم آموزش و فروشگاه دندانپزشکی ایران",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fa" dir="rtl" suppressHydrationWarning>
      <body className="min-h-screen bg-background text-foreground antialiased">
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <SessionProvider>
            <QueryProvider> {/* اگر react-query داری — اختیاری */}
              {children}
              <Toaster position="top-center" richColors closeButton duration={5000} />
            </QueryProvider>
          </SessionProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}