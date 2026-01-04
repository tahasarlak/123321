// src/types/instructorGroups.ts
export type GroupItem = {
  id: string;
  title: string;
  enrolled: number;
  capacity: number | null;
};

export type GroupResult =
  | { success: true; groups?: GroupItem[]; message?: string }
  | { success: false; error: string };