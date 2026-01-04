// src/components/product/PriceHistoryBox.tsx
import { FC } from "react";
import { TrendingDown, TrendingUp, Minus } from "lucide-react";
import { format } from "date-fns-jalali";

interface PriceEntry {
  price: number;
  recordedAt: Date;
  discountPercent?: number | null;
}

interface PriceHistoryBoxProps {
  histories: PriceEntry[];
  currency?: string;
  className?: string;
}

const PriceHistoryBox: FC<PriceHistoryBoxProps> = ({
  histories,
  currency = "تومان",
  className = "",
}) => {
  if (histories.length === 0) return null;

  // مرتب‌سازی از جدید به قدیم
  const sorted = [...histories].sort((a, b) => b.recordedAt.getTime() - a.recordedAt.getTime());
  const latest = sorted[0];
  const oldest = sorted[sorted.length - 1];

  const minPrice = Math.min(...histories.map(h => h.price));
  const maxPrice = Math.max(...histories.map(h => h.price));
  const currentPrice = latest.price;

  const trend = currentPrice > oldest.price ? "up" : currentPrice < oldest.price ? "down" : "stable";

  return (
    <div className={`bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden ${className}`}>
      <div className="bg-gradient-to-r from-indigo-600 to-purple-700 text-white p-6">
        <h3 className="text-2xl font-black flex items-center gap-3">
          {trend === "down" && <TrendingDown className="w-8 h-8 text-emerald-300" />}
          {trend === "up" && <TrendingUp className="w-8 h-8 text-rose-300" />}
          {trend === "stable" && <Minus className="w-8 h-8" />}
          تاریخچه قیمت
        </h3>
        <p className="mt-2 text-lg opacity-90">
          {histories.length} تغییر قیمت در {format(oldest.recordedAt, "d MMMM yyyy")} تا امروز
        </p>
      </div>

      <div className="p-8 space-y-6">
        {/* خلاصه آماری */}
        <div className="grid grid-cols-3 gap-6 text-center">
          <div className="bg-rose-50 rounded-2xl py-4">
            <p className="text-rose-600 text-sm font-bold">بالاترین قیمت</p>
            <p className="text-2xl font-black text-rose-700">
              {maxPrice.toLocaleString("fa-IR")} {currency}
            </p>
          </div>
          <div className="bg-emerald-50 rounded-2xl py-4">
            <p className="text-emerald-600 text-sm font-bold">پایین‌ترین قیمت</p>
            <p className="text-2xl font-black text-emerald-700">
              {minPrice.toLocaleString("fa-IR")} {currency}
            </p>
          </div>
          <div className="bg-indigo-50 rounded-2xl py-4">
            <p className="text-indigo-600 text-sm font-bold">قیمت فعلی</p>
            <p className="text-3xl font-black text-indigo-700">
              {currentPrice.toLocaleString("fa-IR")} {currency}
            </p>
          </div>
        </div>

        {/* لیست تاریخچه */}
        <div className="space-y-4 max-h-96 overflow-y-auto">
          {sorted.map((entry, i) => {
            const prev = sorted[i + 1];
            const diff = prev ? entry.price - prev.price : 0;
            const percentChange = prev ? Math.round((diff / prev.price) * 100) : 0;

            return (
              <div
                key={i}
                className="flex items-center justify-between p-5 bg-gray-50 rounded-2xl hover:bg-gray-100 transition-all group"
              >
                <div className="flex items-center gap-4">
                  <div className="text-left">
                    <p className="text-2xl font-bold text-gray-800">
                      {entry.price.toLocaleString("fa-IR")} {currency}
                    </p>
                    {entry.discountPercent && entry.discountPercent > 0 && (
                      <span className="inline-block bg-rose-500 text-white px-3 py-1 rounded-full text-sm font-bold mt-1">
                        −{entry.discountPercent}%
                      </span>
                    )}
                  </div>
                </div>

                <div className="text-right">
                  <p className="text-lg font-semibold text-gray-700">
                    {format(entry.recordedAt, "d MMMM yyyy")}
                  </p>
                  <p className="text-sm text-gray-500">
                    {format(entry.recordedAt, "HH:mm")}
                  </p>
                  {prev && (
                    <p className={`text-sm font-bold mt-1 ${diff < 0 ? "text-emerald-600" : diff > 0 ? "text-rose-600" : "text-gray-400"}`}>
                      {diff < 0 ? "کاهش" : diff > 0 ? "افزایش" : "بدون تغییر"}{" "}
                      {Math.abs(percentChange)}%
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* پیام نهایی جذاب */}
        <div className="text-center pt-6 border-t border-gray-200">
          <p className="text-lg font-bold text-gray-700">
            {trend === "down" && "تبریک! الان بهترین زمان خرید است"}
            {trend === "up" && "قیمت در حال افزایش است — زودتر اقدام کنید!"}
            {trend === "stable" && "قیمت پایدار و مطمئن"}
          </p>
        </div>
      </div>
    </div>
  );
};

export default PriceHistoryBox;