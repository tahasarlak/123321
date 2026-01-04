import { Suspense } from "react";
import CreateCourseContent from "../CreateCourseContent";
import { cookies } from "next/headers"; // هنوز نگه دار تا dynamic بمونه

export default function CreateCoursePage() {
  cookies(); // force dynamic

  return (
    <div className="container mx-auto px-6 py-20 max-w-7xl">
      <Suspense fallback={<LoadingSkeleton />}>
        <CreateCourseContent />
      </Suspense>
    </div>
  );
}

// یک skeleton ساده برای زمان لودینگ (اختیاری اما توصیه می‌شه)
function LoadingSkeleton() {
  return (
    <div className="text-center py-20">
      <h1 className="text-5xl font-bold text-foreground/50">در حال بارگذاری...</h1>
      <p className="mt-8 text-xl text-muted-foreground">در حال بررسی دسترسی و بارگذاری فرم...</p>
    </div>
  );
}