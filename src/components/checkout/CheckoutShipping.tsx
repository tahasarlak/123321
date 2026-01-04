// src/components/checkout/CheckoutShipping.tsx
"use client";
import { useState } from "react";

export default function CheckoutShipping({ zones, pickupLocations }: any) {
  const [method, setMethod] = useState<"shipping" | "pickup">("shipping");
  const [selectedRule, setSelectedRule] = useState<string>("");

  return (
    <div className="bg-white rounded-4xl shadow-3xl p-16">
      <h2 className="text-6xl font-black mb-12 text-center">روش ارسال</h2>

      <div className="flex gap-12 mb-16 justify-center">
        <button onClick={() => setMethod("shipping")} className={`px-20 py-10 rounded-3xl text-4xl font-black transition ${method === "shipping" ? "bg-gradient-to-r from-teal-600 to-cyan-600 text-white" : "bg-gray-200"}`}>
          ارسال به آدرس
        </button>
        <button onClick={() => setMethod("pickup")} className={`px-20 py-10 rounded-3xl text-4xl font-black transition ${method === "pickup" ? "bg-gradient-to-r from-emerald-600 to-green-600 text-white" : "bg-gray-200"}`}>
          تحویل حضوری
        </button>
      </div>

      {method === "shipping" && (
        <div className="space-y-12">
          {zones.flatMap((z: any) => z.rules).map((rule: any) => (
            <label key={rule.id} className="flex items-center justify-between p-12 bg-gradient-to-r from-teal-50 to-cyan-50 rounded-3xl cursor-pointer hover:shadow-2xl transition">
              <div>
                <p className="text-4xl font-black text-teal-700">{rule.title}</p>
                <p className="text-2xl text-gray-700">
                  {rule.method === "FREE" ? "رایگان" : rule.cost?.toLocaleString() + " تومان"}
                  {rule.estimatedDays && ` • ${rule.estimatedDays}`}
                </p>
              </div>
              <input type="radio" name="shippingRule" value={rule.id} className="w-12 h-12" />
            </label>
          ))}
        </div>
      )}

      {method === "pickup" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
          {pickupLocations.map((loc: any) => (
            <label key={loc.id} className="p-12 bg-gradient-to-br from-emerald-50 to-teal-50 rounded-3xl cursor-pointer hover:shadow-3xl transition">
              <p className="text-4xl font-black text-emerald-700">{loc.title}</p>
              <p className="text-2xl text-gray-700 mt-4">{loc.address}</p>
              <p className="text-xl text-indigo-600 mt-4">{loc.city.name} • {loc.city.province.country.name}</p>
              <input type="radio" name="pickupLocation" value={loc.id} className="mt-8 w-10 h-10" />
            </label>
          ))}
        </div>
      )}
    </div>
  );
}