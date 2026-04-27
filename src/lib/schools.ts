import { supabase } from "./supabase";

export type AirStatus = "Optimal" | "Dangereux" | "Interdit d'accès";

export interface SensorData {
  id: string;
  name: string;
  co2: number;
  voc: number;
  temp: number;
  hum: number;
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
  co2_moyen: number;
  voc_moyen: number;
  temperature_moyenne: number;
  humidite_moyenne: number;
  created_at: string;
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
      { id: "s1", name: "Imprimante 3D FDM", co2: 720, voc: 110, temp: 21.5, hum: 42, status: "good" },
      { id: "s2", name: "Découpe Laser", co2: 850, voc: 130, temp: 22.1, hum: 44, status: "good" },
      { id: "s3", name: "Fraiseuse CNC", co2: 910, voc: 145, temp: 22.8, hum: 45, status: "good" },
      { id: "s4", name: "Imprimante Résine", co2: 680, voc: 95, temp: 21.0, hum: 41, status: "good" },
      { id: "s5", name: "Scanner 3D", co2: 740, voc: 115, temp: 21.8, hum: 43, status: "good" },
    ]
  },
  { 
    id: "2", 
    name: "École Poly-Tech", 
    city: "Lyon", 
    status: "Dangereux",
    sensors: [
      { id: "s1", name: "Découpe Laser CO2", co2: 1280, voc: 420, temp: 24.5, hum: 52, status: "warning" },
      { id: "s2", name: "Imprimante Acrylique", co2: 1450, voc: 580, temp: 25.8, hum: 55, status: "warning" },
      { id: "s3", name: "Traceur de Découpe", co2: 1150, voc: 380, temp: 23.5, hum: 50, status: "warning" },
      { id: "s4", name: "Presse à Chaud", co2: 1320, voc: 490, temp: 24.8, hum: 53, status: "warning" },
    ]
  },
  { 
    id: "3", 
    name: "Institut Oxalys", 
    city: "Bordeaux", 
    status: "Interdit d'accès",
    sensors: [
      { id: "s1", name: "Ligne Impression Industrielle", co2: 2250, voc: 920, temp: 28.5, hum: 72, status: "danger" },
      { id: "s2", name: "Bras Robotisé", co2: 2450, voc: 1050, temp: 29.2, hum: 75, status: "danger" },
      { id: "s3", name: "Banc de Test Électrique", co2: 2100, voc: 880, temp: 27.8, hum: 70, status: "danger" },
      { id: "s4", name: "Imprimante 3D SLS", co2: 1950, voc: 780, temp: 26.5, hum: 68, status: "danger" },
      { id: "s5", name: "Poste Soudage CMS", co2: 2300, voc: 950, temp: 28.8, hum: 73, status: "danger" },
      { id: "s6", name: "Four de Refusion", co2: 2150, voc: 890, temp: 27.5, hum: 71, status: "danger" },
    ]
  },
  { 
    id: "4", 
    name: "Collège des Explorateurs", 
    city: "Nantes", 
    status: "Optimal",
    sensors: [
      { id: "s1", name: "Imprimante 3D Édu", co2: 650, voc: 85, temp: 20.5, hum: 40, status: "good" },
      { id: "s2", name: "Découpeuse Vinyle", co2: 780, voc: 105, temp: 21.8, hum: 42, status: "good" },
      { id: "s3", name: "Machine à Coudre", co2: 820, voc: 115, temp: 22.2, hum: 44, status: "good" },
      { id: "s4", name: "Poste Informatique", co2: 710, voc: 92, temp: 21.2, hum: 41, status: "good" },
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

function getSensorStatus(co2: number, voc: number, temp: number, hum: number): SensorData["status"] {
  const isDanger =
    co2 >= 1600 ||
    voc >= 400 ||
    temp >= 35 ||
    temp <= 12 ||
    hum >= 80 ||
    hum <= 20;

  if (isDanger) return "danger";

  const isWarning =
    co2 >= 1000 ||
    voc >= 200 ||
    temp >= 28 ||
    temp <= 16 ||
    hum >= 70 ||
    hum <= 30;

  if (isWarning) return "warning";
  return "good";
}

function computeAirStatus(sensors: SensorData[]): AirStatus {
  if (sensors.some((sensor) => sensor.status === "danger")) {
    return "Interdit d'accès";
  }

  if (sensors.some((sensor) => sensor.status === "warning")) {
    return "Dangereux";
  }

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

    const sensors: SensorData[] = rawSensors.map((station, index) => {
      const status = getSensorStatus(
        station.co2_moyen,
        station.voc_moyen,
        station.temperature_moyenne,
        station.humidite_moyenne,
      );

      return {
        id: String(station.id),
        name: equipements[index] || `Capteur ${index + 1}`,
        co2: station.co2_moyen,
        voc: station.voc_moyen,
        temp: station.temperature_moyenne,
        hum: station.humidite_moyenne,
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
      return "Environnement de travail sain";
    case "Dangereux":
      return "Ventilation recommandée immédiatement";
    case "Interdit d'accès":
      return "Évacuation de la zone requise";
    default:
      return "";
  }
}
