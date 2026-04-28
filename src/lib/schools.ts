import { supabase } from "./supabase";

export type AirStatus = "Optimal" | "Dangereux" | "Interdit d'accès";

/**
 * Indice qualité de l’air (capteur type 0–200+). Plus la valeur est élevée, plus la pollution intérieure est forte.
 * - ≤ optimalMax : situation saine pour un fablab (objectif courant).
 * - entre warnMin et warnMax : dégradation — ventilation / réduction des sources.
 * - ≥ dangerMin : pic sévère — accès à restreindre (correspond à « Interdit d’accès » si au moins un capteur y est).
 */
export const AIR_INDEX_OPTIMAL_MAX = 64;
export const AIR_INDEX_WARN_MIN = 65;
export const AIR_INDEX_WARN_MAX = 119;
export const AIR_INDEX_DANGER_MIN = 120;

/** Lit une valeur `air_qualite` Supabase (nombre, chaîne, null) sans produire NaN. */
export function parseAirQualite(raw: unknown): number {
  if (raw == null || raw === "") return 0;
  if (typeof raw === "number" && Number.isFinite(raw)) return Math.max(0, raw);
  if (typeof raw === "string") {
    const n = Number(String(raw).replace(",", ".").trim());
    return Number.isFinite(n) ? Math.max(0, n) : 0;
  }
  return 0;
}

function parsePlacement(raw: unknown): number {
  if (raw == null || raw === "") return 0;
  if (typeof raw === "number" && Number.isFinite(raw)) return Math.max(0, Math.floor(raw));
  if (typeof raw === "string") {
    const n = Number(String(raw).replace(",", ".").trim());
    return Number.isFinite(n) ? Math.max(0, Math.floor(n)) : 0;
  }
  return 0;
}

export interface SensorData {
  id: string;
  name: string;
  /** Ordre d'affichage (colonne `placement` en base, 1 = premier). */
  placement: number;
  /** Indice qualité de l'air renvoyé par le capteur (plus la valeur est élevée, plus la dégradation est forte). */
  airQualite: number;
  status: "good" | "warning" | "danger";
}

export interface School {
  id: string;
  name: string;
  city: string;
  status: AirStatus;
  sensors: SensorData[];
  description?: string;
  equipements?: string[];
  lien?: string;
  image?: string;
}

interface FablabRow {
  id: string;
  nom: string;
  adresse: string;
  description: string | null;
  equipements: string[] | string | null;
  lien: string | null;
  image: string | null;
}

interface StationRow {
  id: number;
  fablab_id: string;
  created_at: string;
  air_qualite?: number | null;
  nom?: string | null;
  placement?: number | null;
}

export interface Teacher {
  id: string;
  nom: string;
  prenom: string;
  matiere: string;
  email: string;
}

export interface Technician {
  id: string;
  nom: string;
  prenom: string;
  email?: string;
}

export async function fetchTeachers(fablabId: string): Promise<Teacher[]> {
  const { data, error } = await supabase
    .from("professeur")
    .select("id, nom, prenom, matiere, email")
    .eq("fablab_id", fablabId)
    .order("nom", { ascending: true });

  if (error) {
    console.error("Error fetching teachers:", error);
    return [];
  }

  return (data as Teacher[]) ?? [];
}

export async function fetchTechnicians(fablabId: string): Promise<Technician[]> {
  const { data: links, error: lErr } = await supabase
    .from("technicien_fablabs")
    .select("technicien_id")
    .eq("fablab_id", fablabId);

  if (lErr) {
    console.error("Error fetching technicien_fablabs:", lErr);
    return [];
  }
  if (!links?.length) {
    return [];
  }

  const ids = links.map((l) => l.technicien_id as string);
  const { data, error } = await supabase
    .from("technicien")
    .select("id, nom, prenom")
    .in("id", ids)
    .order("nom", { ascending: true });

  if (error) {
    console.error("Error fetching technicians:", error);
    return [];
  }

  return (data as Technician[]) ?? [];
}

export const schools: School[] = [
  { 
    id: "1", 
    name: "Lycée Henri IV", 
    city: "Paris", 
    status: "Optimal",
    sensors: [
      { id: "s1", name: "Imprimante 3D FDM", placement: 1, airQualite: 52, status: "good" },
      { id: "s2", name: "Découpe Laser", placement: 2, airQualite: 68, status: "good" },
      { id: "s3", name: "Fraiseuse CNC", placement: 3, airQualite: 71, status: "good" },
      { id: "s4", name: "Imprimante Résine", placement: 4, airQualite: 48, status: "good" },
      { id: "s5", name: "Scanner 3D", placement: 5, airQualite: 55, status: "good" },
    ]
  },
  { 
    id: "2", 
    name: "École Poly-Tech", 
    city: "Lyon", 
    status: "Dangereux",
    sensors: [
      { id: "s1", name: "Découpe Laser CO2", placement: 1, airQualite: 95, status: "warning" },
      { id: "s2", name: "Imprimante Acrylique", placement: 2, airQualite: 108, status: "warning" },
      { id: "s3", name: "Traceur de Découpe", placement: 3, airQualite: 88, status: "warning" },
      { id: "s4", name: "Presse à Chaud", placement: 4, airQualite: 102, status: "warning" },
    ]
  },
  { 
    id: "3", 
    name: "Institut Oxalys", 
    city: "Bordeaux", 
    status: "Interdit d'accès",
    sensors: [
      { id: "s1", name: "Ligne Impression Industrielle", placement: 1, airQualite: 165, status: "danger" },
      { id: "s2", name: "Bras Robotisé", placement: 2, airQualite: 178, status: "danger" },
      { id: "s3", name: "Banc de Test Électrique", placement: 3, airQualite: 152, status: "danger" },
      { id: "s4", name: "Imprimante 3D SLS", placement: 4, airQualite: 142, status: "danger" },
      { id: "s5", name: "Poste Soudage CMS", placement: 5, airQualite: 170, status: "danger" },
      { id: "s6", name: "Four de Refusion", placement: 6, airQualite: 158, status: "danger" },
    ]
  },
  { 
    id: "4", 
    name: "Collège des Explorateurs", 
    city: "Nantes", 
    status: "Optimal",
    sensors: [
      { id: "s1", name: "Imprimante 3D Édu", placement: 1, airQualite: 45, status: "good" },
      { id: "s2", name: "Découpeuse Vinyle", placement: 2, airQualite: 58, status: "good" },
      { id: "s3", name: "Machine à Coudre", placement: 3, airQualite: 62, status: "good" },
      { id: "s4", name: "Poste Informatique", placement: 4, airQualite: 51, status: "good" },
    ]
  },
];

function parseEquipements(value: FablabRow["equipements"]): string[] {
  if (Array.isArray(value)) return value;
  if (typeof value !== "string") return [];

  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function getSensorStatus(airQualite: number): SensorData["status"] {
  if (!Number.isFinite(airQualite)) return "good";
  if (airQualite >= AIR_INDEX_DANGER_MIN) return "danger";
  if (airQualite >= AIR_INDEX_WARN_MIN) return "warning";
  return "good";
}

/**
 * État global du fablab : basé sur la **moyenne** de l’indice (cohérent avec la carte « indice moyen »).
 * Les statuts par capteur (points warning/danger) restent pour repérer un capteur isolé.
 */
function computeAirStatus(sensors: SensorData[]): AirStatus {
  const vals = sensors.map((s) => s.airQualite).filter((v) => Number.isFinite(v));
  if (vals.length === 0) return "Optimal";
  const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
  if (avg >= AIR_INDEX_DANGER_MIN) return "Interdit d'accès";
  if (avg >= AIR_INDEX_WARN_MIN) return "Dangereux";
  return "Optimal";
}

export async function fetchFablabs(): Promise<School[]> {
  const [{ data: fablabsData, error: fablabsError }, { data: stationsData, error: stationsError }] = await Promise.all([
    supabase
    .from('fablab')
      .select('*'),
    supabase
      .from("station")
      .select("*")
      .order("id", { ascending: true }),
  ]);

  if (fablabsError) {
    console.error("Error fetching fablabs:", fablabsError);
    return [];
  }

  if (stationsError) {
    console.error("Error fetching stations:", stationsError);
    return [];
  }

  const stationsByFablab = (stationsData as StationRow[]).reduce<Record<string, StationRow[]>>((acc, station) => {
    if (!acc[station.fablab_id]) {
      acc[station.fablab_id] = [];
    }
    acc[station.fablab_id].push(station);
    return acc;
  }, {});

  return (fablabsData as FablabRow[]).map((fab) => {
    const city = fab.adresse?.split(" · ")[0] || "Inconnu";
    const equipements = parseEquipements(fab.equipements);
    const rawSensors = stationsByFablab[fab.id] ?? [];
    const sortedStations = [...rawSensors].sort((a, b) => {
      const pa = parsePlacement(a.placement);
      const pb = parsePlacement(b.placement);
      const oa = pa > 0 ? pa : 999_999;
      const ob = pb > 0 ? pb : 999_999;
      if (oa !== ob) return oa - ob;
      return a.id - b.id;
    });

    const sensors: SensorData[] = sortedStations.map((station, index) => {
      const airQualite = parseAirQualite(station.air_qualite);
      const status = getSensorStatus(airQualite);
      const pl = parsePlacement(station.placement);
      const nomDb = typeof station.nom === "string" ? station.nom.trim() : "";
      const fromEquip =
        pl > 0 ? equipements[pl - 1] : undefined;
      const name =
        nomDb ||
        (typeof fromEquip === "string" ? fromEquip : undefined) ||
        equipements[index] ||
        `Capteur ${index + 1}`;

      return {
        id: String(station.id),
        name,
        placement: pl > 0 ? pl : index + 1,
        airQualite,
        status,
      };
    });

    return {
      id: fab.id,
      name: fab.nom,
      city: city,
      status: computeAirStatus(sensors),
      sensors: sensors,
      description: fab.description ?? undefined,
      equipements: equipements,
      lien: fab.lien ?? undefined,
      image: fab.image ?? undefined,
    };
  });
}

export function getStatusColor(status: AirStatus) {
  switch (status) {
    case "Optimal":
      return {
        border: "border-emerald-300/20",
        bg: "bg-emerald-400/10",
        text: "text-emerald-600 dark:text-emerald-400",
        badge: "text-emerald-600 dark:text-emerald-200",
        dot: "bg-emerald-500",
        lightText: "text-emerald-700 dark:text-emerald-100"
      };
    case "Dangereux":
      return {
        border: "border-orange-300/20",
        bg: "bg-orange-400/10",
        text: "text-orange-600 dark:text-orange-400",
        badge: "text-orange-600 dark:text-orange-200",
        dot: "bg-orange-500",
        lightText: "text-orange-700 dark:text-orange-100"
      };
    case "Interdit d'accès":
      return {
        border: "border-red-300/20",
        bg: "bg-red-400/10",
        text: "text-red-600 dark:text-red-400",
        badge: "text-red-600 dark:text-red-200",
        dot: "bg-red-500",
        lightText: "text-red-700 dark:text-red-100"
      };
    default:
      return {
        border: "border-slate-300/20",
        bg: "bg-slate-400/10",
        text: "text-slate-600 dark:text-slate-400",
        badge: "text-slate-600 dark:text-slate-200",
        dot: "bg-slate-500",
        lightText: "text-slate-700 dark:text-slate-100"
      };
  }
}

export function getStatusLabel(status: AirStatus) {
  switch (status) {
    case "Optimal":
      return "Aucun risque — conditions favorables";
    case "Dangereux":
      return "Accès autorisé : aérez la zone et restez vigilant";
    case "Interdit d'accès":
      return "Accès interdit — ne pas occuper la zone";
    default:
      return "";
  }
}
