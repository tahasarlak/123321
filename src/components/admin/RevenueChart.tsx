"use client";

interface RevenueChartProps {
  data: { date: string; درآمد: number }[];
}

export default function RevenueChart({ data }: RevenueChartProps) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-96 text-muted-foreground text-xl">
        داده‌ای برای نمایش وجود ندارد
      </div>
    );
  }

  const maxValue = Math.max(...data.map((item) => item.درآمد));
  const minValue = Math.min(...data.map((item) => item.درآمد));
  const range = maxValue - minValue || 1;

  // نقاط برای مسیر SVG
  const points = data
    .map((item, i) => {
      const x = (i / (data.length - 1)) * 100;
      const y = 100 - ((item.درآمد - minValue) / range) * 100;
      return `${x},${y}`;
    })
    .join(" ");

  const formatter = new Intl.NumberFormat("fa-IR", {
    style: "currency",
    currency: "IRR",
    minimumFractionDigits: 0,
  });

  return (
    <div className="h-96 w-full relative">
      <svg viewBox="0 0 100 100" className="w-full h-full">
        {/* گرید افقی */}
        {[0, 25, 50, 75, 100].map((y) => (
          <line
            key={y}
            x1="0"
            y1={y}
            x2="100"
            y2={y}
            stroke="#374151"
            strokeDasharray="3,3"
          />
        ))}

        {/* خط چارت */}
        <polyline
          fill="none"
          stroke="#10b981"
          strokeWidth="3"
          points={points}
        />

        {/* پر کردن زیر خط */}
        <polyline
          fill="rgba(16, 185, 129, 0.2)"
          points={`0,100 ${points} 100,100`}
        />

        {/* نقاط */}
        {data.map((item, i) => {
          const x = (i / (data.length - 1)) * 100;
          const y = 100 - ((item.درآمد - minValue) / range) * 100;
          return (
            <circle
              key={i}
              cx={x}
              cy={y}
              r="4"
              fill="#10b981"
              className="hover:r-6 transition-all"
            >
              <title>{item.date}: {formatter.format(item.درآمد)}</title>
            </circle>
          );
        })}
      </svg>

      {/* لیبل‌های محور X (تاریخ‌ها) */}
      <div className="absolute bottom-0 left-0 right-0 flex justify-between px-4 text-sm text-muted-foreground">
        <span>{data[0]?.date}</span>
        <span>{data[Math.floor(data.length / 2)]?.date}</span>
        <span>{data[data.length - 1]?.date}</span>
      </div>

      {/* مجموع درآمد */}
      <div className="absolute top-4 right-4 bg-background/80 backdrop-blur rounded-xl p-4 shadow-lg">
        <p className="text-sm text-muted-foreground">درآمد کل ۳۰ روز</p>
        <p className="text-2xl font-black text-success">
          {formatter.format(data.reduce((sum, item) => sum + item.درآمد, 0))}
        </p>
      </div>
    </div>
  );
}