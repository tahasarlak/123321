// src/components/common/MediaCard.tsx
import Link from "next/link";
import Image from "next/image";
import PriceBox from "../price/PriceBox";
import { FiStar, FiClock, FiUsers } from "react-icons/fi";

interface MediaCardProps {
  href: string;
  image: string;
  title: string;
  subtitle?: string;
  price: number;
  oldPrice?: number;
  discountPercent?: number;
  rating?: number;
  reviewsCount?: number;
  duration?: string;        // مثلاً "۱۲ ساعت"
  students?: number;        // مثلاً "۳۲۰۰ نفر"
  badge?: string;           // مثلاً "پرفروش"، "جدید"، "رایگان"
  isLiked?: boolean;
}

export default function MediaCard({
  href,
  image,
  title,
  subtitle,
  price,
  oldPrice,
  discountPercent,
  rating = 0,
  reviewsCount = 0,
  duration,
  students,
  badge,
  isLiked = false,
}: MediaCardProps) {
  return (
    <Link href={href} className="group block">
      <div className="bg-white rounded-3xl shadow-xl overflow-hidden hover:shadow-3xl hover:-translate-y-4 transition-all duration-500">
        <div className="relative aspect-[4/3] overflow-hidden">
          <Image src={image} alt={title} fill className="object-cover group-hover:scale-110 transition" />
          {badge && (
            <span className="absolute top-4 left-4 bg-amber-500 text-white px-6 py-3 rounded-full text-lg font-bold">
              {badge}
            </span>
          )}
        </div>

        <div className="p-8 space-y-6">
          <h3 className="text-3xl font-black line-clamp-2 group-hover:text-indigo-600 transition">{title}</h3>
          {subtitle && <p className="text-gray-600 text-xl">{subtitle}</p>}

          <div className="flex items-center gap-6 text-lg">
            {rating > 0 && (
              <div className="flex items-center gap-2">
                <FiStar className="text-yellow-500" size={28} />
                <span className="font-bold">{rating.toFixed(1)}</span>
                <span className="text-gray-500">({reviewsCount})</span>
              </div>
            )}
            {duration && <div className="flex items-center gap-2"><FiClock size={24} /> {duration}</div>}
            {students && <div className="flex items-center gap-2"><FiUsers size={24} /> {students.toLocaleString()}</div>}
          </div>

          <PriceBox price={price} oldPrice={oldPrice} discountPercent={discountPercent} size="normal" />
        </div>
      </div>
    </Link>
  );
}