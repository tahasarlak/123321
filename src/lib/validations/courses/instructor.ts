// src/lib/validations/course/instructor.ts
import { z } from "zod";

export const courseInstructorSchema = z.object({
  title: z.string().min(10, "عنوان باید حداقل ۱۰ کاراکتر باشد").max(200, "عنوان نمی‌تواند بیشتر از ۲۰۰ کاراکتر باشد"),
  code: z.string().optional(),
  description: z.string().min(100, "توضیحات باید حداقل ۱۰۰ کاراکتر باشد").max(5000, "توضیحات نمی‌تواند بیشتر از ۵۰۰۰ کاراکتر باشد"),
  units: z.number().min(1).max(8),
  duration: z.string().min(1, "مدت دوره الزامی است"),
  type: z.enum(["RECORDED", "LIVE", "HYBRID"]),
  priceIRR: z.number().min(0),
  discountPercent: z.number().min(0).max(99).optional(),
  maxDiscount: z.number().min(0).optional(),
  capacity: z.number().min(0).optional(),
  categoryId: z.string().min(1, "دسته‌بندی الزامی است"),
  tags: z.array(z.string()).max(8, "حداکثر ۸ تگ"),
  chapters: z
    .array(
      z.object({
        id: z.string(),
        title: z.string().min(3, "عنوان فصل الزامی است").max(100),
        description: z.string().optional(),
        lessons: z
          .array(
            z.object({
              id: z.string(),
              title: z.string().min(3, "عنوان درس الزامی است").max(150),
              description: z.string().optional(),
              duration: z.string().optional(),
              videoUrl: z.string().optional(),
              isFree: z.boolean().optional(),
              attachments: z
                .array(
                  z.object({
                    name: z.string(),
                    url: z.string(),
                    type: z.string().optional(),
                    size: z.number().optional(),
                  })
                )
                .max(10)
                .optional(),
            })
          )
          .min(1, "هر فصل حداقل یک درس نیاز دارد"),
      })
    )
    .min(1, "حداقل یک فصل نیاز است")
    .max(20, "حداکثر ۲۰ فصل"),
});

export type CourseInstructorFormData = z.infer<typeof courseInstructorSchema>;