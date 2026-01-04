// src/components/admin/ProductFormAdmin.tsx
"use client";

import { useState, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Package,
  Tag,
  Percent,
  DollarSign,
  Loader2,
  AlertCircle,
  Trash2,
  Plus,
} from "lucide-react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";

import ImageUploader from "@/components/upload/ImageUploader";
import ProductPaymentAccountsSelector from "@/components/admin/ProductPaymentAccountsSelector";
import ProductShippingMethodsSelector from "@/components/admin/ProductShippingMethodsSelector";

import {
  createProductSchema,
  updateProductSchema,
  type CreateProductForm,
  type UpdateProductForm,
} from "@/lib/validations/admin/product";

interface Category {
  id: string;
  name: string;
}

interface PaymentAccount {
  id: string;
  title: string;
  type: "CARD_TO_CARD" | "BANK_TRANSFER" | "CRYPTO";
  bankName: string;
  country: { flagEmoji: string; name: string; currency: string };
  isActive: boolean;
}

interface ShippingMethod {
  id: string;
  title: string;
  type: string;
  isActive: boolean;
}

interface InitialData {
  id?: string;
  title?: string;
  slug?: string;
  brand?: string;
  categoryId?: string;
  description?: string;
  price?: Record<string, number>;
  maxDiscountAmount?: Record<string, number>;
  discountPercent?: number;
  stock?: number;
  image?: string;
  gallery?: string[];
  tags?: string;
  paymentAccountIds?: string[];
  shippingMethodIds?: string[];
}

interface Props {
  categories: Category[];
  paymentAccounts: PaymentAccount[];
  shippingMethods: ShippingMethod[];
  initialData?: InitialData;
}

const AVAILABLE_CURRENCIES = [
  { code: "IRR", name: "تومان", symbol: "تومان", flag: "🇮🇷" },
  { code: "USD", name: "دلار آمریکا", symbol: "$", flag: "🇺🇸" },
  { code: "EUR", name: "یورو", symbol: "€", flag: "🇪🇺" },
  { code: "AED", name: "درهم امارات", symbol: "AED", flag: "🇦🇪" },
  { code: "TRY", name: "لیر ترکیه", symbol: "₺", flag: "🇹🇷" },
  { code: "GBP", name: "پوند انگلیس", symbol: "£", flag: "🇬🇧" },
  { code: "CAD", name: "دلار کانادا", symbol: "C$", flag: "🇨🇦" },
  { code: "AUD", name: "دلار استرالیا", symbol: "A$", flag: "🇦🇺" },
  { code: "CNY", name: "یوان چین", symbol: "¥", flag: "🇨🇳" },
  { code: "RUB", name: "روبل روسیه", symbol: "₽", flag: "🇷🇺" },
  { code: "SAR", name: "ریال سعودی", symbol: "SAR", flag: "🇸🇦" },
  { code: "QAR", name: "ریال قطر", symbol: "QAR", flag: "🇶🇦" },
];

export default function ProductFormAdmin({
  categories: initialCategories,
  paymentAccounts,
  shippingMethods,
  initialData,
}: Props) {
  const t = useTranslations("admin");
  const router = useRouter();
  const isEditMode = !!initialData?.id;
  const [isPending, startTransition] = useTransition();

  const [imageUrl, setImageUrl] = useState(initialData?.image || "");
  const [galleryUrls, setGalleryUrls] = useState<string[]>(initialData?.gallery || []);
  const [categories, setCategories] = useState<Category[]>(initialCategories);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [showNewCategoryInput, setShowNewCategoryInput] = useState(false);
  const [creatingCategory, setCreatingCategory] = useState(false);

  const [discountPercent, setDiscountPercent] = useState((initialData?.discountPercent || 0).toString());
  const [titleForSlug, setTitleForSlug] = useState(initialData?.title || "");
  const [brandForSlug, setBrandForSlug] = useState(initialData?.brand || "");
  const [isSlugEditedByUser, setIsSlugEditedByUser] = useState(false);

  const [selectedCurrencies, setSelectedCurrencies] = useState<string[]>(
    initialData?.price ? Object.keys(initialData.price) : ["IRR"]
  );

  const [prices, setPrices] = useState<Record<string, string>>(() => {
    if (initialData?.price) {
      return Object.fromEntries(
        Object.entries(initialData.price).map(([k, v]) => [k, v.toString()])
      );
    }
    return { IRR: "" };
  });

  const [maxDiscounts, setMaxDiscounts] = useState<Record<string, string>>(() => {
    if (initialData?.maxDiscountAmount) {
      return Object.fromEntries(
        Object.entries(initialData.maxDiscountAmount).map(([k, v]) => [k, v.toString()])
      );
    }
    return {};
  });

  const [selectedPaymentAccountIds, setSelectedPaymentAccountIds] = useState<string[]>(
    initialData?.paymentAccountIds || []
  );

  const [selectedShippingMethodIds, setSelectedShippingMethodIds] = useState<string[]>(
    initialData?.shippingMethodIds || []
  );

  const schema = isEditMode ? updateProductSchema : createProductSchema;

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CreateProductForm | UpdateProductForm>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: initialData?.title || "",
      slug: initialData?.slug || "",
      brand: initialData?.brand || "",
      categoryId: initialData?.categoryId || "",
      description: initialData?.description || "",
      stock: initialData?.stock || 0,
      discountPercent: initialData?.discountPercent || 0,
      tags: initialData?.tags || "",
    },
  });

  const generateSlug = (text: string): string => {
    if (!text) return "";
    return text
      .trim()
      .toLowerCase()
      .replace(/[آأإآ]/g, "a")
      .replace(/إ|أ|آ/g, "a")
      .replace(/ب/g, "b")
      .replace(/پ/g, "p")
      .replace(/ت|ط/g, "t")
      .replace(/ث|س|ص/g, "s")
      .replace(/ج/g, "j")
      .replace(/چ/g, "ch")
      .replace(/ح|ه|ة/g, "h")
      .replace(/خ/g, "kh")
      .replace(/د/g, "d")
      .replace(/ذ|ز|ظ|ض/g, "z")
      .replace(/ر/g, "r")
      .replace(/ژ/g, "zh")
      .replace(/ش/g, "sh")
      .replace(/ع|غ/g, "gh")
      .replace(/ف/g, "f")
      .replace(/ق/g, "gh")
      .replace(/ک|ك/g, "k")
      .replace(/گ/g, "g")
      .replace(/ل/g, "l")
      .replace(/م/g, "m")
      .replace(/ن/g, "n")
      .replace(/و/g, "o")
      .replace(/ی|ي|ئ|ی/g, "y")
      .replace(/[^\w\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-+|-+$/g, "");
  };

  useEffect(() => {
    if (!isSlugEditedByUser) {
      const parts = [brandForSlug, titleForSlug].filter(Boolean).map(generateSlug);
      const generated = parts.join("-");
      if (generated && generated.length > 2) {
      }
    }
  }, [titleForSlug, brandForSlug, isSlugEditedByUser]);

  const handleSlugManualChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setIsSlugEditedByUser(true);
    e.target.value = generateSlug(e.target.value);
  };

  const addCurrency = (code: string) => {
    if (!selectedCurrencies.includes(code)) {
      setSelectedCurrencies((prev) => [...prev, code]);
      setPrices((prev) => ({ ...prev, [code]: "" }));
      setMaxDiscounts((prev) => ({ ...prev, [code]: "" }));
    }
  };

  const removeCurrency = (code: string) => {
    if (selectedCurrencies.length === 1) return;
    setSelectedCurrencies((prev) => prev.filter((c) => c !== code));
    setPrices((prev) => {
      const { [code]: _, ...rest } = prev;
      return rest;
    });
    setMaxDiscounts((prev) => {
      const { [code]: _, ...rest } = prev;
      return rest;
    });
  };

  const handleCreateCategory = async () => {
    if (!newCategoryName.trim() || newCategoryName.length < 2) return;
    setCreatingCategory(true);
    try {
      const res = await fetch("/api/admin/categories/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newCategoryName.trim() }),
      });
      if (res.ok) {
        const newCat = await res.json();
        setCategories((prev) => [...prev, newCat]);
        setNewCategoryName("");
        setShowNewCategoryInput(false);
      }
    } catch {
    } finally {
      setCreatingCategory(false);
    }
  };

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!imageUrl) {
      toast.error("تصویر اصلی الزامی است");
      return;
    }
    if (!prices.IRR || Number(prices.IRR) <= 0) {
      toast.error("قیمت تومان الزامی است");
      return;
    }

    startTransition(async () => {
      const formData = new FormData(e.currentTarget);
      if (isEditMode) {
        formData.append("id", initialData!.id!);
      }
      formData.append("image", imageUrl);
      galleryUrls.forEach((url, i) => formData.append(`gallery[${i}]`, url));
      formData.append("discountPercent", discountPercent || "0");
      selectedCurrencies.forEach((code) => {
        formData.append(`price[${code}]`, prices[code] || "0");
        formData.append(`maxDiscountAmount[${code}]`, maxDiscounts[code] || "0");
      });
      selectedShippingMethodIds.forEach((id, i) =>
        formData.append(`shippingMethodIds[${i}]`, id)
      );
      selectedPaymentAccountIds.forEach((id, i) =>
        formData.append(`paymentAccountIds[${i}]`, id)
      );

      const endpoint = isEditMode ? "/api/admin/products/edit" : "/api/admin/products/create";

      try {
        const res = await fetch(endpoint, {
          method: "POST",
          body: formData,
        });

        if (res.ok) {
          toast.success(isEditMode ? "محصول با موفقیت ویرایش شد!" : "محصول با موفقیت اضافه شد!");
          router.push("/admin/products");
          router.refresh();
        } else {
          const error = await res.text();
          toast.error("خطا: " + error);
        }
      } catch {
        toast.error("مشکل ارتباط با سرور");
      }
    });
  };

  return (
    <form onSubmit={onSubmit} className="space-y-32">
      {/* عنوان + اسلاگ */}
      <div className="grid lg:grid-cols-2 gap-16">
        <div>
          <label className="block text-3xl font-black mb-6">عنوان محصول *</label>
          <input
            {...register("title")}
            placeholder="ایمپلنت Straumann Roxolid SLA"
            onChange={(e) => setTitleForSlug(e.target.value)}
            className="w-full px-10 py-8 rounded-3xl border-4 border-border focus:border-primary text-2xl shadow-2xl bg-background"
          />
        </div>
        <div>
          <div className="flex items-center justify-between mb-6">
            <label className="text-3xl font-black">اسلاگ (Slug) *</label>
            {!isSlugEditedByUser && titleForSlug && (
              <span className="text-sm font-bold text-emerald-600 animate-pulse">اتوماتیک</span>
            )}
          </div>
          <input
            {...register("slug")}
            placeholder="straumann-roxolid-sla"
            onChange={handleSlugManualChange}
            onFocus={() => setIsSlugEditedByUser(true)}
            className="w-full px-10 py-8 rounded-3xl border-4 border-border focus:border-primary text-2xl shadow-2xl bg-background"
          />
        </div>
      </div>

      {/* برند + دسته‌بندی */}
      <div className="grid lg:grid-cols-2 gap-16">
        <div>
          <label className="block text-3xl font-black mb-6">برند</label>
          <input
            {...register("brand")}
            placeholder="Straumann, Osstem"
            onChange={(e) => setBrandForSlug(e.target.value)}
            className="w-full px-10 py-8 rounded-3xl border-4 border-border focus:border-primary text-2xl shadow-2xl bg-background"
          />
        </div>
        <div>
          <label className="block text-3xl font-black mb-6">دسته‌بندی *</label>
          {showNewCategoryInput ? (
            <div className="space-y-6">
              <input
                type="text"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                placeholder="نام دسته‌بندی جدید..."
                autoFocus
                className="w-full px-10 py-8 rounded-3xl border-4 border-emerald-300 focus:border-emerald-600 text-2xl shadow-2xl bg-background"
              />
              <div className="flex gap-6">
                <button
                  type="button"
                  onClick={handleCreateCategory}
                  disabled={creatingCategory}
                  className="bg-emerald-600 text-white px-12 py-6 rounded-3xl text-2xl font-black hover:bg-emerald-700 disabled:opacity-50"
                >
                  {creatingCategory ? "در حال ذخیره..." : "ذخیره"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowNewCategoryInput(false);
                    setNewCategoryName("");
                  }}
                  className="bg-gray-300 px-12 py-6 rounded-3xl text-2xl font-black"
                >
                  انصراف
                </button>
              </div>
            </div>
          ) : (
            <>
              <select
                {...register("categoryId")}
                className="w-full px-10 py-8 rounded-3xl border-4 border-border focus:border-primary text-2xl shadow-xl bg-background"
              >
                <option value="">انتخاب کنید</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => setShowNewCategoryInput(true)}
                className="mt-8 w-full bg-gradient-to-r from-cyan-600 to-blue-600 text-white py-8 rounded-3xl text-2xl font-black hover:scale-105 transition"
              >
                افزودن دسته‌بندی جدید
              </button>
            </>
          )}
        </div>
      </div>

      {/* روش‌های ارسال */}
      <div className="bg-gradient-to-br from-teal-50 via-cyan-50 to-blue-50 rounded-3xl p-20 shadow-3xl border border-border/50">
        <h2 className="text-5xl md:text-6xl font-black text-center mb-20 bg-gradient-to-r from-cyan-600 to-blue-700 bg-clip-text text-transparent">
          روش‌های ارسال
        </h2>
        <ProductShippingMethodsSelector
          methods={shippingMethods}
          selectedIds={selectedShippingMethodIds}
          onChange={setSelectedShippingMethodIds}
        />
      </div>

      {/* قیمت‌گذاری + تخفیف */}
      <div className="bg-gradient-to-br from-purple-50 via-pink-50 to-amber-50 rounded-3xl p-20 shadow-3xl border border-border/50">
        <h2 className="text-5xl md:text-6xl font-black text-center mb-20 bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
          قیمت‌گذاری جهانی + حداکثر تخفیف
        </h2>
        <div className="space-y-12">
          {selectedCurrencies.map((code) => {
            const currency = AVAILABLE_CURRENCIES.find((c) => c.code === code)!;
            return (
              <div
                key={code}
                className="bg-card/90 rounded-3xl p-10 shadow-2xl border border-border/50 flex items-end gap-8"
              >
                <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-10">
                  <div>
                    <label className="block text-2xl font-black mb-4 flex items-center gap-3">
                      {currency.flag} {currency.name} <span className="text-lg text-muted-foreground">({currency.symbol})</span>
                    </label>
                    <input
                      type="number"
                      value={prices[code] || ""}
                      required={code === "IRR"}
                      onChange={(e) =>
                        setPrices((p) => ({ ...p, [code]: e.target.value }))
                      }
                      placeholder="مثلاً ۲۵۰۰۰۰۰"
                      className="w-full px-8 py-6 rounded-2xl border-4 border-border focus:border-primary text-2xl font-bold shadow-lg bg-background"
                    />
                  </div>
                  <div>
                    <label className="block text-2xl font-black mb-4">
                      حداکثر تخفیف ({currency.symbol})
                    </label>
                    <input
                      type="number"
                      value={maxDiscounts[code] || ""}
                      onChange={(e) =>
                        setMaxDiscounts((p) => ({ ...p, [code]: e.target.value }))
                      }
                      placeholder="مثلاً ۵۰۰۰۰۰"
                      className="w-full px-8 py-6 rounded-2xl border-4 border-border focus:border-amber-600 text-2xl font-bold shadow-lg bg-background"
                    />
                  </div>
                </div>
                {selectedCurrencies.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeCurrency(code)}
                    className="bg-destructive hover:bg-destructive/80 text-white p-5 rounded-2xl shadow-lg transition transform hover:scale-110"
                  >
                    <Trash2 size={28} />
                  </button>
                )}
              </div>
            );
          })}
        </div>
        <div className="mt-16 flex flex-wrap gap-6 justify-center">
          {AVAILABLE_CURRENCIES.filter((c) => !selectedCurrencies.includes(c.code)).map((c) => (
            <button
              key={c.code}
              type="button"
              onClick={() => addCurrency(c.code)}
              className="flex items-center gap-3 bg-gradient-to-r from-primary to-secondary text-white px-10 py-6 rounded-3xl font-black text-xl shadow-2xl hover:scale-110 transition"
            >
              <Plus size={32} />
              {c.flag} {c.name}
            </button>
          ))}
        </div>
        <div className="mt-20 p-16 bg-gradient-to-r from-amber-100 to-orange-100 rounded-3xl border border-amber-300 text-center">
          <label className="block text-4xl font-black mb-8">درصد تخفیف عمومی محصول (%)</label>
          <input
            type="number"
            value={discountPercent}
            onChange={(e) => setDiscountPercent(e.target.value)}
            min="0"
            max="99"
            placeholder="۲۵"
            className="w-80 px-12 py-8 rounded-3xl border-4 border-amber-500 focus:border-amber-700 text-5xl font-bold text-center shadow-2xl bg-background"
          />
        </div>
      </div>

      {/* حساب‌های پرداخت */}
      <ProductPaymentAccountsSelector
        accounts={paymentAccounts}
        selectedIds={selectedPaymentAccountIds}
        onChange={setSelectedPaymentAccountIds}
      />

      {/* موجودی + تگ‌ها */}
      <div className="grid lg:grid-cols-2 gap-16">
        <div>
          <label className="block text-3xl font-black mb-6">موجودی *</label>
          <input
            {...register("stock", { valueAsNumber: true })}
            type="number"
            required
            className="w-full px-10 py-8 rounded-3xl border-4 border-border focus:border-primary text-2xl shadow-2xl bg-background"
          />
        </div>
        <div>
          <label className="block text-3xl font-black mb-6">تگ‌ها (با کاما)</label>
          <input
            {...register("tags")}
            placeholder="ایمپلنت, سوئیسی, تیتانیوم"
            className="w-full px-10 py-8 rounded-3xl border-4 border-border focus:border-primary text-2xl shadow-2xl bg-background"
          />
        </div>
      </div>

      {/* توضیحات */}
      <div>
        <label className="block text-3xl font-black mb-8">توضیحات کامل *</label>
        <textarea
          {...register("description")}
          rows={12}
          required
          placeholder="جنس، کاربرد، گارانتی..."
          className="w-full px-12 py-10 rounded-3xl border-4 border-border focus:border-primary text-xl resize-none shadow-2xl bg-background"
        />
      </div>

      {/* تصاویر */}
      <div className="grid lg:grid-cols-2 gap-24">
        <div>
          <label className="block text-3xl font-black mb-8">تصویر اصلی *</label>
          <ImageUploader onUpload={setImageUrl} />
          {imageUrl && (
            <img
              src={imageUrl}
              alt="preview"
              className="mt-8 mx-auto max-h-96 rounded-3xl shadow-3xl"
            />
          )}
        </div>
        <div>
          <label className="block text-3xl font-black mb-8">گالری (اختیاری)</label>
          <ImageUploader onUpload={(url) => setGalleryUrls((p) => [...p, url])} multiple />
          {galleryUrls.length > 0 && (
            <div className="grid grid-cols-3 gap-8 mt-8">
              {galleryUrls.map((url, i) => (
                <img key={i} src={url} alt="" className="rounded-3xl shadow-2xl" />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* دکمه نهایی */}
      <div className="text-center pt-20">
        <button
          type="submit"
          disabled={isPending || !imageUrl}
          className={`px-64 py-16 rounded-3xl text-6xl font-black shadow-3xl transition-all transform hover:scale-110 ${
            isPending || !imageUrl
              ? "bg-muted text-muted-foreground cursor-not-allowed"
              : "bg-gradient-to-r from-primary via-secondary to-pink-600 text-white"
          }`}
        >
          {isPending ? (
            <>
              <Loader2 className="inline-block animate-spin mr-8" size={64} />
              در حال ذخیره...
            </>
          ) : (
            "ذخیره تغییرات"
          )}
        </button>
      </div>
    </form>
  );
}