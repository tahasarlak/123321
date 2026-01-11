import { getServerSession } from "next-auth";
import { authOptions } from "@/app/[locale]/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/db/prisma";

export default async function SessionPage({ params }: { params: { sessionId: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return <div>لطفاً وارد شوید</div>;

  const userId = session.user.id as string;
  const sessionData = await prisma.classSession.findUnique({
    where: { id: params.sessionId },
    include: { course: true },
  });

  if (!sessionData) return <div>جلسه یافت نشد</div>;

  // ثبت حضور خودکار
  await prisma.sessionAttendance.upsert({
    where: { sessionId_userId: { sessionId: params.sessionId, userId } },
    update: { joinedAt: new Date(), status: "PRESENT" },
    create: {
      sessionId: params.sessionId,
      userId,
      status: "PRESENT",
      joinedAt: new Date(),
    },
  });

  const isInternal = !sessionData.meetLink;

  if (!isInternal && sessionData.meetLink) {
    // ریدایرکت به لینک خارجی
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <p>در حال انتقال به جلسه...</p>
        <script dangerouslySetInnerHTML={{ __html: `window.location.href = "${sessionData.meetLink}"` }} />
      </div>
    );
  }

  // کلاس داخلی با Jitsi سفارشی
  const domain = process.env.JITSI_DOMAIN || "meet.jit.si"; // سرور خودت یا meet.jit.si
  const roomName = sessionData.jitsiRoomName || sessionData.id;

  return (
    <div className="h-screen flex flex-col">
      <div className="bg-black text-white p-4 flex justify-between">
        <h1 className="text-xl">{sessionData.title}</h1>
        <p>{sessionData.course.title}</p>
      </div>

      <iframe
        src={`https://$$ {domain}/ $${roomName}?jwt=&config.overwriteMutableConfig=true
          &interfaceConfig.OVERRIDE_LOGO=true
          &interfaceConfig.SHOW_JITSI_WATERMARK=false
          &interfaceConfig.SHOW_BRAND_WATERMARK=false
          &interfaceConfig.APP_NAME=MyPlatform
          &userInfo.displayName=${encodeURIComponent(session.user.name || "دانشجو")}
          &userInfo.email=${encodeURIComponent(session.user.email || "")}`}
        allow="camera; microphone; fullscreen; display-capture"
        className="flex-1 w-full border-0"
      />
    </div>
  );
}