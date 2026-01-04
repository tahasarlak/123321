// src/components/shipping/ShippingModal.tsx
"use client";

import { Truck, Clock, Shield, PackageCheck } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useTranslations } from "next-intl";

interface ShippingMethod {
  id: string;
  name: string;
  description?: string;
  deliveryTime: string;
  cost: number;
  isFreeOver?: number;
}

interface ShippingModalProps {
  shippingMethods: ShippingMethod[];
  className?: string;
}

export default function ShippingModal({
  shippingMethods,
  className,
}: ShippingModalProps) {
  const t = useTranslations("shipping");

  if (shippingMethods.length === 0) return null;

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="lg"
          className={cn(
            "group relative w-full rounded-4xl border-4 border-primary/30 bg-card/90 px-12 py-10 text-3xl font-black shadow-3xl backdrop-blur-3xl transition-all duration-700 hover:border-primary hover:bg-primary/5 hover:shadow-4xl hover:scale-105",
            className
          )}
        >
          <Truck className="h-16 w-16 text-primary transition-transform group-hover:scale-110" />
          <span className="mr-6">{t("title") || "روش‌های ارسال"}</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl rounded-4xl bg-card/98 backdrop-blur-3xl shadow-5xl ring-4 ring-primary/20">
        <DialogHeader>
          <DialogTitle className="text-5xl font-black bg-gradient-to-r from-primary to-violet-600 bg-clip-text text-transparent">
            {t("modal_title") || "روش‌های ارسال محصول"}
          </DialogTitle>
          <DialogDescription className="text-2xl text-muted-foreground mt-6">
            {t("modal_desc") || "انتخاب کنید کدام روش برای شما مناسب‌تر است"}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-10 mt-12">
          {shippingMethods.map((method) => (
            <div
              key={method.id}
              className="group relative rounded-4xl bg-gradient-to-br from-card to-muted/40 p-10 shadow-2xl ring-2 ring-border/50 backdrop-blur-xl transition-all duration-700 hover:shadow-4xl hover:scale-[1.02] hover:ring-primary/40"
            >
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-8">
                <div className="flex items-start gap-8">
                  <div className="rounded-full bg-primary/10 p-6 shadow-xl ring-4 ring-primary/20">
                    <Truck className="h-16 w-16 text-primary" />
                  </div>
                  <div className="space-y-4">
                    <h3 className="text-4xl font-black text-foreground">{method.name}</h3>
                    {method.description && (
                      <p className="text-xl text-muted-foreground">{method.description}</p>
                    )}
                    <div className="flex flex-wrap gap-8 mt-6">
                      <div className="flex items-center gap-4">
                        <Clock className="h-10 w-10 text-violet-600" />
                        <span className="text-2xl font-bold">{method.deliveryTime}</span>
                      </div>
                      {method.isFreeOver && (
                        <div className="flex items-center gap-4">
                          <Shield className="h-10 w-10 text-emerald-600" />
                          <span className="text-2xl font-bold text-emerald-600">
                            {t("free_over") || "رایگان بالای"} {method.isFreeOver.toLocaleString("fa-IR")} تومان
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                <div className="text-left md:text-right">
                  <p className="text-2xl text-muted-foreground">{t("cost") || "هزینه ارسال:"}</p>
                  <p className="text-5xl font-black text-primary mt-2">
                    {method.cost === 0
                      ? t("free") || "رایگان"
                      : `${method.cost.toLocaleString("fa-IR")} تومان`}
                  </p>
                  {method.cost === 0 && <PackageCheck className="h-12 w-12 text-emerald-600 mx-auto mt-4" />}
                </div>
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}