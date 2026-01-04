// src/app/[locale]/class/[meetLink]/page.tsx
"use client";

import { useEffect, useRef } from "react";
import { ZegoUIKitPrebuilt } from "@zegocloud/zego-uikit-prebuilt";
import { useSession } from "next-auth/react";
import { useRouter, useParams } from "next/navigation";
import { useTranslations, useLocale } from "next-intl";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils/cn";

export default function LiveClassPage() {
  const t = useTranslations("class");
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams();
  const locale = useLocale();
  const isRTL = locale === "fa";

  const meetLink = params.meetLink as string;
  const roomRef = useRef<HTMLDivElement>(null);
  const zpRef = useRef<any>(null);

  useEffect(() => {
    if (status === "loading") return;

    if (!session?.user) {
      toast.error(t("login_required") || "لطفاً ابتدا وارد حساب خود شوید");
      router.push("/auth");
      return;
    }

    const initClass = async () => {
      try {
        const res = await fetch("/api/zego/token", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            roomId: meetLink,
            userId: session.user.id,
            userName: session.user.name || "دانشجو",
          }),
        });

        if (!res.ok) {
          const error = await res.text();
          throw new Error(error || t("token_error") || "خطا در دریافت توکن کلاس");
        }

        const { token } = await res.json();

        const zp = ZegoUIKitPrebuilt.create(token);
        zpRef.current = zp;

        zp.joinRoom({
          container: roomRef.current!,
          scenario: {
            mode: ZegoUIKitPrebuilt.VideoConference,
          },
          showScreenSharingButton: true,
          showRoomTimer: true,
          showTextChat: true,
          showUserList: true,
          maxUsers: 500,
          // فیکس: roles آرایه هست
          turnOnMicrophoneWhenJoining: session.user.roles?.includes("INSTRUCTOR") ?? false,
          turnOnCameraWhenJoining: session.user.roles?.includes("INSTRUCTOR") ?? false,
          onLeaveRoom: () => {
            router.push("/dashboard/live-classes");
          },
        });
      } catch (err: any) {
        toast.error(err.message || t("join_error") || "خطا در ورود به کلاس زنده");
        router.push("/dashboard/live-classes");
      }
    };

    initClass();

    return () => {
      if (zpRef.current) {
        zpRef.current.destroy();
      }
    };
  }, [session, status, meetLink, router, t]);

  if (status === "loading") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-accent/20 to-background flex items-center justify-center">
        <div className="text-center space-y-8">
          <Loader2 size={80} className="mx-auto animate-spin text-primary" />
          <p className="text-4xl md:text-5xl font-black text-foreground">
            {t("connecting") || "در حال اتصال به کلاس زنده..."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-black">
      <div ref={roomRef} className="absolute inset-0 w-full h-full" />

      {/* عنوان کلاس */}
      <div className={cn("absolute top-8 z-10", isRTL ? "right-8" : "left-8")}>
        <div className="bg-background/90 backdrop-blur-xl rounded-3xl px-10 py-6 shadow-3xl border border-border/50">
          <h1 className="text-4xl md:text-5xl font-black text-foreground">
            {t("live_class") || "کلاس زنده"} — {meetLink.replace(/_/g, " ")}
          </h1>
        </div>
      </div>
    </div>
  );
}