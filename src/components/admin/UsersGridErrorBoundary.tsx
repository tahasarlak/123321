// src/components/admin/UsersGridErrorBoundary.tsx
'use client';

import { Component, ErrorInfo, ReactNode } from "react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode; // اختیاری: می‌تونی fallback سفارشی بدی
}

interface State {
  hasError: boolean;
}

/**
 * Error Boundary مخصوص بخش UsersGrid در صفحه ادمین کاربران
 * اگر در بارگذاری کاربران (از Prisma یا cache) خطایی رخ بده، این کامپوننت فعال می‌شه
 */
export default class UsersGridErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
  };

  // وقتی خطایی در فرزندها رخ بده، این متد فراخوانی می‌شه
  public static getDerivedStateFromError(_: Error): State {
    return { hasError: true };
  }

  // برای لاگ کردن خطا (اختیاری — می‌تونی به Sentry یا سرویس دیگه بفرستی)
  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("UsersGrid Error Boundary caught an error:", error, errorInfo);
    // اگر از Sentry یا LogRocket استفاده می‌کنی، اینجا لاگ کن
    // Sentry.captureException(error);
  }

  public render() {
    if (this.state.hasError) {
      // می‌تونی fallback سفارشی از props بگیری، وگرنه fallback پیش‌فرض نشون بده
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex flex-col items-center justify-center py-20 space-y-6">
          <h2 className="text-2xl font-bold text-destructive">
            خطا در بارگذاری کاربران
          </h2>
          <p className="text-muted-foreground text-center max-w-md">
            مشکلی در دریافت اطلاعات کاربران پیش آمد. لطفاً صفحه را رفرش کنید یا دوباره تلاش کنید.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition shadow-md"
          >
            رفرش صفحه
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}