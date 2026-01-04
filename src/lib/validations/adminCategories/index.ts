// src/validations/adminCategories/index.ts
import { z } from "zod";
import { faAdminCategoriesMessages } from "./messages";

export const createCategorySchema = z.object({
  name: z.string().min(2, faAdminCategoriesMessages.name_min),
  honeypot: z.string().optional(),
});

export const editCategorySchema = createCategorySchema.extend({
  id: z.string().min(1),
});