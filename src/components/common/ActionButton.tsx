// src/components/common/ActionButton.tsx
import { cn } from "@/lib/utils/cn";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

interface ActionButtonProps {
  type: "cart" | "enroll" | "buy" | "download" | "waitlist";
  disabled?: boolean;
  loading?: boolean;
  onClick?: () => void;
  className?: string;
}

export default function ActionButton({
  type,
  disabled = false,
  loading = false,
  onClick,
  className,
}: ActionButtonProps) {
  const configs = {
    cart: { text: "افزودن به سبد خرید", gradient: "from-emerald-600 to-teal-600" },
    enroll: { text: "ثبت‌نام در دوره", gradient: "from-purple-600 to-pink-600" },
    buy: { text: "خرید فوری", gradient: "from-amber-500 to-orange-600" },
    download: { text: "دانلود فایل", gradient: "from-blue-600 to-cyan-600" },
    waitlist: { text: "اعلام موجودی", gradient: "from-gray-600 to-gray-800" },
  };

  const config = configs[type];

  return (
    <Button
      onClick={onClick}
      disabled={disabled || loading}
      className={cn(
        "w-full py-9 rounded-full text-3xl font-black text-white shadow-2xl hover:scale-105 transition-all disabled:opacity-50 disabled:cursor-not-allowed",
        config.gradient,
        className
      )}
    >
      {loading ? <Loader2 className="animate-spin mx-auto" size={36} /> : config.text}
    </Button>
  );
}