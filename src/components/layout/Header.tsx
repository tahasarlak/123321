// src/components/layout/Header.tsx
"use client";

import { useTranslations, useLocale } from "next-intl";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { toast } from "sonner";
import { useEffect, useRef, useState } from "react";
import {
  Bell,
  ShoppingCart,
  LogOut,
  Menu,
  X,
  Home,
  User,
  Settings,
  BookOpen,
  PlayCircle,
  MessageCircle,
  Award,
  Moon,
  Sun,
  ChevronDown,
  Globe,
  TrendingUp,
} from "lucide-react";
import { useRealtime } from "@/lib/hooks/useRealtime";
import { cn } from "@/lib/utils/cn";
import { useTheme } from "@/lib/hooks/useTheme";


export default function Header() {
  const t = useTranslations("header");
  const tc = useTranslations("common");
  const locale = useLocale();
  const router = useRouter();
  const { data: session, status } = useSession();
  const { theme, toggle: toggleTheme } = useTheme();

  const [cartCount, setCartCount] = useState(0);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotif, setShowNotif] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showLangMenu, setShowLangMenu] = useState(false);
  const [mobileMenu, setMobileMenu] = useState(false);

  const notifRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const langMenuRef = useRef<HTMLDivElement>(null);

  const flags: Record<string, string> = { fa: "🇮🇷", en: "🇬🇧", ru: "🇷🇺" };
  const langNames: Record<string, string> = { fa: "فارسی", en: "English", ru: "Русский" };

  // Language switch بهینه
  const changeLanguage = (newLocale: "fa" | "en" | "ru") => {
    const path = window.location.pathname.split("/").slice(2).join("/") || "";
    const search = window.location.search;
    router.push(`/${newLocale}/${path}${search}`);
    router.refresh(); // reload messages
    toast.success(`${flags[newLocale]} ${langNames[newLocale]} انتخاب شد`);
    setShowLangMenu(false);
  };

  // Realtime cart count
  useRealtime("cart:update", (data) => {
    if (data.userId === session?.user?.id) setCartCount(data.count);
  });

  // Realtime notifications
  useRealtime("notification:new", (data) => {
    if (data.userId === session?.user?.id) {
      setUnreadCount(prev => prev + 1);
      toast.info(data.message);
    }
  });

  // Initial fetch برای countها
  useEffect(() => {
    if (status === "authenticated") {
      fetch("/api/cart", { cache: "no-store" })
        .then(r => r.json())
        .then(d => setCartCount(d.count || 0))
        .catch(() => {});

      fetch("/api/notification/unread", { cache: "no-store" })
        .then(r => r.json())
        .then(d => setUnreadCount(d.count || 0))
        .catch(() => {});
    } else {
      setCartCount(0);
      setUnreadCount(0);
    }
  }, [status]);

  // Click outside
  useEffect(() => {
    const handle = (e: MouseEvent) => {
      if (!notifRef.current?.contains(e.target as Node)) setShowNotif(false);
      if (!userMenuRef.current?.contains(e.target as Node)) setShowUserMenu(false);
      if (!langMenuRef.current?.contains(e.target as Node)) setShowLangMenu(false);
    };
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, []);

  const handleLogout = async () => {
    await signOut({ callbackUrl: `/${locale}` });
    toast.success(t("logout"));
  };

  const getAvatar = () => {
    if (session?.user?.image) return session.user.image;
    const gender = session?.user?.gender === "MALE" ? "men" : "women";
    const random = Math.floor(Math.random() * 99) + 1;
    return `https://randomuser.me/api/portraits/${gender}/${random}.jpg`;
  };

  const mainMenu = [
    { href: "/courses", key: "courses", icon: BookOpen },
    { href: "/live-classes", key: "liveClasses", icon: PlayCircle },
    { href: "/products", key: "products", icon: ShoppingCart },
    { href: "/blog", key: "blog", icon: MessageCircle },
    { href: "/about", key: "about", icon: User },
    { href: "/contact", key: "contact", icon: MessageCircle },
  ];

  const roles = (session?.user?.roles as string[]) || [];
  const userMenu = [
    { href: "/dashboard", key: "dashboard", icon: Home },
    { href: "/profile", key: "profile", icon: User },
    { href: "/my-courses", key: "myCourses", icon: BookOpen },
    { href: "/certificates", key: "certificates", icon: Award },
    ...(roles.includes("INSTRUCTOR") ? [{ href: "/instructor", key: "instructorPanel", icon: TrendingUp }] : []),
    ...(roles.some(r => ["ADMIN", "SUPERADMIN"].includes(r)) ? [{ href: "/admin", key: "adminPanel", icon: Award }] : []),
    { href: "/settings", key: "settings", icon: Settings },
  ];

  if (status === "loading") {
    return (
      <header className="fixed inset-x-0 top-0 z-50 h-20 border-b bg-background/95 backdrop-blur">
        <div className="container flex h-full items-center justify-center">
          <p className="text-lg font-medium">{tc("loading")}...</p>
        </div>
      </header>
    );
  }

  return (
    <>
      <header className="fixed inset-x-0 top-0 z-50 h-20 border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-full items-center justify-between px-4">
          {/* Logo + Nav */}
          <div className="flex items-center gap-8">
            <Link href="/" className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-secondary text-3xl font-black text-white shadow-lg">
                R
              </div>
              <span className="hidden text-2xl font-black bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent md:block">
                روم آکادمی
              </span>
            </Link>
            <nav className="hidden items-center gap-1 lg:flex">
              {mainMenu.map((item) => (
                <Link
                  key={item.href}
                  href={`/${locale}${item.href}`}
                  className="flex items-center gap-2 rounded-xl px-5 py-3 text-base font-medium text-foreground/80 transition hover:bg-accent hover:text-primary"
                >
                  <item.icon className="h-5 w-5" />
                  {t(item.key)}
                </Link>
              ))}
            </nav>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3">
            {/* Language */}
            <div ref={langMenuRef} className="relative">
              <button
                onClick={() => setShowLangMenu(!showLangMenu)}
                className="flex items-center gap-2 rounded-xl bg-accent/50 px-4 py-2.5 font-medium transition hover:bg-accent"
                aria-label="Change language"
              >
                <Globe className="h-5 w-5" />
                <span className="text-2xl">{flags[locale]}</span>
                <ChevronDown className={cn("h-4 w-4 transition", showLangMenu && "rotate-180")} />
              </button>
              {showLangMenu && (
                <div className="absolute right-0 mt-3 w-48 rounded-2xl bg-card shadow-2xl ring-1 ring-border">
                  {(["fa", "en", "ru"] as const).map((l) => (
                    <button
                      key={l}
                      onClick={() => changeLanguage(l)}
                      className={cn("flex w-full items-center gap-3 px-5 py-3 transition hover:bg-accent", locale === l && "bg-primary/10 font-bold")}
                    >
                      <span className="text-3xl">{flags[l]}</span>
                      <span>{langNames[l]}</span>
                      {locale === l && <span className="ml-auto text-primary">✓</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Theme */}
            <button
              onClick={toggleTheme}
              className="rounded-xl p-3 transition hover:bg-accent"
              aria-label="Toggle theme"
            >
              {theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </button>

            {/* Cart */}
            <Link href={`/${locale}/cart`} className="relative" aria-label={`Cart (${cartCount})`}>
              <div className="rounded-xl bg-accent/50 p-3 transition hover:scale-110">
                <ShoppingCart className="h-6 w-6" />
              </div>
              {cartCount > 0 && (
                <span className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs font-bold text-white">
                  {cartCount}
                </span>
              )}
            </Link>

            {/* Notifications */}
            {session && (
              <div ref={notifRef} className="relative">
                <button
                  onClick={() => setShowNotif(!showNotif)}
                  className="relative rounded-xl bg-accent/50 p-3 transition hover:scale-110"
                  aria-label={`Notifications (${unreadCount})`}
                >
                  <Bell className="h-6 w-6" />
                  {unreadCount > 0 && (
                    <span className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-red-500 text-xs font-bold text-white">
                      {unreadCount}
                    </span>
                  )}
                </button>
                {showNotif && (
                  <div className="absolute right-0 mt-3 w-96 rounded-2xl bg-card shadow-2xl ring-1 ring-border">
                    <div className="border-b p-4">
                      <h3 className="font-bold">{t("notifications")}</h3>
                    </div>
                    <div className="max-h-80 overflow-y-auto p-4">
                      {unreadCount === 0 ? (
                        <p className="text-center text-muted-foreground">{t("noNotifications")}</p>
                      ) : (
                        <p className="text-center text-muted-foreground">لیست اعلان‌ها (realtime با socket)</p>
                      )}
                    </div>
                    <div className="border-t p-4 text-center">
                      <Link href={`/${locale}/notifications`} className="font-medium text-primary hover:underline">
                        {t("viewAllNotifications")}
                      </Link>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* User Menu */}
            {session ? (
              <div ref={userMenuRef} className="relative">
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="flex items-center gap-3 rounded-xl bg-accent/50 p-2 transition hover:scale-105"
                  aria-label="User menu"
                >
                  <Image
                    src={getAvatar()}
                    alt="Avatar"
                    width={40}
                    height={40}
                    className="rounded-full object-cover ring-2 ring-primary/20"
                    placeholder="blur"
                    blurDataURL="/placeholder-avatar.png"
                  />
                  <ChevronDown className={cn("h-4 w-4 transition", showUserMenu && "rotate-180")} />
                </button>
                {showUserMenu && (
                  <div className="absolute right-0 mt-3 w-64 rounded-2xl bg-card shadow-2xl ring-1 ring-border">
                    <div className="border-b p-4">
                      <p className="font-bold truncate">{session.user?.name}</p>
                      <p className="text-sm text-muted-foreground truncate">{session.user?.email}</p>
                    </div>
                    <div className="p-2">
                      {userMenu.map((item) => (
                        <Link
                          key={item.href}
                          href={`/${locale}${item.href}`}
                          className="flex items-center gap-3 rounded-xl px-4 py-3 hover:bg-accent transition"
                        >
                          <item.icon className="h-5 w-5" />
                          <span>{t(item.key)}</span>
                        </Link>
                      ))}
                      <button
                        onClick={handleLogout}
                        className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-destructive hover:bg-destructive/10 transition"
                      >
                        <LogOut className="h-5 w-5" />
                        <span>{t("logout")}</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <Link
                href={`/${locale}/auth`}
                className="rounded-xl bg-gradient-to-r from-primary to-secondary px-6 py-3 font-bold text-white shadow-lg transition hover:scale-105"
              >
                {t("login")}
              </Link>
            )}

            {/* Mobile Toggle */}
            <button
              onClick={() => setMobileMenu(!mobileMenu)}
              className="lg:hidden rounded-xl p-3 transition hover:bg-accent"
              aria-label="Mobile menu"
            >
              {mobileMenu ? <X className="h-7 w-7" /> : <Menu className="h-7 w-7" />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        <div className={cn("fixed inset-x-0 top-20 z-40 overflow-hidden transition-all duration-300 lg:hidden", mobileMenu ? "max-h-screen opacity-100" : "max-h-0 opacity-0")}>
          <div className="bg-background/98 backdrop-blur border-t py-6">
            <div className="container">
              <nav className="grid grid-cols-2 gap-4">
                {mainMenu.map((item) => (
                  <Link
                    key={item.href}
                    href={`/${locale}${item.href}`}
                    onClick={() => setMobileMenu(false)}
                    className="flex flex-col items-center gap-3 rounded-2xl bg-accent/50 p-6 text-center transition hover:bg-accent"
                  >
                    <item.icon className="h-10 w-10" />
                    <span className="font-medium">{t(item.key)}</span>
                  </Link>
                ))}
              </nav>
              {!session && (
                <div className="mt-8 text-center">
                  <Link
                    href={`/${locale}/auth`}
                    onClick={() => setMobileMenu(false)}
                    className="inline-block rounded-xl bg-gradient-to-r from-primary to-secondary px-10 py-4 font-bold text-white shadow-lg"
                  >
                    {t("login")}
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>
      <div className="h-20" /> {/* Spacer for fixed header */}
    </>
  );
}