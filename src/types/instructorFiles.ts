// src/types/instructorFiles.ts
export type FileItem = {
  id: string;
  title: string;
  url: string;
  type: string;
  size: number | null;
  sectionId: string | null;
  groupId: string | null;
};

export type FileResult =
  | { success: true; files?: FileItem[]; file?: FileItem; message?: string }
  | { success: false; error: string };