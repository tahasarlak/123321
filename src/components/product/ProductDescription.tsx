// src/components/product//ProductDescription.tsx

import ReadMore from "../ui/ReadMore";

interface ProductDescriptionProps {
  description: string;
}

export default function ProductDescription({ description }: ProductDescriptionProps) {
  return (
    <div className="bg-gray-50 rounded-3xl p-10 border border-gray-200">
      <h2 className="text-4xl font-black mb-8 text-gray-800">توضیحات کامل محصول</h2>
      
      <ReadMore
        maxHeight={180}
        gradient={true}
        expandText="نمایش بیشتر"
        collapseText="نمایش کمتر"
      >
        {description || "توضیحات به‌زودی اضافه می‌شود..."}
      </ReadMore>
    </div>
  );
}