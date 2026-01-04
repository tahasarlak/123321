// src/app/[locale]/support/page.tsx
import { getTranslations } from "next-intl/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/[locale]/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/db/prisma";
import { Metadata } from "next";
import Link from "next/link";
import { MessageCircle, HeadphonesIcon, Clock, CheckCircle } from "lucide-react";
import SupportChatWidget from "@/components/support/SupportChatWidget";
import { cn } from "@/lib/utils/cn";

type Props = {
  params: { locale: string };
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = params;
  const t = await getTranslations({ locale, namespace: "support" });

  return {
    title: t("title") || "پشتیبانی و تیکت | روم آکادمی",
    description: t("description") || "هر سوالی دارید، ما اینجاییم تا کمکتون کنیم",
  };
}

type TicketWithMessages = {
  id: string;
  title: string;
  status: "OPEN" | "PENDING" | "RESOLVED" | "CLOSED";
  messages: {
    id: string;
    content: string;
    sender: "USER" | "SUPPORT" | "AI";
    isAI: boolean;
    createdAt: Date;
  }[];
};

export default async function SupportPage({ params }: Props) {
  const { locale } = params;
  const t = await getTranslations({ locale, namespace: "support" });
  const isRTL = locale === "fa";

  const session = await getServerSession(authOptions);

  let tickets: TicketWithMessages[] = [];

  if (session?.user?.id) {
    tickets = await prisma.ticket.findMany({
      where: { userId: session.user.id },
      include: { messages: { orderBy: { createdAt: "asc" } } },
      orderBy: { updatedAt: "desc" },
    });
  }

  return (
    <div className="container mx-auto px-6 py-32 max-w-7xl">
      {/* هدر */}
      <div className="text-center mb-24">
        <h1 className="text-7xl md:text-9xl font-black mb-8 bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
          {t("title") || "پشتیبانی و تیکت"}
        </h1>
        <p className="text-3xl md:text-4xl text-foreground/70">
          {t("subtitle") || "هر سوالی دارید، ما اینجاییم تا کمکتون کنیم"}
        </p>
      </div>

      <div className="grid lg:grid-cols-3 gap-12">
        {/* لیست تیکت‌ها */}
        <div className="lg:col-span-2 space-y-12">
          {session ? (
            tickets.length === 0 ? (
              <div className="bg-card/90 backdrop-blur-2xl rounded-3xl shadow-3xl p-20 text-center border border-border/50">
                <MessageCircle size={120} className="mx-auto mb-12 text-primary/50" />
                <p className="text-5xl font-black text-foreground/70 mb-8">
                  {t("no_tickets") || "هنوز تیکتی ثبت نکرده‌اید"}
                </p>
                <p className="text-3xl text-muted-foreground">
                  {t("use_chat") || "از چت زنده یا هوش مصنوعی در سمت راست استفاده کنید"}
                </p>
              </div>
            ) : (
              tickets.map((ticket) => (
                <div
                  key={ticket.id}
                  className="bg-card/90 backdrop-blur-2xl rounded-3xl shadow-3xl p-12 border border-border/50"
                >
                  <div className="flex items-center justify-between mb-8">
                    <h3 className="text-4xl font-black text-foreground">{ticket.title}</h3>
                    <div
                      className={cn(
                        "px-8 py-4 rounded-full text-2xl font-black shadow-lg",
                        ticket.status === "OPEN"
                          ? "bg-orange-500 text-white"
                          : ticket.status === "RESOLVED"
                          ? "bg-emerald-500 text-white"
                          : "bg-muted text-muted-foreground"
                      )}
                    >
                      {ticket.status === "OPEN"
                        ? t("open") || "باز"
                        : ticket.status === "RESOLVED"
                        ? t("resolved") || "حل شده"
                        : t("closed") || "بسته"}
                    </div>
                  </div>
                  <div className="space-y-8">
                    {ticket.messages.map((msg) => (
                      <div
                        key={msg.id}
                        className={cn(
                          "p-8 rounded-3xl max-w-3xl shadow-lg",
                          msg.sender === "USER"
                            ? "bg-primary/10 ml-auto border border-primary/20"
                            : "bg-muted/50 mr-auto border border-border/30"
                        )}
                      >
                        <div className="flex items-center gap-4 mb-4">
                          {msg.isAI ? (
                            <HeadphonesIcon size={40} className="text-primary" />
                          ) : msg.sender === "USER" ? (
                            <div className="w-12 h-12 bg-gradient-to-br from-primary to-secondary rounded-full flex items-center justify-center text-white font-black text-2xl">
                              {session?.user?.name?.[0] || "م"}
                            </div>
                          ) : (
                            <HeadphonesIcon size={40} className="text-success" />
                          )}
                          <div>
                            <p className="text-2xl font-bold text-foreground">
                              {msg.isAI
                                ? t("ai") || "🤖 هوش مصنوعی"
                                : msg.sender === "USER"
                                ? t("you") || "شما"
                                : t("support") || "پشتیبانی"}
                            </p>
                            <p className="text-lg text-muted-foreground flex items-center gap-2">
                              <Clock size={24} />
                              {new Date(msg.createdAt).toLocaleString(locale === "fa" ? "fa-IR" : locale)}
                            </p>
                          </div>
                        </div>
                        <p className="text-2xl text-foreground leading-relaxed">{msg.content}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            )
          ) : (
            <div className="bg-card/90 backdrop-blur-2xl rounded-3xl shadow-3xl p-20 text-center border border-border/50">
              <MessageCircle size={120} className="mx-auto mb-12 text-primary/50" />
              <p className="text-5xl font-black text-foreground/70 mb-8">
                {t("login_required") || "برای مشاهده تیکت‌ها وارد شوید"}
              </p>
              <Link
                href="/auth"
                className="inline-block bg-gradient-to-r from-primary to-secondary text-white px-20 py-12 rounded-3xl text-4xl font-black hover:scale-105 transition shadow-3xl"
              >
                {t("login") || "ورود / ثبت‌نام"}
              </Link>
            </div>
          )}
        </div>

        {/* ویجت چت زنده + هوش مصنوعی */}
        <div className="lg:sticky lg:top-32 h-fit">
          <SupportChatWidget />
        </div>
      </div>
    </div>
  );
}