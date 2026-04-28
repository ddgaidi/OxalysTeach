"use client";

import { useEffect, useState, useRef } from "react";
import {
  fetchFablabs,
  getStatusColor,
  getStatusLabel,
  AirStatus,
  AIR_INDEX_OPTIMAL_MAX,
  AIR_INDEX_DANGER_MIN,
} from "@/src/lib/schools";
import {
  ArrowRight,
  Wind,
  Bell,
  Workflow,
  GraduationCap,
  TrendingUp,
  Zap,
  Shield,
} from "lucide-react";
import { motion, useMotionValue, useSpring, useTransform, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { Navbar } from "@/src/components/sections/Navbar";
import { TeacherList } from "@/src/components/sections/teacher-list";

const bentoFeatures = [
  {
    title: "Qualité de l'air",
    icon: Wind,
    text: "Suivi de l'indice qualité de l'air en temps réel pour un environnement sain et productif.",
    accent: "from-orange-500/20 to-red-500/10",
    iconColor: "text-orange-400",
    iconBg: "bg-orange-500/15",
    span: "lg:col-span-2",
  },
  {
    title: "Alertes intelligentes",
    icon: Bell,
    text: "Notifications instantanées dès que les seuils de sécurité sont dépassés.",
    accent: "from-rose-500/20 to-pink-500/10",
    iconColor: "text-rose-400",
    iconBg: "bg-rose-500/15",
    span: "",
  },
  {
    title: "Réponse rapide",
    icon: Zap,
    text: "Latence inférieure à 500ms entre le capteur et le tableau de bord.",
    accent: "from-amber-500/20 to-orange-500/10",
    iconColor: "text-amber-400",
    iconBg: "bg-amber-500/15",
    span: "",
  },
  {
    title: "Historique & analyses",
    icon: Workflow,
    text: "Visualisez les tendances pour optimiser l'aération de votre espace sur la durée.",
    accent: "from-red-500/20 to-rose-500/10",
    iconColor: "text-red-400",
    iconBg: "bg-red-500/15",
    span: "",
  },
  {
    title: "Sécurité garantie",
    icon: Shield,
    text: "Données hébergées et chiffrées. Accès strictement réservé à votre établissement.",
    accent: "from-orange-500/20 to-amber-500/10",
    iconColor: "text-orange-300",
    iconBg: "bg-orange-500/15",
    span: "",
  },
];

function FloatingOrb({ className, animate }: { className: string; animate: Record<string, number[]> }) {
  return (
    <motion.div
      animate={animate}
      transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
      className={`pointer-events-none absolute rounded-full blur-[100px] ${className}`}
    />
  );
}

function BentoCard({
  feature,
  index,
}: {
  feature: (typeof bentoFeatures)[0];
  index: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    mouseX.set(e.clientX - rect.left);
    mouseY.set(e.clientY - rect.top);
  };

  const background = useTransform(
    [mouseX, mouseY],
    ([x, y]) =>
      `radial-gradient(200px circle at ${x}px ${y}px, rgba(249,115,22,0.08), transparent 70%)`,
  );

  const Icon = feature.icon;

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.5, delay: index * 0.08, ease: [0.22, 1, 0.36, 1] }}
      onMouseMove={handleMouseMove}
            className={`card-shine group relative overflow-hidden rounded-2xl border border-black/8 dark:border-white/8 bg-white dark:bg-white/3 shadow-sm dark:shadow-none hover:border-black/15 dark:hover:border-white/15 transition-all duration-500 p-6 ${feature.span}`}
    >
      <motion.div className="pointer-events-none absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300" style={{ background }} />
      <div className={`absolute inset-0 bg-gradient-to-br ${feature.accent} opacity-50`} />

      <div className="relative">
        <div className={`mb-4 inline-flex h-10 w-10 items-center justify-center rounded-xl ${feature.iconBg}`}>
          <Icon className={`h-5 w-5 ${feature.iconColor}`} />
        </div>
        <h3 className="font-bold text-slate-900 dark:text-white mb-2">{feature.title}</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">{feature.text}</p>
      </div>
    </motion.div>
  );
}

const titleWords = ["Oxalys", "Teach"];

export default function Home() {
  const [schoolName, setSchoolName] = useState("");
  const [airStatus, setAirStatus] = useState<AirStatus>("Optimal");
  const [avgAirIndex, setAvgAirIndex] = useState<number | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    async function loadData() {
      const name = document.cookie
        .split("; ")
        .find((row) => row.startsWith("school_name="))
        ?.split("=")[1];

      if (name) {
        const decodedName = decodeURIComponent(name);
        setSchoolName(decodedName);
        const allSchools = await fetchFablabs();
        const school = allSchools.find((s) => s.name === decodedName);
        if (school) {
          setAirStatus(school.status);
          const vals = school.sensors.map((s) => s.airQualite).filter((v) => Number.isFinite(v));
          setAvgAirIndex(vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null);
        }
      }
    }
    loadData();
  }, []);

  const statusColors = getStatusColor(airStatus);
  const statusLabel = getStatusLabel(airStatus);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.12, delayChildren: 0.2 } },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] } },
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-50 dark:bg-[#05050f] text-slate-900 dark:text-slate-100 transition-colors duration-300">
      {/* Background orbs — dark only */}
      <FloatingOrb
        className="h-[600px] w-[600px] -left-48 -top-48 bg-orange-600/20 opacity-0 dark:opacity-100"
        animate={{ x: [0, 50, -20, 0], y: [0, -40, 30, 0], scale: [1, 1.1, 0.95, 1] }}
      />
      <FloatingOrb
        className="h-[500px] w-[500px] -right-32 top-1/3 bg-red-700/15 opacity-0 dark:opacity-100"
        animate={{ x: [0, -40, 20, 0], y: [0, 30, -20, 0], scale: [1, 0.9, 1.05, 1] }}
      />
      <FloatingOrb
        className="h-[400px] w-[400px] left-1/2 bottom-0 -translate-x-1/2 bg-rose-600/10 opacity-0 dark:opacity-100"
        animate={{ x: [0, 20, -15, 0], y: [0, -25, 10, 0] }}
      />

      {/* Grid */}
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(0,0,0,.04)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,.04)_1px,transparent_1px)] dark:bg-[linear-gradient(rgba(255,255,255,.018)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.018)_1px,transparent_1px)] bg-[size:72px_72px]" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-10%,rgba(249,115,22,0.06),transparent)]" />

      <Navbar />

      <main className="relative mx-auto w-full max-w-7xl px-6 pt-32 pb-24 lg:px-12">
        {/* Hero */}
        <motion.section
          variants={containerVariants}
          initial="hidden"
          animate={mounted ? "visible" : "hidden"}
          className="grid items-center gap-16 lg:grid-cols-[1.15fr_0.85fr]"
        >
          <div className="space-y-8">
            {/* Badge */}
            <motion.div variants={itemVariants}>
              <AnimatePresence>
                {schoolName ? (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="inline-flex items-center gap-2 rounded-full border border-orange-500/25 bg-orange-500/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-orange-400"
                  >
                    <div className="h-1.5 w-1.5 rounded-full bg-orange-500 animate-pulse" />
                    <GraduationCap className="h-3.5 w-3.5" />
                    Espace {schoolName}
                  </motion.div>
                ) : (
                  <span className="inline-flex items-center gap-2 rounded-full border border-orange-500/20 bg-orange-500/8 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-orange-400">
                    <TrendingUp className="h-3.5 w-3.5" />
                    Nouvelle expérience pro
                  </span>
                )}
              </AnimatePresence>
            </motion.div>

            {/* Title */}
            <motion.div variants={itemVariants} className="space-y-2">
              <div className="flex h-16 w-full max-w-[400px]">
                <img
                  src="/oxalys-teach.png"
                  alt="OxalysTeach"
                  className="h-16 w-auto object-contain object-left dark:hidden"
                />
                <img
                  src="/oxalys-teach-light.png"
                  alt="OxalysTeach"
                  className="h-16 w-auto object-contain object-left hidden dark:block"
                />
              </div>
              <h2 className="text-2xl font-bold text-slate-500 dark:text-slate-400 sm:text-3xl lg:text-4xl tracking-tight">
                {schoolName || "Le futur de l'enseignement"}
              </h2>
            </motion.div>

            {/* Description */}
            <motion.p variants={itemVariants} className="max-w-xl text-base text-slate-500 dark:text-slate-400 sm:text-lg leading-relaxed">
              Pilotez vos espaces éducatifs avec une interface haut de gamme.{" "}
              {schoolName
                ? `Bienvenue dans l'espace ${schoolName}.`
                : "Monitoring de l'air, gestion des équipes, données en temps réel."}
            </motion.p>

            {/* CTAs */}
            <motion.div variants={itemVariants} className="flex flex-wrap items-center gap-4">
              <Link
                href="/dashboard"
                className="group relative inline-flex items-center gap-2.5 overflow-hidden rounded-full px-8 py-4 text-sm font-bold text-white shadow-xl shadow-orange-500/20"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-orange-500 via-red-500 to-rose-600 animate-gradient-shift" />
                <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 bg-gradient-to-r from-transparent via-white/10 to-transparent skew-x-12" />
                <span className="relative">Accéder au Dashboard</span>
                <ArrowRight className="relative h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </Link>

              <a
                href="#teachers"
                className="inline-flex items-center gap-2 rounded-full border border-slate-300 dark:border-white/10 px-8 py-4 text-sm font-semibold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:border-slate-400 dark:hover:border-white/20 hover:bg-slate-100 dark:hover:bg-white/5 transition-all duration-200"
              >
                Voir l'équipe
              </a>
            </motion.div>
          </div>

          {/* Status card */}
          <motion.div
            variants={itemVariants}
            className="relative"
          >
            <div className="absolute -inset-1 rounded-3xl bg-gradient-to-br from-orange-500/20 via-transparent to-red-600/20 blur-xl opacity-60" />
            <div className="relative rounded-3xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 backdrop-blur-xl p-6 shadow-lg dark:shadow-[0_30px_60px_rgba(0,0,0,0.4)]">
              {/* Status top */}
              <div className={`rounded-2xl border ${statusColors.border} ${statusColors.bg} p-5 mb-4`}>
                <div className="flex items-center justify-between mb-3">
                  <p className={`text-[10px] font-bold uppercase tracking-widest ${statusColors.badge}`}>
                    Qualité de l'air
                    {schoolName ? ` · ${schoolName}` : ""}
                  </p>
                  <div className={`h-2 w-2 rounded-full ${statusColors.dot} animate-pulse`} />
                </div>
                <p className={`text-3xl font-black ${statusColors.text}`}>{airStatus}</p>
                <p className={`mt-1.5 text-sm italic ${statusColors.lightText}`}>"{statusLabel}"</p>

                {/* Progress bar */}
                <div className="mt-4 h-1 w-full rounded-full bg-black/20 overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{
                      width: `${Math.max(
                        8,
                        Math.min(
                          100,
                          avgAirIndex != null
                            ? 100 - (avgAirIndex / (AIR_INDEX_DANGER_MIN * 1.35)) * 100
                            : airStatus === "Optimal"
                              ? 88
                              : airStatus === "Dangereux"
                                ? 48
                                : 22,
                        ),
                      )}%`,
                    }}
                    transition={{ delay: 0.8, duration: 1.2, ease: "easeOut" }}
                    className={`h-full rounded-full ${statusColors.dot}`}
                  />
                </div>
              </div>

              {/* Metrics */}
              {[
                {
                  label: "Indice qualité de l'air (moy.)",
                  value: avgAirIndex != null ? `${avgAirIndex.toFixed(1)}` : "—",
                  ok: avgAirIndex == null ? true : avgAirIndex <= AIR_INDEX_OPTIMAL_MAX,
                },
                { label: "Ventilation", value: "À adapter selon l'indice", ok: true },
                { label: "Dernière alerte", value: "Voir le tableau de bord", ok: true },
              ].map((item, i) => (
                <motion.div
                  key={item.label}
                  initial={{ opacity: 0, x: 16 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.5 + i * 0.1 }}
                  className="flex items-center gap-3 rounded-xl border border-slate-100 dark:border-white/5 bg-slate-50 dark:bg-white/3 px-4 py-3 mb-2 last:mb-0"
                >
                  <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 shrink-0" />
                  <p className="text-xs text-slate-500 dark:text-slate-400 flex-1">{item.label}</p>
                  <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">{item.value}</p>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </motion.section>

        {/* Bento features */}
        <section className="mt-28">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="mb-10 text-center"
          >
            <p className="text-xs font-bold uppercase tracking-[0.25em] text-orange-500 mb-3">Fonctionnalités</p>
            <h2 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white sm:text-4xl">
              Tout ce dont vous avez besoin
            </h2>
            <p className="mt-3 text-slate-500 dark:text-slate-400 max-w-xl mx-auto">
              Une plateforme complète pour superviser, analyser et agir sur la qualité de votre environnement.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 auto-rows-fr">
            {bentoFeatures.map((feature, i) => (
              <BentoCard key={feature.title} feature={feature} index={i} />
            ))}
          </div>
        </section>
      </main>

      <TeacherList />

      {/* Footer */}
      <footer className="relative border-t border-slate-200 dark:border-white/5 py-10">
        <div className="mx-auto flex w-full max-w-7xl flex-col sm:flex-row items-center justify-between gap-3 px-6 lg:px-12">
          <div className="flex items-center gap-2">
            <p className="text-xs text-slate-500 font-medium flex items-center gap-1.5">
              © 2026
              <img
                src="/oxalys-teach.png"
                alt="OxalysTeach"
                width={72}
                height={16}
                className="inline-block align-middle dark:hidden"
              />
              <img
                src="/oxalys-teach-light.png"
                alt="OxalysTeach"
                width={72}
                height={16}
                className="align-middle hidden dark:block"
              />
              {schoolName ? ` · ${schoolName}` : ""}
            </p>
          </div>
          <p className="text-xs text-slate-400 dark:text-slate-600">Interface conçue pour les établissements modernes.</p>
        </div>
      </footer>
    </div>
  );
}
