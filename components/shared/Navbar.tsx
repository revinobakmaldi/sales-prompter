"use client";

import { motion } from "framer-motion";
import { TrendingUp, LayoutDashboard, Store, Package, Settings, LogOut, User } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { clearAuth } from "@/lib/auth";

const NAV_LINKS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/retailers", label: "Retailers", icon: Store },
  { href: "/products", label: "Products", icon: Package },
  { href: "/salesman", label: "Salesman", icon: User },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const isLoginPage = pathname === "/";

  const handleLogout = () => {
    clearAuth();
    router.push("/");
  };

  return (
    <motion.nav
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="sticky top-0 z-50 border-b border-zinc-200/50 dark:border-zinc-800/50 bg-white/80 dark:bg-black/80 backdrop-blur-xl shadow-sm"
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
        <Link href="/dashboard" className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-primary" />
          <span className="font-semibold text-foreground">SalesPrompter</span>
        </Link>

        {!isLoginPage && (
          <div className="flex items-center gap-1">
            {NAV_LINKS.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className={`hidden sm:block px-3 py-1.5 rounded-lg text-sm transition-colors ${
                  pathname === href || pathname.startsWith(href + "/")
                    ? "text-primary font-medium bg-primary/10"
                    : "text-zinc-600 dark:text-zinc-400 hover:text-primary hover:bg-zinc-100 dark:hover:bg-zinc-800"
                }`}
              >
                {label}
              </Link>
            ))}
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800 px-3 py-1.5 text-sm text-zinc-700 dark:text-zinc-300 transition-all hover:border-red-300 hover:bg-red-500/10 hover:text-red-500 ml-2"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span className="hidden sm:block">Logout</span>
            </button>
          </div>
        )}
      </div>

      {/* Mobile bottom nav — visible only when logged in on small screens */}
      {!isLoginPage && (
        <div className="sm:hidden flex border-t border-zinc-200/50 dark:border-zinc-800/50">
          {NAV_LINKS.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={`flex-1 flex flex-col items-center gap-0.5 py-2 text-[10px] transition-colors ${
                pathname === href || pathname.startsWith(href + "/")
                  ? "text-primary"
                  : "text-zinc-500 dark:text-zinc-400"
              }`}
            >
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          ))}
        </div>
      )}
    </motion.nav>
  );
}
