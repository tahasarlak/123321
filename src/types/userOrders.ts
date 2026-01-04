// src/types/userOrders.ts
export type UserOrderListItem = {
  id: string;
  status: string;
  finalAmount: number;
  createdAt: Date;
  itemCount: number;
};

export type UserOrderDetail = {
  id: string;
  status: string;
  finalAmount: number;
  createdAt: Date;
  items: Array<{
    product?: { id: string; title: string; image: string };
    course?: { id: string; title: string; image: string };
    quantity: number;
    price: number;
  }>;
  payment: any;
  shipping: any;
};

export type UserOrdersResult =
  | { success: true; orders?: UserOrderListItem[]; total?: number; order?: UserOrderDetail }
  | { success: false; error: string };