// src/types/universal.ts
import { ReactNode } from "react";

export interface UniversalGalleryProps {
  images: string[];
  discountBadge?: { type: "PERCENTAGE" | "FIXED"; value: number };
  likeId: string;
  likeType: "product" | "course" | "post" | "video" | "download";
  initialLiked?: boolean;
}
export interface DetailItem {
  label: string;
  value: string | number;
  icon: "package" | "book" | "shield" | "star" | "message";
  color?: "amber" | "indigo" | "emerald" | "rose" | "purple";
}

export interface DetailHeaderProps {
  title: string;
  rating: number;
  reviewsCount: number;
  items?: Omit<DetailItem, "icon" | "color">[];
  tags?: { id: string; name: string }[];
}
export interface PriceBoxProps {
  price: number;
  discountPercent?: number;
  currency?: string;
  size?: "sm" | "md" | "lg" | "xl";
}
export interface ReadMoreProps {
  children?: string;
  maxHeight?: number;
  expandText?: string;
  collapseText?: string;
  className?: string;
}
export interface ShareButtonProps {
  title: string;
  url?: string;
  size?: "sm" | "default" | "lg";
  className?: string;
}
export interface AddToCartButtonProps {
  productId?: string;
  courseId?: string;
  stock?: number;
  isPurchased?: boolean;
}
export interface ShippingMethod {
  id: string;
  title: string;
  type: "POST" | "COURIER" | "TIPAX" | "INTERNATIONAL" | "PRESENTIAL" | "FREE";
  cost?: number | null;
  costPercent?: number | null;
  freeAbove?: number | null;
  estimatedDays?: string | null;
  address?: string | null;
  phone?: string | null;
  locationDetails?: any | null;
}

export interface ShippingModalProps {
  shippingMethods: ShippingMethod[];
}
export interface ItemsGridProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
  columns?: 2 | 3 | 4 | 5 | 6;
  gap?: "sm" | "md" | "lg";
  className?: string;
}
export interface BreadcrumbItem {
  label: string;
  href: string;
}

export interface BreadcrumbProps {
  items: BreadcrumbItem[];
  className?: string;
}
export interface Review {
  id: string;
  rating: number;
  comment?: string | null;
  createdAt: Date;
  user: {
    name: string;
    image?: string | null;
  };
}

export interface ReviewSectionProps {
  reviews: Review[];
  averageRating?: number;
  totalReviews?: number;
  entityId: string;
  entityType: "product" | "course" | "post";
}
