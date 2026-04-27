"use client";

import * as React from "react";
import { Moon, Sun, Monitor, GraduationCap, LogIn, LayoutDashboard, Home, Users } from "lucide-react";
import { useTheme } from "@/src/components/providers/theme-provider";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";

export function Navbar() {
  const { setTheme, theme } = useTheme();
  const [schoolName, setSchoolName] = React.useState("");
  const [scrolled, setScrolled] = React.useState(false);
  const [menuOpen, setMenuOpen] = React.useState(false);

  React.useEffect(() => {
    const name = document.cookie
      .split("; ")
      .find((row) => row.startsWith("school_name="))
      ?.split("=")[1];
    if (name) setSchoolName(decodeURIComponent(name));

    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const navLinks = [
    { href: "/", label: "Accueil", icon: Home },
    { href: "#teachers", label: "Équipe", icon: Users },
    { href: "/api/monitor-redirect", label: "Moniteur", icon: Monitor, external: false },
  ];

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
        scrolled
          ? "bg-white/80 dark:bg-black/60 backdrop-blur-2xl border-b border-slate-200 dark:border-white/8 shadow-sm dark:shadow-[0_8px_32px_rgba(0,0,0,0.4)]"
          : "bg-transparent"
      }`}
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Logo */}
        <motion.div
          initial={{ opacity: 0, x: -24 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="flex items-center gap-4"
        >
          <Link href="/" className="group relative flex items-center gap-2">
            <img
              src="/oxalys-teach.png"
              alt="OxalysTeach"
              className="h-8 w-auto relative transition-transform duration-300 group-hover:scale-105 dark:hidden"
            />
            <img
              src="/oxalys-teach-light.png"
              alt="OxalysTeach"
              className="h-8 w-auto relative transition-transform duration-300 group-hover:scale-105 hidden dark:block"
            />
          </Link>

          <AnimatePresence>
            {schoolName && (
              <motion.div
                initial={{ opacity: 0, x: -10, width: 0 }}
                animate={{ opacity: 1, x: 0, width: "auto" }}
                exit={{ opacity: 0, x: -10, width: 0 }}
                className="hidden lg:flex items-center gap-2 pl-4 border-l border-slate-200 dark:border-white/10 overflow-hidden"
              >
                <div className="relative flex items-center gap-2 rounded-full px-3 py-1 bg-orange-500/10 border border-orange-500/20">
                  <div className="h-1.5 w-1.5 rounded-full bg-orange-500 animate-pulse" />
                  <GraduationCap className="h-3.5 w-3.5 text-orange-400" />
                  <span className="text-xs font-semibold text-orange-300 truncate max-w-[140px]">
                    {schoolName}
                  </span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Nav Links — desktop */}
        <motion.nav
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="hidden md:flex items-center gap-1"
        >
          {navLinks.map(({ href, label, icon: Icon, external }) => (
            <Link
              key={label}
              href={href}
              {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
              className="group relative flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors duration-200"
            >
              <Icon className="h-3.5 w-3.5 opacity-60 group-hover:opacity-100 transition-opacity" />
              {label}
              <span className="absolute bottom-1 left-1/2 -translate-x-1/2 h-px w-0 bg-gradient-to-r from-orange-500 to-red-500 group-hover:w-4/5 transition-all duration-300 rounded-full" />
            </Link>
          ))}
        </motion.nav>

        {/* Right actions */}
        <motion.div
          initial={{ opacity: 0, x: 24 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, delay: 0.15 }}
          className="flex items-center gap-2"
        >
          {/* Theme toggle */}
          <button
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="relative h-9 w-9 rounded-full flex items-center justify-center text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 transition-all duration-200"
            aria-label="Changer de thème"
          >
            <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0 absolute" />
            <Moon className="h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100 absolute" />
          </button>

          {/* Logout */}
          <button
            onClick={async () => {
              await fetch("/api/logout", { method: "POST" });
              window.location.href = "/login";
            }}
            className="hidden sm:flex items-center gap-1.5 h-9 px-4 rounded-full text-sm font-medium text-slate-500 dark:text-slate-400 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-500/10 border border-transparent hover:border-red-500/20 transition-all duration-200"
          >
            <LogIn className="h-3.5 w-3.5 rotate-180" />
            Déconnexion
          </button>

          {/* Dashboard CTA */}
          <Link
            href="/dashboard"
            className="group relative hidden sm:flex items-center gap-2 h-9 px-5 rounded-full text-sm font-semibold text-white overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-orange-500 via-red-500 to-rose-600 animate-gradient-shift" />
            <div className="absolute inset-0 bg-gradient-to-r from-orange-500 via-red-500 to-rose-600 opacity-0 group-hover:opacity-100 blur-sm transition-opacity duration-300" />
            <LayoutDashboard className="relative h-3.5 w-3.5" />
            <span className="relative">Dashboard</span>
          </Link>

          {/* Mobile menu button */}
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="md:hidden h-9 w-9 flex flex-col items-center justify-center gap-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-white/10 transition-all"
            aria-label="Menu"
          >
            <motion.span
              animate={menuOpen ? { rotate: 45, y: 6 } : { rotate: 0, y: 0 }}
              className="block h-px w-4 bg-slate-700 dark:bg-white origin-center transition-all"
            />
            <motion.span
              animate={menuOpen ? { opacity: 0, scaleX: 0 } : { opacity: 1, scaleX: 1 }}
              className="block h-px w-4 bg-slate-700 dark:bg-white"
            />
            <motion.span
              animate={menuOpen ? { rotate: -45, y: -6 } : { rotate: 0, y: 0 }}
              className="block h-px w-4 bg-slate-700 dark:bg-white origin-center transition-all"
            />
          </button>
        </motion.div>
      </div>

      {/* Mobile menu */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden overflow-hidden bg-white/90 dark:bg-black/80 backdrop-blur-2xl border-t border-slate-200 dark:border-white/5"
          >
            <div className="p-4 space-y-1">
              {navLinks.map(({ href, label, icon: Icon, external }) => (
                <Link
                  key={label}
                  href={href}
                  {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                  onClick={() => setMenuOpen(false)}
                  className="flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5 transition-all"
                >
                  <Icon className="h-4 w-4 text-orange-400" />
                  {label}
                </Link>
              ))}
              <div className="pt-2 border-t border-slate-100 dark:border-white/5 space-y-1">
                <Link
                  href="/dashboard"
                  onClick={() => setMenuOpen(false)}
                  className="flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-semibold text-white bg-gradient-to-r from-orange-500/20 to-red-500/20 border border-orange-500/20"
                >
                  <LayoutDashboard className="h-4 w-4 text-orange-400" />
                  Dashboard
                </Link>
                <button
                  onClick={async () => {
                    await fetch("/api/logout", { method: "POST" });
                    window.location.href = "/login";
                  }}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-medium text-red-400 hover:bg-red-500/10 transition-all"
                >
                  <LogIn className="h-4 w-4 rotate-180" />
                  Déconnexion
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
