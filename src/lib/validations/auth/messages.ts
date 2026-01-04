// src/validations/auth/messages.ts

export const authMessages = {
  fa: {
    email_invalid: "ایمیل معتبر نیست",
    password_min: "رمز عبور باید حداقل ۸ کاراکتر باشد",
    name_min: "نام باید حداقل ۲ کاراکتر باشد",
    name_max: "نام نمی‌تواند بیشتر از ۱۰۰ کاراکتر باشد",
    phone_invalid: "شماره موبایل باید با ۰۹ شروع شود و ۱۱ رقم باشد",
    password_confirm: "رمز عبور و تکرار آن مطابقت ندارند",
    gender_invalid: "جنسیت نامعتبر است",
    user_exists_email: "این ایمیل قبلاً ثبت شده است",
    user_exists_phone: "این شماره موبایل قبلاً ثبت شده است",
    invalid_token: "توکن نامعتبر یا منقضی شده است",
    server_error: "خطایی در سرور رخ داد. لطفاً بعداً تلاش کنید.",
  },
  en: {
    email_invalid: "Email is not valid",
    password_min: "Password must be at least 8 characters",
    name_min: "Name must be at least 2 characters",
    name_max: "Name cannot exceed 100 characters",
    phone_invalid: "Phone number must start with 09 and be 11 digits",
    password_confirm: "Passwords do not match",
    gender_invalid: "Invalid gender",
    user_exists_email: "This email is already registered",
    user_exists_phone: "This phone number is already registered",
    invalid_token: "Token is invalid or expired",
    server_error: "A server error occurred. Please try again later.",
  },
  ru: {
    email_invalid: "Неверный адрес электронной почты",
    password_min: "Пароль должен содержать минимум 8 символов",
    name_min: "Имя должно содержать минимум 2 символа",
    name_max: "Имя не может превышать 100 символов",
    phone_invalid: "Номер телефона должен начинаться с 09 и содержать 11 цифр",
    password_confirm: "Пароли не совпадают",
    gender_invalid: "Неверный пол",
    user_exists_email: "Этот email уже зарегистрирован",
    user_exists_phone: "Этот номер телефона уже зарегистрирован",
    invalid_token: "Токен недействителен или истёк",
    server_error: "Произошла ошибка сервера. Попробуйте позже.",
  },
} as const;

// تایپ برای دسترسی امن
export type AuthMessageKey = keyof typeof authMessages.fa;
export type Locale = keyof typeof authMessages;