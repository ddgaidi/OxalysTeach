"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import {
  GraduationCap,
  Home,
  LayoutDashboard,
  LogOut,
  Bell,
  User,
  Users,
  RefreshCw,
  Cpu,
  Sun,
  Moon,
  ChevronRight,
  Download,
  Clock,
  Trash2,
  Wind,
  Activity,
  Thermometer,
  Droplets,
  ArrowUp,
  ArrowDown,
  Camera,
  Key,
  Settings2,
  Wrench,
  Mail,
  BookOpen,
  X,
  CheckCircle,
  Eye,
  EyeOff,
} from "lucide-react";
import { SensorCard } from "@/src/components/dashboard/sensor-card";
import { getClientCookie } from "@/src/lib/clientCookie";
import { fetchFablabs, getStatusColor, AirStatus, School, SensorData, Teacher, Technician } from "@/src/lib/schools";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTheme } from "@/src/components/providers/theme-provider";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from "recharts";

const notificationsData = [
  { id: 1, title: "Alerte CO2 Élevée", message: "L'imprimante 3D FDM a dépassé 1200ppm.", time: "il y a 5 min", type: "warning" },
  { id: 2, title: "Maintenance", message: "Nettoyage des filtres de la découpe laser prévu demain à 08:00.", time: "il y a 2h", type: "info" },
  { id: 3, title: "Système OK", message: "Toutes les machines sont maintenant sous surveillance.", time: "il y a 5h", type: "success" },
];

const STAT_CARDS = [
  { key: "sensors", label: "Capteurs", unit: "actifs", icon: Cpu,       color: "emerald", glow: "shadow-emerald-500/20" },
  { key: "co2",     label: "CO2 Moyen", unit: "ppm",   icon: Wind,      color: "orange",  glow: "shadow-orange-500/20" },
  { key: "voc",     label: "VOC Moyen", unit: "ppb",   icon: Activity,  color: "purple",  glow: "shadow-purple-500/20" },
  { key: "temp",    label: "Température", unit: "°C",  icon: Thermometer,color: "red",    glow: "shadow-red-500/20" },
  { key: "hum",     label: "Humidité",  unit: "%",     icon: Droplets,  color: "cyan",    glow: "shadow-cyan-500/20" },
] as const;

const COLOR_MAP: Record<string, { bg: string; text: string; border: string }> = {
  emerald: { bg: "bg-emerald-500/15", text: "text-emerald-400", border: "border-emerald-500/20" },
  orange:  { bg: "bg-orange-500/15",  text: "text-orange-400",  border: "border-orange-500/20" },
  purple:  { bg: "bg-purple-500/15",  text: "text-purple-400",  border: "border-purple-500/20" },
  red:     { bg: "bg-red-500/15",     text: "text-red-400",     border: "border-red-500/20" },
  cyan:    { bg: "bg-cyan-500/15",    text: "text-cyan-400",    border: "border-cyan-500/20" },
};

export default function DashboardPage() {
  const router = useRouter();
  const { setTheme, theme } = useTheme();
  const [activeTab, setActiveTab] = useState("overview");
  const [selectedSensorId, setSelectedSensorId] = useState<string | null>(null);
  const [schoolName, setSchoolName] = useState("");
  const [airStatus, setAirStatus] = useState<AirStatus>("Optimal");
  const [currentSchool, setCurrentSchool] = useState<School | null>(null);
  const [chartPeriod, setChartPeriod] = useState<"hour" | "week">("hour");
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isEditingSensors, setIsEditingSensors] = useState(false);
  const [localSensors, setLocalSensors] = useState<SensorData[]>([]);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [lastRefreshAt, setLastRefreshAt] = useState<string>("");
  const [refreshStatus, setRefreshStatus] = useState<"idle" | "success" | "error">("idle");
  const [historyData, setHistoryData] = useState<Array<{ time: string; co2: number; voc: number; temp: number }>>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [isLoadingPersonnel, setIsLoadingPersonnel] = useState(false);
  const [loggedUserName, setLoggedUserName] = useState("");
  const [loggedUserRole, setLoggedUserRole] = useState("technician");
  const [loggedUserAvatar, setLoggedUserAvatar] = useState<string | null>(null);
  // Password modal
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [pwCurrent, setPwCurrent] = useState("");
  const [pwNew, setPwNew] = useState("");
  const [pwConfirm, setPwConfirm] = useState("");
  const [pwShowCurrent, setPwShowCurrent] = useState(false);
  const [pwShowNew, setPwShowNew] = useState(false);
  const [pwLoading, setPwLoading] = useState(false);
  const [pwError, setPwError] = useState("");
  const [pwSuccess, setPwSuccess] = useState(false);
  // Avatar upload
  const [avatarUploading, setAvatarUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadSchoolData = useCallback(async (isManual = false) => {
    const name = document.cookie
      .split("; ")
      .find((row) => row.startsWith("school_name="))
      ?.split("=")[1];

    if (name) {
      try {
        const decodedName = decodeURIComponent(name);
        setSchoolName(decodedName);
        const allSchools = await fetchFablabs();
        const school = allSchools.find((s) => s.name === decodedName);
        if (school) {
          setAirStatus(school.status);
          setCurrentSchool(school);
          setLocalSensors(school.sensors);
          const now = new Date();
          const timestamp = now.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
          setLastRefreshAt(timestamp);
          const sensorCount = school.sensors.length;
          if (sensorCount > 0) {
            const averages = school.sensors.reduce(
              (acc, sensor) => ({
                co2: acc.co2 + sensor.co2 / sensorCount,
                voc: acc.voc + sensor.voc / sensorCount,
                temp: acc.temp + sensor.temp / sensorCount,
              }),
              { co2: 0, voc: 0, temp: 0 },
            );
            setHistoryData((prev) => [...prev, { time: timestamp, ...averages }].slice(-15));
          }
          if (isManual) { setRefreshStatus("success"); setTimeout(() => setRefreshStatus("idle"), 3000); }
        } else if (isManual) { setRefreshStatus("error"); setTimeout(() => setRefreshStatus("idle"), 3000); }
      } catch {
        if (isManual) { setRefreshStatus("error"); setTimeout(() => setRefreshStatus("idle"), 3000); }
      }
    }
  }, []);

  useEffect(() => {
    loadSchoolData();
    const intervalId = window.setInterval(() => loadSchoolData(), 20_000);
    return () => window.clearInterval(intervalId);
  }, [loadSchoolData]);

  useEffect(() => {
    const rawName = getClientCookie("user_name");
    const rawRole = getClientCookie("user_role");
    if (rawName) {
      try {
        setLoggedUserName(decodeURIComponent(rawName));
      } catch {
        setLoggedUserName(rawName);
      }
    }
    if (rawRole) setLoggedUserRole(rawRole);
  }, []);

  // Charge l'avatar du technicien connecté
  useEffect(() => {
    if (loggedUserRole !== "technician") return;
    const userId = getClientCookie("user_id");
    if (!userId) return;
    fetch("/api/technicien/me", { credentials: "include", cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data: { error?: string; image?: string | null } | null) => {
        if (data?.image) setLoggedUserAvatar(data.image);
      })
      .catch(console.error);
  }, [loggedUserRole]);

  useEffect(() => {
    if (activeTab !== "personnel") return;
    const schoolId = document.cookie.split("; ").find((r) => r.startsWith("school_id="))?.split("=")[1];
    if (!schoolId) return;
    setIsLoadingPersonnel(true);
    fetch(`/api/personnel?fablabId=${encodeURIComponent(schoolId)}`)
      .then((res) => res.json())
      .then(({ professors, technicians: techs }) => {
        setTeachers((professors ?? []) as Teacher[]);
        setTechnicians((techs ?? []) as Technician[]);
      })
      .catch(console.error)
      .finally(() => setIsLoadingPersonnel(false));
  }, [activeTab]);

  const handleMoveSensor = (index: number, direction: "up" | "down") => {
    const newSensors = [...localSensors];
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newSensors.length) return;
    [newSensors[index], newSensors[targetIndex]] = [newSensors[targetIndex], newSensors[index]];
    setLocalSensors(newSensors);
  };
  const handleRenameSensor = (id: string, newName: string) => {
    setLocalSensors((prev) => prev.map((s) => (s.id === id ? { ...s, name: newName } : s)));
  };
  const saveSensorsOrder = () => { if (currentSchool) setCurrentSchool({ ...currentSchool, sensors: localSensors }); setIsEditingSensors(false); };

  const statusColors = getStatusColor(airStatus);

  const getAverageValues = () => {
    if (!currentSchool || currentSchool.sensors.length === 0) return { co2: 0, voc: 0, temp: 0, hum: 0 };
    const count = currentSchool.sensors.length;
    return currentSchool.sensors.reduce((acc, s) => ({ co2: acc.co2 + s.co2 / count, voc: acc.voc + s.voc / count, temp: acc.temp + s.temp / count, hum: acc.hum + s.hum / count }), { co2: 0, voc: 0, temp: 0, hum: 0 });
  };
  const avg = getAverageValues();

  const sensorBarsData = useMemo(
    () => (currentSchool?.sensors ?? []).map((sensor) => ({ name: sensor.name.length > 16 ? `${sensor.name.slice(0, 16)}...` : sensor.name, co2: sensor.co2 })),
    [currentSchool?.sensors],
  );

  const healthTips = useMemo(() => ({
    ventilationTip: avg.co2 >= 1000 ? "Le CO2 est eleve : ouvrez largement les fenetres et augmentez l'extraction." : "CO2 correct : maintenez une aeration legere pendant les activites.",
    temperatureTip: avg.temp < 19 ? "Temperature basse : chauffez legerement la salle pour rester entre 19C et 22C." : avg.temp > 24 ? "Temperature elevee : rafraichissez la piece pour le confort des utilisateurs." : "Temperature stable : la zone est dans la plage de confort.",
    humidityTip: avg.hum < 35 ? "Humidite basse : ajoutez un apport d'humidite pour eviter un air trop sec." : avg.hum > 65 ? "Humidite elevee : ventilez pour limiter la condensation et l'inconfort." : "Humidite equilibree : bonnes conditions pour les usages en fablab.",
  }), [avg.co2, avg.temp, avg.hum]);

  const handleExportCSV = () => {
    if (!currentSchool) return;
    let csv = "data:text/csv;charset=utf-8,Nom,CO2 (ppm),VOC (ppb),Temp (°C),Hum (%)\n";
    csv += `VUE D'ENSEMBLE,${avg.co2.toFixed(0)},${avg.voc.toFixed(0)},${avg.temp.toFixed(1)},${avg.hum.toFixed(0)}\n`;
    currentSchool.sensors.forEach((s) => { csv += `${s.name},${s.co2},${s.voc},${s.temp},${s.hum}\n`; });
    const link = document.createElement("a");
    link.setAttribute("href", encodeURI(csv));
    link.setAttribute("download", `export_oxalys_${schoolName.replace(/\s+/g, "_")}.csv`);
    document.body.appendChild(link); link.click(); document.body.removeChild(link);
  };

  const handleLogout = async () => { await fetch("/api/logout", { method: "POST" }); router.push("/login"); router.refresh(); };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pwNew !== pwConfirm) { setPwError("Les mots de passe ne correspondent pas."); return; }
    if (pwNew.length < 6) { setPwError("Le mot de passe doit contenir au moins 6 caractères."); return; }
    setPwLoading(true);
    setPwError("");
    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword: pwCurrent, newPassword: pwNew }),
      });
      const data = await res.json();
      if (!res.ok) { setPwError(data.error ?? "Erreur inconnue."); return; }
      setPwSuccess(true);
      setTimeout(() => {
        setShowPasswordModal(false);
        setPwSuccess(false);
        setPwCurrent(""); setPwNew(""); setPwConfirm("");
      }, 2000);
    } finally {
      setPwLoading(false);
    }
  };

  const closePasswordModal = () => {
    setShowPasswordModal(false);
    setPwError("");
    setPwCurrent(""); setPwNew(""); setPwConfirm("");
    setPwSuccess(false);
  };

  const handleAvatarFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setAvatarUploading(true);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/technicien/avatar", {
        method: "POST",
        body: formData,
        credentials: "include",
      });

      const data = await res.json();

      if (!res.ok) {
        alert(
          (data as { error?: string }).error ||
            "Erreur d’envoi de la photo. Vérifiez la clé service Supabase, le bucket et la colonne image.",
        );
        return;
      }

      if ((data as { url?: string | null }).url) {
        setLoggedUserAvatar((data as { url: string }).url);
        return;
      }

      const meRes = await fetch("/api/technicien/me", {
        cache: "no-store",
        credentials: "include",
      });
      if (meRes.ok) {
        const meData = (await meRes.json()) as { image?: string | null; error?: string };
        if (meData.image) setLoggedUserAvatar(meData.image);
      }

      setIsProfileMenuOpen(false);

    } catch (err) {
      console.error(err);
      alert("Erreur réseau");
    } finally {
      setAvatarUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };
  const sensors = currentSchool?.sensors || [];

  const statValues = { sensors: sensors.length, co2: avg.co2, voc: avg.voc, temp: avg.temp, hum: avg.hum };

  const isDark = theme === "dark";
  const chartGridColor = isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.06)";
  const chartTickStyle = { fontSize: 9, fill: isDark ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.4)" };
  const chartTooltipStyle = isDark
    ? { backgroundColor: "#0d0d1a", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "12px", fontSize: "12px", color: "#e2e8f0" }
    : { backgroundColor: "#ffffff", border: "1px solid rgba(0,0,0,0.10)", borderRadius: "12px", fontSize: "12px", color: "#1e293b" };

  return (
    <div className="flex min-h-screen bg-slate-100 dark:bg-[#05050f] overflow-x-hidden text-slate-900 dark:text-slate-100 transition-colors duration-300">
      {/* Background orbs — dark only */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden z-0 opacity-0 dark:opacity-100">
        <div className="absolute -left-40 -top-40 h-96 w-96 rounded-full bg-orange-600/10 blur-[120px] animate-float" />
        <div className="absolute -right-32 bottom-0 h-80 w-80 rounded-full bg-red-700/8 blur-[100px] animate-float-slow" />
      </div>

      {/* SIDEBAR */}
      <aside className="hidden lg:flex w-68 flex-col bg-white dark:bg-black/40 backdrop-blur-2xl border-r border-slate-200 dark:border-white/5 sticky top-0 h-screen z-10" style={{ width: "272px" }}>
        <div className="p-5 border-b border-slate-100 dark:border-white/5">
          <Link href="/" className="group flex items-center">
            <img
              src="/oxalys-teach.png"
              alt="OxalysTeach"
              className="h-8 w-auto transition-transform duration-300 group-hover:scale-105 dark:hidden"
            />
            <img
              src="/oxalys-teach-light.png"
              alt="OxalysTeach"
              className="h-8 w-auto transition-transform duration-300 group-hover:scale-105 hidden dark:block"
            />
          </Link>
        </div>

        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          <p className="text-[9px] uppercase font-bold text-slate-400 dark:text-white/20 px-3 pt-2 pb-1 tracking-widest">Principal</p>

          {[
            { id: "overview",  label: "Vue d'ensemble", icon: LayoutDashboard },
            { id: "personnel", label: "Personnel",       icon: Users },
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`group w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 text-sm font-medium relative overflow-hidden ${
                activeTab === id
                  ? "text-slate-900 dark:text-white"
                  : "text-slate-400 dark:text-white/40 hover:text-slate-700 dark:hover:text-white/70 hover:bg-slate-100 dark:hover:bg-white/5"
              }`}
            >
              {activeTab === id && (
                <motion.div
                  layoutId="sidebar-active"
                  className="absolute inset-0 bg-gradient-to-r from-orange-500/20 to-red-500/10 border border-orange-500/20 rounded-xl"
                />
              )}
              <Icon size={16} className={`relative shrink-0 ${activeTab === id ? "text-orange-400" : ""}`} />
              <span className="relative">{label}</span>
              {activeTab === id && (
                <div className="absolute right-3 h-1.5 w-1.5 rounded-full bg-orange-500 animate-pulse" />
              )}
            </button>
          ))}

          <div className="flex items-center justify-between px-3 pt-5 pb-1">
            <p className="text-[9px] uppercase font-bold text-slate-400 dark:text-white/20 tracking-widest">Capteurs Air</p>
            <button
              onClick={() => (isEditingSensors ? saveSensorsOrder() : setIsEditingSensors(true))}
              className="flex items-center gap-1 text-[9px] font-bold text-orange-500/70 hover:text-orange-400 transition-colors"
            >
              <Settings2 size={9} />
              {isEditingSensors ? "Enregistrer" : "Modifier"}
            </button>
          </div>

          <div className="space-y-0.5">
            {localSensors.map((sensor, index) => (
              <div key={sensor.id}>
                {isEditingSensors ? (
                  <div className="flex items-center gap-2 px-2 py-1.5 rounded-xl bg-slate-100 dark:bg-white/3 border border-slate-200 dark:border-white/5">
                    <div className="flex flex-col gap-0.5">
                      <button onClick={() => handleMoveSensor(index, "up")} disabled={index === 0} className="p-0.5 text-slate-400 dark:text-white/30 hover:text-orange-400 disabled:opacity-20 transition-colors">
                        <ArrowUp size={10} />
                      </button>
                      <button onClick={() => handleMoveSensor(index, "down")} disabled={index === localSensors.length - 1} className="p-0.5 text-slate-400 dark:text-white/30 hover:text-orange-400 disabled:opacity-20 transition-colors">
                        <ArrowDown size={10} />
                      </button>
                    </div>
                    <input
                      type="text"
                      value={sensor.name}
                      onChange={(e) => handleRenameSensor(sensor.id, e.target.value)}
                      className="flex-1 bg-transparent text-xs font-medium text-slate-600 dark:text-white/70 focus:outline-none focus:text-orange-400 transition-colors"
                    />
                  </div>
                ) : (
                  <button
                    onClick={() => { setActiveTab("sensor-detail"); setSelectedSensorId(sensor.id); }}
                    className={`group w-full flex items-center gap-2.5 px-3 py-2 rounded-xl transition-all text-xs relative ${
                      activeTab === "sensor-detail" && selectedSensorId === sensor.id
                        ? "text-orange-400 bg-orange-500/10 border border-orange-500/15"
                        : "text-slate-500 dark:text-white/35 hover:text-slate-700 dark:hover:text-white/60 hover:bg-slate-100 dark:hover:bg-white/4"
                    }`}
                  >
                    <div className={`h-1.5 w-1.5 rounded-full shrink-0 ${sensor.status === "good" ? "bg-emerald-500" : sensor.status === "warning" ? "bg-orange-500 animate-pulse" : "bg-red-500 animate-pulse"}`} />
                    <span className="truncate font-medium">{sensor.name}</span>
                    <ChevronRight size={10} className="ml-auto opacity-40 group-hover:opacity-70 transition-opacity shrink-0" />
                  </button>
                )}
              </div>
            ))}
          </div>

          <p className="text-[9px] uppercase font-bold text-slate-400 dark:text-white/20 px-3 pt-5 pb-1 tracking-widest">Navigation</p>
          <Link
            href="/"
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-500 dark:text-white/40 hover:text-slate-700 dark:hover:text-white/70 hover:bg-slate-100 dark:hover:bg-white/5 transition-all"
          >
            <Home size={16} />
            Retour à l'accueil
          </Link>
        </nav>

        {/* Profile */}
        <div className="p-3 border-t border-slate-200 dark:border-white/5 relative">
          <button
            onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
            className="w-full flex items-center gap-3 p-3 rounded-2xl hover:bg-slate-100 dark:hover:bg-white/5 transition-all group text-left"
          >
            <div className="h-9 w-9 rounded-full border border-orange-500/20 overflow-hidden shrink-0 group-hover:scale-105 transition-transform">
              {loggedUserAvatar ? (
                <img src={loggedUserAvatar} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-orange-500/30 to-red-500/20 flex items-center justify-center">
                  <User size={16} className="text-orange-400" />
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-slate-900 dark:text-white truncate">{loggedUserName}</p>
              <p className="text-[9px] text-slate-500 dark:text-white/30 truncate capitalize">
                Technicien FabLab
              </p>
            </div>
          </button>

          <AnimatePresence>
            {isProfileMenuOpen && (
              <>
                <div className="fixed inset-0 z-40 cursor-pointer" onClick={() => setIsProfileMenuOpen(false)} />
                <motion.div
                  initial={{ opacity: 0, y: 8, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 8, scale: 0.96 }}
                  className="absolute bottom-full left-3 right-3 mb-2 bg-white dark:bg-[#0d0d1a] rounded-2xl border border-slate-200 dark:border-white/8 shadow-[0_20px_60px_rgba(0,0,0,0.12)] dark:shadow-[0_20px_60px_rgba(0,0,0,0.6)] z-50 overflow-hidden"
                >
                  <div className="p-1.5 space-y-0.5">
                    {/* Modifier le mot de passe */}
                    <button
                      onClick={() => { setIsProfileMenuOpen(false); setShowPasswordModal(true); }}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-white/5 transition-all text-left disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <div className="h-7 w-7 rounded-lg flex items-center justify-center text-blue-400 bg-blue-500/10">
                        <Key size={13} />
                      </div>
                      <span className="text-xs font-medium text-slate-700 dark:text-white/70">Modifier le mot de passe</span>
                    </button>
                    {/* Photo de profil */}
                    <button
                      onClick={() => { setIsProfileMenuOpen(false); fileInputRef.current?.click(); }}
                      disabled={avatarUploading}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-white/5 transition-all text-left disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <div className="h-7 w-7 rounded-lg flex items-center justify-center text-purple-400 bg-purple-500/10">
                        {avatarUploading ? <RefreshCw size={13} className="animate-spin" /> : <Camera size={13} />}
                      </div>
                      <span className="text-xs font-medium text-slate-700 dark:text-white/70">
                        {avatarUploading ? "Envoi en cours…" : "Photo de profil"}
                      </span>
                    </button>
                  </div>
                  {/* Input fichier caché */}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleAvatarFileChange}
                  />
                </motion.div>
              </>
            )}
          </AnimatePresence>

          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-red-400/70 hover:text-red-400 hover:bg-red-500/8 transition-all mt-1"
          >
            <LogOut size={15} />
            Déconnexion
          </button>
        </div>
      </aside>

      {/* MAIN */}
      <main className="relative flex-1 flex flex-col min-w-0 overflow-hidden z-10">
        {/* Top header */}
        <header className="h-16 bg-white/80 dark:bg-black/30 backdrop-blur-xl border-b border-slate-200 dark:border-white/5 flex items-center justify-between px-6 sticky top-0 z-20">
          <div>
            <h1 className="text-base font-black text-slate-900 dark:text-white tracking-tight">
              Tableau de bord
              {schoolName && (
                <span className="ml-2 text-sm font-semibold text-gradient">· {schoolName}</span>
              )}
            </h1>
            <p className="text-[10px] text-slate-400 dark:text-white/30 font-medium">Supervision en temps réel</p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="h-8 w-8 flex items-center justify-center rounded-full text-slate-500 dark:text-white/40 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/8 transition-all"
            >
              <Sun className="h-3.5 w-3.5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0 absolute" />
              <Moon className="h-3.5 w-3.5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100 absolute" />
            </button>

            <div className="relative">
              <button
                onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
                className="relative h-8 w-8 flex items-center justify-center rounded-full text-slate-500 dark:text-white/40 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/8 transition-all"
              >
                <Bell className="h-3.5 w-3.5" />
                    <span className="absolute top-1.5 right-1.5 h-1.5 w-1.5 bg-red-500 rounded-full border-2 border-white dark:border-[#05050f] animate-pulse" />
              </button>

              <AnimatePresence>
                {isNotificationsOpen && (
                  <>
                    <div className="fixed inset-0 z-40 cursor-pointer" onClick={() => setIsNotificationsOpen(false)} />
                    <motion.div
                      initial={{ opacity: 0, y: 8, scale: 0.96 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 8, scale: 0.96 }}
                      className="absolute right-0 mt-2 w-80 bg-white dark:bg-[#0d0d1a] rounded-2xl border border-slate-200 dark:border-white/8 shadow-[0_20px_60px_rgba(0,0,0,0.12)] dark:shadow-[0_20px_60px_rgba(0,0,0,0.6)] z-50 overflow-hidden"
                    >
                      <div className="p-4 border-b border-slate-100 dark:border-white/5 flex justify-between items-center">
                        <span className="text-sm font-bold text-slate-900 dark:text-white">Notifications</span>
                        <button onClick={() => setIsNotificationsOpen(false)} className="h-6 w-6 flex items-center justify-center rounded-lg hover:bg-slate-100 dark:hover:bg-white/8 text-slate-400 dark:text-white/30 hover:text-slate-900 dark:hover:text-white transition-all">
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                      <div className="max-h-80 overflow-y-auto">
                        {notificationsData.map((notif) => (
                          <div key={notif.id} className="p-4 border-b border-slate-50 dark:border-white/3 hover:bg-slate-50 dark:hover:bg-white/3 transition-colors cursor-pointer group">
                            <div className="flex gap-3">
                              <div className={`mt-1.5 h-1.5 w-1.5 rounded-full shrink-0 ${notif.type === "warning" ? "bg-orange-500" : notif.type === "info" ? "bg-blue-500" : "bg-emerald-500"}`} />
                              <div>
                                <h4 className="text-xs font-bold text-slate-700 dark:text-white/80 group-hover:text-orange-500 dark:group-hover:text-orange-400 transition-colors">{notif.title}</h4>
                                <p className="text-[11px] text-slate-500 dark:text-white/40 mt-0.5">{notif.message}</p>
                                <span className="flex items-center gap-1 text-[9px] text-slate-400 dark:text-white/25 mt-1.5">
                                  <Clock className="h-2 w-2" /> {notif.time}
                                </span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>
          </div>
        </header>

        {/* Content area */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-7xl mx-auto space-y-6">

            {/* ── OVERVIEW TAB ── */}
            {activeTab === "overview" && (
              <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                {/* Status bar */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className={`h-2.5 w-2.5 rounded-full ${statusColors.dot} ${airStatus !== "Optimal" ? "animate-pulse" : ""}`} />
                    <div>
                      <span className="text-sm font-bold text-slate-800 dark:text-white">État de l'air — </span>
                      <span className={`text-sm font-black ${statusColors.text}`}>{airStatus}</span>
                    </div>
                    <span className="text-[10px] text-slate-400 dark:text-white/30 hidden sm:block">
                      {airStatus === "Optimal" ? "Tous les capteurs sont opérationnels" : airStatus === "Dangereux" ? "Alerte détectée" : "Zone critique"}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <AnimatePresence>
                      {refreshStatus !== "idle" && (
                        <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                          className={`text-xs font-medium ${refreshStatus === "success" ? "text-emerald-400" : "text-red-400"}`}>
                          {refreshStatus === "success" ? "Actualisé" : "Échec"}
                        </motion.span>
                      )}
                    </AnimatePresence>
                    <button
                      onClick={() => loadSchoolData(true)}
                      className="flex items-center gap-1.5 h-8 px-3 rounded-xl text-xs font-medium text-slate-500 dark:text-white/50 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-white/8 hover:border-slate-300 dark:hover:border-white/15 hover:bg-slate-50 dark:hover:bg-white/5 transition-all"
                    >
                      <RefreshCw className={`h-3 w-3 ${refreshStatus !== "idle" ? "animate-spin" : ""}`} />
                      Actualiser
                    </button>
                    <button
                      onClick={handleExportCSV}
                      className="flex items-center gap-1.5 h-8 px-3 rounded-xl text-xs font-semibold text-white bg-gradient-to-r from-orange-500 to-red-600 hover:opacity-90 transition-opacity"
                    >
                      <Download className="h-3 w-3" />
                      Exporter
                    </button>
                  </div>
                </div>

                {/* Stat cards */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                  {STAT_CARDS.map(({ key, label, unit, icon: Icon, color }) => {
                    const c = COLOR_MAP[color];
                    const val = key === "sensors" ? sensors.length : key === "co2" ? avg.co2 : key === "voc" ? avg.voc : key === "temp" ? avg.temp : avg.hum;
                    const formatted = key === "sensors" ? String(sensors.length) : key === "temp" ? avg.temp.toFixed(1) : Math.round(val as number).toString();
                    return (
                      <motion.div
                        key={key}
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: STAT_CARDS.findIndex((s) => s.key === key) * 0.07 }}
                        className={`card-shine group relative overflow-hidden rounded-2xl border ${c.border} bg-white dark:bg-black/30 backdrop-blur-sm p-4 hover:shadow-lg transition-all duration-300`}
                      >
                        <div className={`absolute inset-0 bg-gradient-to-br ${c.bg} opacity-30`} />
                        <div className="relative">
                          <div className={`inline-flex h-8 w-8 items-center justify-center rounded-xl ${c.bg} mb-3`}>
                            <Icon size={15} className={c.text} />
                          </div>
                          <p className="text-[9px] text-slate-500 dark:text-white/30 uppercase font-bold tracking-widest mb-1">{label}</p>
                          <p className={`text-xl font-black ${c.text}`}>
                            {formatted}
                            <span className="text-xs font-normal text-slate-400 dark:text-white/25 ml-1">{unit}</span>
                          </p>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>

                <p className="text-[10px] text-slate-400 dark:text-white/20">
                  Actualisation auto toutes les 20s{lastRefreshAt ? ` · Mis à jour à ${lastRefreshAt}` : ""}
                </p>

                {/* Charts + Tips */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                  {/* Chart */}
                  <div className="lg:col-span-2 rounded-3xl border border-slate-200 dark:border-white/5 bg-white dark:bg-black/30 backdrop-blur-sm p-6 shadow-sm dark:shadow-none">
                    <div className="flex items-center justify-between mb-6">
                      <div>
                        <h3 className="font-bold text-slate-900 dark:text-white">Suivi des Indicateurs</h3>
                        <p className="text-[11px] text-slate-500 dark:text-white/30 mt-0.5">{schoolName}</p>
                      </div>
                      <div className="flex bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/8 p-1 rounded-xl gap-1">
                        {["hour", "week"].map((p) => (
                          <button
                            key={p}
                            onClick={() => setChartPeriod(p as "hour" | "week")}
                            className={`h-7 px-3 rounded-lg text-[11px] font-semibold transition-all ${
                              chartPeriod === p
                                ? "bg-gradient-to-r from-orange-500 to-red-600 text-white shadow-lg"
                                : "text-slate-400 dark:text-white/30 hover:text-slate-600 dark:hover:text-white/60"
                            }`}
                          >
                            {p === "hour" ? "Aujourd'hui" : "Semaine"}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="h-64 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        {chartPeriod === "hour" ? (
                          <AreaChart data={historyData}>
                            <defs>
                              <linearGradient id="colorCo2" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#f97316" stopOpacity={0.35} />
                                <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
                              </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={chartGridColor} />
                            <XAxis dataKey="time" axisLine={false} tickLine={false} tick={chartTickStyle} />
                            <YAxis axisLine={false} tickLine={false} tick={chartTickStyle} />
                            <Tooltip contentStyle={chartTooltipStyle} />
                            <Area type="monotone" dataKey="co2" name="CO2 (ppm)" stroke="#f97316" fillOpacity={1} fill="url(#colorCo2)" strokeWidth={2.5} />
                          </AreaChart>
                        ) : (
                          <BarChart data={sensorBarsData}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={chartGridColor} />
                            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={chartTickStyle} />
                            <YAxis axisLine={false} tickLine={false} tick={chartTickStyle} />
                            <Tooltip contentStyle={chartTooltipStyle} />
                            <Bar dataKey="co2" name="CO2 par capteur" fill="#f97316" radius={[6, 6, 0, 0]} opacity={0.85} />
                          </BarChart>
                        )}
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Health tips */}
                  <div className="rounded-3xl border border-slate-200 dark:border-white/5 bg-white dark:bg-black/30 backdrop-blur-sm p-6 shadow-sm dark:shadow-none">
                    <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2 mb-5">
                      <Activity className="text-orange-400 h-4 w-4" />
                      Conseils Santé
                    </h3>
                    <div className="space-y-3">
                      {[
                        { icon: Wind, tip: healthTips.ventilationTip, label: "Ventilation", color: "text-orange-400 bg-orange-500/10" },
                        { icon: Thermometer, tip: healthTips.temperatureTip, label: "Température", color: "text-red-400 bg-red-500/10" },
                        { icon: Droplets, tip: healthTips.humidityTip, label: "Humidité", color: "text-cyan-400 bg-cyan-500/10" },
                      ].map(({ icon: Icon, tip, label, color }) => (
                        <div key={label} className="flex gap-3 p-3 rounded-2xl bg-slate-50 dark:bg-white/3 border border-slate-100 dark:border-white/5">
                          <div className={`h-7 w-7 rounded-lg flex items-center justify-center shrink-0 ${color}`}>
                            <Icon className="h-3.5 w-3.5" />
                          </div>
                          <div>
                            <h4 className="text-[11px] font-bold text-slate-700 dark:text-white/70">{label}</h4>
                            <p className="text-[10px] text-slate-500 dark:text-white/30 mt-0.5 leading-relaxed">{tip}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className={`mt-4 p-4 rounded-2xl border ${statusColors.border} ${statusColors.bg}`}>
                      <div className="flex justify-between items-center mb-2">
                        <p className="text-[9px] font-bold uppercase tracking-widest text-orange-400">Score Qualité Air</p>
                        <span className={`text-[9px] font-black ${statusColors.text}`}>
                          {airStatus === "Optimal" ? "92/100" : airStatus === "Dangereux" ? "64/100" : "28/100"}
                        </span>
                      </div>
                      <div className="w-full bg-slate-200 dark:bg-black/30 h-1.5 rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: airStatus === "Optimal" ? "92%" : airStatus === "Dangereux" ? "64%" : "28%" }}
                          transition={{ duration: 1.2, ease: "easeOut", delay: 0.3 }}
                          className={`h-full rounded-full ${statusColors.dot}`}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* ── PERSONNEL TAB ── */}
            {activeTab === "personnel" && (
              <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                <div>
                  <h2 className="text-xl font-black text-slate-900 dark:text-white">Personnel de l'établissement</h2>
                  <p className="text-sm text-slate-500 dark:text-white/30 mt-0.5">{schoolName}</p>
                </div>

                {isLoadingPersonnel ? (
                  <div className="flex flex-col items-center justify-center py-24 gap-4">
                    <div className="relative h-10 w-10">
                      <div className="absolute inset-0 rounded-full border border-orange-500/20" />
                      <div className="absolute inset-0 rounded-full border border-t-orange-500 animate-spin" />
                    </div>
                    <p className="text-xs text-slate-400 dark:text-white/30">Chargement...</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
                    {/* Teachers */}
                    <div className="rounded-3xl border border-slate-200 dark:border-white/5 bg-white dark:bg-black/30 backdrop-blur-sm overflow-hidden shadow-sm dark:shadow-none">
                      <div className="p-5 border-b border-slate-100 dark:border-white/5 flex items-center gap-3">
                        <div className="p-2 rounded-xl bg-orange-500/15 text-orange-400"><BookOpen size={16} /></div>
                        <div>
                          <h3 className="font-bold text-slate-900 dark:text-white text-sm">Professeurs</h3>
                          <p className="text-[10px] text-slate-500 dark:text-white/30">{teachers.length} enseignant{teachers.length !== 1 ? "s" : ""}</p>
                        </div>
                      </div>
                      <div className="divide-y divide-slate-50 dark:divide-white/3">
                        {teachers.length === 0 ? (
                          <p className="p-6 text-xs text-slate-400 dark:text-white/30 text-center">Aucun professeur trouvé.</p>
                        ) : teachers.map((teacher) => (
                          <div key={teacher.id} className="flex items-center gap-3 px-5 py-3.5 hover:bg-slate-50 dark:hover:bg-white/3 transition-colors group">
                            <div className="h-9 w-9 rounded-xl bg-orange-500/15 flex items-center justify-center text-orange-400 font-bold text-xs shrink-0 group-hover:scale-105 transition-transform">
                              {teacher.prenom[0]}{teacher.nom[0]}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold text-xs text-slate-800 dark:text-white truncate">{teacher.prenom} {teacher.nom}</p>
                              <div className="flex items-center gap-1 mt-0.5">
                                <BookOpen size={8} className="text-orange-400" />
                                <span className="text-[10px] text-orange-400 font-medium">{teacher.matiere}</span>
                              </div>
                            </div>
                            <a href={`mailto:${teacher.email}`} className="flex items-center gap-1 text-[10px] text-slate-400 dark:text-white/25 hover:text-orange-400 transition-colors truncate max-w-[140px]">
                              <Mail size={9} className="shrink-0" />
                              <span className="truncate">{teacher.email}</span>
                            </a>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Technicians */}
                    <div className="rounded-3xl border border-slate-200 dark:border-white/5 bg-white dark:bg-black/30 backdrop-blur-sm overflow-hidden shadow-sm dark:shadow-none">
                      <div className="p-5 border-b border-slate-100 dark:border-white/5 flex items-center gap-3">
                        <div className="p-2 rounded-xl bg-cyan-500/15 text-cyan-400"><Wrench size={16} /></div>
                        <div>
                          <h3 className="font-bold text-slate-900 dark:text-white text-sm">Techniciens</h3>
                          <p className="text-[10px] text-slate-500 dark:text-white/30">{technicians.length} technicien{technicians.length !== 1 ? "s" : ""}</p>
                        </div>
                      </div>
                      <div className="divide-y divide-slate-50 dark:divide-white/3">
                        {technicians.length === 0 ? (
                          <p className="p-6 text-xs text-slate-400 dark:text-white/30 text-center">Aucun technicien trouvé.</p>
                        ) : technicians.map((tech) => (
                          <div key={tech.id} className="flex items-center gap-3 px-5 py-3.5 hover:bg-slate-50 dark:hover:bg-white/3 transition-colors group">
                            <div className="h-9 w-9 rounded-xl bg-cyan-500/15 flex items-center justify-center text-cyan-400 font-bold text-xs shrink-0 group-hover:scale-105 transition-transform">
                              {tech.prenom[0]}{tech.nom[0]}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold text-xs text-slate-800 dark:text-white truncate">{tech.prenom} {tech.nom}</p>
                              <p className="text-[10px] text-slate-500 dark:text-white/30 mt-0.5">Technicien FabLab</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </motion.div>
            )}

            {/* ── SENSOR DETAIL TAB ── */}
            {activeTab === "sensor-detail" && selectedSensorId && (
              <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                {/* Sensor header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-3xl border border-slate-200 dark:border-white/5 bg-white dark:bg-black/30 shadow-sm dark:shadow-none p-6">
                  <div className="flex items-center gap-4">
                    <div className={`p-3 rounded-2xl ${sensors.find((s) => s.id === selectedSensorId)?.status === "good" ? "bg-emerald-500/15 text-emerald-400" : sensors.find((s) => s.id === selectedSensorId)?.status === "warning" ? "bg-orange-500/15 text-orange-400" : "bg-red-500/15 text-red-400"}`}>
                      <Cpu size={24} />
                    </div>
                    <div>
                      <h2 className="text-lg font-black text-slate-900 dark:text-white">{sensors.find((s) => s.id === selectedSensorId)?.name}</h2>
                      <div className="flex items-center gap-2 mt-1">
                        <div className={`h-1.5 w-1.5 rounded-full ${sensors.find((s) => s.id === selectedSensorId)?.status === "good" ? "bg-emerald-500" : sensors.find((s) => s.id === selectedSensorId)?.status === "warning" ? "bg-orange-500 animate-pulse" : "bg-red-500 animate-pulse"}`} />
                        <span className="text-xs text-slate-500 dark:text-white/40">
                          {sensors.find((s) => s.id === selectedSensorId)?.status === "good" ? "Capteur opérationnel" : sensors.find((s) => s.id === selectedSensorId)?.status === "warning" ? "Attention — Qualité dégradée" : "Critique — Seuil dépassé"}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => setActiveTab("overview")} className="h-8 px-4 rounded-xl text-xs font-medium text-slate-500 dark:text-white/50 border border-slate-200 dark:border-white/8 hover:text-slate-900 dark:hover:text-white hover:border-slate-300 dark:hover:border-white/20 hover:bg-slate-50 dark:hover:bg-white/5 transition-all">
                      Retour
                    </button>
                    <button className="h-8 px-4 rounded-xl text-xs font-semibold text-white bg-gradient-to-r from-orange-500 to-red-600 hover:opacity-90 transition-opacity">
                      Historique
                    </button>
                  </div>
                </div>

                {/* Metrics */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <SensorCard name="CO2" type="co2" value={sensors.find((s) => s.id === selectedSensorId)?.co2 || 0} unit="ppm" status={sensors.find((s) => s.id === selectedSensorId)?.status || "good"} lastUpdated="En direct" />
                  <SensorCard name="VOC" type="voc" value={sensors.find((s) => s.id === selectedSensorId)?.voc || 0} unit="ppb" status={sensors.find((s) => s.id === selectedSensorId)?.status || "good"} lastUpdated="En direct" />
                  <SensorCard name="Température" type="temp" value={sensors.find((s) => s.id === selectedSensorId)?.temp || 0} unit="°C" status={sensors.find((s) => s.id === selectedSensorId)?.status || "good"} lastUpdated="En direct" />
                  <SensorCard name="Humidité" type="hum" value={sensors.find((s) => s.id === selectedSensorId)?.hum || 0} unit="%" status={sensors.find((s) => s.id === selectedSensorId)?.status || "good"} lastUpdated="En direct" />
                </div>

                {/* Sensor chart */}
                <div className="rounded-3xl border border-slate-200 dark:border-white/5 bg-white dark:bg-black/30 shadow-sm dark:shadow-none p-6">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h3 className="font-bold text-slate-900 dark:text-white">Évolution du Capteur</h3>
                      <p className="text-[11px] text-slate-500 dark:text-white/30 mt-0.5">{sensors.find((s) => s.id === selectedSensorId)?.name}</p>
                    </div>
                    <div className="flex bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/8 p-1 rounded-xl gap-1">
                      <button className="h-7 px-3 rounded-lg text-[11px] font-semibold bg-gradient-to-r from-orange-500 to-red-600 text-white">Aujourd'hui</button>
                      <button className="h-7 px-3 rounded-lg text-[11px] font-semibold text-slate-400 dark:text-white/30 hover:text-slate-600 dark:hover:text-white/60 transition-colors">Semaine</button>
                    </div>
                  </div>
                  <div className="h-72 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={historyData}>
                        <defs>
                          <linearGradient id="colorSensor" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={sensors.find((s) => s.id === selectedSensorId)?.status === "good" ? "#10b981" : sensors.find((s) => s.id === selectedSensorId)?.status === "warning" ? "#f97316" : "#ef4444"} stopOpacity={0.35} />
                            <stop offset="95%" stopColor={sensors.find((s) => s.id === selectedSensorId)?.status === "good" ? "#10b981" : "#ef4444"} stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={chartGridColor} />
                        <XAxis dataKey="time" axisLine={false} tickLine={false} tick={chartTickStyle} />
                        <YAxis axisLine={false} tickLine={false} tick={chartTickStyle} />
                        <Tooltip contentStyle={chartTooltipStyle} />
                        <Area type="monotone" dataKey="co2" name="CO2 (ppm)" stroke={sensors.find((s) => s.id === selectedSensorId)?.status === "good" ? "#10b981" : sensors.find((s) => s.id === selectedSensorId)?.status === "warning" ? "#f97316" : "#ef4444"} fillOpacity={1} fill="url(#colorSensor)" strokeWidth={2.5} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </motion.div>
            )}
          </div>
        </div>
      </main>

      {/* ── Modale : Modifier le mot de passe ──────────────────────────── */}
      <AnimatePresence>
        {showPasswordModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4 cursor-pointer"
            onClick={closePasswordModal}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.93, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.93, y: 16 }}
              transition={{ type: "spring", stiffness: 380, damping: 30 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-sm bg-white dark:bg-[#0d0d1a] rounded-3xl border border-slate-200 dark:border-white/10 shadow-2xl overflow-hidden cursor-default"
            >
              {/* Header */}
              <div className="flex items-center justify-between px-6 pt-6 pb-4">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-2xl bg-blue-500/10 flex items-center justify-center">
                    <Key size={16} className="text-blue-400" />
                  </div>
                  <h2 className="text-sm font-black text-slate-900 dark:text-white">Modifier le mot de passe</h2>
                </div>
                <button onClick={closePasswordModal} className="h-7 w-7 rounded-xl bg-slate-100 dark:bg-white/5 flex items-center justify-center hover:bg-slate-200 dark:hover:bg-white/10 transition-colors">
                  <X size={13} className="text-slate-500 dark:text-white/40" />
                </button>
              </div>

              {pwSuccess ? (
                <div className="px-6 pb-6 flex flex-col items-center gap-3 pt-2">
                  <CheckCircle size={40} className="text-emerald-400" />
                  <p className="text-sm font-bold text-slate-900 dark:text-white">Mot de passe mis à jour !</p>
                </div>
              ) : (
                <form onSubmit={handlePasswordChange} className="px-6 pb-6 space-y-4">
                  {/* Mot de passe actuel */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-semibold text-slate-500 dark:text-white/40 uppercase tracking-wide">Mot de passe actuel</label>
                    <div className="relative">
                      <input
                        type={pwShowCurrent ? "text" : "password"}
                        value={pwCurrent}
                        onChange={(e) => setPwCurrent(e.target.value)}
                        required
                        className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2.5 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-white/20 focus:outline-none focus:ring-2 focus:ring-blue-500/30 pr-10"
                        placeholder="••••••••"
                      />
                      <button type="button" onClick={() => setPwShowCurrent(!pwShowCurrent)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-white/30">
                        {pwShowCurrent ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                    </div>
                  </div>
                  {/* Nouveau mot de passe */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-semibold text-slate-500 dark:text-white/40 uppercase tracking-wide">Nouveau mot de passe</label>
                    <div className="relative">
                      <input
                        type={pwShowNew ? "text" : "password"}
                        value={pwNew}
                        onChange={(e) => setPwNew(e.target.value)}
                        required
                        className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2.5 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-white/20 focus:outline-none focus:ring-2 focus:ring-blue-500/30 pr-10"
                        placeholder="••••••••"
                      />
                      <button type="button" onClick={() => setPwShowNew(!pwShowNew)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-white/30">
                        {pwShowNew ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                    </div>
                  </div>
                  {/* Confirmer */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-semibold text-slate-500 dark:text-white/40 uppercase tracking-wide">Confirmer le nouveau mot de passe</label>
                    <input
                      type="password"
                      value={pwConfirm}
                      onChange={(e) => setPwConfirm(e.target.value)}
                      required
                      className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2.5 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-white/20 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                      placeholder="••••••••"
                    />
                  </div>
                  {/* Erreur */}
                  {pwError && (
                    <p className="text-[11px] text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2">{pwError}</p>
                  )}
                  {/* Submit */}
                  <button
                    type="submit"
                    disabled={pwLoading}
                    className="w-full bg-blue-500 hover:bg-blue-600 disabled:opacity-60 text-white text-sm font-bold rounded-xl py-2.5 transition-colors flex items-center justify-center gap-2"
                  >
                    {pwLoading ? <RefreshCw size={14} className="animate-spin" /> : null}
                    {pwLoading ? "Mise à jour…" : "Mettre à jour"}
                  </button>
                </form>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
