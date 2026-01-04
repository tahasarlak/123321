import { memo } from "react";
import { X, UserCog } from "lucide-react";
import { ROLE_DISPLAY_CONFIG } from "@/config/roles"; // فقط این رو ایمپورت کن

interface SelectedRolesBadgesProps {
  roles: string[];
  onRemove: (role: string) => void;
}

const defaultConfig = {
  color: "bg-primary/10 text-primary",
  icon: UserCog,
  label: "نقش نامشخص", // اضافه کردیم چون حالا label هم نیاز داریم
};

export const SelectedRolesBadges = memo(({ roles, onRemove }: SelectedRolesBadgesProps) => {
  if (roles.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2">
      {roles.map((role) => {
        // config حالا شامل label هم هست
        const config = ROLE_DISPLAY_CONFIG[role] || defaultConfig;
        const Icon = config.icon || defaultConfig.icon;
        const label = config.label || role; // از label داخل config استفاده کن

        return (
          <span
            key={role}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium ${
              config.color ? `bg-${config.color.replace("text-", "")}-100 text-${config.color}` : defaultConfig.color
            }`}
          >
            {Icon && <Icon className="w-4 h-4" />}
            <span>{label}</span>
            <button
              type="button"
              onClick={() => onRemove(role)}
              className="hover:text-red-600 transition"
              aria-label={`حذف نقش ${label}`}
            >
              <X className="w-4 h-4" />
            </button>
          </span>
        );
      })}
    </div>
  );
});

SelectedRolesBadges.displayName = "SelectedRolesBadges";