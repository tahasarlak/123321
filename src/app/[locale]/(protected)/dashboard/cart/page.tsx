// src/app/cart/page.tsx
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db/prisma";
import { authOptions } from "@/app/[locale]/api/auth/[...nextauth]/route";
import Link from "next/link";
import Image from "next/image";
import { Trash2, CreditCard, Smartphone } from "lucide-react";
import SuggestedProducts from "@/components/product/SuggestedProducts";


export default async function CartPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/auth");

  const cart = await prisma.cart.findUnique({
    where: { userId: session.user.id },
    include: {
      items: {
        include: {
          product: {
            select: {
              id: true,
              title: true,
              price: true,
              image: true,
              stock: true,
              slug: true,
              paymentAccounts: {
                where: { isActive: true },
                orderBy: { priority: "desc" },
                take: 1,
                select: {
                  type: true,
                  cardNumber: true,
                  iban: true,
                  holderName: true,
                  bankName: true,
                },
              },
            },
          },
          course: {
            select: {
              id: true,
              title: true,
              price: true,
              image: true,
              slug: true,
              paymentAccounts: {
                where: { isActive: true },
                orderBy: { priority: "desc" },
                take: 1,
                select: {
                  type: true,
                  cardNumber: true,
                  iban: true,
                  holderName: true,
                  bankName: true,
                },
              },
            },
          },
        },
      },
    },
  });

  if (!cart || cart.items.length === 0) {
    return (
      <div className="container mx-auto px-6 py-32 text-center">
        <div className="mx-auto max-w-2xl">
          <h1 className="text-6xl md:text-8xl font-black mb-8 bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
            سبد خرید خالیه
          </h1>
          <p className="text-2xl text-muted-foreground mb-12">
            هنوز چیزی انتخاب نکردی، بریم یه چیزی بترکونیم؟
          </p>
          <div className="flex flex-col sm:flex-row gap-6 justify-center">
            <Link
              href="/courses"
              className="inline-flex items-center justify-center gap-4 bg-gradient-to-r from-primary to-secondary text-white px-12 py-6 rounded-3xl text-2xl font-black hover:shadow-2xl transform hover:scale-105 transition"
            >
              دوره‌های آموزشی
            </Link>
            <Link
              href="/products"
              className="inline-flex items-center justify-center gap-4 bg-gradient-to-r from-pink-600 to-rose-600 text-white px-12 py-6 rounded-3xl text-2xl font-black hover:shadow-2xl transform hover:scale-105 transition"
            >
              محصولات فیزیکی
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // گروه‌بندی بر اساس روش پرداخت
  const paymentGroups = cart.items.reduce((groups, item) => {
    const data = item.product || item.course;
    if (!data) return groups;

    const price = Number(data.price || 0);
    const totalPrice = price * item.quantity;

    const account = data.paymentAccounts?.[0];
    const identifier = account?.cardNumber || account?.iban || "";
    const key = account
      ? `${account.type}-${identifier}-${account.holderName}`
      : "online-gateway";

    if (!groups[key]) {
      groups[key] = {
        account,
        items: [],
        total: 0,
      };
    }

    groups[key].items.push({
      id: item.id,
      title: data.title,
      image: data.image || "/placeholder.jpg",
      price,
      quantity: item.quantity,
      totalPrice,
      slug: data.slug,
      type: item.product ? "product" : "course",
      stock: (item.product as any)?.stock || Infinity,
    });

    groups[key].total += totalPrice;
    return groups;
  }, {} as Record<string, { account: any; items: any[]; total: number }>);

  const grandTotal = Object.values(paymentGroups).reduce((sum, g) => sum + g.total, 0);

  return (
    <div className="container mx-auto px-6 py-16 md:py-24 max-w-7xl">
      <h1 className="text-5xl md:text-8xl font-black text-center mb-16 bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
        سبد خرید شما
      </h1>

      <div className="grid lg:grid-cols-3 gap-12">
        {/* لیست آیتم‌ها */}
        <div className="lg:col-span-2 space-y-12">
          {Object.entries(paymentGroups).map(([key, group]) => (
            <div
              key={key}
              className={`rounded-3xl shadow-2xl overflow-hidden border border-border/50 ${
                group.account?.type === "CARD_TO_CARD"
                  ? "bg-gradient-to-br from-amber-50 to-orange-100"
                  : "bg-gradient-to-br from-primary/10 to-secondary/10"
              }`}
            >
              <div className="p-8">
                <div className="flex items-center justify-between mb-8">
                  <h2 className="text-3xl md:text-4xl font-black flex items-center gap-4 text-foreground">
                    {group.account ? (
                      <>
                        <CreditCard className="w-10 h-10 text-amber-600" />
                        <span>پرداخت کارت به کارت</span>
                      </>
                    ) : (
                      <>
                        <Smartphone className="w-10 h-10 text-primary" />
                        <span>پرداخت آنلاین</span>
                      </>
                    )}
                  </h2>
                  <span className="text-2xl font-bold text-primary">
                    {group.total.toLocaleString("fa-IR")} تومان
                  </span>
                </div>

                {/* اطلاعات کارت */}
                {group.account && group.account.type === "CARD_TO_CARD" && (
                  <div className="mb-10 p-8 bg-card/90 backdrop-blur-lg rounded-3xl border-4 border-dashed border-amber-300">
                    <p className="text-2xl font-black text-amber-700 mb-6 text-center">
                      اطلاعات واریز کارت به کارت
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="text-center p-6 bg-gradient-to-r from-amber-100 to-orange-100 rounded-2xl">
                        <p className="text-muted-foreground mb-2">شماره کارت</p>
                        <p className="text-2xl font-black text-amber-700 dir-ltr">
                          {formatCardNumber(group.account.cardNumber)}
                        </p>
                      </div>
                      <div className="text-center p-6 bg-gradient-to-r from-purple-100 to-pink-100 rounded-2xl">
                        <p className="text-muted-foreground mb-2">به نام</p>
                        <p className="text-xl font-bold">
                          {group.account.holderName || "روم آکادمی"}
                        </p>
                      </div>
                      {group.account.bankName && (
                        <div className="text-center p-6 bg-gradient-to-r from-pink-100 to-rose-100 rounded-2xl">
                          <p className="text-muted-foreground mb-2">بانک</p>
                          <p className="text-xl font-bold">{group.account.bankName}</p>
                        </div>
                      )}
                    </div>
                    <p className="mt-6 text-center text-amber-800 font-bold text-lg bg-amber-100 py-3 rounded-2xl">
                      دقیقاً مبلغ {group.total.toLocaleString("fa-IR")} تومان واریز کنید
                    </p>
                  </div>
                )}

                {/* آیتم‌ها */}
                <div className="space-y-6">
                  {group.items.map((item) => (
                    <CartItem key={item.id} item={item} />
                  ))}
                </div>

                {/* درگاه پرداخت آنلاین */}
                {!group.account && (
                  <div className="mt-10 p-8 bg-gradient-to-r from-emerald-50 to-teal-50 rounded-3xl text-center border-4 border-dashed border-emerald-300">
                    <p className="text-2xl font-black text-emerald-700 mb-6">
                      پرداخت امن از طریق درگاه بانکی
                    </p>
                    <form action="/api/checkout" method="POST">
                      <input type="hidden" name="groupKey" value={key} />
                      <button className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 text-white py-6 rounded-2xl text-2xl font-black hover:shadow-2xl transform hover:scale-105 transition">
                        پرداخت {group.total.toLocaleString("fa-IR")} تومان
                      </button>
                    </form>
                  </div>
                )}
              </div>
            </div>
          ))}

          <SuggestedProducts />
        </div>

        {/* جمع کل */}
        <div className="lg:sticky lg:top-24 h-fit">
          <div className="bg-card rounded-3xl shadow-2xl p-10 border border-border/50">
            <h2 className="text-4xl font-black text-center mb-10 text-foreground">جمع کل سفارش</h2>
            <div className="space-y-6 mb-8">
              {Object.entries(paymentGroups).map(([key, group]) => (
                <div key={key} className="flex justify-between text-xl">
                  <span className="text-muted-foreground">
                    {group.account
                      ? `کارت ${formatCardNumber(group.account.cardNumber || group.account.iban)}`
                      : "درگاه آنلاین"}
                  </span>
                  <strong className="text-primary font-bold">
                    {group.total.toLocaleString("fa-IR")} تومان
                  </strong>
                </div>
              ))}
            </div>
            <div className="border-t-4 border-dashed border-border/30 pt-8">
              <div className="flex justify-between items-center text-4xl font-black">
                <span className="text-foreground">مبلغ نهایی:</span>
                <strong className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-secondary">
                  {grandTotal.toLocaleString("fa-IR")} تومان
                </strong>
              </div>
            </div>
            <p className="mt-8 text-center text-muted-foreground font-medium leading-relaxed">
              بعد از واریز وجه، سفارش شما به صورت خودکار تأیید و دسترسی‌ها فعال میشه
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// کامپوننت آیتم سبد
function CartItem({ item }: { item: any }) {
  return (
    <div className="bg-card rounded-3xl shadow-xl overflow-hidden hover:shadow-2xl transition-all group border border-border/30">
      <div className="flex items-center p-6">
        <Image
          src={item.image}
          alt={item.title}
          width={120}
          height={120}
          className="rounded-2xl object-cover shadow-lg"
        />
        <div className="flex-1 px-8">
          <h3 className="text-2xl font-black mb-3 text-foreground">{item.title}</h3>
          <div className="flex items-center gap-6 text-lg text-muted-foreground">
            <span>تعداد: <strong className="text-primary">{item.quantity}</strong></span>
            <span>×</span>
            <span>{item.price.toLocaleString("fa-IR")} تومان</span>
          </div>
          <p className="text-3xl font-black text-primary mt-4">
            {item.totalPrice.toLocaleString("fa-IR")} تومان
          </p>
        </div>
        <form action="/api/cart/delete" method="POST" className="self-start">
          <input type="hidden" name="itemId" value={item.id} />
          <button
            type="submit"
            className="p-4 bg-destructive/20 text-destructive rounded-2xl hover:bg-destructive/40 transition group"
          >
            <Trash2 className="w-6 h-6 group-hover:scale-110 transition" />
          </button>
        </form>
      </div>
    </div>
  );
}

// فرمت کارت
function formatCardNumber(card: string | null | undefined) {
  if (!card) return "—";
  return card.replace(/\D/g, "").replace(/(\d{4})(?=\d)/g, "$1 ").trim();
}