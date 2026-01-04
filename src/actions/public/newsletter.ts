// src/actions/public/newsletter.ts  (یا هر مسیری که داری)
"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

const schema = z.object({
  email: z.string().email("ایمیل معتبر نیست"),
  honeypot: z.string().optional(),
});

type State = {
  success: boolean;
  message: string;
};

export async function subscribeNewsletter(
  prevState: State | null,
  formData: FormData
): Promise<State> {
  const data = Object.fromEntries(formData);

  // Honeypot trap
  if (data.honeypot) {
    return { success: true, message: "با موفقیت ثبت شد!" };
  }

  const parsed = schema.safeParse(data);
  if (!parsed.success) {
    return { success: false, message: "ایمیل معتبر نیست" };
  }

  // اینجا واقعاً به خبرنامه اضافه کن (Mailchimp, DB, etc.)
  // await addToNewsletter(parsed.data.email);

  revalidatePath("/");
  return { success: true, message: "با موفقیت در خبرنامه ثبت شدید!" };
}