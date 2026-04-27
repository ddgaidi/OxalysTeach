"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Lock,
  User,
  AlertTriangle,
  Sun,
  Moon,
  Sparkles,
  LogIn,
  School,
  ChevronDown,
  Check,
} from "lucide-react";
import { motion, AnimatePresence, useMotionValue, useSpring } from "framer-motion";
import { useTheme } from "@/src/components/providers/theme-provider";
import { fetchFablabs, School as SchoolType } from "@/src/lib/schools";
import { OxalysTeachLogo } from "./oxalys-teach-logo";

const ITIS_FORMATION_NAME = "ITIS Formation";
const ITIS_ADMIN_EMAIL = "admin@oxalys.fr";
const ITIS_DEMO_PASSWORD = "1234";

export default function LoginPage() {
  const { setTheme, theme } = useTheme();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [selectedSchool, setSelectedSchool] = useState<{ id: string; name: string } | null>(null);
  const [isSchoolListOpen, setIsSchoolListOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingSchools, setIsFetchingSchools] = useState(true);
  const [availableSchools, setAvailableSchools] = useState<SchoolType[]>([]);
  const [error, setError] = useState("");
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const router = useRouter();
  const cardRef = useRef<HTMLDivElement>(null);

  const rotateX = useSpring(useMotionValue(0), { stiffness: 100, damping: 30 });
  const rotateY = useSpring(useMotionValue(0), { stiffness: 100, damping: 30 });

  const sortedSchools = useMemo(
    () => [...availableSchools].sort((a, b) => a.name.localeCompare(b.name, "fr", { sensitivity: "base" })),
    [availableSchools],
  );

  useEffect(() => {
    async function loadSchools() {
      try {
        const fablabs = await fetchFablabs();
        setAvailableSchools(fablabs);
      } catch {
        setError("Impossible de charger la liste des établissements.");
      } finally {
        setIsFetchingSchools(false);
      }
    }
    loadSchools();
  }, []);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left - rect.width / 2;
    const y = e.clientY - rect.top - rect.height / 2;
    rotateX.set(-y / 30);
    rotateY.set(x / 30);
  };

  const handleMouseLeave = () => {
    rotateX.set(0);
    rotateY.set(0);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSchool) {
      setError("Veuillez sélectionner un fablab.");
      return;
    }
    setError("");
    setIsLoading(true);

    const response = await fetch("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username,
        password,
        schoolId: selectedSchool.id,
        schoolName: selectedSchool.name,
      }),
    });

    if (!response.ok) {
      if (response.status === 403) {
        setError(
          `Ce compte n'est pas rattaché au fablab « ${selectedSchool.name} ».`,
        );
      } else {
        setError("Identifiants invalides.");
      }
      setIsLoading(false);
      return;
    }

    setIsLoading(false);
    if (typeof window !== "undefined") {
      const next = new URLSearchParams(window.location.search).get("next");
      if (next === "monitor") {
        window.location.assign("/api/monitor-redirect");
        return;
      }
    }
    router.push("/");
    router.refresh();
  };

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-slate-100 dark:bg-[#05050f] p-4 transition-colors duration-300">
      {/* Animated background orbs — dark only */}
      <motion.div
        animate={{ x: [0, 40, -20, 0], y: [0, -30, 20, 0], scale: [1, 1.1, 0.95, 1] }}
        transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
        className="pointer-events-none absolute -left-32 -top-32 h-[500px] w-[500px] rounded-full bg-orange-600/20 blur-[100px] opacity-0 dark:opacity-100"
      />
      <motion.div
        animate={{ x: [0, -50, 30, 0], y: [0, 40, -20, 0], scale: [1, 0.9, 1.05, 1] }}
        transition={{ duration: 22, repeat: Infinity, ease: "easeInOut", delay: 3 }}
        className="pointer-events-none absolute -bottom-32 -right-32 h-[600px] w-[600px] rounded-full bg-red-700/15 blur-[120px] opacity-0 dark:opacity-100"
      />
      <motion.div
        animate={{ x: [0, 20, -10, 0], y: [0, -15, 25, 0] }}
        transition={{ duration: 15, repeat: Infinity, ease: "easeInOut", delay: 7 }}
        className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[400px] w-[400px] rounded-full bg-rose-600/10 blur-[80px] opacity-0 dark:opacity-100"
      />

      {/* Grid overlay */}
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(0,0,0,.04)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,.04)_1px,transparent_1px)] dark:bg-[linear-gradient(rgba(255,255,255,.015)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.015)_1px,transparent_1px)] bg-[size:60px_60px]" />

      {/* Theme toggle */}
      <div className="absolute top-4 right-4 z-10">
        <button
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          className="h-9 w-9 flex items-center justify-center rounded-full bg-white/5 border border-white/10 text-slate-400 hover:text-white hover:bg-white/10 transition-all"
        >
          <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0 absolute" />
          <Moon className="h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100 absolute" />
        </button>
      </div>

      {/* Main card */}
      <motion.div
        ref={cardRef}
        style={{ rotateX, rotateY, transformPerspective: 1200 }}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        initial={{ opacity: 0, y: 40, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        className="relative w-full max-w-lg"
      >
        {/* Glow border effect */}
        <div className="absolute -inset-px rounded-3xl bg-gradient-to-br from-orange-500/30 via-transparent to-red-600/20 opacity-0 hover:opacity-100 transition-opacity duration-500 blur-sm" />
        <div className="absolute -inset-px rounded-3xl bg-gradient-to-br from-orange-500/20 via-white/5 to-red-600/10 opacity-60" />

        <div className="relative rounded-3xl bg-white dark:bg-white/5 backdrop-blur-2xl border border-slate-200 dark:border-white/10 p-8 shadow-[0_25px_50px_rgba(0,0,0,0.15)] dark:shadow-[0_25px_50px_rgba(0,0,0,0.5)]">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15, duration: 0.5 }}
            className="mb-8 text-center"
          >

            <div className="inline-flex items-center gap-1.5 mb-3 rounded-full border border-orange-500/20 bg-orange-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-widest text-orange-400">
              <Sparkles className="h-3 w-3" />
              Connexion sécurisée
            </div>

            <div className="flex justify-center mb-2">
              <OxalysTeachLogo />
            </div>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Accédez à votre espace pédagogique</p>
          </motion.div>

          <motion.form
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.25 }}
            onSubmit={handleLogin}
            className="space-y-5"
          >
            {/* Error */}
            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -8, height: 0 }}
                  animate={{ opacity: 1, y: 0, height: "auto" }}
                  exit={{ opacity: 0, y: -8, height: 0 }}
                  className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400 flex items-center gap-2"
                >
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  {error}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Fablab */}
            <div className="space-y-1.5 relative">
              <label className="text-xs font-semibold uppercase tracking-widest text-slate-500 ml-1">
                Fablab
              </label>
              <button
                type="button"
                disabled={isFetchingSchools}
                onClick={() => setIsSchoolListOpen(!isSchoolListOpen)}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-xl bg-slate-50 dark:bg-white/5 border transition-all text-left ${
                  isSchoolListOpen
                    ? "border-orange-500/50 ring-1 ring-orange-500/30"
                    : "border-slate-200 dark:border-white/10"
                } ${isFetchingSchools ? "opacity-40 cursor-not-allowed" : "hover:border-slate-300 dark:hover:border-white/20"}`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <School className={`h-4 w-4 shrink-0 ${selectedSchool ? "text-orange-400" : "text-slate-600"}`} />
                  <span
                    className={`text-sm truncate ${selectedSchool ? "text-slate-900 dark:text-white" : "text-slate-500"}`}
                  >
                    {isFetchingSchools
                      ? "Chargement des fablabs…"
                      : selectedSchool
                        ? selectedSchool.name
                        : "Choisissez votre fablab"}
                  </span>
                </div>
                <ChevronDown
                  className={`h-4 w-4 text-slate-500 shrink-0 transition-transform duration-200 ${isSchoolListOpen ? "rotate-180" : ""}`}
                />
              </button>

              <AnimatePresence>
                {isSchoolListOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -8, scaleY: 0.95 }}
                    animate={{ opacity: 1, y: 0, scaleY: 1 }}
                    exit={{ opacity: 0, y: -8, scaleY: 0.95 }}
                    style={{ transformOrigin: "top" }}
                    className="absolute z-50 mt-1 w-full rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0d0d1a]/95 backdrop-blur-2xl shadow-[0_20px_60px_rgba(0,0,0,0.15)] dark:shadow-[0_20px_60px_rgba(0,0,0,0.6)] overflow-hidden"
                  >
                    <div className="max-h-56 overflow-y-auto py-1.5">
                      {sortedSchools.map((school) => (
                        <button
                          key={school.id}
                          type="button"
                          onClick={() => {
                            setSelectedSchool({ id: school.id, name: school.name });
                            setIsSchoolListOpen(false);
                          }}
                          className="w-full flex items-center justify-between px-4 py-2.5 text-left hover:bg-orange-500/10 transition-colors group"
                        >
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-slate-800 dark:text-white group-hover:text-orange-600 dark:group-hover:text-orange-300 transition-colors truncate">
                              {school.name}
                            </p>
                            <p className="text-[10px] text-slate-500 uppercase tracking-widest mt-0.5 truncate">
                              {school.city}
                            </p>
                          </div>
                          {selectedSchool?.id === school.id && (
                            <Check className="h-3.5 w-3.5 text-orange-400 shrink-0" />
                          )}
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 px-1">
                Connectez-vous avec un compte lié à l&apos;établissement sélectionné.
              </p>
            </div>

            {/* E-mail */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-widest text-slate-500 ml-1">
                E-mail
              </label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="email"
                  autoComplete="email"
                  placeholder="vous@exemple.fr"
                  className={`w-full pl-10 pr-4 py-3 rounded-xl bg-slate-50 dark:bg-white/5 border text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none transition-all ${
                    focusedField === "email"
                      ? "border-orange-500/50 ring-1 ring-orange-500/30"
                      : "border-slate-200 dark:border-white/10 hover:border-slate-300 dark:hover:border-white/20"
                  }`}
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  onFocus={() => setFocusedField("email")}
                  onBlur={() => setFocusedField(null)}
                />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-widest text-slate-500 ml-1">
                Mot de passe
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="password"
                  placeholder="••••"
                  className={`w-full pl-10 pr-4 py-3 rounded-xl bg-slate-50 dark:bg-white/5 border text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none transition-all ${
                    focusedField === "password"
                      ? "border-orange-500/50 ring-1 ring-orange-500/30"
                      : "border-slate-200 dark:border-white/10 hover:border-slate-300 dark:hover:border-white/20"
                  }`}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onFocus={() => setFocusedField("password")}
                  onBlur={() => setFocusedField(null)}
                />
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={isLoading}
              className="group relative w-full overflow-hidden rounded-xl py-3.5 text-sm font-bold text-white transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed mt-2"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-orange-500 via-red-500 to-rose-600 animate-gradient-shift" />
              <div className="absolute inset-0 bg-gradient-to-r from-orange-400 via-red-400 to-rose-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <div className="absolute inset-0 overflow-hidden">
                <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 bg-gradient-to-r from-transparent via-white/10 to-transparent skew-x-12" />
              </div>
              <span className="relative flex items-center justify-center gap-2">
                {isLoading ? (
                  <>
                    <div className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                    Connexion...
                  </>
                ) : (
                  <>
                    Se connecter
                    <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </span>
            </button>
          </motion.form>

          {/* Accès démo ITIS — survol : mot de passe */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.45 }}
            className="mt-6 pt-5 border-t border-slate-200/80 dark:border-white/10"
          >
            <p className="mb-3 text-center text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">
              Informations
            </p>
            <div
              className="group/demo relative flex w-full cursor-default select-none items-center gap-4 rounded-xl border border-slate-200/90 bg-slate-50/80 px-4 py-4 transition-all duration-300 dark:border-orange-500/25 dark:bg-white/[0.04] dark:shadow-[0_0_24px_-8px_rgba(249,115,22,0.35)] dark:hover:border-orange-400/45 dark:hover:shadow-[0_0_32px_-6px_rgba(249,115,22,0.45)]"
              title="Survolez pour afficher le mot de passe démo"
            >
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 dark:border-orange-500/35 dark:bg-white/[0.06] dark:text-orange-300/90">
                <LogIn className="h-5 w-5" strokeWidth={1.75} />
              </div>
              <div className="min-w-0 flex-1 text-left">
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-500">
                  Accès Dashboard · HORS {ITIS_FORMATION_NAME}
                </p>
                <div className="relative mt-1 min-h-[1.75rem]">
                  <p className="truncate text-base font-medium text-slate-900 transition-opacity duration-200 group-hover/demo:pointer-events-none group-hover/demo:opacity-0 dark:text-white sm:text-lg">
                    <span className="text-slate-900 dark:text-white">E-mail : </span>
                    <span className="bg-gradient-to-r from-orange-500 to-red-500 bg-clip-text font-extrabold text-transparent">
                      {ITIS_ADMIN_EMAIL}
                    </span>
                  </p>
                  <p className="pointer-events-none absolute left-0 top-0 flex flex-wrap items-baseline gap-1.5 text-base font-medium opacity-0 transition-opacity duration-200 group-hover/demo:opacity-100 sm:text-lg">
                    <span className="text-slate-900 dark:text-white">Mot de passe :</span>
                    <span className="bg-gradient-to-r from-orange-500 to-red-500 bg-clip-text font-extrabold text-transparent">
                      {ITIS_DEMO_PASSWORD}
                    </span>
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
}
