"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Check, Clock, GraduationCap, ShieldCheck, X } from "lucide-react";
import { useTheme } from "@/src/components/providers/theme-provider";

type CertificationRequest = {
  id: string;
  membre_id: string;
  fablab_id: string;
  status: "pending" | "approved" | "declined";
  requested_at: string;
  reason?: string | null;
  member?: {
    prenom?: string | null;
    nom?: string | null;
    email?: string | null;
    telephone?: string | null;
    certification_status?: string | null;
  };
};

export default function CertificationsPage() {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const [requests, setRequests] = useState<CertificationRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState<string | null>(null);
  const [error, setError] = useState("");

  const pending = useMemo(() => requests.filter((request) => request.status === "pending"), [requests]);
  const reviewed = useMemo(() => requests.filter((request) => request.status !== "pending"), [requests]);

  async function load() {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/certifications");
      const payload = await response.json();
      if (!response.ok) {
        setError(payload.error ?? "Impossible de charger les demandes.");
        return;
      }
      setRequests(payload.requests ?? []);
    } finally {
      setLoading(false);
    }
  }

  async function review(requestId: string, action: "approve" | "decline") {
    setActionId(requestId);
    setError("");
    try {
      const response = await fetch("/api/certifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestId, action }),
      });
      const payload = await response.json();
      if (!response.ok) {
        setError(payload.error ?? "Action impossible.");
        return;
      }
      await load();
    } finally {
      setActionId(null);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const pageBg = isDark ? "bg-[#05050f] text-white" : "bg-slate-100 text-slate-900";
  const card = isDark ? "bg-black/30 border-white/8" : "bg-white border-slate-200";

  return (
    <main className={`min-h-screen ${pageBg}`}>
      <div className="mx-auto max-w-6xl px-4 py-24">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <Link href="/dashboard" className="text-xs font-semibold text-orange-400 hover:text-orange-300">
              Retour dashboard
            </Link>
            <div className="mt-4 flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-orange-500/15 text-orange-400">
                <ShieldCheck size={22} />
              </div>
              <div>
                <h1 className="text-2xl font-black tracking-tight">Certification eleves</h1>
                <p className="text-sm text-slate-500 dark:text-white/40">
                  Acceptez uniquement les etudiants qui appartiennent reellement a votre etablissement.
                </p>
              </div>
            </div>
          </div>
          <div className={`rounded-2xl border px-4 py-3 ${card}`}>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-white/35">En attente</p>
            <p className="text-2xl font-black text-orange-400">{pending.length}</p>
          </div>
        </div>

        {error && (
          <div className="mb-5 rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
            {error}
          </div>
        )}

        <section className={`overflow-hidden rounded-3xl border shadow-sm ${card}`}>
          <div className="border-b border-slate-200 p-5 dark:border-white/5">
            <h2 className="text-sm font-black">Demandes recues</h2>
          </div>

          {loading ? (
            <p className="p-8 text-center text-sm text-slate-500 dark:text-white/35">Chargement...</p>
          ) : pending.length === 0 ? (
            <p className="p-8 text-center text-sm text-slate-500 dark:text-white/35">Aucune demande en attente.</p>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-white/5">
              {pending.map((request) => {
                const fullName = `${request.member?.prenom ?? ""} ${request.member?.nom ?? ""}`.trim() || "Etudiant";
                return (
                  <div key={request.id} className="flex flex-col gap-4 p-5 md:flex-row md:items-center md:justify-between">
                    <div className="flex items-center gap-4">
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-500/15 text-orange-400">
                        <GraduationCap size={22} />
                      </div>
                      <div>
                        <p className="font-bold">{fullName}</p>
                        <p className="text-xs text-slate-500 dark:text-white/35">{request.member?.email ?? "Email indisponible"}</p>
                        <p className="mt-1 flex items-center gap-1 text-[10px] uppercase tracking-wider text-yellow-500">
                          <Clock size={11} />
                          {new Date(request.requested_at).toLocaleString("fr-FR")}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => review(request.id, "decline")}
                        disabled={actionId === request.id}
                        className="inline-flex items-center gap-2 rounded-xl border border-red-500/25 bg-red-500/10 px-4 py-2 text-xs font-bold text-red-400 disabled:opacity-50"
                      >
                        <X size={14} />
                        Refuser
                      </button>
                      <button
                        type="button"
                        onClick={() => review(request.id, "approve")}
                        disabled={actionId === request.id}
                        className="inline-flex items-center gap-2 rounded-xl border border-emerald-500/25 bg-emerald-500/10 px-4 py-2 text-xs font-bold text-emerald-400 disabled:opacity-50"
                      >
                        <Check size={14} />
                        Accepter
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {reviewed.length > 0 && (
          <section className={`mt-6 overflow-hidden rounded-3xl border ${card}`}>
            <div className="border-b border-slate-200 p-5 dark:border-white/5">
              <h2 className="text-sm font-black">Historique</h2>
            </div>
            <div className="divide-y divide-slate-100 dark:divide-white/5">
              {reviewed.slice(0, 20).map((request) => (
                <div key={request.id} className="flex items-center justify-between gap-4 p-4 text-sm">
                  <span>{`${request.member?.prenom ?? ""} ${request.member?.nom ?? ""}`.trim() || request.member?.email}</span>
                  <span className={request.status === "approved" ? "text-emerald-400" : "text-red-400"}>
                    {request.status === "approved" ? "Accepte" : "Refuse"}
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
