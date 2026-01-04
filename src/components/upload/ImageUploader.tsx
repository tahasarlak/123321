// src/components/upload/ImageUploader.tsx
"use client";

import { useState, useCallback, useRef } from "react";
import { useDropzone } from "react-dropzone";
import Image from "next/image";
import { FiUploadCloud, FiCheckCircle, FiX, FiTrash2, FiLoader, FiImage } from "react-icons/fi";
import { toast } from "sonner";
import { useTranslations, useLocale } from "next-intl";
import { cn } from "@/lib/utils/cn";

interface UploadedFile {
  file: File;
  preview: string;
  url?: string;
  uploading: boolean;
  progress: number;
}

interface Props {
  onUpload: (url: string) => void;
  multiple?: boolean;
  maxFiles?: number;
  maxSizeMB?: number;
  aspectRatio?: string;
}

export default function ImageUploader({
  onUpload,
  multiple = false,
  maxFiles = 10,
  maxSizeMB = 15,
  aspectRatio,
}: Props) {
  const t = useTranslations("common");
  const locale = useLocale();
  const isRTL = locale === "fa";

  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [dragging, setDragging] = useState(false);

  const uploadFile = async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("type", "image");

    const res = await fetch("/api/upload", {
      method: "POST",
      body: formData,
    });

    if (!res.ok) {
      const error = await res.text();
      throw new Error(error || t("upload_error") || "خطا در آپلود");
    }

    const data = await res.json();
    return data.url;
  };

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      if (acceptedFiles.length === 0) return;

      const newFiles: UploadedFile[] = acceptedFiles.map((file) => ({
        file,
        preview: URL.createObjectURL(file),
        uploading: true,
        progress: 0,
      }));

      setFiles((prev) => [...prev, ...newFiles].slice(0, multiple ? maxFiles : 1));

      for (const item of newFiles) {
        try {
          setFiles((prev) =>
            prev.map((f) =>
              f.preview === item.preview ? { ...f, progress: 60 } : f
            )
          );

          const url = await uploadFile(item.file);

          setFiles((prev) =>
            prev.map((f) =>
              f.preview === item.preview
                ? { ...f, url, uploading: false, progress: 100 }
                : f
            )
          );

          onUpload(url);
          toast.success(t("image_success") || "تصویر با موفقیت آپلود شد");
        } catch {
          setFiles((prev) =>
            prev.map((f) =>
              f.preview === item.preview ? { ...f, uploading: false, progress: 0 } : f
            )
          );
          toast.error(t("image_error") || "خطا در آپلود تصویر");
        }
      }
    },
    [onUpload, multiple, maxFiles, t]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "image/*": [] },
    maxSize: maxSizeMB * 1024 * 1024,
    multiple,
    onDropRejected: (rejections) => {
      rejections.forEach((r) => {
        const code = r.errors[0].code;
        if (code === "file-too-large")
          toast.error(t("file_too_large", { size: maxSizeMB }) || `فایل بیش از ${maxSizeMB} مگابایت است`);
        if (code === "file-invalid-type")
          toast.error(t("invalid_type") || "فرمت فایل پشتیبانی نمی‌شود");
      });
    },
  });

  const removeFile = (preview: string) => {
    setFiles((prev) => {
      const file = prev.find((f) => f.preview === preview);
      if (file?.preview) URL.revokeObjectURL(file.preview);
      return prev.filter((f) => f.preview !== preview);
    });
  };

  return (
    <div className="space-y-12">
      <div
        {...getRootProps()}
        onDragEnter={() => setDragging(true)}
        onDragLeave={() => setDragging(false)}
        className={cn(
          "relative border-8 border-dashed rounded-4xl p-32 text-center transition-all duration-500 cursor-pointer",
          isDragActive || dragging
            ? "border-primary bg-primary/5 shadow-3xl scale-105"
            : "border-border hover:border-primary hover:bg-primary/5"
        )}
      >
        <input {...getInputProps()} />
        <div className="space-y-12">
          <FiUploadCloud
            size={140}
            className={cn("mx-auto transition-all", isDragActive ? "text-primary animate-bounce" : "text-muted-foreground")}
          />
          {isDragActive && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="bg-primary text-white px-24 py-12 rounded-full text-6xl font-black animate-pulse shadow-4xl">
                {t("drop_here") || "رها کنید!"}
              </div>
            </div>
          )}
          <div>
            <p className="text-5xl font-black text-foreground">
              {isDragActive ? t("drop_active") || "فایل را اینجا رها کنید" : t("drop_default") || "کلیک کنید یا تصویر را بکشید و رها کنید"}
            </p>
            <p className="text-3xl text-muted-foreground mt-8">
              {t("max_size") || `حداکثر ${maxSizeMB} مگابایت`} • JPG, PNG, WebP, AVIF
            </p>
            {aspectRatio && (
              <p className="text-3xl text-primary font-bold mt-4">
                {t("aspect_ratio") || "نسبت پیشنهادی"}: {aspectRatio}
              </p>
            )}
          </div>
        </div>
      </div>

      {files.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-12">
          {files.map((item) => (
            <div key={item.preview} className="group relative bg-card rounded-4xl shadow-4xl overflow-hidden border-8 border-border/50 hover:border-primary transition-all">
              <div className="aspect-square relative">
                <Image
                  src={item.preview}
                  alt="پیش‌نمایش"
                  fill
                  className="object-cover"
                />
                {item.uploading ? (
                  <div className="absolute inset-0 bg-black/70 flex items-center justify-center">
                    <div className="text-center text-white">
                      <FiLoader size={60} className="mx-auto mb-6 animate-spin" />
                      <div className="h-8 bg-white/30 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-primary to-secondary transition-all duration-700"
                          style={{ width: `${item.progress}%` }}
                        />
                      </div>
                      <p className="text-3xl font-black mt-6">{item.progress}%</p>
                    </div>
                  </div>
                ) : item.url ? (
                  <div className="absolute inset-0 bg-gradient-to-t from-emerald-600/90 to-transparent flex items-end justify-center pb-12">
                    <div className="bg-white/90 backdrop-blur-xl rounded-full px-12 py-8 flex items-center gap-8">
                      <FiCheckCircle size={60} className="text-emerald-600" />
                      <span className="text-4xl font-black text-emerald-700">{t("uploaded") || "آپلود شد"}</span>
                    </div>
                  </div>
                ) : (
                  <div className="absolute inset-0 bg-red-600/90 flex items-center justify-center">
                    <span className="text-4xl font-black text-white">{t("error") || "خطا"}</span>
                  </div>
                )}
              </div>
              <button
                onClick={() => removeFile(item.preview)}
                className="absolute top-8 right-8 bg-red-600/80 p-6 rounded-full opacity-0 group-hover:opacity-100 transition"
              >
                <FiTrash2 size={40} className="text-white" />
              </button>
            </div>
          ))}
        </div>
      )}

      {files.length === 0 && (
        <div className="text-center py-20">
          <div className="h-28 w-28 mx-auto rounded-full bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center shadow-2xl">
            <FiImage size={80} className="text-muted-foreground/40" />
          </div>
          <p className="text-4xl font-bold text-muted-foreground mt-8">
            {t("no_image") || "هنوز تصویری آپلود نشده"}
          </p>
        </div>
      )}
    </div>
  );
}