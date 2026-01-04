import { Control, FieldErrors } from "react-hook-form";
import { CheckCircle, AlertCircle, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import ImageUploader from "@/components/upload/ImageUploader";
import { FormValues } from "@/types/user";
import { InputField } from "@/components/ui/InputField";

interface Props {
  control: Control<FormValues>;
  errors: FieldErrors<FormValues>;
  imageUrl: string | null;
  setImageUrl: (url: string | null) => void;
  required?: boolean;
  activeLabel: string;
}

export function ProfileImageSection({ control, errors, imageUrl, setImageUrl, required = false, activeLabel }: Props) {
  const t = useTranslations("admin");

  return (
    <div className="space-y-8">
      <div>
        <label className="text-sm font-medium mb-4 block">
          {t("profile_image") || "تصویر پروفایل"} {required && <span className="text-red-500">*</span>}
        </label>
        <div className="flex flex-col sm:flex-row gap-6 items-start">
          {imageUrl && (
            <div className="relative">
              <img src={imageUrl} alt="Profile preview" className="w-32 h-32 object-cover rounded-lg shadow-md" />
              <button
                type="button"
                onClick={() => setImageUrl(null)}
                className="absolute top-1 right-1 p-1.5 bg-red-600 text-white rounded-full hover:bg-red-700 transition"
                aria-label="حذف تصویر"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          )}
          <ImageUploader onUpload={(url) => setImageUrl(url)} />
        </div>
        {imageUrl && (
          <p className="text-green-600 mt-4 flex items-center gap-2">
            <CheckCircle className="h-5 w-5" />
            {t("image_uploaded") || "تصویر با موفقیت آپلود شد"}
          </p>
        )}
        {errors.image && (
          <p className="text-sm text-red-500 mt-2 flex items-center gap-1">
            <AlertCircle className="h-4 w-4" />
            {errors.image.message}
          </p>
        )}
      </div>

      <div className="flex items-center gap-3">
        <InputField id="isActive" label={activeLabel} type="checkbox" control={control} />
      </div>
    </div>
  );
}