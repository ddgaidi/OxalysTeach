"use client";

import { useEffect, useRef, useState } from "react";
import { supabase } from "@/src/lib/supabase";
import { motion, useMotionValue, useTransform, AnimatePresence } from "framer-motion";
import { User, Mail, BookOpen, Search, Wrench, ShieldCheck, X } from "lucide-react";

interface ProfessorData {
  id: string;
  fablab_id: string;
  nom: string;
  prenom: string;
  matiere: string;
  email: string;
  created_at: string;
}

interface TechnicianData {
  id: string;
  prenom: string;
  nom: string;
  image: string | null;
  created_at: string;
}

const normalizeText = (value: string) =>
  value.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();

const REQUIRED_SUBJECTS = [
  "SVT",
  "Mathématiques",
  "Physique-Chimie",
  "Informatique",
  "Philosophie",
];

const SUBJECT_COLORS: Record<string, { gradient: string; border: string; icon: string; dot: string }> = {
  SVT:              { gradient: "from-emerald-500/15 to-teal-500/5",   border: "border-emerald-500/20",  icon: "bg-emerald-500/15 text-emerald-400",  dot: "bg-emerald-500" },
  Mathématiques:    { gradient: "from-blue-500/15 to-indigo-500/5",    border: "border-blue-500/20",     icon: "bg-blue-500/15 text-blue-400",        dot: "bg-blue-500" },
  "Physique-Chimie":{ gradient: "from-purple-500/15 to-violet-500/5",  border: "border-purple-500/20",   icon: "bg-purple-500/15 text-purple-400",    dot: "bg-purple-500" },
  Informatique:     { gradient: "from-orange-500/15 to-amber-500/5",   border: "border-orange-500/20",   icon: "bg-orange-500/15 text-orange-400",    dot: "bg-orange-500" },
  Philosophie:      { gradient: "from-rose-500/15 to-pink-500/5",      border: "border-rose-500/20",     icon: "bg-rose-500/15 text-rose-400",        dot: "bg-rose-500" },
};

function getSubjectColors(matiere: string) {
  return SUBJECT_COLORS[matiere] ?? {
    gradient: "from-slate-500/10 to-slate-400/5",
    border: "border-white/10",
    icon: "bg-white/10 text-slate-400",
    dot: "bg-slate-500",
  };
}

function getInitials(prenom: string, nom: string) {
  return `${prenom[0] ?? ""}${nom[0] ?? ""}`.toUpperCase();
}

function TeacherCard({ teacher, index }: { teacher: ProfessorData; index: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const colors = getSubjectColors(teacher.matiere);
  const isPending = teacher.id.startsWith("fallback-");

  const background = useTransform(
    [mouseX, mouseY],
    ([x, y]) =>
      `radial-gradient(180px circle at ${x}px ${y}px, rgba(255,255,255,0.04), transparent 70%)`,
  );

  return (
    <motion.article
      ref={ref}
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.5, delay: index * 0.06, ease: [0.22, 1, 0.36, 1] }}
      whileHover={{ y: -3 }}
      onMouseMove={(e) => {
        if (!ref.current) return;
        const rect = ref.current.getBoundingClientRect();
        mouseX.set(e.clientX - rect.left);
        mouseY.set(e.clientY - rect.top);
      }}
      className={`card-shine group relative overflow-hidden rounded-2xl border ${colors.border} bg-gradient-to-br ${colors.gradient} backdrop-blur-sm transition-all duration-300 hover:shadow-lg p-5 ${isPending ? "opacity-40" : ""}`}
    >
      <motion.div
        className="pointer-events-none absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
        style={{ background }}
      />

      <div className="relative flex items-start gap-4">
        {/* Avatar */}
        <div className="relative shrink-0">
          {isPending ? (
            <div className="h-12 w-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center">
              <User className="h-5 w-5 text-slate-600" />
            </div>
          ) : (
            <div className={`h-12 w-12 rounded-xl ${colors.icon} flex items-center justify-center font-bold text-sm transition-transform duration-300 group-hover:scale-110`}>
              {getInitials(teacher.prenom, teacher.nom)}
            </div>
          )}
          <div className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-slate-50 dark:border-[#05050f] ${isPending ? "bg-slate-600" : colors.dot}`} />
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 mb-1">
            <h4 className={`font-bold text-sm truncate ${isPending ? "text-slate-500 italic" : "text-slate-900 dark:text-white"}`}>
              {teacher.prenom} {teacher.nom}
            </h4>
            {!isPending && (
              <span className="shrink-0 inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] font-semibold text-slate-400">
                <ShieldCheck className="h-2.5 w-2.5" />
                Enseignant
              </span>
            )}
          </div>
          <p className={`text-xs font-semibold mb-3 ${isPending ? "text-slate-600" : colors.icon.split(" ")[1]}`}>
            {teacher.matiere}
          </p>
          {!isPending && (
            <a
              href={`mailto:${teacher.email}`}
              className="flex items-center gap-1.5 text-[11px] text-slate-500 hover:text-slate-300 transition-colors group/mail"
            >
              <Mail className="h-3 w-3 shrink-0 group-hover/mail:text-orange-400 transition-colors" />
              <span className="truncate">{teacher.email}</span>
            </a>
          )}
        </div>
      </div>
    </motion.article>
  );
}

function TechCard({ tech, index }: { tech: TechnicianData; index: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  const background = useTransform(
    [mouseX, mouseY],
    ([x, y]) =>
      `radial-gradient(160px circle at ${x}px ${y}px, rgba(6,182,212,0.06), transparent 70%)`,
  );

  return (
    <motion.article
      ref={ref}
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.5, delay: index * 0.07, ease: [0.22, 1, 0.36, 1] }}
      whileHover={{ y: -3 }}
      onMouseMove={(e) => {
        if (!ref.current) return;
        const rect = ref.current.getBoundingClientRect();
        mouseX.set(e.clientX - rect.left);
        mouseY.set(e.clientY - rect.top);
      }}
      className="card-shine group relative overflow-hidden rounded-2xl border border-cyan-500/15 bg-gradient-to-br from-cyan-500/10 to-sky-500/5 backdrop-blur-sm transition-all duration-300 hover:shadow-lg hover:border-cyan-500/25 p-5"
    >
      <motion.div
        className="pointer-events-none absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
        style={{ background }}
      />
      <div className="relative flex items-center gap-4">
        <div className="relative shrink-0">
          <div className="h-12 w-12 rounded-xl bg-cyan-500/15 text-cyan-400 flex items-center justify-center font-bold text-sm transition-transform duration-300 group-hover:scale-110">
            {getInitials(tech.prenom, tech.nom)}
          </div>
          <div className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-slate-50 dark:border-[#05050f] bg-cyan-500" />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="font-bold text-sm text-slate-900 dark:text-white truncate mb-0.5">
            {tech.prenom} {tech.nom}
          </h4>
          <div className="flex items-center gap-1.5">
            <Wrench className="h-3 w-3 text-cyan-400 shrink-0" />
            <p className="text-xs text-cyan-400 font-medium">Technicien FabLab</p>
          </div>
        </div>
      </div>
    </motion.article>
  );
}

export function TeacherList() {
  const [teachers, setTeachers] = useState<ProfessorData[]>([]);
  const [technicians, setTechnicians] = useState<TechnicianData[]>([]);
  const [schoolName, setSchoolName] = useState("");
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    async function fetchData() {
      try {
        const cookies = document.cookie.split("; ");
        const rawName = cookies.find((r) => r.startsWith("school_name="))?.split("=")[1];
        const rawId   = cookies.find((r) => r.startsWith("school_id="))?.split("=")[1];

        const decodedName = rawName ? decodeURIComponent(rawName) : "";
        setSchoolName(decodedName);

        let fablabId: string | null = rawId ? decodeURIComponent(rawId) : null;

        // Fallback : résolution par nom si le cookie school_id est absent
        if (!fablabId && decodedName) {
          const { data, error } = await supabase
            .from("fablab")
            .select("id")
            .eq("nom", decodedName)
            .single();
          if (error || !data) { setLoading(false); return; }
          fablabId = data.id;
        }

        if (!fablabId) { setLoading(false); return; }

        const encodedId = encodeURIComponent(fablabId);

        const [personnelRes, techniciensRes] = await Promise.all([
          fetch(`/api/personnel?fablabId=${encodedId}`),
          fetch(`/api/techniciens?fablabId=${encodedId}`),
        ]);

        if (personnelRes.ok) {
          const { professors } = await personnelRes.json();
          setTeachers((professors ?? []) as ProfessorData[]);
        } else {
          console.error("Personnel API error:", personnelRes.status);
        }

        if (techniciensRes.ok) {
          const { technicians: techs } = await techniciensRes.json();
          setTechnicians((techs ?? []) as TechnicianData[]);
        } else {
          console.error("Techniciens API error:", techniciensRes.status);
        }
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const filteredTeachers = teachers.filter(
    (t) =>
      normalizeText(`${t.prenom} ${t.nom}`).includes(normalizeText(searchTerm)) ||
      normalizeText(t.matiere).includes(normalizeText(searchTerm)),
  );

  const displayedTeachers = searchTerm.trim()
    ? filteredTeachers
    : REQUIRED_SUBJECTS.map((subject) => {
        const key = normalizeText(subject);
        const found = filteredTeachers.find((t) => normalizeText(t.matiere) === key);
        if (found) return found;
        return {
          id: `fallback-${key}`,
          fablab_id: "",
          nom: "Affectation",
          prenom: "En attente",
          matiere: subject,
          email: "non-assigne@oxalysteach.local",
          created_at: "",
        } satisfies ProfessorData;
      });

  const filteredTechnicians = technicians.filter((t) =>
    normalizeText(`${t.prenom} ${t.nom}`).includes(normalizeText(searchTerm)),
  );

  return (
      <section id="teachers" className="relative py-28 overflow-hidden bg-slate-50 dark:bg-transparent">
      {/* Background */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_60%_60%_at_10%_50%,rgba(249,115,22,0.07),transparent),radial-gradient(ellipse_50%_50%_at_90%_30%,rgba(6,182,212,0.06),transparent)]" />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(0,0,0,.03)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,.03)_1px,transparent_1px)] dark:bg-[linear-gradient(rgba(255,255,255,.012)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.012)_1px,transparent_1px)] bg-[size:72px_72px]" />

      <div className="relative mx-auto max-w-7xl px-6 lg:px-12">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="mb-12"
        >
          <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
            <div className="space-y-4">
              <p className="text-xs font-bold uppercase tracking-[0.25em] text-orange-500">Équipe pédagogique</p>
              <h2 className="text-4xl font-black tracking-tighter text-slate-900 dark:text-white sm:text-5xl">
                Professeurs &{" "}
                <span className="text-gradient">Techniciens</span>
                {schoolName && (
                  <span className="block mt-1 text-2xl text-slate-500 dark:text-slate-400 font-bold">{schoolName}</span>
                )}
              </h2>
              <p className="max-w-lg text-slate-500 dark:text-slate-400">
                L'équipe pédagogique et technique de votre établissement, présentée en temps réel.
              </p>
            </div>

            {/* Stats */}
            <div className="flex gap-4 shrink-0">
              <div className="rounded-2xl border border-orange-500/15 bg-orange-500/8 px-5 py-3 text-center">
                <p className="text-[10px] uppercase tracking-widest text-orange-400/70 mb-1">Professeurs</p>
                <p className="text-3xl font-black text-slate-900 dark:text-white">{teachers.length}</p>
              </div>
              <div className="rounded-2xl border border-cyan-500/15 bg-cyan-500/8 px-5 py-3 text-center">
                <p className="text-[10px] uppercase tracking-widest text-cyan-400/70 mb-1">Techniciens</p>
                <p className="text-3xl font-black text-slate-900 dark:text-white">{technicians.length}</p>
              </div>
            </div>
          </div>

          {/* Search */}
          <div className="relative mt-8 max-w-lg">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
            <input
              type="text"
              placeholder="Rechercher un nom, une matière..."
              className="w-full rounded-2xl border border-slate-200 dark:border-white/8 bg-white dark:bg-white/5 pl-11 pr-10 py-3.5 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-600 focus:outline-none focus:border-orange-500/40 focus:ring-1 focus:ring-orange-500/20 transition-all"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <AnimatePresence>
              {searchTerm && (
                <motion.button
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  onClick={() => setSearchTerm("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 h-6 w-6 rounded-full bg-slate-100 dark:bg-white/10 flex items-center justify-center text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-white/15 transition-all"
                >
                  <X className="h-3 w-3" />
                </motion.button>
              )}
            </AnimatePresence>
          </div>
        </motion.div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <div className="relative h-12 w-12">
              <div className="absolute inset-0 rounded-full border-2 border-orange-500/20" />
              <div className="absolute inset-0 rounded-full border-2 border-t-orange-500 animate-spin" />
            </div>
            <p className="text-sm text-slate-500">Chargement de l'équipe...</p>
          </div>
        ) : (
          <div className="space-y-16">
            {/* Teachers */}
            <div>
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                className="flex items-center gap-3 mb-6"
              >
                <div className="flex items-center gap-2">
                  <BookOpen className="h-5 w-5 text-orange-400" />
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white">Professeurs</h3>
                </div>
                <div className="flex-1 h-px bg-gradient-to-r from-slate-200 dark:from-white/10 to-transparent" />
                <span className="text-xs font-bold uppercase tracking-widest text-slate-500">
                  {displayedTeachers.filter((t) => !t.id.startsWith("fallback-")).length} / {displayedTeachers.length} profils
                </span>
              </motion.div>

              {displayedTeachers.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 rounded-2xl border border-dashed border-slate-200 dark:border-white/8">
                  <Search className="h-8 w-8 text-slate-400 mb-3" />
                  <p className="text-slate-500 text-sm">Aucun professeur ne correspond à votre recherche.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                  {displayedTeachers.map((teacher, i) => (
                    <TeacherCard key={teacher.id} teacher={teacher} index={i} />
                  ))}
                </div>
              )}
            </div>

            {/* Technicians */}
            <div>
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                className="flex items-center gap-3 mb-6"
              >
                <div className="flex items-center gap-2">
                  <Wrench className="h-5 w-5 text-cyan-400" />
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white">Techniciens</h3>
                </div>
                <div className="flex-1 h-px bg-gradient-to-r from-slate-200 dark:from-white/10 to-transparent" />
                <span className="text-xs font-bold uppercase tracking-widest text-slate-500">
                  {filteredTechnicians.length} profils
                </span>
              </motion.div>

              {filteredTechnicians.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 rounded-2xl border border-dashed border-slate-200 dark:border-white/8">
                  <Wrench className="h-8 w-8 text-slate-400 mb-3" />
                  <p className="text-slate-500 text-sm">
                    {searchTerm ? "Aucun technicien ne correspond à votre recherche." : "Aucun technicien enregistré."}
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {filteredTechnicians.map((tech, i) => (
                    <TechCard key={tech.id} tech={tech} index={i} />
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
