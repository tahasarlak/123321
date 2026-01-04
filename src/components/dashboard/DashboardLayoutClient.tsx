"use client";

import { useState, useRef, useEffect, memo } from "react";
import Link from "next/link";
import { usePathname, useSearchParams, useRouter } from "next/navigation";
import { Session } from "next-auth";
import {
  Home,
  Users,
  BookOpen,
  ShoppingCart,
  DollarSign,
  Settings,
  LogOut,
  TrendingUp,
  GraduationCap,
  Gavel,
  PlayCircle,
  PlusCircle,
  MessageSquare,
  Flag,
  ChevronDown,
  ChevronRight,
  Menu,
  X,
  AlertCircle,
} from "lucide-react";

import { ROLE_DISPLAY_CONFIG } from "@/config/roles";
import { cn } from "@/lib/utils/cn";

const iconMap = {
  home: Home,
  users: Users,
  "book-open": BookOpen,
  "shopping-cart": ShoppingCart,
  "dollar-sign": DollarSign,
  settings: Settings,
  "trending-up": TrendingUp,
  "graduation-cap": GraduationCap,
  gavel: Gavel,
  "play-circle": PlayCircle,
  "plus-circle": PlusCircle,
  "message-square": MessageSquare,
  flag: Flag,
  default: Home,
} as const;

type IconKey = keyof typeof iconMap;

interface SubMenuItem {
  href: string;
  label: string;
  badge?: number;
}

interface MenuItem {
  href?: string;
  label: string;
  icon: IconKey;
  badge?: number;
  subItems?: SubMenuItem[];
}

interface RoleInfo {
  value: string;
  label: string;
  icon?: any;
  color?: string;
}

interface Stats {
  todayRevenue: number;
}

interface DashboardLayoutClientProps {
  session: Session;
  menuItems: MenuItem[];
  stats: Stats;
  currentRole: string;
  userRoles: string[];
  hasMultipleRoles: boolean;
  children: React.ReactNode;
}

const DashboardLayoutClient = memo(function DashboardLayoutClient({
  session,
  menuItems,
  stats,
  currentRole,
  userRoles,
  hasMultipleRoles,
  children,
}: DashboardLayoutClientProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [openSubmenus, setOpenSubmenus] = useState<number[]>([]);
  const [isRoleDropdownOpen, setIsRoleDropdownOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [pendingRole, setPendingRole] = useState<string | null>(null);

  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const dropdownRef = useRef<HTMLDivElement>(null);

  const userRoleObjects: RoleInfo[] = userRoles
    .map((role) => {
      const config = ROLE_DISPLAY_CONFIG[role];
      return config
        ? { value: role, label: config.label, icon: config.icon, color: config.color }
        : null;
    })
    .filter(Boolean) as RoleInfo[];

  const currentRoleConfig = ROLE_DISPLAY_CONFIG[currentRole] || {
    label: "کاربر",
    icon: Home,
    color: "text-blue-600",
  };

  const CurrentRoleIcon = currentRoleConfig.icon;

  const toggleSubmenu = (index: number) => {
    setOpenSubmenus((prev) =>
      prev.includes(index) ? prev.filter((i) => i !== index) : [...prev, index]
    );
  };

  const isItemActive = (item: MenuItem): boolean => {
    if (item.href && (pathname === item.href || pathname.startsWith(`${item.href}/`))) {
      return true;
    }
    if (item.subItems) {
      return item.subItems.some(
        (sub) => pathname === sub.href || pathname.startsWith(`${sub.href}/`)
      );
    }
    return false;
  };

  const requestRoleSwitch = (roleValue: string) => {
    if (roleValue === currentRole) {
      setIsRoleDropdownOpen(false);
      return;
    }
    setPendingRole(roleValue);
    setIsRoleDropdownOpen(false);
  };

  const confirmRoleSwitch = () => {
    if (!pendingRole) return;
    const params = new URLSearchParams(searchParams.toString());
    params.set("role", pendingRole);
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  };

  const cancelRoleSwitch = () => {
    setPendingRole(null);
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsRoleDropdownOpen(false);
      }
    };
    if (isRoleDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isRoleDropdownOpen]);

  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        setIsMobileMenuOpen(false);
      }
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const isSidebarCollapsed = !(isSidebarOpen || isMobileMenuOpen);

  return (
    <>
      {/* Overlay فقط برای منوی موبایل و مودال تأیید تغییر نقش */}
      {(isMobileMenuOpen || pendingRole) && (
        <div
          className="fixed inset-0 bg-black/60 z-40 transition-opacity"
          onClick={() => {
            setIsMobileMenuOpen(false);
            setPendingRole(null);
          }}
        />
      )}

      {/* مودال تأیید تغییر نقش */}
      {pendingRole && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-2xl p-8 max-w-md w-full animate-in fade-in zoom-in-95 duration-300">
            <div className="flex items-center gap-4 mb-6">
              <AlertCircle size={48} className="text-primary" />
              <h3 className="text-3xl font-black">تغییر نقش</h3>
            </div>
            <p className="text-xl text-foreground/80 mb-8 leading-relaxed">
              آیا مطمئن هستید که می‌خواهید نقش خود را به{" "}
              <span className="font-black text-primary">
                {ROLE_DISPLAY_CONFIG[pendingRole]?.label || pendingRole}
              </span>{" "}
              تغییر دهید؟
            </p>
            <div className="flex gap-4 justify-end">
              <button
                onClick={cancelRoleSwitch}
                className="px-8 py-4 rounded-2xl bg-muted hover:bg-muted/80 transition-all text-lg font-bold"
              >
                لغو
              </button>
              <button
                onClick={confirmRoleSwitch}
                className="px-8 py-4 rounded-2xl bg-primary hover:bg-primary/90 text-white transition-all text-lg font-black shadow-lg hover:shadow-xl hover:scale-105"
              >
                تأیید و تغییر نقش
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="min-h-screen bg-background flex">
        {/* Sidebar */}
        <aside
          role="navigation"
          aria-label="منوی اصلی داشبورد"
          className={cn(
            "fixed inset-y-0 left-0 z-30 flex flex-col bg-primary/98 text-white shadow-2xl transition-all duration-500 ease-in-out border-r border-white/10",
            isMobileMenuOpen ? "w-80 translate-x-0" : isSidebarOpen ? "w-80" : "w-20",
            !isMobileMenuOpen && !isSidebarOpen && "lg:w-20",
            "lg:relative lg:z-auto lg:translate-x-0"
          )}
        >
          <div className="flex flex-col h-full">
            {/* Header */}
            <div className="p-6 border-b border-white/10">
              <div className="flex items-center justify-between mb-6">
                <div
                  className={cn(
                    "flex items-center gap-4 transition-all duration-500",
                    !isSidebarCollapsed ? "opacity-100" : "opacity-0 w-0 overflow-hidden"
                  )}
                >
                  <div className="w-14 h-14 bg-white/20 rounded-3xl flex items-center justify-center text-3xl font-black shadow-xl">
                    R
                  </div>
                  <h1 className="text-3xl font-black bg-gradient-to-r from-white to-white/80 bg-clip-text text-transparent">
                    پنل روم
                  </h1>
                </div>

                <button
                  onClick={() =>
                    window.innerWidth < 1024
                      ? setIsMobileMenuOpen(!isMobileMenuOpen)
                      : setIsSidebarOpen(!isSidebarOpen)
                  }
                  className="p-3 bg-white/10 hover:bg-white/20 rounded-2xl transition-all hover:scale-110 shadow-lg"
                  aria-label={isSidebarCollapsed ? "باز کردن منو" : "بستن منو"}
                >
                  {isSidebarCollapsed ? <Menu size={28} /> : <X size={28} />}
                </button>
              </div>

              {/* Role Switcher */}
              {hasMultipleRoles && !isSidebarCollapsed && (
                <div className="relative" ref={dropdownRef}>
                  <p className="text-white/70 text-sm mb-3 text-center">نقش فعلی</p>
                  <button
                    onClick={() => setIsRoleDropdownOpen(!isRoleDropdownOpen)}
                    className="w-full flex items-center justify-between bg-white/20 hover:bg-white/30 rounded-2xl p-4 transition-all shadow-inner"
                    aria-haspopup="true"
                    aria-expanded={isRoleDropdownOpen}
                  >
                    <div className="flex items-center gap-4">
                      {CurrentRoleIcon && <CurrentRoleIcon size={36} className="text-white" />}
                      <span className="font-black text-xl">{currentRoleConfig.label}</span>
                    </div>
                    <ChevronDown
                      size={24}
                      className={cn("text-white/70 transition-transform duration-300", isRoleDropdownOpen && "rotate-180")}
                    />
                  </button>

                  {isRoleDropdownOpen && (
                    <div className="absolute left-0 right-0 top-full mt-3 bg-white dark:bg-gray-900 rounded-3xl shadow-2xl overflow-hidden z-50 border border-white/20">
                      {userRoleObjects.map((role) => {
                        const RoleIcon = role.icon;
                        const isActive = role.value === currentRole;
                        return (
                          <button
                            key={role.value}
                            onClick={() => requestRoleSwitch(role.value)}
                            className={cn(
                              "w-full flex items-center gap-4 px-6 py-5 transition-all text-left",
                              isActive
                                ? "bg-primary text-white font-black"
                                : "text-foreground hover:bg-gray-100 dark:hover:bg-gray-800"
                            )}
                          >
                            {RoleIcon && <RoleIcon size={32} />}
                            <span className="font-bold text-lg">{role.label}</span>
                            {isActive && <span className="ml-auto text-sm opacity-70">فعلی</span>}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Navigation */}
            <nav className="flex-1 p-4 space-y-2 overflow-y-auto scrollbar-thin scrollbar-thumb-white/20">
              {menuItems.map((item, index) => {
                const Icon = iconMap[item.icon] || iconMap.default;
                const hasSubItems = !!item.subItems?.length;
                const isActive = isItemActive(item);
                const isSubmenuOpen = openSubmenus.includes(index);

                return (
                  <div key={index} className="space-y-1">
                    {/* Tooltip when sidebar collapsed */}
                    {isSidebarCollapsed && (
                      <div className="relative group">
                        <div className="absolute left-full ml-4 px-4 py-2 bg-gray-900 text-white text-sm rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50 pointer-events-none">
                          {item.label}
                        </div>
                      </div>
                    )}

                    {hasSubItems ? (
                      <button
                        onClick={() => toggleSubmenu(index)}
                        className={cn(
                          "w-full group flex items-center gap-5 px-5 py-4 rounded-2xl transition-all duration-300 shadow-lg relative",
                          isActive
                            ? "bg-white/25 ring-4 ring-white/30 shadow-xl"
                            : "hover:bg-white/15 hover:shadow-xl"
                        )}
                        aria-expanded={isSubmenuOpen}
                        aria-controls={`submenu-${index}`}
                      >
                        <Icon size={28} className="flex-shrink-0 text-white/90 group-hover:text-white" />
                        <span
                          className={cn(
                            "font-bold text-lg flex-1 text-right transition-all duration-300",
                            isSidebarCollapsed ? "opacity-0 w-0 overflow-hidden" : "opacity-100"
                          )}
                        >
                          {item.label}
                        </span>
                        {!isSidebarCollapsed && (
                          <>
                            {item.badge !== undefined && item.badge > 0 && (
                              <span className="mr-auto bg-destructive text-white px-3 py-1 rounded-full text-sm font-black animate-pulse">
                                {item.badge.toLocaleString("fa-IR")}
                              </span>
                            )}
                            <ChevronDown
                              size={24}
                              className={cn("transition-transform duration-300", isSubmenuOpen && "rotate-180")}
                            />
                          </>
                        )}
                      </button>
                    ) : (
                      <Link
                        href={item.href!}
                        className={cn(
                          "group flex items-center gap-5 px-5 py-4 rounded-2xl transition-all duration-300 shadow-lg relative",
                          isActive
                            ? "bg-white/25 ring-4 ring-white/30 shadow-xl"
                            : "hover:bg-white/15 hover:shadow-xl"
                        )}
                        aria-current={isActive ? "page" : undefined}
                      >
                        <Icon size={28} className="flex-shrink-0 text-white/90 group-hover:text-white" />
                        <span
                          className={cn(
                            "font-bold text-lg transition-all duration-300",
                            isSidebarCollapsed ? "opacity-0 w-0 overflow-hidden" : "opacity-100"
                          )}
                        >
                          {item.label}
                        </span>
                        {!isSidebarCollapsed && item.badge !== undefined && item.badge > 0 && (
                          <span className="ml-auto bg-destructive text-white px-3 py-1 rounded-full text-sm font-black animate-pulse">
                            {item.badge.toLocaleString("fa-IR")}
                          </span>
                        )}
                      </Link>
                    )}

                    {/* Submenu */}
                    {hasSubItems && !isSidebarCollapsed && isSubmenuOpen && (
                      <div id={`submenu-${index}`} className="pr-14 space-y-1 animate-in slide-in-from-top duration-300">
                        {item.subItems!.map((subItem, subIndex) => {
                          const isSubActive =
                            pathname === subItem.href || pathname.startsWith(`${subItem.href}/`);
                          return (
                            <Link
                              key={subIndex}
                              href={subItem.href}
                              className={cn(
                                "block px-5 py-3 rounded-xl transition-all flex items-center justify-between shadow-md",
                                isSubActive
                                  ? "bg-white/20 text-white font-black"
                                  : "text-white/80 hover:bg-white/10 hover:text-white"
                              )}
                              aria-current={isSubActive ? "page" : undefined}
                            >
                              <div className="flex items-center gap-3">
                                <ChevronRight size={18} />
                                <span className="text-lg">{subItem.label}</span>
                              </div>
                              {subItem.badge !== undefined && subItem.badge > 0 && (
                                <span className="bg-destructive text-white px-2 py-0.5 rounded-full text-xs font-black animate-pulse">
                                  {subItem.badge.toLocaleString("fa-IR")}
                                </span>
                              )}
                            </Link>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </nav>

            {/* Footer */}
            <div className="p-4 border-t border-white/10 space-y-5">
              {/* Today's Revenue - همیشه نمایش داده شود */}
              {!isSidebarCollapsed && (
                <div className="bg-white/10 backdrop-blur rounded-2xl p-5 text-center shadow-xl">
                  <p className="text-white/70 text-sm">
                    {currentRole === "SUPERADMIN" || currentRole === "ADMIN"
                      ? "درآمد امروز سیستم"
                      : "درآمد امروز شما"}
                  </p>
                  <p className="text-3xl font-black text-white mt-2">
                    {stats.todayRevenue.toLocaleString("fa-IR")} تومان
                  </p>
                </div>
              )}

              {/* User Info & Logout */}
              <div className="flex items-center justify-between bg-white/10 backdrop-blur rounded-2xl p-4 shadow-xl">
                {!isSidebarCollapsed && (
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-gradient-to-br from-white/20 to-white/10 rounded-2xl flex items-center justify-center text-3xl font-black text-white shadow-lg">
                      {session.user?.name?.[0]?.toUpperCase() || "U"}
                    </div>
                    <div>
                      <p className="font-black text-xl text-white">{session.user?.name || "کاربر"}</p>
                      <p className="text-sm text-white/70">{currentRoleConfig.label}</p>
                    </div>
                  </div>
                )}

                <form action="/api/auth/signout" method="POST">
                  <button
                    type="submit"
                    className="p-4 bg-destructive/30 hover:bg-destructive/50 rounded-2xl transition-all hover:scale-110 shadow-lg"
                    aria-label="خروج از حساب کاربری"
                  >
                    <LogOut size={24} />
                  </button>
                </form>
              </div>
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main
          className={cn(
            "flex-1 transition-all duration-500",
            isSidebarCollapsed ? "lg:ml-20" : "lg:ml-80"
          )}
        >
          <header className="bg-card/95 backdrop-blur shadow-xl sticky top-0 z-20 border-b border-border">
            <div className="px-6 py-8 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
              <h2 className="text-5xl font-black bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent text-center lg:text-right">
                خوش آمدید، {session.user?.name || "کاربر"} عزیز
              </h2>
              <div className="text-center lg:text-right">
                <p className="text-2xl font-bold text-foreground/70">
                  {new Date().toLocaleDateString("fa-IR", {
                    weekday: "long",
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </p>
                <p className="text-4xl font-black text-primary mt-3">
                  {new Date().toLocaleTimeString("fa-IR", { hour: "2-digit", minute: "2-digit" })}
                </p>
              </div>
            </div>
          </header>

          <div className="p-8 lg:p-12 min-h-screen bg-background/50">
            {children}
          </div>
        </main>
      </div>
    </>
  );
});

DashboardLayoutClient.displayName = "DashboardLayoutClient";
export default DashboardLayoutClient;