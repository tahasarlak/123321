"use client";

import { useTranslations } from "next-intl"; // ← مستقیم در کلاینت استفاده می‌شه
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { TrendingUp, Users, ShoppingCart, BookOpen, Package, Activity, DollarSign } from "lucide-react";

type AnalyticsData = {
  revenueByDay: { label: string; revenue: number; formatted: string }[];
  totalWeekRevenue: number;
  growthPercent: number;
  totalRevenue: number;
  totalOrders: number;
  totalUsers: number;
  totalCourses: number;
  totalProducts: number;
  avgOrderValue: number;
  topCourses: { title: string; students: number; revenue: number }[];
  topProducts: { title: string; sales: number; revenue: number }[];
};

export default function AnalyticsClient({ data }: { data: AnalyticsData }) {
  const t = useTranslations("admin.analytics"); // ← اینجا ترجمه رو می‌گیریم
  const formatter = new Intl.NumberFormat("fa-IR");

  return (
    <div className="container mx-auto px-6 py-20 max-w-7xl space-y-24">
      {/* کارت‌های اصلی */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12">
        <StatCard icon={DollarSign} title={t("totalRevenue")} value={formatter.format(data.totalRevenue) + " تومان"} gradient="from-emerald-500 to-teal-600" />
        <StatCard icon={ShoppingCart} title={t("totalOrders")} value={formatter.format(data.totalOrders)} gradient="from-blue-500 to-indigo-600" />
        <StatCard icon={Users} title={t("totalUsers")} value={formatter.format(data.totalUsers)} gradient="from-purple-500 to-pink-600" />
        <StatCard
          icon={TrendingUp}
          title={t("weeklyGrowth")}
          value={data.growthPercent >= 0 ? `+%${data.growthPercent.toFixed(1)}` : `${data.growthPercent.toFixed(1)}%`}
          gradient={data.growthPercent >= 0 ? "from-green-500 to-emerald-600" : "from-red-500 to-rose-600"}
        />
      </div>

      {/* چارت درآمد هفتگی */}
      <div className="bg-card rounded-3xl shadow-3xl p-12 lg:p-16 border border-border/50">
        <h2 className="text-5xl md:text-6xl font-black text-center mb-16 text-foreground">
          {t("weeklyRevenueTitle")}
        </h2>
        <div className="h-96">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data.revenueByDay}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="label" stroke="#9CA3AF" fontSize={16} tickLine={false} />
              <YAxis stroke="#9CA3AF" fontSize={16} tickLine={false} />
              <Tooltip
                contentStyle={{ backgroundColor: "#1F2937", border: "none", borderRadius: "16px" }}
                formatter={(value: number) => formatter.format(value) + " تومان"}
              />
              <Bar dataKey="revenue" fill="#10B981" radius={[12, 12, 0, 0]} barSize={50} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="text-center mt-12">
          <p className="text-4xl font-black text-emerald-500">
            {formatter.format(data.totalWeekRevenue)} تومان
          </p>
          <p className="text-2xl text-muted-foreground mt-4">
            {t("totalWeekRevenue")}
          </p>
        </div>
      </div>

      {/* کارت‌های اضافی */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
        <StatCard icon={BookOpen} title={t("publishedCourses")} value={formatter.format(data.totalCourses)} gradient="from-cyan-500 to-blue-600" />
        <StatCard icon={Package} title={t("activeProducts")} value={formatter.format(data.totalProducts)} gradient="from-orange-500 to-red-600" />
        <StatCard icon={Activity} title={t("avgOrderValue")} value={formatter.format(Math.round(data.avgOrderValue)) + " تومان"} gradient="from-violet-500 to-fuchsia-600" />
      </div>

      {/* پرفروش‌ترین‌ها */}
      <div className="grid lg:grid-cols-2 gap-16">
        <div className="bg-card rounded-3xl shadow-3xl p-12 lg:p-16 border border-border/50">
          <h2 className="text-5xl md:text-6xl font-black text-center mb-16 text-foreground">
            {t("topCoursesTitle")}
          </h2>
          <div className="space-y-8">
            {data.topCourses.length === 0 ? (
              <p className="text-center text-muted-foreground text-2xl py-20">{t("noData")}</p>
            ) : (
              data.topCourses.map((course, index) => (
                <div key={index} className="flex items-center justify-between p-10 bg-gradient-to-r from-primary/5 to-secondary/10 rounded-3xl hover:shadow-2xl transition-all duration-300">
                  <div className="flex items-center gap-8">
                    <div className="w-24 h-24 bg-gradient-to-br from-primary to-secondary text-white rounded-3xl flex items-center justify-center text-5xl font-black shadow-2xl">
                      {index + 1}
                    </div>
                    <div>
                      <p className="text-3xl md:text-4xl font-black text-foreground">{course.title}</p>
                      <p className="text-xl text-muted-foreground mt-3">{course.students} دانشجو</p>
                    </div>
                  </div>
                  <p className="text-4xl font-black text-success">{formatter.format(course.revenue)} تومان</p>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="bg-card rounded-3xl shadow-3xl p-12 lg:p-16 border border-border/50">
          <h2 className="text-5xl md:text-6xl font-black text-center mb-16 text-foreground">
            {t("topProductsTitle")}
          </h2>
          <div className="space-y-8">
            {data.topProducts.length === 0 ? (
              <p className="text-center text-muted-foreground text-2xl py-20">{t("noData")}</p>
            ) : (
              data.topProducts.map((product, index) => (
                <div key={index} className="flex items-center justify-between p-10 bg-gradient-to-r from-emerald-500/10 to-teal-600/10 rounded-3xl hover:shadow-2xl transition-all duration-300">
                  <div className="flex items-center gap-8">
                    <div className="w-24 h-24 bg-gradient-to-br from-emerald-500 to-teal-600 text-white rounded-3xl flex items-center justify-center text-5xl font-black shadow-2xl">
                      {index + 1}
                    </div>
                    <div>
                      <p className="text-3xl md:text-4xl font-black text-foreground">{product.title}</p>
                      <p className="text-xl text-muted-foreground mt-3">{product.sales} فروش</p>
                    </div>
                  </div>
                  <p className="text-4xl font-black text-emerald-600">{formatter.format(product.revenue)} تومان</p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, title, value, gradient }: { icon: any; title: string; value: string; gradient: string }) {
  return (
    <div className={`relative bg-gradient-to-br ${gradient} text-white rounded-3xl p-12 shadow-2xl overflow-hidden transition-all duration-500 hover:scale-105 hover:shadow-3xl group`}>
      <div className="absolute inset-0 bg-white/10 group-hover:bg-white/20 transition" />
      <div className="relative z-10">
        <Icon className="w-20 h-20 mb-8 opacity-90" />
        <p className="text-6xl md:text-7xl font-black">{value}</p>
        <p className="text-2xl md:text-3xl mt-6 opacity-90">{title}</p>
      </div>
    </div>
  );
}