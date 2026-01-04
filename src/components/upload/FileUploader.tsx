// src/components/upload/FileUploader.tsx
"use client";

import { useState, useCallback, useRef } from "react";
import { useDropzone } from "react-dropzone";
import { FiUploadCloud, FiCheckCircle, FiTrash2, FiFile, FiFileText, FiArchive, FiMusic, FiFilm, FiImage, FiLoader, FiHardDrive } from "react-icons/fi";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils/cn";

interface UploadedFile {
  id: string;
  file: File;
  preview?: string;
  url?: string;
  uploading: boolean;
  progress: number;
  speed?: string;
  size: string;
  type: string;
  icon: React.ElementType;
}

interface Props {
  onUpload: (url: string, fileName: string) => void;
  maxSizeGB?: number;
  maxFiles?: number;
  multiple?: boolean;
}

export default function FileUploader({
  onUpload,
  maxSizeGB = 10,
  maxFiles = 20,
  multiple = true,
}: Props) {
  const t = useTranslations("upload");
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [dragging, setDragging] = useState(false);
  const startTime = useRef<number>(0);

  const getFileIcon = (type: string): React.ElementType => {
    if (type.includes("pdf")) return FiFileText;
    if (type.includes("zip") || type.includes("rar") || type.includes("7z")) return FiArchive; // فیکس: FiFileArchive → FiArchive
    if (type.includes("audio")) return FiMusic;
    if (type.includes("video")) return FiFilm;
    if (type.includes("image")) return FiImage;
    return FiFile;
  };

  const formatBytes = (bytes: number) => {
    const gb = bytes / (1024 * 1024 * 1024);
    const mb = bytes / (1024 * 1024);
    if (gb >= 1) return gb.toFixed(2) + " GB";
    if (mb >= 1) return mb.toFixed(1) + " MB";
    return (bytes / 1024).toFixed(1) + " KB";
  };

  const uploadFile = async (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("type", "attachment");

      const xhr = new XMLHttpRequest();
      startTime.current = Date.now();

      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) {
          const percent = (e.loaded / e.total) * 100;
          const elapsed = (Date.now() - startTime.current) / 1000 || 1;
          const speed = (e.loaded / elapsed / 1024 / 1024).toFixed(2);
          setFiles((prev) =>
            prev.map((f) =>
              f.id === file.name + file.size + file.lastModified
                ? { ...f, progress: percent, speed: `${speed} MB/s` }
                : f
            )
          );
        }
      };

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          const data = JSON.parse(xhr.responseText);
          resolve(data.url);
        } else reject("Upload failed");
      };

      xhr.onerror = () => reject("Network error");
      xhr.open("POST", "/api/upload");
      xhr.send(formData);
    });
  };

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      if (acceptedFiles.length === 0) return;

      const newFiles: UploadedFile[] = acceptedFiles.map((file) => {
        const preview = file.type.startsWith("image/") || file.type === "application/pdf"
          ? URL.createObjectURL(file)
          : undefined;
        return {
          id: file.name + file.size + file.lastModified,
          file,
          preview,
          uploading: true,
          progress: 0,
          size: formatBytes(file.size),
          type: file.type,
          icon: getFileIcon(file.type),
        };
      });

      setFiles((prev) => [...prev, ...newFiles].slice(0, maxFiles));

      for (const item of newFiles) {
        try {
          const url = await uploadFile(item.file);
          setFiles((prev) =>
            prev.map((f) =>
              f.id === item.id
                ? { ...f, url, uploading: false, progress: 100 }
                : f
            )
          );
          onUpload(url, item.file.name);
          toast.success(t("file_success", { name: item.file.name }) || `${item.file.name} با موفقیت آپلود شد`);
        } catch {
          setFiles((prev) =>
            prev.map((f) =>
              f.id === item.id ? { ...f, uploading: false, progress: 0 } : f
            )
          );
          toast.error(t("file_error", { name: item.file.name }) || `آپلود ${item.file.name} ناموفق بود`);
        }
      }
    },
    [onUpload, maxFiles, t]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "application/pdf": [],
      "application/zip": [],
      "application/x-rar-compressed": [],
      "application/x-7z-compressed": [],
      "audio/*": [],
      "video/*": [],
      "image/*": [],
      "text/plain": [],
    },
    maxSize: maxSizeGB * 1024 * 1024 * 1024,
    multiple,
    onDropRejected: (rejections) => {
      rejections.forEach((r) => {
        if (r.errors[0].code === "file-too-large")
          toast.error(t("file_too_large", { size: maxSizeGB }));
        else if (r.errors[0].code === "too-many-files")
          toast.error(t("too_many_files") || "تعداد فایل‌ها بیشتر از حد مجاز است");
      });
    },
  });

  const removeFile = (id: string) => {
    setFiles((prev) => {
      const file = prev.find((f) => f.id === id);
      if (file?.preview) URL.revokeObjectURL(file.preview);
      return prev.filter((f) => f.id !== id);
    });
  };

  return (
    <div className="space-y-20">
      {files.length < maxFiles && (
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
              <FiUploadCloud
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
                {isDragActive ? t("drop_active") || "فایل‌ها را اینجا رها کنید" : t("drop_default") || "کلیک کنید یا فایل‌ها را بکشید و رها کنید"}
              </p>
              <p className="text-4xl text-muted-foreground mt-12">
                {t("max_file_size") || `حداکثر ${maxSizeGB} گیگابایت`} • PDF, ZIP, DOCX, MP4, MP3 و ...
              </p>
              <p className="text-3xl text-primary font-bold mt-8">
                {t("max_files") || `تا ${maxFiles} فایل همزمان`} • {t("direct_link") || "لینک مستقیم پس از آپلود"}
              </p>
            </div>
          </div>
        </div>
      )}

      {files.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-16">
          {files.map((item) => (
            <div
              key={item.id}
              className="group relative bg-card rounded-4xl shadow-4xl overflow-hidden border-12 border-border/50 hover:border-primary transition-all"
            >
              <div className="aspect-video bg-gradient-to-br from-primary/5 to-secondary/5 relative overflow-hidden">
                {item.preview ? (
                  item.type === "application/pdf" ? (
                    <iframe src={item.preview} className="w-full h-full" />
                  ) : (
                    <img src={item.preview} alt={item.file.name} className="w-full h-full object-cover" />
                  )
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <item.icon size={120} className="text-primary" />
                  </div>
                )}
                {item.uploading && (
                  <div className="absolute inset-0 bg-black/70 flex items-center justify-center">
                    <div className="text-center text-white">
                      <FiLoader size={100} className="mx-auto mb-12 animate-spin" />
                      <div className="h-12 bg-white/30 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-primary to-secondary transition-all duration-500"
                          style={{ width: `${item.progress}%` }}
                        />
                      </div>
                      <p className="text-5xl font-black mt-8">{item.progress.toFixed(0)}%</p>
                      {item.speed && <p className="text-3xl mt-4">{item.speed}</p>}
                    </div>
                  </div>
                )}
                {item.url && (
                  <div className="absolute top-12 left-12 bg-emerald-600 text-white px-16 py-8 rounded-full flex items-center gap-8 shadow-3xl">
                    <FiCheckCircle size={60} />
                    <span className="text-4xl font-black">{t("uploaded") || "کامل شد"}</span>
                  </div>
                )}
              </div>

              <div className="p-16 space-y-8">
                <div className="flex items-center justify-between">
                  <h4 className="text-4xl font-black line-clamp-2">{item.file.name}</h4>
                  <button
                    onClick={() => removeFile(item.id)}
                    className="text-red-600 hover:scale-125 transition"
                  >
                    <FiTrash2 size={50} />
                  </button>
                </div>
                <div className="grid grid-cols-3 gap-8 text-center">
                  <div>
                    <FiHardDrive size={50} className="mx-auto mb-4 text-primary" />
                    <p className="text-3xl font-black">{item.size}</p>
                  </div>
                  <div>
                    <FiFile size={50} className="mx-auto mb-4 text-primary" />
                    <p className="text-2xl">{item.type.split("/")[1]?.toUpperCase() || "FILE"}</p>
                  </div>
                  {item.url && (
                    <div>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(item.url!);
                          toast.success(t("link_copied") || "لینک کپی شد");
                        }}
                        className="bg-gradient-to-r from-primary to-secondary text-white px-16 py-8 rounded-full text-3xl font-black hover:scale-110 transition shadow-3xl"
                      >
                        {t("copy_link") || "کپی لینک"}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {files.length === 0 && (
        <div className="text-center py-32">
          <FiFile size={140} className="mx-auto mb-16 text-muted-foreground" />
          <p className="text-6xl font-bold text-muted-foreground">{t("no_file") || "هنوز فایلی آپلود نشده"}</p>
        </div>
      )}
    </div>
  );
}