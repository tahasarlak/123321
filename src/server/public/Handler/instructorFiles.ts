// src/server/public/Handler/instructorFiles.ts
"use server";

import { prisma } from "@/lib/db/prisma";
import { writeFile } from "fs/promises";
import { join } from "path";
import sharp from "sharp";
import { getSocket } from "@/server/public/Socket/socket";
import { uploadFileSchema } from "@/lib/validations/instructorFiles";
import { faInstructorFilesMessages } from "@/lib/validations/instructorFiles/messages"; // مسیر درست
import type { FileResult } from "@/types/instructorFiles";

async function isInstructorOrAdmin(userId: string, courseId: string): Promise<boolean> {
  const course = await prisma.course.findUnique({
    where: { id: courseId },
    select: { instructorId: true },
  });
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { roles: { select: { role: true } } },
  });
  const isAdmin = user?.roles.some(r => ["ADMIN", "SUPERADMIN"].includes(r.role));
  return isAdmin || course?.instructorId === userId;
}

export async function handleUploadFileToCourse(data: Record<string, any>, userId: string): Promise<FileResult> {
  const parsed = uploadFileSchema.safeParse(data);
  if (!parsed.success) return { success: false, error: faInstructorFilesMessages.server_error };

  const { courseId, sectionId, groupId, title, file, honeypot } = parsed.data;
  if (honeypot && honeypot.length > 0) return { success: true };

  if (!(await isInstructorOrAdmin(userId, courseId))) return { success: false, error: faInstructorFilesMessages.not_owner };

const arrayBuffer = await file.arrayBuffer();
const uint8Array = new Uint8Array(arrayBuffer);  
const buffer = Buffer.from(uint8Array);

const filename = `course-${courseId}-${Date.now()}.${file.type.split("/")[1] || "bin"}`;
const filepath = join(process.cwd(), "public/uploads/courses", filename);

let optimized: Buffer = buffer;

if (file.type.startsWith("image/")) {
  const sharpBuffer = await sharp(buffer)
    .resize(1200, 1200, { fit: "inside", withoutEnlargement: true })
    .webp({ quality: 80 })
    .toBuffer();

  // اینجا هم بدون جنریک صریح
  const uint8 = new Uint8Array(sharpBuffer);
  optimized = Buffer.from(uint8);
}

await writeFile(filepath, optimized);

  const uploadedFile = await prisma.courseFile.create({
    data: {
      courseId,
      sectionId,
      groupId,
      title,
      url: `/uploads/courses/${filename}`,
      type: file.type,
      size: file.size,
      uploadedBy: userId,
    },
  });

  const io = getSocket();
  io?.to(`course_${courseId}`).emit("new_file", uploadedFile);

  return { success: true, message: "فایل آپلود شد", file: uploadedFile };
}