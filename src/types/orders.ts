// src/types/orders.ts
export type OrderStatus = "PENDING" | "PAID" | "PROCESSING" | "SHIPPED" | "DELIVERED" | "CANCELLED" | "REFUNDED";

export type OrderItem = {
  product?: { id: string; title: string; image: string; price: number };
  course?: { id: string; title: string; image: string; price: number };
  quantity: number;
  price: number;
};

export type OrderDetail = {
  id: string;
  status: OrderStatus;
  finalAmount: number;
  createdAt: Date;
  items: OrderItem[];
  payment: any;
};

export type OrderListResponse = {
  orders: {
    id: string;
    status: OrderStatus;
    finalAmount: number;
    createdAt: Date;
    itemCount: number;
  }[];
  total: number;
  stats?: {
    totalOrders: number;
    pendingOrders: number;
    todayRevenue: number;
  };
};

export type OrderResult =
  | { success: true; message?: string; order?: OrderDetail; list?: OrderListResponse }
  | { success: false; error: string };