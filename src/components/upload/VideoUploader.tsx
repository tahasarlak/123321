// src/components/upload/VideoUploader.tsx
"use client";

import { useState, useCallback, useRef } from "react";
import { useDropzone } from "react-dropzone";
import { FiUploadCloud, FiCheckCircle, FiTrash2, FiFilm, FiLoader, FiClock, FiHardDrive } from "react-icons/fi";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils/cn";

interface UploadedVideo {
  file: File;
  preview: string;
  url?: string;
  uploading: boolean;
  progress: number;
  speed?: string;
  duration?: string;
  size: string;
  resolution?: string;
}

interface Props {
  onUpload: (url: string) => void;
  maxSizeGB?: number;
}

export default function VideoUploader({
  onUpload,
  maxSizeGB = 5,
}: Props) {
  const t = useTranslations("upload");
  const [video, setVideo] = useState<UploadedVideo | null>(null);
  const [dragging, setDragging] = useState(false);
  const startTime = useRef<number>(0);

  const formatBytes = (bytes: number) => {
    const gb = bytes / (1024 * 1024 * 1024);
    const mb = bytes / (1024 * 1024);
    if (gb >= 1) return gb.toFixed(2) + " GB";
    if (mb >= 1) return mb.toFixed(1) + " MB";
    return (bytes / 1024).toFixed(1) + " KB";
  };

  const getVideoMetadata = (file: File): Promise<{ duration: string; resolution?: string }> => {
    return new Promise((resolve) => {
      const vid = document.createElement("video");
      vid.preload = "metadata";
      vid.onloadedmetadata = () => {
        window.URL.revokeObjectURL(vid.src);
        const duration = Math.round(vid.duration);
        const mins = Math.floor(duration / 60).toString().padStart(2, "0");
        const secs = (duration % 60).toString().padStart(2, "0");
        resolve({
          duration: `${mins}:${secs}`,
          resolution: vid.videoWidth && vid.videoHeight ? `${vid.videoWidth}×${vid.videoHeight}` : undefined,
        });
      };
      vid.src = URL.createObjectURL(file);
    });
  };

  const uploadVideo = async (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("type", "video");

      const xhr = new XMLHttpRequest();
      startTime.current = Date.now();

      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) {
          const percent = (e.loaded / e.total) * 100;
          const elapsed = (Date.now() - startTime.current) / 1000 || 1;
          const speed = (e.loaded / elapsed / 1024 / 1024).toFixed(2);
          setVideo((prev) => prev ? { ...prev, progress: percent, speed: `${speed} MB/s` } : null);
        }
      };

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          const data = JSON.parse(xhr.responseText);
          resolve(data.url);
        } else {
          reject("Upload failed");
        }
      };

      xhr.onerror = () => reject("Network error");
      xhr.open("POST", "/api/upload");
      xhr.send(formData);
    });
  };

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      if (acceptedFiles.length === 0) return;
      const file = acceptedFiles[0];

      const sizeGB = file.size / (1024 * 1024 * 1024);
      if (sizeGB > maxSizeGB) {
        toast.error(t("video_too_large", { size: maxSizeGB }) || `ویدیو بیش از ${maxSizeGB} گیگابایت است`);
        return;
      }

      const metadata = await getVideoMetadata(file);

      const newVideo: UploadedVideo = {
        file,
        preview: URL.createObjectURL(file),
        uploading: true,
        progress: 0,
        size: formatBytes(file.size),
        duration: metadata.duration,
        resolution: metadata.resolution,
      };

      setVideo(newVideo);

      try {
        const url = await uploadVideo(file);
        setVideo((prev) => prev ? { ...prev, url, uploading: false, progress: 100 } : null);
        onUpload(url);
        toast.success(t("video_success") || "ویدیو با موفقیت آپلود شد و در حال پردازش است...");
      } catch {
        toast.error(t("video_error") || "خطا در آپلود ویدیو");
        setVideo((prev) => prev ? { ...prev, uploading: false, progress: 0 } : null);
      }
    },
    [onUpload, maxSizeGB, t]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "video/*": [".mp4", ".mov", ".webm", ".mkv", ".avi"],
    },
    maxSize: maxSizeGB * 1024 * 1024 * 1024,
    multiple: false,
    onDropRejected: (rejections) => {
      rejections.forEach((r) => {
        if (r.errors[0].code === "file-too-large")
          toast.error(t("video_too_large", { size: maxSizeGB }));
        else if (r.errors[0].code === "file-invalid-type")
          toast.error(t("invalid_video_type") || "فرمت ویدیو پشتیبانی نمی‌شود");
      });
    },
  });

  const removeVideo = () => {
    if (video?.preview) URL.revokeObjectURL(video.preview);
    setVideo(null);
    onUpload("");
  };

  return (
    <div className="space-y-16">
      {!video && (
        <div
          {...getRootProps()}
          onDragEnter={() => setDragging(true)}
          onDragLeave={() => setDragging(false)}
          className={cn(
            "relative border-8 border-dashed rounded-4xl p-40 text-center transition-all duration-500 cursor-pointer",
            isDragActive || dragging
              ? "border-primary bg-primary/5 shadow-4xl scale-105"
              : "border-border hover:border-primary hover:bg-primary/5"
          )}
        >
          <input {...getInputProps()} />
          <div className="space-y-16">
            <div className="relative">
              <FiFilm
                size={160}
                className={cn("mx-auto transition-all", isDragActive ? "text-primary animate-bounce" : "text-muted-foreground")}
              />
              {isDragActive && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="bg-primary text-white px-32 py-16 rounded-full text-7xl font-black animate-pulse shadow-5xl">
                    {t("drop_here") || "رها کنید!"}
                  </div>
                </div>
              )}
            </div>
            <div>
              <p className="text-6xl font-black text-foreground">
                {isDragActive ? t("drop_active") || "ویدیو را اینجا رها کنید" : t("drop_default") || "کلیک کنید یا ویدیو را بکشید و رها کنید"}
              </p>
              <p className="text-4xl text-muted-foreground mt-12">
                {t("max_video_size") || `حداکثر ${maxSizeGB} گیگابایت`} • MP4, MOV, WebM
              </p>
              <p className="text-3xl text-primary font-bold mt-8">
                {t("video_processing") || "پس از آپلود، ویدیو به صورت خودکار به HLS تبدیل و در چند کیفیت ارائه می‌شود"}
              </p>
            </div>
          </div>
        </div>
      )}

      {video && (
        <div className="bg-card rounded-4xl shadow-5xl overflow-hidden border-12 border-primary/20">
          <div className="relative">
            <video
              src={video.preview}
              controls
              className="w-full aspect-video object-cover"
            />
            {video.uploading && (
              <div className="absolute inset-0 bg-black/70 flex items-center justify-center">
                <div className="text-center text-white">
                  <FiLoader size={100} className="mx-auto mb-12 animate-spin" />
                  <div className="h-12 bg-white/30 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-primary to-secondary transition-all duration-500"
                      style={{ width: `${video.progress}%` }}
                    />
                  </div>
                  <div className="grid grid-cols-3 gap-12 mt-12 text-4xl font-black">
                    <div>{t("progress") || "پیشرفت"}: {video.progress.toFixed(1)}%</div>
                    <div>{t("speed") || "سرعت"}: {video.speed || t("calculating") || "در حال محاسبه..."}</div>
                    <div>{t("size") || "حجم"}: {video.size}</div>
                  </div>
                </div>
              </div>
            )}
            {video.url && (
              <div className="absolute top-12 left-12 bg-emerald-600 text-white px-16 py-8 rounded-full flex items-center gap-8 shadow-3xl">
                <FiCheckCircle size={60} />
                <span className="text-4xl font-black">{t("video_uploaded") || "ویدیو با موفقیت آپلود و پردازش شد!"}</span>
              </div>
            )}
          </div>

          <div className="p-20 bg-gradient-to-br from-primary/5 to-secondary/5">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-12 text-center">
              <div>
                <FiClock size={60} className="mx-auto mb-6 text-primary" />
                <p className="text-4xl font-black">{video.duration || t("calculating")}</p>
                <p className="text-muted-foreground">{t("duration") || "مدت زمان"}</p>
              </div>
              <div>
                <FiHardDrive size={60} className="mx-auto mb-6 text-primary" />
                <p className="text-4xl font-black">{video.size}</p>
                <p className="text-muted-foreground">{t("file_size") || "حجم فایل"}</p>
              </div>
              {video.resolution && (
                <div>
                  <FiFilm size={60} className="mx-auto mb-6 text-primary" />
                  <p className="text-4xl font-black">{video.resolution}</p>
                  <p className="text-muted-foreground">{t("resolution") || "رزولوشن"}</p>
                </div>
              )}
              <div>
                <p className="text-3xl text-muted-foreground">{t("uploaded_at") || "آپلود شده در"}</p>
                <p className="text-4xl font-black text-primary">{new Date().toLocaleTimeString("fa-IR")}</p>
              </div>
            </div>

            {video.url && (
              <div className="flex justify-center gap-16 mt-20">
                <button
                  onClick={removeVideo}
                  className="bg-red-600 text-white px-24 py-16 rounded-4xl flex items-center gap-12 hover:scale-110 transition shadow-3xl"
                >
                  <FiTrash2 size={60} />
                  <span className="text-5xl font-black">{t("replace") || "حذف و جایگزینی"}</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {!video && (
        <div className="text-center py-32">
          <FiFilm size={120} className="mx-auto mb-12 text-muted-foreground" />
          <p className="text-5xl font-bold text-muted-foreground">{t("no_video") || "هنوز ویدیویی آپلود نشده"}</p>
        </div>
      )}
    </div>
  );
}