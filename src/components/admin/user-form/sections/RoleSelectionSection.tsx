"use client";

import { Control, FieldErrors, UseFormSetValue, useWatch } from "react-hook-form";
import { Search, AlertCircle } from "lucide-react";
import debounce from "lodash.debounce";
import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import React from "react";

import { ROLE_DISPLAY_CONFIG } from "@/config/roles";
import { useUserRoles } from "@/lib/hooks/useUserRoles";
import { FormValues } from "@/types/user";
import { SelectedRolesBadges } from "./SelectedRolesBadges";

interface Props {
  control: Control<FormValues>;
  errors: FieldErrors<FormValues>;
  setValue: UseFormSetValue<FormValues>;
}

export const RoleSelectionSection = React.memo(function RoleSelectionSection({
  control,
  errors,
  setValue,
}: Props) {
  const t = useTranslations("admin");

  const [searchTerm, setSearchTerm] = useState("");

  const selectedRoles = useWatch({ control, name: "roles" }) || [];

  const handleRolesChange = (roles: string[]) =>
    setValue("roles", roles, { shouldValidate: true });

  const { availableRoles = [], toggleRole, removeRole } = useUserRoles(
    selectedRoles,
    handleRolesChange
  );

  // Debounced search
  const debouncedSetSearchTerm = useMemo(
    () => debounce((value: string) => setSearchTerm(value), 250),
    []
  );

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    debouncedSetSearchTerm(e.target.value);
  };

  useEffect(() => {
    return () => debouncedSetSearchTerm.cancel();
  }, [debouncedSetSearchTerm]);

  // Filtered roles based on search term
  const filteredRoles = useMemo(() => {
    if (!searchTerm.trim()) return availableRoles;

    const lowerSearch = searchTerm.toLowerCase();

    return availableRoles.filter((roleValue: string) => {
      const config = ROLE_DISPLAY_CONFIG[roleValue];
      const label = config?.label || roleValue;
      return label.toLowerCase().includes(lowerSearch);
    });
  }, [availableRoles, searchTerm]);

  const rolesErrorMessage = errors.roles?.message ?? errors.roles?.root?.message;

  return (
    <div className="space-y-4">
      {/* Header with label and error */}
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium flex items-center gap-2">
          {t("user_roles") || "نقش‌های کاربر"} <span className="text-red-500">*</span>
        </label>
        {rolesErrorMessage && (
          <p className="text-sm text-red-500 flex items-center gap-1">
            <AlertCircle className="h-4 w-4" />
            {rolesErrorMessage}
          </p>
        )}
      </div>

      {/* Search input */}
      <div className="relative">
        <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
        <input
          type="text"
          placeholder={t("search_role") || "جستجوی نقش..."}
          onChange={handleSearchChange}
          className="w-full px-4 py-3 ps-12 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-shadow"
        />
      </div>

      {/* Roles list */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 max-h-96 overflow-y-auto p-4 bg-muted/20 rounded-lg">
        {filteredRoles.length === 0 ? (
          <p className="text-muted-foreground col-span-full text-center py-8">
            {t("no_role_found") || "هیچ نقشی یافت نشد"}
          </p>
        ) : (
          filteredRoles.map((roleValue: string) => {
            const config = ROLE_DISPLAY_CONFIG[roleValue];
            const label = config?.label || roleValue;

            return (
              <label
                key={roleValue}
                className="flex items-center gap-3 cursor-pointer p-3 hover:bg-muted rounded transition-colors"
              >
                <input
                  type="checkbox"
                  checked={selectedRoles.includes(roleValue)}
                  onChange={() => toggleRole(roleValue)}
                  className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary"
                />
                <span className="text-sm">{label}</span>
              </label>
            );
          })
        )}
      </div>

      {/* Selected roles badges */}
      {selectedRoles.length > 0 && (
        <div>
          <p className="text-sm font-medium mb-2">
            {t("selected_roles") || "نقش‌های انتخاب‌شده"} ({selectedRoles.length}):
          </p>
          <SelectedRolesBadges roles={selectedRoles} onRemove={removeRole} />
        </div>
      )}
    </div>
  );
});

RoleSelectionSection.displayName = "RoleSelectionSection";