// src/app/[locale]/admin/roles/components/RolesList.tsx
import { getTranslations } from "next-intl/server";
import { cn } from "@/lib/utils/cn";
import { AVAILABLE_ICONS, AVAILABLE_COLORS } from "@/config/roles";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Edit2, Trash2 } from "lucide-react";
import { updateCustomRole, deleteCustomRole } from "@/actions/admin/roles";


type RoleItem = {
  role: string;
  label: string;
  description: string;
  icon: any; // LucideIcon | null
  color: string;
  order: number;
  userCount: number;
  isCustom: boolean;
};

type Props = {
  roles: RoleItem[];
  locale: string;
};

export default async function RolesList({ roles, locale }: Props) {
  const t = await getTranslations({ locale, namespace: "admin" });

  return (
    <div className="space-y-8">
      {roles.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-3xl text-muted-foreground">
            {t("no_roles") || "هیچ نقشی یافت نشد"}
          </p>
        </div>
      ) : (
        roles.map((roleItem) => {
          const IconComponent = roleItem.icon;

          return (
            <div
              key={roleItem.role}
              className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 p-8 bg-muted/30 rounded-3xl border border-border/50 hover:bg-muted/60 transition-all group"
            >
              <div className="flex items-center gap-6">
                {IconComponent && (
                  <IconComponent size={56} className={cn(roleItem.color)} />
                )}
                <div>
                  <h3 className="text-2xl md:text-3xl font-black text-foreground flex items-center gap-3 flex-wrap">
                    {roleItem.label}
                    {!roleItem.isCustom && (
                      <span className="text-sm font-normal text-muted-foreground whitespace-nowrap">
                        (سیستمی)
                      </span>
                    )}
                    {roleItem.isCustom && (
                      <span className="text-sm font-normal text-muted-foreground whitespace-nowrap">
                        (سفارشی)
                      </span>
                    )}
                  </h3>

                  {roleItem.description && (
                    <p className="text-base md:text-lg text-muted-foreground mt-2 max-w-xl">
                      {roleItem.description}
                    </p>
                  )}

                  <p className="text-base md:text-lg text-muted-foreground mt-3">
                    تعداد کاربران:{" "}
                    <span className="font-bold text-foreground">
                      {roleItem.userCount.toLocaleString("fa-IR")}
                    </span>
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 md:gap-4 w-full sm:w-auto justify-end">
                {roleItem.isCustom && (
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="lg" className="gap-2 min-w-[100px]">
                        <Edit2 size={20} />
                        ویرایش
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-lg sm:max-w-2xl">
                      <DialogHeader>
                        <DialogTitle className="text-2xl md:text-3xl">
                          ویرایش نقش: {roleItem.label}
                        </DialogTitle>
                      </DialogHeader>

                      <form action={updateCustomRole.bind(null, roleItem.role)}>
                        <div className="grid gap-5 py-6">
                          <div className="grid gap-2">
                            <Label htmlFor="label">برچسب نمایشی</Label>
                            <Input
                              id="label"
                              name="label"
                              defaultValue={roleItem.label}
                              required
                            />
                          </div>

                          <div className="grid gap-2">
                            <Label htmlFor="description">توضیحات</Label>
                            <Textarea
                              id="description"
                              name="description"
                              defaultValue={roleItem.description}
                            />
                          </div>

                          <div className="grid gap-2">
                            <Label htmlFor="icon">آیکن</Label>
                            <Select
                              name="icon"
                              defaultValue={
                                AVAILABLE_ICONS.find((i) => i.component === roleItem.icon)?.value || ""
                              }
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="انتخاب آیکن" />
                              </SelectTrigger>
                              <SelectContent>
                                {AVAILABLE_ICONS.map((icon) => (
                                  <SelectItem key={icon.value} value={icon.value}>
                                    {icon.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="grid gap-2">
                            <Label htmlFor="color">رنگ</Label>
                            <Select name="color" defaultValue={roleItem.color}>
                              <SelectTrigger>
                                <SelectValue placeholder="انتخاب رنگ" />
                              </SelectTrigger>
                              <SelectContent>
                                {AVAILABLE_COLORS.map((c) => (
                                  <SelectItem key={c.value} value={c.value}>
                                    {c.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="grid gap-2">
                            <Label htmlFor="order">ترتیب نمایش</Label>
                            <Input
                              id="order"
                              name="order"
                              type="number"
                              defaultValue={roleItem.order}
                            />
                          </div>
                        </div>

                        <DialogFooter>
                          <Button type="submit" size="lg">
                            ذخیره تغییرات
                          </Button>
                        </DialogFooter>
                      </form>
                    </DialogContent>
                  </Dialog>
                )}

                <form action={deleteCustomRole.bind(null, roleItem.role)}>
                  <Button
                    type="submit"
                    variant="destructive"
                    size="lg"
                    disabled={!roleItem.isCustom || roleItem.userCount > 0}
                    className="gap-2 min-w-[100px]"
                  >
                    <Trash2 size={20} />
                    حذف
                  </Button>
                </form>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}