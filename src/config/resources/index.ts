// src/config/resources/index.ts
import { blogsConfig } from "./blogs";
import { coursesConfig } from "./courses";
import { discountsConfig } from "./discounts";
import { instructorsConfig } from "./instructors";
import { notificationsConfig } from "./notifications";
import { ordersConfig } from "./orders";
import { paymentAccountsConfig } from "./paymentAccounts";
import { productsConfig } from "./products";
import { shippingMethodsConfig } from "./shippingMethods";
import { usersConfig } from "./users";
import { rolesConfig } from "./roles"; // اگر roles.ts رو اضافه کردی

export const RESOURCE_DISPLAY_CONFIG = {
  users: usersConfig,
  products: productsConfig,
  courses: coursesConfig,
  blogs: blogsConfig,
  discounts: discountsConfig,
  orders: ordersConfig,
  instructors: instructorsConfig,
  paymentAccounts: paymentAccountsConfig,
  shippingMethods: shippingMethodsConfig,
  notifications: notificationsConfig,
   roles: rolesConfig, 
} as const;

export type ResourceDisplayConfig = typeof RESOURCE_DISPLAY_CONFIG;