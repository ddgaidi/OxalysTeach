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
  ArrowUp,
  ArrowDown,
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
import {
  fetchFablabs,
  getStatusColor,
  AirStatus,
  School,
  SensorData,
  Teacher,
  Technician,
  AIR_INDEX_OPTIMAL_MAX,
  AIR_INDEX_WARN_MIN,
  AIR_INDEX_WARN_MAX,
  AIR_INDEX_DANGER_MIN,
} from "@/src/lib/schools";
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
  LineChart,
  Line,
  Legend,
  ReferenceArea,
  ReferenceLine,
} from "recharts";

function strokeForAirIndex(v: number): string {
  if (!Number.isFinite(v)) return "#94a3b8";
  if (v >= AIR_INDEX_DANGER_MIN) return "#ef4444";
  if (v >= AIR_INDEX_WARN_MIN) return "#f97316";
  return "#22c55e";
}

/** Couleurs fixes par capteur sur le graphique vue d’ensemble (courbes / barres). */
const SENSOR_LINE_COLORS = [
  "#f97316",
  "#8b5cf6",
  "#06b6d4",
  "#22c55e",
  "#ec4899",
  "#eab308",
  "#3b82f6",
  "#14b8a6",
  "#f43f5e",
  "#a855f7",
];

/** Fenêtre du graphique temps réel : 5 dernières minutes (données les plus anciennes supprimées). */
const LIVE_WINDOW_MS = 5 * 60 * 1000;
const LIVE_STORAGE_MAX = 360;

/** Agrégation pas de 10 minutes (persistée pour survivre au refresh). */
const TEN_MIN_MS = 10 * 60 * 1000;
const TEN_MIN_RETENTION_MS = 48 * 60 * 60 * 1000;
const TEN_MIN_MAX_POINTS = 288;

const liveStorageKey = (fablabId: string) => `oxalys_air_live_v1_${fablabId}`;
const tenMinStorageKey = (fablabId: string) => `oxalys_air_10m_v1_${fablabId}`;

type AirHistoryRow = {
  ts: number;
  date: string;
  time: string;
  values: Record<string, number>;
};

type TenMinRow = {
  bucketStart: number;
  time: string;
  values: Record<string, number>;
};

function trimLiveHistory(rows: AirHistoryRow[], now = Date.now()): AirHistoryRow[] {
  const cutoff = now - LIVE_WINDOW_MS;
  const next = rows.filter((r) => typeof r.ts === "number" && r.ts >= cutoff);
  return next.slice(-LIVE_STORAGE_MAX);
}

function loadLiveHistory(fablabId: string): AirHistoryRow[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(liveStorageKey(fablabId));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as AirHistoryRow[];
    if (!Array.isArray(parsed)) return [];
    return trimLiveHistory(parsed.filter((r) => typeof r.ts === "number"));
  } catch {
    return [];
  }
}

function saveLiveHistory(fablabId: string, rows: AirHistoryRow[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(liveStorageKey(fablabId), JSON.stringify(rows));
  } catch {
    /* quota / private mode */
  }
}

function loadTenMinHistory(fablabId: string): TenMinRow[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(tenMinStorageKey(fablabId));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as TenMinRow[];
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((r) => typeof r.bucketStart === "number" && r.values && typeof r.values === "object");
  } catch {
    return [];
  }
}

function saveTenMinHistory(fablabId: string, rows: TenMinRow[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(tenMinStorageKey(fablabId), JSON.stringify(rows));
  } catch {
    /* ignore */
  }
}

function formatTenMinAxisLabel(bucketStart: number): string {
  const d = new Date(bucketStart * TEN_MIN_MS);
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  if (d >= startOfToday) {
    return d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  }
  return d.toLocaleString("fr-FR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
}

function averagesFromSums(sums: Record<string, { sum: number; count: number }>): Record<string, number> {
  const out: Record<string, number> = {};
  Object.entries(sums).forEach(([id, { sum, count }]) => {
    if (count > 0) out[id] = sum / count;
  });
  return out;
}

type DashboardNotification = {
  id: string;
  title: string;
  message: string;
  timeLabel: string;
  type: "critical" | "warning" | "success";
  createdAt: number;
};

const notifStorageKey = (fablabId: string) => `oxalys_dash_notif_v1_${fablabId}`;
const NOTIF_MAX = 50;

function loadDashboardNotifications(fablabId: string): DashboardNotification[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(notifStorageKey(fablabId));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as DashboardNotification[];
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((n) => n.id && n.title && typeof n.createdAt === "number").slice(0, NOTIF_MAX);
  } catch {
    return [];
  }
}

function saveDashboardNotifications(fablabId: string, list: DashboardNotification[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(notifStorageKey(fablabId), JSON.stringify(list.slice(0, NOTIF_MAX)));
  } catch {
    /* ignore */
  }
}

function airStatusLabelFr(s: AirStatus): string {
  switch (s) {
    case "Optimal":
      return "Optimal";
    case "Dangereux":
      return "Dangereux";
    case "Interdit d'accès":
      return "Interdit d'accès";
    default:
      return String(s);
  }
}

function notificationTypeForAirChange(from: AirStatus, to: AirStatus): DashboardNotification["type"] {
  if (to === "Interdit d'accès") return "critical";
  if (to === "Optimal") return "success";
  if (from === "Interdit d'accès" && to === "Dangereux") return "warning";
  return "warning";
}

function newNotificationId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

const SESSION_AVATAR_KEY = "oxalys_session_avatar_v1";

type SessionAvatarColors = { bg: string; fg: string };

function pickSessionAvatarColors(): SessionAvatarColors {
  const hues = [12, 32, 142, 172, 210, 252, 292, 332];
  const h = hues[Math.floor(Math.random() * hues.length)];
  return { bg: `hsl(${h} 58% 46%)`, fg: `hsl(${h} 30% 98%)` };
}

function getOrCreateSessionAvatarColors(): SessionAvatarColors {
  if (typeof window === "undefined") return { bg: "hsl(24 58% 46%)", fg: "hsl(24 30% 98%)" };
  try {
    const raw = sessionStorage.getItem(SESSION_AVATAR_KEY);
    if (raw) {
      const p = JSON.parse(raw) as SessionAvatarColors;
      if (typeof p?.bg === "string" && typeof p?.fg === "string") return p;
    }
  } catch {
    /* ignore */
  }
  const c = pickSessionAvatarColors();
  try {
    sessionStorage.setItem(SESSION_AVATAR_KEY, JSON.stringify(c));
  } catch {
    /* ignore */
  }
  return c;
}

const STAT_CARDS = [
  { key: "air", label: "Qualité de l'air", unit: "indice moyen", icon: Wind, color: "orange", glow: "shadow-orange-500/20" },
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
  const [chartPeriod, setChartPeriod] = useState<"live" | "10m">("live");
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState<DashboardNotification[]>([]);
  const notifFablabRef = useRef<string | null>(null);
  const notifBaselineRef = useRef<{ air: AirStatus; sensors: Record<string, SensorData["status"]> } | null>(null);
  const [isEditingSensors, setIsEditingSensors] = useState(false);
  const isEditingSensorsRef = useRef(false);
  const [localSensors, setLocalSensors] = useState<SensorData[]>([]);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [lastRefreshAt, setLastRefreshAt] = useState<string>("");
  const [refreshStatus, setRefreshStatus] = useState<"idle" | "success" | "error">("idle");
  const [historyData, setHistoryData] = useState<AirHistoryRow[]>([]);
  const [tenMinSeries, setTenMinSeries] = useState<TenMinRow[]>([]);
  const tenMinCtxRef = useRef<{ bucket: number | null; sums: Record<string, { sum: number; count: number }> }>({
    bucket: null,
    sums: {},
  });
  const lastFablabIdRef = useRef<string | null>(null);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [isLoadingPersonnel, setIsLoadingPersonnel] = useState(false);
  const [loggedUserName, setLoggedUserName] = useState("");
  const [sessionAvatar, setSessionAvatar] = useState<SessionAvatarColors | null>(null);
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
  const [savingLayout, setSavingLayout] = useState(false);
  const notifTriggerRef = useRef<HTMLDivElement>(null);
  const notifPanelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    isEditingSensorsRef.current = isEditingSensors;
  }, [isEditingSensors]);

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
          if (lastFablabIdRef.current !== school.id) {
            lastFablabIdRef.current = school.id;
            tenMinCtxRef.current = { bucket: null, sums: {} };
            setTenMinSeries([]);
            setHistoryData([]);
            setIsEditingSensors(false);
          }
          setAirStatus(school.status);
          setCurrentSchool(school);
          if (isEditingSensorsRef.current) {
            setLocalSensors((prev) => {
              const byId = new Map(school.sensors.map((s) => [s.id, s]));
              return prev.map((s) => {
                const fresh = byId.get(s.id);
                if (!fresh) return s;
                return { ...s, airQualite: fresh.airQualite, status: fresh.status };
              });
            });
          } else {
            setLocalSensors(school.sensors);
          }
          const now = new Date();
          const timestamp = now.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
          const dateStr = now.toLocaleDateString("fr-FR");
          setLastRefreshAt(timestamp);
          if (school.sensors.length > 0) {
            const values: Record<string, number> = {};
            school.sensors.forEach((sensor) => {
              values[sensor.id] = sensor.airQualite;
            });
            const ts = now.getTime();
            const fablabId = school.id;

            setHistoryData((prev) => {
              let base = prev;
              if (base.length === 0) {
                base = loadLiveHistory(fablabId);
              }
              const merged = trimLiveHistory([...base, { ts, date: dateStr, time: timestamp, values }]);
              saveLiveHistory(fablabId, merged);
              return merged;
            });

            const bucket = Math.floor(ts / TEN_MIN_MS);
            const ctx = tenMinCtxRef.current;
            let finalized: TenMinRow | null = null;

            if (ctx.bucket !== null && bucket !== ctx.bucket && Object.keys(ctx.sums).length > 0) {
              finalized = {
                bucketStart: ctx.bucket,
                time: formatTenMinAxisLabel(ctx.bucket),
                values: averagesFromSums(ctx.sums),
              };
            }
            if (ctx.bucket !== bucket) {
              ctx.bucket = bucket;
              ctx.sums = {};
            }
            school.sensors.forEach((sensor) => {
              const id = sensor.id;
              if (!ctx.sums[id]) ctx.sums[id] = { sum: 0, count: 0 };
              ctx.sums[id].sum += sensor.airQualite;
              ctx.sums[id].count += 1;
            });
            const partial = averagesFromSums(ctx.sums);

            setTenMinSeries((prev) => {
              let next = prev;
              if (next.length === 0) {
                next = loadTenMinHistory(fablabId).filter((r) => r.bucketStart < bucket);
              }
              const minBucket = Math.floor((ts - TEN_MIN_RETENTION_MS) / TEN_MIN_MS);
              next = next.filter((r) => r.bucketStart >= minBucket);
              if (finalized) {
                next = next.filter((r) => r.bucketStart !== finalized!.bucketStart);
                next = [...next, finalized];
              }
              const label = formatTenMinAxisLabel(bucket);
              const last = next[next.length - 1];
              if (!last || last.bucketStart !== bucket) {
                next = [...next, { bucketStart: bucket, time: label, values: { ...partial } }];
              } else {
                next = [...next.slice(0, -1), { bucketStart: bucket, time: label, values: { ...partial } }];
              }
              const trimmed = next.slice(-TEN_MIN_MAX_POINTS);
              saveTenMinHistory(fablabId, trimmed);
              return trimmed;
            });
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
    const intervalId = window.setInterval(() => loadSchoolData(), 1_000);
    return () => window.clearInterval(intervalId);
  }, [loadSchoolData]);

  useEffect(() => {
    const rawName = getClientCookie("user_name");
    if (rawName) {
      try {
        setLoggedUserName(decodeURIComponent(rawName));
      } catch {
        setLoggedUserName(rawName);
      }
    }
  }, []);

  useEffect(() => {
    setSessionAvatar(getOrCreateSessionAvatarColors());
  }, []);

  useEffect(() => {
    if (!isNotificationsOpen) return;
    const onPointerDown = (e: PointerEvent) => {
      const n = e.target as Node;
      if (notifTriggerRef.current?.contains(n)) return;
      if (notifPanelRef.current?.contains(n)) return;
      setIsNotificationsOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown, true);
    return () => document.removeEventListener("pointerdown", onPointerDown, true);
  }, [isNotificationsOpen]);

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

  useEffect(() => {
    if (!currentSchool?.id) return;
    const sensorsMap = Object.fromEntries(currentSchool.sensors.map((s) => [s.id, s.status]));
    const snapshot = { air: airStatus, sensors: { ...sensorsMap } };

    if (notifFablabRef.current !== currentSchool.id) {
      notifFablabRef.current = currentSchool.id;
      notifBaselineRef.current = snapshot;
      setNotifications(loadDashboardNotifications(currentSchool.id));
      return;
    }

    const prev = notifBaselineRef.current;
    if (!prev) {
      notifBaselineRef.current = snapshot;
      return;
    }

    const now = new Date();
    const timeStr = now.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
    const dateStr = now.toLocaleDateString("fr-FR");
    const timeLabel = `${dateStr} à ${timeStr}`;
    const createdAt = now.getTime();

    const newItems: DashboardNotification[] = [];

    if (prev.air !== airStatus) {
      newItems.push({
        id: newNotificationId(),
        title: "État de la salle",
        message: `Passage de « ${airStatusLabelFr(prev.air)} » à « ${airStatusLabelFr(airStatus)} » (indice moyen).`,
        timeLabel,
        type: notificationTypeForAirChange(prev.air, airStatus),
        createdAt,
      });
    }

    currentSchool.sensors.forEach((s) => {
      const was = prev.sensors[s.id];
      if (was !== "danger" && s.status === "danger") {
        newItems.push({
          id: newNotificationId(),
          title: "Capteur en zone critique",
          message: `${s.name} : indice ≥ ${AIR_INDEX_DANGER_MIN} (seuil « interdit » sur ce capteur).`,
          timeLabel,
          type: "critical",
          createdAt,
        });
      }
    });

    notifBaselineRef.current = snapshot;

    if (newItems.length === 0) return;

    setNotifications((prevList) => {
      const next = [...newItems, ...prevList].slice(0, NOTIF_MAX);
      saveDashboardNotifications(currentSchool.id, next);
      return next;
    });
  }, [currentSchool, airStatus]);

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

  const displaySensors = useMemo(
    () => (isEditingSensors ? localSensors : currentSchool?.sensors) ?? [],
    [isEditingSensors, localSensors, currentSchool?.sensors],
  );

  const saveSensorsOrder = async () => {
    if (!currentSchool) return;
    setSavingLayout(true);
    try {
      const res = await fetch("/api/stations/layout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fablabId: currentSchool.id,
          stations: localSensors.map((s) => ({ id: Number(s.id), nom: s.name })),
        }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        alert(data.error ?? "Erreur lors de l'enregistrement");
        return;
      }
      setCurrentSchool({ ...currentSchool, sensors: localSensors });
      setIsEditingSensors(false);
      await loadSchoolData(true);
    } catch {
      alert("Erreur réseau");
    } finally {
      setSavingLayout(false);
    }
  };

  const statusColors = getStatusColor(airStatus);

  const avgAir = useMemo(() => {
    const list = displaySensors.map((s) => s.airQualite).filter((v) => Number.isFinite(v));
    if (list.length === 0) return 0;
    return list.reduce((a, b) => a + b, 0) / list.length;
  }, [displaySensors]);

  const historyChartData = useMemo(
    () =>
      historyData.map((row) => ({
        ts: row.ts,
        time: row.time,
        ...row.values,
      })),
    [historyData],
  );

  const tenMinChartData = useMemo(
    () =>
      tenMinSeries.map((r) => ({
        ts: r.bucketStart * TEN_MIN_MS,
        time: r.time,
        ...r.values,
      })),
    [tenMinSeries],
  );

  const chartYMax = useMemo(() => {
    let m = AIR_INDEX_DANGER_MIN + 24;
    historyChartData.forEach((row) => {
      const r = row as Record<string, number | string | undefined>;
      displaySensors.forEach((s) => {
        const v = r[s.id];
        if (typeof v === "number" && Number.isFinite(v)) m = Math.max(m, v);
      });
    });
    return Math.min(500, Math.ceil(m * 1.12));
  }, [historyChartData, displaySensors]);

  const chartYMax10m = useMemo(() => {
    let m = AIR_INDEX_DANGER_MIN + 24;
    tenMinChartData.forEach((row) => {
      const r = row as Record<string, number | string | undefined>;
      displaySensors.forEach((s) => {
        const v = r[s.id];
        if (typeof v === "number" && Number.isFinite(v)) m = Math.max(m, v);
      });
    });
    return Math.min(500, Math.ceil(m * 1.12));
  }, [tenMinChartData, displaySensors]);

  const healthTips = useMemo(() => {
    const a = avgAir;
    return {
      niveauTip:
        a <= AIR_INDEX_OPTIMAL_MAX
          ? `Indice moyen ≤ ${AIR_INDEX_OPTIMAL_MAX} : situation favorable, maintenez une ventilation de fond pendant les ateliers.`
          : a < AIR_INDEX_DANGER_MIN
            ? `Entre ${AIR_INDEX_WARN_MIN} et ${AIR_INDEX_WARN_MAX} : air dégradé — aérez davantage et réduisez les sources (poussières, colles, machines).`
            : `≥ ${AIR_INDEX_DANGER_MIN} : niveau critique — ventilez fortement, limitez l'occupation et vérifiez les capteurs en rouge.`,
      ventilationTip:
        a > AIR_INDEX_OPTIMAL_MAX
          ? "Ouvrez en grand ou lancez l'extraction mécanique pour faire redescendre l'indice rapidement."
          : "Une aération courte mais régulière suffit souvent à rester dans la zone verte du graphique.",
      suiviTip: `Les bandes du graphique : vert ≤ ${AIR_INDEX_OPTIMAL_MAX} (optimal), orange ${AIR_INDEX_WARN_MIN}–${AIR_INDEX_WARN_MAX} (dangereux), rouge ≥ ${AIR_INDEX_DANGER_MIN} (interdit d'accès).`,
    };
  }, [avgAir]);

  const csvEscape = (cell: string | number) => {
    const s = String(cell);
    if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
  };

  const handleExportCSV = () => {
    if (!currentSchool) return;
    const sensorsOrdered = displaySensors;
    const header = ["Date", "Heure", ...sensorsOrdered.map((s) => s.name)].map(csvEscape).join(",");
    const lines = [header];
    if (historyData.length === 0) {
      const now = new Date();
      const row = [
        now.toLocaleDateString("fr-FR"),
        now.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
        ...sensorsOrdered.map((s) => String(s.airQualite)),
      ];
      lines.push(row.map(csvEscape).join(","));
    } else {
      historyData.forEach((h) => {
        const row = [
          h.date,
          h.time,
          ...sensorsOrdered.map((s) => String(h.values[s.id] ?? "")),
        ];
        lines.push(row.map(csvEscape).join(","));
      });
    }
    const csvBody = "\ufeff" + lines.join("\n");
    const blob = new Blob([csvBody], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `export_oxalys_${schoolName.replace(/\s+/g, "_")}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleLogout = async () => {
    try {
      sessionStorage.removeItem(SESSION_AVATAR_KEY);
    } catch {
      /* ignore */
    }
    await fetch("/api/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  };

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

  const qualityScore = Math.round(
    Math.max(0, Math.min(100, 100 - (avgAir / (AIR_INDEX_DANGER_MIN * 1.35)) * 100)),
  );

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
              type="button"
              onClick={() => {
                if (isEditingSensors) {
                  void saveSensorsOrder();
                } else {
                  if (currentSchool) setLocalSensors([...currentSchool.sensors]);
                  setIsEditingSensors(true);
                }
              }}
              disabled={savingLayout}
              className="flex items-center gap-1 text-[9px] font-bold text-orange-500/70 hover:text-orange-400 transition-colors disabled:opacity-40"
            >
              <Settings2 size={9} />
              {savingLayout ? "…" : isEditingSensors ? "Enregistrer" : "Modifier"}
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
            <div
              className="h-9 w-9 rounded-full border border-white/25 overflow-hidden shrink-0 group-hover:scale-105 transition-transform flex items-center justify-center shadow-inner"
              style={{ backgroundColor: sessionAvatar?.bg ?? "hsl(24 58% 46%)" }}
            >
              <User size={18} style={{ color: sessionAvatar?.fg ?? "hsl(24 30% 98%)" }} aria-hidden />
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
                  </div>
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

            <div className="relative" ref={notifTriggerRef}>
              <button
                type="button"
                onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
                className="relative h-8 w-8 flex items-center justify-center rounded-full text-slate-500 dark:text-white/40 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/8 transition-all"
              >
                <Bell className="h-3.5 w-3.5" />
                {notifications.length > 0 ? (
                  <span className="absolute -top-0.5 -right-0.5 min-w-[14px] h-[14px] px-0.5 flex items-center justify-center rounded-full bg-red-500 text-[8px] font-bold text-white border-2 border-white dark:border-[#05050f]">
                    {notifications.length > 99 ? "99+" : notifications.length}
                  </span>
                ) : null}
              </button>

              <AnimatePresence>
                {isNotificationsOpen && (
                  <>
                    <motion.div
                      ref={notifPanelRef}
                      initial={{ opacity: 0, y: 8, scale: 0.96 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 8, scale: 0.96 }}
                      className="absolute right-0 mt-2 w-80 bg-white dark:bg-[#0d0d1a] rounded-2xl border border-slate-200 dark:border-white/8 shadow-[0_20px_60px_rgba(0,0,0,0.12)] dark:shadow-[0_20px_60px_rgba(0,0,0,0.6)] z-50 overflow-hidden"
                    >
                      <div className="p-4 border-b border-slate-100 dark:border-white/5 flex justify-between items-center">
                        <span className="text-sm font-bold text-slate-900 dark:text-white">Notifications</span>
                        <button
                          type="button"
                          title="Effacer l'historique"
                          onClick={(e) => {
                            e.stopPropagation();
                            setNotifications([]);
                            if (currentSchool?.id) saveDashboardNotifications(currentSchool.id, []);
                          }}
                          className="h-6 w-6 flex items-center justify-center rounded-lg hover:bg-slate-100 dark:hover:bg-white/8 text-slate-400 dark:text-white/30 hover:text-slate-900 dark:hover:text-white transition-all"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                      <div className="max-h-80 overflow-y-auto">
                        {notifications.length === 0 ? (
                          <p className="p-6 text-center text-[11px] text-slate-400 dark:text-white/30">
                            Aucune alerte récente. Vous serez notifié des changements de statut de la salle et des
                            passages d&apos;un capteur en rouge (indice ≥ {AIR_INDEX_DANGER_MIN}).
                          </p>
                        ) : (
                          notifications.map((notif) => (
                            <div
                              key={notif.id}
                              className="p-4 border-b border-slate-50 dark:border-white/3 hover:bg-slate-50 dark:hover:bg-white/3 transition-colors group"
                            >
                              <div className="flex gap-3">
                                <div
                                  className={`mt-1.5 h-1.5 w-1.5 rounded-full shrink-0 ${
                                    notif.type === "critical"
                                      ? "bg-red-500"
                                      : notif.type === "warning"
                                        ? "bg-orange-500"
                                        : "bg-emerald-500"
                                  }`}
                                />
                                <div>
                                  <h4 className="text-xs font-bold text-slate-700 dark:text-white/80 group-hover:text-orange-500 dark:group-hover:text-orange-400 transition-colors">
                                    {notif.title}
                                  </h4>
                                  <p className="text-[11px] text-slate-500 dark:text-white/40 mt-0.5 leading-relaxed">
                                    {notif.message}
                                  </p>
                                  <span className="flex items-center gap-1 text-[9px] text-slate-400 dark:text-white/25 mt-1.5">
                                    <Clock className="h-2 w-2 shrink-0" /> {notif.timeLabel}
                                  </span>
                                </div>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>
          </div>
        </header>

        {/* Content area */}
        <div className="flex-1 min-w-0 overflow-y-auto p-6">
          <div className="max-w-7xl mx-auto min-w-0 space-y-6">

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
                      {airStatus === "Optimal"
                        ? "Aucun risque identifié sur la moyenne des capteurs"
                        : airStatus === "Dangereux"
                          ? "Accès autorisé — surveillance et ventilation recommandées"
                          : "Accès interdit — indice moyen trop élevé"}
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

                {/* Indice moyen — seule métrique agrégée (pas de CO₂ / COV / T / HR) */}
                <div className="grid grid-cols-1 gap-3 max-w-md">
                  {STAT_CARDS.map(({ key, label, unit, icon: Icon, color }) => {
                    const c = COLOR_MAP[color];
                    const formatted = Number.isFinite(avgAir) ? avgAir.toFixed(1) : "—";
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
                          <p className="text-xl font-black" style={{ color: strokeForAirIndex(avgAir) }}>
                            {formatted}
                            <span className="text-xs font-normal text-slate-400 dark:text-white/25 ml-1">{unit}</span>
                          </p>
                          <p className="text-[10px] text-slate-500 dark:text-white/35 mt-2">
                            {displaySensors.length} capteur{displaySensors.length !== 1 ? "s" : ""} · seuils : optimal ≤ {AIR_INDEX_OPTIMAL_MAX}, dangereux {AIR_INDEX_WARN_MIN}–{AIR_INDEX_WARN_MAX}, interdit ≥ {AIR_INDEX_DANGER_MIN}
                          </p>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>

                <p className="text-[10px] text-slate-400 dark:text-white/20">
                  Temps réel : 1 mesure/s, courbe sur les 5 dernières minutes (défilement automatique, mémorisé dans ce
                  navigateur après rechargement). Onglet 10 min : moyenne par pas de 10 minutes, jusqu&apos;à 48 h.
                  {lastRefreshAt ? ` · Dernière mesure à ${lastRefreshAt}` : ""}
                </p>

                {/* Charts + Tips */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 min-w-0">
                  {/* Chart */}
                  <div className="lg:col-span-2 min-w-0 rounded-3xl border border-slate-200 dark:border-white/5 bg-white dark:bg-black/30 backdrop-blur-sm p-6 shadow-sm dark:shadow-none">
                    <div className="flex items-center justify-between mb-6">
                      <div>
                        <h3 className="font-bold text-slate-900 dark:text-white">Qualité de l&apos;air — évolution</h3>
                        <p className="text-[11px] text-slate-500 dark:text-white/30 mt-0.5">{schoolName}</p>
                      </div>
                      <div className="flex bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/8 p-1 rounded-xl gap-1">
                        {(
                          [
                            { id: "live" as const, label: "Temps réel" },
                            { id: "10m" as const, label: "10 min" },
                          ] as const
                        ).map(({ id, label }) => (
                          <button
                            key={id}
                            type="button"
                            onClick={() => setChartPeriod(id)}
                            className={`h-7 px-3 rounded-lg text-[11px] font-semibold transition-all ${
                              chartPeriod === id
                                ? "bg-gradient-to-r from-orange-500 to-red-600 text-white shadow-lg"
                                : "text-slate-400 dark:text-white/30 hover:text-slate-600 dark:hover:text-white/60"
                            }`}
                          >
                            {label}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="h-64 w-full min-h-64 min-w-0">
                      <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={256}>
                        {chartPeriod === "live" ? (
                          historyChartData.length === 0 ? (
                            <div className="flex h-full items-center justify-center text-xs text-slate-400 dark:text-white/30">
                              En attente des premières mesures…
                            </div>
                          ) : (
                            <LineChart data={historyChartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={chartGridColor} />
                              <XAxis
                                dataKey="ts"
                                type="number"
                                domain={["dataMin", "dataMax"]}
                                axisLine={false}
                                tickLine={false}
                                tick={chartTickStyle}
                                tickFormatter={(v) =>
                                  typeof v === "number"
                                    ? new Date(v).toLocaleTimeString("fr-FR", {
                                        hour: "2-digit",
                                        minute: "2-digit",
                                        second: "2-digit",
                                      })
                                    : ""
                                }
                              />
                              <YAxis domain={[0, chartYMax]} axisLine={false} tickLine={false} tick={chartTickStyle} />
                              <Tooltip
                                contentStyle={chartTooltipStyle}
                                labelFormatter={(v) =>
                                  typeof v === "number" ? new Date(v).toLocaleString("fr-FR") : String(v)
                                }
                              />
                              <ReferenceArea y1={0} y2={AIR_INDEX_OPTIMAL_MAX} fill="#22c55e" fillOpacity={isDark ? 0.07 : 0.12} />
                              <ReferenceArea y1={AIR_INDEX_WARN_MIN} y2={AIR_INDEX_WARN_MAX} fill="#f97316" fillOpacity={isDark ? 0.06 : 0.1} />
                              <ReferenceArea y1={AIR_INDEX_DANGER_MIN} y2={chartYMax} fill="#ef4444" fillOpacity={isDark ? 0.07 : 0.11} />
                              <ReferenceLine y={AIR_INDEX_OPTIMAL_MAX} stroke="#22c55e" strokeDasharray="4 4" strokeOpacity={0.5} />
                              <ReferenceLine y={AIR_INDEX_DANGER_MIN} stroke="#ef4444" strokeDasharray="4 4" strokeOpacity={0.5} />
                              <Legend
                                wrapperStyle={{ fontSize: "10px", paddingTop: 8 }}
                                formatter={(value) => (typeof value === "string" && value.length > 14 ? `${value.slice(0, 14)}…` : String(value))}
                              />
                              {displaySensors.map((s, i) => (
                                <Line
                                  key={s.id}
                                  type="monotone"
                                  dataKey={s.id}
                                  name={s.name}
                                  stroke={SENSOR_LINE_COLORS[i % SENSOR_LINE_COLORS.length]}
                                  strokeWidth={2}
                                  dot={false}
                                  isAnimationActive={false}
                                  connectNulls
                                />
                              ))}
                            </LineChart>
                          )
                        ) : tenMinChartData.length === 0 ? (
                          <div className="flex h-full items-center justify-center text-xs text-slate-400 dark:text-white/30">
                            Pas encore assez de données par pas de 10 minutes (l&apos;historique est conservé après
                            rechargement).
                          </div>
                        ) : (
                          <LineChart data={tenMinChartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={chartGridColor} />
                            <XAxis
                              dataKey="ts"
                              type="number"
                              domain={["dataMin", "dataMax"]}
                              axisLine={false}
                              tickLine={false}
                              tick={chartTickStyle}
                              tickFormatter={(v) =>
                                typeof v === "number"
                                  ? new Date(v).toLocaleString("fr-FR", {
                                      day: "2-digit",
                                      month: "2-digit",
                                      hour: "2-digit",
                                      minute: "2-digit",
                                    })
                                  : ""
                              }
                            />
                            <YAxis domain={[0, chartYMax10m]} axisLine={false} tickLine={false} tick={chartTickStyle} />
                            <Tooltip
                              contentStyle={chartTooltipStyle}
                              labelFormatter={(v) =>
                                typeof v === "number" ? new Date(v).toLocaleString("fr-FR") : String(v)
                              }
                            />
                            <ReferenceArea y1={0} y2={AIR_INDEX_OPTIMAL_MAX} fill="#22c55e" fillOpacity={isDark ? 0.07 : 0.12} />
                            <ReferenceArea y1={AIR_INDEX_WARN_MIN} y2={AIR_INDEX_WARN_MAX} fill="#f97316" fillOpacity={isDark ? 0.06 : 0.1} />
                            <ReferenceArea y1={AIR_INDEX_DANGER_MIN} y2={chartYMax10m} fill="#ef4444" fillOpacity={isDark ? 0.07 : 0.11} />
                            <ReferenceLine y={AIR_INDEX_OPTIMAL_MAX} stroke="#22c55e" strokeDasharray="4 4" strokeOpacity={0.5} />
                            <ReferenceLine y={AIR_INDEX_DANGER_MIN} stroke="#ef4444" strokeDasharray="4 4" strokeOpacity={0.5} />
                            <Legend
                              wrapperStyle={{ fontSize: "10px", paddingTop: 8 }}
                              formatter={(value) => (typeof value === "string" && value.length > 14 ? `${value.slice(0, 14)}…` : String(value))}
                            />
                            {displaySensors.map((s, i) => (
                              <Line
                                key={s.id}
                                type="monotone"
                                dataKey={s.id}
                                name={s.name}
                                stroke={SENSOR_LINE_COLORS[i % SENSOR_LINE_COLORS.length]}
                                strokeWidth={2}
                                dot={{ r: 3 }}
                                isAnimationActive={false}
                                connectNulls
                              />
                            ))}
                          </LineChart>
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
                        { icon: Activity, tip: healthTips.niveauTip, label: "Niveau global", color: "text-orange-400 bg-orange-500/10" },
                        { icon: Wind, tip: healthTips.ventilationTip, label: "Ventilation", color: "text-cyan-400 bg-cyan-500/10" },
                        { icon: Cpu, tip: healthTips.suiviTip, label: "Suivi", color: "text-emerald-400 bg-emerald-500/10" },
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
                          {qualityScore}/100
                        </span>
                      </div>
                      <div className="w-full bg-slate-200 dark:bg-black/30 h-1.5 rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${qualityScore}%` }}
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
                    <div className={`p-3 rounded-2xl ${displaySensors.find((s) => s.id === selectedSensorId)?.status === "good" ? "bg-emerald-500/15 text-emerald-400" : displaySensors.find((s) => s.id === selectedSensorId)?.status === "warning" ? "bg-orange-500/15 text-orange-400" : "bg-red-500/15 text-red-400"}`}>
                      <Cpu size={24} />
                    </div>
                    <div>
                      <h2 className="text-lg font-black text-slate-900 dark:text-white">{displaySensors.find((s) => s.id === selectedSensorId)?.name}</h2>
                      <div className="flex items-center gap-2 mt-1">
                        <div className={`h-1.5 w-1.5 rounded-full ${displaySensors.find((s) => s.id === selectedSensorId)?.status === "good" ? "bg-emerald-500" : displaySensors.find((s) => s.id === selectedSensorId)?.status === "warning" ? "bg-orange-500 animate-pulse" : "bg-red-500 animate-pulse"}`} />
                        <span className="text-xs text-slate-500 dark:text-white/40">
                          {displaySensors.find((s) => s.id === selectedSensorId)?.status === "good" ? "Capteur opérationnel" : displaySensors.find((s) => s.id === selectedSensorId)?.status === "warning" ? "Attention — Qualité dégradée" : "Critique — Seuil dépassé"}
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

                {/* Métrique unique : indice qualité de l'air */}
                <div className="w-full max-w-xl">
                  <SensorCard
                    name="Qualité de l'air"
                    type="air"
                    value={Math.round(displaySensors.find((s) => s.id === selectedSensorId)?.airQualite ?? 0)}
                    unit="indice"
                    status={displaySensors.find((s) => s.id === selectedSensorId)?.status || "good"}
                    lastUpdated="En direct"
                    compact
                  />
                </div>

                {/* Sensor chart */}
                <div className="rounded-3xl border border-slate-200 dark:border-white/5 bg-white dark:bg-black/30 shadow-sm dark:shadow-none p-6 min-w-0">
                  <div className="flex items-center justify-between gap-3 mb-6">
                    <div>
                      <h3 className="font-bold text-slate-900 dark:text-white">Évolution du Capteur</h3>
                      <p className="text-[11px] text-slate-500 dark:text-white/30 mt-0.5">{displaySensors.find((s) => s.id === selectedSensorId)?.name}</p>
                    </div>
                    <span className="text-[11px] font-semibold text-slate-500 dark:text-white/45 shrink-0">En direct</span>
                  </div>
                  <div className="h-72 w-full min-h-72 min-w-0">
                    <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={288}>
                      <AreaChart
                        data={historyData.map((h) => ({
                          ts: h.ts,
                          time: h.time,
                          air: selectedSensorId ? h.values[selectedSensorId] : undefined,
                        }))}
                        margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
                      >
                        <defs>
                          <linearGradient id="colorSensor" x1="0" y1="0" x2="0" y2="1">
                            <stop
                              offset="5%"
                              stopColor={strokeForAirIndex(displaySensors.find((s) => s.id === selectedSensorId)?.airQualite ?? 0)}
                              stopOpacity={0.35}
                            />
                            <stop
                              offset="95%"
                              stopColor={strokeForAirIndex(displaySensors.find((s) => s.id === selectedSensorId)?.airQualite ?? 0)}
                              stopOpacity={0}
                            />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={chartGridColor} />
                        <XAxis
                          dataKey="ts"
                          type="number"
                          domain={["dataMin", "dataMax"]}
                          axisLine={false}
                          tickLine={false}
                          tick={chartTickStyle}
                          tickFormatter={(v) =>
                            typeof v === "number"
                              ? new Date(v).toLocaleTimeString("fr-FR", {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                  second: "2-digit",
                                })
                              : ""
                          }
                        />
                        <YAxis domain={[0, chartYMax]} axisLine={false} tickLine={false} tick={chartTickStyle} />
                        <Tooltip contentStyle={chartTooltipStyle} />
                        <ReferenceArea y1={0} y2={AIR_INDEX_OPTIMAL_MAX} fill="#22c55e" fillOpacity={isDark ? 0.07 : 0.12} />
                        <ReferenceArea y1={AIR_INDEX_WARN_MIN} y2={AIR_INDEX_WARN_MAX} fill="#f97316" fillOpacity={isDark ? 0.06 : 0.1} />
                        <ReferenceArea y1={AIR_INDEX_DANGER_MIN} y2={chartYMax} fill="#ef4444" fillOpacity={isDark ? 0.07 : 0.11} />
                        <ReferenceLine y={AIR_INDEX_OPTIMAL_MAX} stroke="#22c55e" strokeDasharray="4 4" strokeOpacity={0.5} />
                        <ReferenceLine y={AIR_INDEX_DANGER_MIN} stroke="#ef4444" strokeDasharray="4 4" strokeOpacity={0.5} />
                        <Area
                          type="monotone"
                          dataKey="air"
                          name="Indice"
                          stroke={strokeForAirIndex(displaySensors.find((s) => s.id === selectedSensorId)?.airQualite ?? 0)}
                          fillOpacity={1}
                          fill="url(#colorSensor)"
                          strokeWidth={2.5}
                          isAnimationActive={false}
                          connectNulls
                        />
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
