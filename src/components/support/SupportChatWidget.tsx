// src/components/support/SupportChatWidget.tsx
"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { MessageCircle, Send, X, Bot } from "lucide-react";
import { toast } from "sonner";
import { useSession } from "next-auth/react";
import { useTranslations, useLocale } from "next-intl";
import { cn } from "@/lib/utils/cn";
import { useRealtime } from "@/lib/hooks/useRealtime";

interface Message {
  content: string;
  isAI: boolean;
  createdAt: Date;
}

export default function SupportChatWidget() {
  const t = useTranslations("supportChat");
  const locale = useLocale();
  const isRTL = locale === "fa";

  const { data: session, status } = useSession();
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const socket = useRealtime(session?.user?.id);

  // Load chat history when opened
  useEffect(() => {
    if (open && session?.user?.id && messages.length === 0) {
      fetch(`/api/support/chat?userId=${session.user.id}`, { cache: "no-store" })
        .then((r) => r.json())
        .then((data) => setMessages(data || []))
        .catch(() => toast.error(t("historyError") || "خطا در بارگذاری تاریخچه"));
    }
  }, [open, session?.user?.id, t, messages.length]);

  // Realtime AI response
  useEffect(() => {
    if (!socket || !session?.user?.id) return;

    const handler = (data: { content: string }) => {
      setMessages((prev) => [
        ...prev,
        {
          content: data.content,
          isAI: true,
          createdAt: new Date(),
        },
      ]);
      setLoading(false);
    };

    socket.on("support:message", handler);

    return () => {
      socket.off("support:message", handler);
    };
  }, [socket, session?.user?.id]);

  // Auto scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const sendMessage = async () => {
    if (!message.trim() || loading) return;

    const userMsg: Message = {
      content: message.trim(),
      isAI: false,
      createdAt: new Date(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setMessage("");
    setLoading(true);

    try {
      const res = await fetch("/api/support/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: session?.user?.id,
          message: userMsg.content,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || t("sendError") || "خطا در ارسال پیام");
        setMessages((prev) => prev.slice(0, -1)); // rollback
        setLoading(false);
      }
      // AI response will come via socket
    } catch {
      toast.error(t("serverError") || "مشکل ارتباط با سرور");
      setMessages((prev) => prev.slice(0, -1));
      setLoading(false);
    }
  };

  const userName = session?.user?.name?.split(" ")[0] || t("you") || "شما";

  // Not authenticated
  if (status !== "authenticated") {
    return (
      <button
        onClick={() => toast.error(t("loginRequired") || "برای چت لطفاً وارد شوید")}
        className="fixed bottom-8 left-8 z-50 group md:bottom-12 md:left-12"
        aria-label={t("loginRequired")}
      >
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-r from-primary to-secondary rounded-full blur-xl opacity-70 group-hover:opacity-100 transition" />
          <div className="relative bg-gradient-to-r from-primary to-secondary text-white p-6 rounded-full shadow-3xl hover:scale-110 transition-all">
            <MessageCircle size={48} />
          </div>
        </div>
      </button>
    );
  }

  return (
    <>
      {/* Toggle Button */}
      <button
        onClick={() => setOpen(!open)}
        className="fixed bottom-8 left-8 z-50 group md:bottom-12 md:left-12"
        aria-label={t("title") || "پشتیبانی آنلاین"}
      >
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-r from-primary to-secondary rounded-full blur-xl opacity-70 group-hover:opacity-100 transition animate-pulse" />
          <div className="relative bg-gradient-to-r from-primary to-secondary text-white p-6 rounded-full shadow-3xl hover:scale-110 transition-all">
            <MessageCircle size={48} />
          </div>
          <div className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-8 h-8 flex items-center justify-center text-sm font-black animate-pulse">
            !
          </div>
        </div>
      </button>

      {/* Chat Window */}
      {open && (
        <div
          className={cn(
            "fixed bottom-28 left-8 z-50 w-96 h-[600px] md:bottom-32 md:left-12 bg-card/95 backdrop-blur-3xl rounded-3xl shadow-5xl overflow-hidden border border-border/50 flex flex-col md:w-[420px]",
            isRTL && "left-auto right-8 md:right-12"
          )}
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-primary to-secondary text-white p-6 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Bot size={40} />
              <div>
                <h3 className="text-3xl font-black">{t("title") || "پشتیبانی آنلاین"}</h3>
                <p className="text-lg opacity-90">{t("online") || "آنلاین و آماده کمک"}</p>
              </div>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="hover:bg-white/20 p-3 rounded-full transition"
              aria-label={t("close") || "بستن"}
            >
              <X size={32} />
            </button>
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-8 space-y-6 bg-background/50" role="log" aria-live="polite">
            {messages.length === 0 && !loading ? (
              <div className="text-center text-muted-foreground py-20">
                <Bot size={80} className="mx-auto mb-6 opacity-50" />
                <p className="text-2xl">{t("welcome", { name: userName })}</p>
                <p className="text-xl mt-4">{t("help") || "چطور می‌تونم کمکتون کنم؟"}</p>
              </div>
            ) : (
              messages.map((msg, i) => (
                <div
                  key={i}
                  className={cn(
                    "flex items-start gap-4 max-w-[80%]",
                    msg.isAI ? (isRTL ? "ml-auto flex-row-reverse" : "mr-auto") : (isRTL ? "mr-auto" : "ml-auto flex-row-reverse")
                  )}
                >
                  <div className="relative w-14 h-14 rounded-full shadow-lg overflow-hidden ring-4 ring-background">
                    {msg.isAI ? (
                      <div className="bg-gradient-to-br from-violet-500 to-purple-600 w-full h-full flex items-center justify-center">
                        <Bot size={32} className="text-white" />
                      </div>
                    ) : (
                      <Image
                        src={session.user?.image || `https://ui-avatars.com/api/?name=${session.user?.name}&background=random`}
                        alt={userName}
                        width={56}
                        height={56}
                        className="object-cover"
                        placeholder="blur"
                        blurDataURL="/placeholder-avatar.png"
                      />
                    )}
                  </div>
                  <div
                    className={cn(
                      "p-6 rounded-3xl shadow-lg",
                      msg.isAI ? "bg-muted/50 border border-border/30" : "bg-gradient-to-br from-primary/10 to-secondary/10 border border-primary/20"
                    )}
                  >
                    <p className="text-xl leading-relaxed text-foreground">{msg.content}</p>
                    <p className="text-sm text-muted-foreground mt-3">
                      {new Date(msg.createdAt).toLocaleTimeString(locale === "fa" ? "fa-IR" : locale, {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                </div>
              ))
            )}

            {/* Typing indicator */}
            {loading && (
              <div className={cn("flex items-center gap-4", isRTL ? "ml-auto flex-row-reverse" : "mr-auto")}>
                <div className="w-14 h-14 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
                  <Bot size={32} className="text-white" />
                </div>
                <div className="bg-muted/50 p-6 rounded-3xl flex gap-2">
                  <span className="w-3 h-3 bg-muted-foreground/50 rounded-full animate-bounce" />
                  <span className="w-3 h-3 bg-muted-foreground/50 rounded-full animate-bounce delay-100" />
                  <span className="w-3 h-3 bg-muted-foreground/50 rounded-full animate-bounce delay-200" />
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="p-6 border-t border-border/30 bg-card">
            <div className="flex items-center gap-4">
              <input
                type="text"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    sendMessage();
                  }
                }}
                placeholder={t("placeholder") || "پیام خود را بنویسید..."}
                className="flex-1 px-8 py-6 rounded-full bg-muted/50 text-xl focus:outline-none focus:ring-4 focus:ring-primary/30 transition placeholder-muted-foreground"
                disabled={loading}
                aria-label={t("placeholder")}
              />
              <button
                onClick={sendMessage}
                disabled={loading || !message.trim()}
                className="bg-gradient-to-r from-primary to-secondary text-white p-6 rounded-full hover:scale-110 transition shadow-2xl disabled:opacity-50 disabled:scale-100"
                aria-label={t("send") || "ارسال"}
              >
                <Send size={32} />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}