// src/components/admin/ProductPaymentAccountsSelector.tsx
"use client";

import { CreditCard, Building2, Globe } from "lucide-react";
import { useState } from "react";

interface PaymentAccount {
  id: string;
  title: string;
  type: "CARD_TO_CARD" | "BANK_TRANSFER" | "CRYPTO";
  bankName: string;
  country: { flagEmoji: string; name: string; currency: string };
  isActive: boolean;
}

interface Props {
  accounts: PaymentAccount[];
  selectedIds?: string[];
  onChange: (ids: string[]) => void;
}

export default function ProductPaymentAccountsSelector({
  accounts,
  selectedIds = [],
  onChange,
}: Props) {
  const [selected, setSelected] = useState<string[]>(selectedIds);

  const toggle = (id: string) => {
    const newSelected = selected.includes(id)
      ? selected.filter((x) => x !== id)
      : [...selected, id];
    setSelected(newSelected);
    onChange(newSelected);
  };

  const activeAccounts = accounts.filter((a) => a.isActive);

  if (activeAccounts.length === 0) {
    return (
      <div className="text-center py-32 bg-muted/30 rounded-3xl">
        <Globe size={100} className="mx-auto text-muted-foreground mb-8" />
        <p className="text-4xl font-bold text-muted-foreground">
          هیچ حساب پرداختی فعالی وجود ندارد!
        </p>
      </div>
    );
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "CARD_TO_CARD":
        return <CreditCard size={80} />;
      case "BANK_TRANSFER":
        return <Building2 size={80} />;
      case "CRYPTO":
        return <Globe size={80} />;
      default:
        return <CreditCard size={80} />;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case "CARD_TO_CARD":
        return "کارت به کارت";
      case "BANK_TRANSFER":
        return "حواله بانکی / IBAN";
      case "CRYPTO":
        return "کریپتو";
      default:
        return type;
    }
  };

  return (
    <div className="bg-gradient-to-br from-primary/10 via-secondary/10 to-pink-600/10 rounded-3xl p-16 shadow-3xl border border-border/50">
      <h2 className="text-5xl md:text-6xl font-black text-center mb-12 bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
        حساب‌های پرداخت مجاز برای این محصول
      </h2>
      <p className="text-center text-2xl text-muted-foreground mb-16">
        مشتری فقط با حساب‌های انتخاب‌شده می‌تواند پرداخت کند
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12">
        {activeAccounts.map((acc) => {
          const isSelected = selected.includes(acc.id);
          return (
            <label
              key={acc.id}
              className={`cursor-pointer block relative transition-all duration-500 hover:scale-105 ${
                isSelected ? "ring-8 ring-primary shadow-3xl" : ""
              }`}
            >
              <input
                type="checkbox"
                checked={isSelected}
                onChange={() => toggle(acc.id)}
                className="sr-only peer"
              />
              <div
                className={`bg-card rounded-3xl p-12 text-center shadow-2xl border-4 transition-all duration-300 ${
                  isSelected ? "border-primary bg-primary/5" : "border-border"
                }`}
              >
                <div
                  className={`mx-auto w-32 h-32 bg-gradient-to-br ${
                    acc.type === "CARD_TO_CARD"
                      ? "from-blue-500 to-cyan-600"
                      : acc.type === "BANK_TRANSFER"
                      ? "from-purple-500 to-pink-600"
                      : "from-orange-500 to-red-600"
                  } rounded-3xl flex items-center justify-center shadow-2xl mb-8 text-white`}
                >
                  {getTypeIcon(acc.type)}
                </div>
                <h4 className="text-3xl md:text-4xl font-black text-foreground mb-4">
                  {acc.title}
                </h4>
                <p className="text-xl md:text-2xl text-muted-foreground mb-4">
                  {acc.bankName}
                </p>
                <div className="text-5xl md:text-6xl my-6">{acc.country.flagEmoji}</div>
                <p className="text-xl md:text-2xl font-bold text-primary">
                  {acc.country.name} ({acc.country.currency})
                </p>
                <p className="text-lg text-muted-foreground mt-4">
                  {getTypeLabel(acc.type)}
                </p>
              </div>
            </label>
          );
        })}
      </div>
      <div className="text-center mt-20">
        <p className="text-4xl md:text-5xl font-black text-primary">
          {selected.length > 0
            ? `${selected.length} حساب انتخاب شده`
            : "هیچ حسابی انتخاب نشده"}
        </p>
      </div>
    </div>
  );
}