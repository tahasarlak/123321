"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import React, { useMemo } from "react";

import { PersonalInfoSection } from "./sections/PersonalInfoSection";
import { AcademicInfoSection } from "./sections/AcademicInfoSection";
import { InstructorSection } from "./sections/InstructorSection";
import { BloggerSection } from "./sections/BloggerSection";
import { RoleSelectionSection } from "./sections/RoleSelectionSection";
import { useUserForm } from "@/lib/hooks/useUserForm";

interface Props {
  userId?: string;
  initialRoles?: string[];
}

// نام تابع رو اینجا تعریف می‌کنیم
const CreateOrEditUserFormAdmin: React.FC<Props> = React.memo(function ({
  userId,
  initialRoles = [],
}) {
  const t = useTranslations("admin");
  const router = useRouter();

  const {
    control,
    errors,
    setValue,
    selectedRoles,
    isInstructor,
    isBlogger,
    imageUrl,
    setImageUrl,
    isPending,
    onSubmit,
    preloadData,
    preloadLoading,
    userLoading,
    isSuperAdmin,
    isEdit,
    watch,
  } = useUserForm({ userId, initialRoles });

  // نمایش نام کاربر در عنوان ویرایش
  const userName = watch("name");

  const pageTitle = useMemo(() => {
    if (!isEdit) return t("create_new_user") || "ایجاد کاربر جدید";
    return userName
      ? `${t("edit_user") || "ویرایش کاربر"}: ${userName.trim()}`
      : t("edit_user") || "ویرایش کاربر";
  }, [isEdit, userName, t]);

  // حالت ایجاد کاربر ساده
  if (!isEdit) {
    return (
      <div className="max-w-3xl mx-auto p-6">
        <h1 className="text-3xl font-bold mb-8 text-center">{pageTitle}</h1>

        <form onSubmit={onSubmit} className="space-y-8">
          <section>
            <h2 className="text-2xl font-semibold mb-6">
              {t("basic_info") || "اطلاعات پایه"}
            </h2>

            <PersonalInfoSection
              control={control}
              errors={errors}
              setValue={setValue}
              disabledEmail={false}
              isCreateMode={true}
            />

            <div className="mt-8 p-5 bg-muted/30 rounded-lg border border-muted">
              <p className="text-sm font-medium">
                {t("user_role") || "نقش کاربر"}:{" "}
                <span className="text-primary font-bold">کاربر عادی (USER)</span>
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                {t("create_user_note") ||
                  "پس از ایجاد، می‌توانید در صفحه ویرایش نقش‌های پیشرفته‌تر و اطلاعات تکمیلی اضافه کنید."}
              </p>
            </div>
          </section>

          <div className="flex justify-end gap-4 pt-8">
            <button
              type="button"
              onClick={() => router.push("/dashboard/admin/users")}
              disabled={isPending}
              className="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-70 transition-colors"
            >
              {t("cancel") || "انصراف"}
            </button>

            <button
              type="submit"
              disabled={isPending}
              className="px-8 py-3 bg-primary text-white rounded-lg hover:bg-primary/90 flex items-center gap-2 disabled:opacity-70 transition-colors"
            >
              {isPending && <Loader2 className="h-5 w-5 animate-spin" />}
              {isPending ? t("creating") || "در حال ایجاد..." : t("create_user") || "ایجاد کاربر"}
            </button>
          </div>
        </form>
      </div>
    );
  }

  // حالت بارگیری در ویرایش
  if (userLoading || (preloadLoading && (isInstructor || isBlogger))) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-lg text-muted-foreground">
            {t("loading_user_data") || "در حال بارگیری اطلاعات کاربر..."}
          </p>
        </div>
      </div>
    );
  }

  // حالت ویرایش کامل
  return (
    <div className="max-w-5xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-8 text-center">{pageTitle}</h1>

      <form onSubmit={onSubmit} className="space-y-12">
        {/* اطلاعات شخصی */}
        <section>
          <h2 className="text-2xl font-semibold mb-6">
            {t("personal_info") || "اطلاعات شخصی"}
          </h2>

          <PersonalInfoSection
            control={control}
            errors={errors}
            setValue={setValue}
            disabledEmail={!isSuperAdmin}
            isCreateMode={false}
          />
        </section>

        {/* اطلاعات تحصیلی */}
        {!isInstructor && (
          <section>
            <h2 className="text-2xl font-semibold mb-6">
              {t("academic_info") || "اطلاعات تحصیلی"}
            </h2>

            <AcademicInfoSection
              control={control}
              errors={errors}
              universities={preloadData?.universities || []}
              majors={preloadData?.majors || []}
            />
          </section>
        )}

        {/* اطلاعات اختصاصی استاد */}
        {isInstructor && preloadData && (
          <section>
            <h2 className="text-2xl font-semibold mb-6">
              {t("instructor_info") || "اطلاعات اختصاصی استاد"}
            </h2>

            <InstructorSection
              control={control}
              errors={errors}
              imageUrl={imageUrl}
              setImageUrl={setImageUrl}
              universities={preloadData.universities}
              majors={preloadData.majors}
            />
          </section>
        )}

        {/* اطلاعات اختصاصی نویسنده */}
        {isBlogger && (
          <section>
            <h2 className="text-2xl font-semibold mb-6">
              {t("blogger_info") || "اطلاعات اختصاصی نویسنده"}
            </h2>

            <BloggerSection
              control={control}
              errors={errors}
              imageUrl={imageUrl}
              setImageUrl={setImageUrl}
            />
          </section>
        )}

        {/* نقش‌ها و دسترسی‌ها */}
        <section>
          <h2 className="text-2xl font-semibold mb-6">
            {t("roles_and_permissions") || "نقش‌ها و دسترسی‌ها"}
          </h2>

          <RoleSelectionSection
            control={control}
            errors={errors}
            setValue={setValue}
          />
        </section>

        {/* دکمه‌های اقدام */}
        <div className="flex justify-end gap-4 pt-8 border-t border-muted pb-8">
          <button
            type="button"
            onClick={() => router.push("/dashboard/admin/users")}
            disabled={isPending}
            className="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-70 transition-colors"
          >
            {t("cancel") || "انصراف"}
          </button>

          <button
            type="submit"
            disabled={isPending}
            className="px-8 py-3 bg-primary text-white rounded-lg hover:bg-primary/90 flex items-center gap-2 disabled:opacity-70 transition-colors"
          >
            {isPending && <Loader2 className="h-5 w-5 animate-spin" />}
            {isPending ? t("saving") || "در حال ذخیره..." : t("save_changes") || "ذخیره تغییرات"}
          </button>
        </div>
      </form>
    </div>
  );
});

CreateOrEditUserFormAdmin.displayName = "CreateOrEditUserFormAdmin";

export default CreateOrEditUserFormAdmin;