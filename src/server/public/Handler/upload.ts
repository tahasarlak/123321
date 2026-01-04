// src/server/public/Handler/upload.ts
"use server";

import { v2 as cloudinary } from "cloudinary";
import { uploadSchema } from "@/lib/validations/upload";
import { faUploadMessages } from "@/lib/validations/upload/messages";
import type { UploadResult } from "@/types/upload";

cloudinary.config();

export async function handleUpload(data: unknown): Promise<UploadResult> {
  const parsed = uploadSchema.safeParse({ file: (data as any).file });
  if (!parsed.success) {
    return { success: false, error: faUploadMessages.server_error };
  }

  const { file, honeypot } = parsed.data;
  if (honeypot && honeypot.length > 0) return { success: true, url: "" };

  try {
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const result = await new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: "rom-uploads",
          transformation: [
            { width: 1200, height: 1200, crop: "limit" },
            { quality: "auto" },
            { fetch_format: "auto" },
          ],
        },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      );
      uploadStream.end(buffer);
    });

    return { success: true, url: (result as any).secure_url };
  } catch (error: any) {
    console.error("[UPLOAD HANDLER] خطا:", error);
    return { success: false, error: faUploadMessages.server_error };
  }
}