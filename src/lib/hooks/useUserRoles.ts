import { useCallback } from "react";
import { ROLES } from "@/config/roles";

export function useUserRoles(
  currentRoles: string[] = [],
  onRolesChange: (roles: string[]) => void
) {
  const toggleRole = useCallback(
    (role: string) => {
      const updated = currentRoles.includes(role)
        ? currentRoles.filter((r) => r !== role)
        : [...currentRoles, role];
      onRolesChange(updated);
    },
    [currentRoles, onRolesChange]
  );

  const removeRole = useCallback(
    (role: string) => {
      onRolesChange(currentRoles.filter((r) => r !== role));
    },
    [currentRoles, onRolesChange]
  );

  return {
    availableRoles: ROLES,
    toggleRole,
    removeRole,
  };
}