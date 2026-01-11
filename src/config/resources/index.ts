// src/config/resources.ts
import { blogsConfig } from "./blogs";
import { coursesConfig } from "./courses/courses";
import { discountsConfig } from "./discounts";
import { instructorsConfig } from "./instructors";
import { notificationsConfig } from "./notifications";
import { ordersConfig } from "./orders";
import { paymentAccountsConfig } from "./paymentAccounts";
import { productsConfig } from "./products";
import { shippingMethodsConfig } from "./shippingMethods";
import { usersConfig } from "./users";
import { instructorAssignmentsConfig } from "./instructorAssignments";
import { instructorCertificatesConfig } from "./instructorCertificates";
import { instructorFilesConfig } from "./instructorFiles";
import { instructorLessonsConfig } from "./courses/Lessons";
import { instructorSessionsConfig } from "./courses/Sessions";
import { instructorNotificationsConfig } from "./instructorNotifications";
import { instructorEarningsConfig } from "./instructorEarnings";
import { instructorEnrollmentsConfig } from "./courses/Enrollments";
import { instructorGroupsConfig } from "./courses/Groups";

export const RESOURCES_BY_ROLE = {
  admin: {
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
  },
  instructor: {
    courses: coursesConfig,
    instructorGroups: instructorGroupsConfig,
    instructorEnrollments: instructorEnrollmentsConfig,
    instructorAssignments: instructorAssignmentsConfig,
    instructorCertificates: instructorCertificatesConfig,
    instructorFiles: instructorFilesConfig,
    instructorLessons: instructorLessonsConfig,
    instructorSessions: instructorSessionsConfig,
    instructorNotifications: instructorNotificationsConfig,
    instructorEarnings: instructorEarningsConfig,
  },
  blogger: {} as const,
} as const;

export const ALL_FILTERABLE_RESOURCES = {
  users: usersConfig,
  courses: coursesConfig,
  blogs: blogsConfig,
  discounts: discountsConfig,
  orders: ordersConfig,
  instructors: instructorsConfig,
  notifications: notificationsConfig,
  instructorGroups: instructorGroupsConfig,
  instructorEnrollments: instructorEnrollmentsConfig,
  instructorAssignments: instructorAssignmentsConfig,
  instructorCertificates: instructorCertificatesConfig,
  instructorFiles: instructorFilesConfig,
  instructorLessons: instructorLessonsConfig,
  instructorSessions: instructorSessionsConfig,
  instructorNotifications: instructorNotificationsConfig,
  instructorEarnings: instructorEarningsConfig,
} as const;

export type FilterableResourceKey = keyof typeof ALL_FILTERABLE_RESOURCES;