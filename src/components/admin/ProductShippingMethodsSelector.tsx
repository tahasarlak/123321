// src/components/admin/ProductShippingMethodsSelector.tsx
"use client";

import { Truck, MapPin, DollarSign, Globe } from "lucide-react";

interface ShippingMethod {
  id: string;
  title: string;
  type: string;
  isActive: boolean;
}

interface Props {
  methods: ShippingMethod[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
}

export default function ProductShippingMethodsSelector({
  methods,
  selectedIds,
  onChange,
}: Props) {
  const toggleMethod = (id: string) => {
    const newSelected = selectedIds.includes(id)
      ? selectedIds.filter((x) => x !== id)
      : [...selectedIds, id];
    onChange(newSelected);
  };

  const getIcon = (type: string) => {
    switch (type) {
      case "POST":
      case "COURIER":
      case "TIPAX":
        return <Truck size={56} className="text-blue-600" />;
      case "PRESENTIAL":
        return <MapPin size={56} className="text-emerald-600" />;
      case "FREE":
        return <DollarSign size={56} className="text-success" />;
      default:
        return <Globe size={56} className="text-cyan-600" />;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case "PRESENTIAL":
        return "تحویل حضوری";
      case "FREE":
        return "رایگان";
      default:
        return type;
    }
  };

  const activeMethods = methods.filter((m) => m.isActive);

  if (activeMethods.length === 0) {
    return (
      <div className="text-center py-32 bg-muted/30 rounded-3xl">
        <Globe size={100} className="mx-auto text-muted-foreground mb-8" />
        <p className="text-4xl font-bold text-muted-foreground">
          هیچ روش ارسالی فعالی تعریف نشده
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12">
      {activeMethods.map((method) => {
        const isSelected = selectedIds.includes(method.id);
        return (
          <label
            key={method.id}
            className={`block p-12 rounded-3xl border-6 cursor-pointer transition-all duration-500 hover:scale-105 shadow-2xl ${
              isSelected
                ? "bg-gradient-to-br from-teal-600 to-cyan-700 text-white border-teal-400"
                : "bg-card border-border"
            }`}
          >
            <input
              type="checkbox"
              checked={isSelected}
              onChange={() => toggleMethod(method.id)}
              className="sr-only"
            />
            <div className="flex items-center gap-8 mb-6">
              {getIcon(method.type)}
              <div>
                <h4 className={`text-3xl md:text-4xl font-black ${isSelected ? "text-white" : "text-foreground"}`}>
                  {method.title}
                </h4>
                <p className={`text-xl md:text-2xl mt-2 ${isSelected ? "opacity-90" : "text-muted-foreground"}`}>
                  {getTypeLabel(method.type)}
                </p>
              </div>
            </div>
          </label>
        );
      })}
    </div>
  );
}