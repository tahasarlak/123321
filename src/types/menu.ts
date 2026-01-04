// src/types/menu.ts
export interface MenuItem {
  href?: string;
  label: string;
  icon?: string;
  badge?: number;
  subItems?: MenuItem[];
}