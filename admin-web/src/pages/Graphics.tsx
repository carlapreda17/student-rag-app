import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiClient } from "../api/client";
import axios from "axios";

// ─── Tipuri ────────────────────────────────────────────────────────

interface DailyUsage {
  date: string;
  total: number;
  likes: number;
  dislikes: number;
}

interface InteractionItem {
  id: string;
  question: string;
  answer: string;
  feedback: "like" | "dislike" | "none";
  created_at: string;
}

// ─── Componenta BarChart simplă (fără librării externe) ────────────

function UsageChart({ data }: { data: DailyUsage[] }) {
  if (data.length === 0) {
    return (
      <div className="text-center py-12 text-slate-500">
        Nu există date pentru grafic.
      </div>
    );
  }

  // Găsim valoarea maximă pentru a scala graficul. Minim 4 pentru a arăta bine liniile de ghidaj.
  const maxTotal = Math.max(...data.map((d) => d.total), 4);
  
  // Generăm 5 trepte pentru axa Y (ex: 4, 3, 2, 1, 0)
  const yAxisSteps = [4, 3, 2, 1, 0].map(i => Math.round((maxTotal / 4) * i));

  return (
    <div className="relative h-64 mt-8 mb-6">
      
      {/* 1. Liniile de fundal (Axa Y) */}
      <div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
        {yAxisSteps.map((step, i) => (
          <div key={i} className="flex items-center w-full">
            <span className="text-[10px] font-medium text-slate-500 w-6 text-right mr-3">
              {step > 0 ? step : ''}
            </span>
            <div className="border-b border-slate-700/50 w-full"></div>
          </div>
        ))}
      </div>

      {/* 2. Containerul pentru bare */}
      <div className="absolute inset-0 flex items-end justify-between pl-9 pr-2 pb-[1px] z-10">
        {data.map((day) => {
          const totalHeight = (day.total / maxTotal) * 100;
          const likePct = day.total > 0 ? (day.likes / day.total) * 100 : 0;
          const dislikePct = day.total > 0 ? (day.dislikes / day.total) * 100 : 0;
          const neutralPct = 100 - likePct - dislikePct;

          // Formatăm data
          const dateObj = new Date(day.date);
          const label = dateObj.toLocaleDateString("ro-RO", {
            day: "2-digit",
            month: "short",
          });

          return (
            <div
              key={day.date}
              className="relative flex-1 flex flex-col items-center group h-full justify-end px-1 sm:px-2"
            >
              {/* Tooltip Plutitor */}
              <div className="absolute bottom-full mb-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-xs shadow-2xl whitespace-nowrap pointer-events-none z-50">
                <p className="font-bold text-white mb-1 border-b border-slate-700 pb-1">{label}</p>
                <div className="flex flex-col gap-0.5 mt-1">
                  <p className="text-slate-300 flex justify-between gap-4">
                    <span>Total:</span> <span className="text-white font-bold">{day.total}</span>
                  </p>
                  {day.likes > 0 && (
                    <p className="text-emerald-400 flex justify-between gap-4">
                      <span>Like:</span> <span className="font-bold">{day.likes}</span>
                    </p>
                  )}
                  {day.dislikes > 0 && (
                    <p className="text-red-400 flex justify-between gap-4">
                      <span>Dislike:</span> <span className="font-bold">{day.dislikes}</span>
                    </p>
                  )}
                </div>
                {/* Săgeata Tooltip-ului */}
                <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-600"></div>
              </div>

              {/* Bara Stivuită */}
              <div
                className="w-full max-w-[32px] rounded-t-md overflow-hidden flex flex-col-reverse transition-all duration-500 group-hover:brightness-125 cursor-pointer shadow-lg"
                style={{ height: `${totalHeight}%`, minHeight: day.total > 0 ? "4px" : "0px" }}
              >
                {/* Likes (verde, jos) */}
                {likePct > 0 && (
                  <div className="bg-emerald-500 w-full transition-all duration-500" style={{ height: `${likePct}%` }} />
                )}
                {/* Neutru (gri, mijloc) */}
                {neutralPct > 0 && (
                  <div className="bg-slate-500 w-full transition-all duration-500" style={{ height: `${neutralPct}%` }} />
                )}
                {/* Dislikes (roșu, sus) */}
                {dislikePct > 0 && (
                  <div className="bg-red-500 w-full transition-all duration-500" style={{ height: `${dislikePct}%` }} />
                )}
              </div>

              {/* Eticheta Datei (sub axă) */}
              <span className="absolute top-full mt-3 text-[10px] font-medium text-slate-400 whitespace-nowrap">
                {label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Componenta principală ─────────────────────────────────────────

export function Graphics() {
  const navigate = useNavigate();
  const [dailyUsage, setDailyUsage] = useState<DailyUsage[]>([]);
  const [interactions, setInteractions] = useState<InteractionItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
 

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [usageRes, interactionsRes] = await Promise.all([
          apiClient.get<DailyUsage[]>("/admin/daily-usage"),
          apiClient.get<InteractionItem[]>("/admin/interactions"),
        ]);
        setDailyUsage(usageRes.data);
        setInteractions(interactionsRes.data);
      } catch (err) {
        if (axios.isAxiosError(err)) {
          console.error("Eroare:", err.response?.data);
        }
        setError("Nu s-au putut încărca datele.");
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);


  const totalLikes = interactions.filter((i) => i.feedback === "like").length;
  const totalDislikes = interactions.filter((i) => i.feedback === "dislike").length;

  return (
    <div className="min-h-screen bg-slate-900 text-white p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header cu buton înapoi */}
        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={() => navigate("/dashboard")}
            className="p-2 hover:bg-slate-800 rounded-lg transition-colors text-slate-400 hover:text-white"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
          </button>
          <div>
            <h1 className="text-3xl font-bold">Statistici Interacțiuni</h1>
            <p className="text-slate-400 mt-1">
              Utilizări zilnice și feedback de la utilizatori
            </p>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl">
            {error}
          </div>
        )}

        {isLoading ? (
          <div className="space-y-6">
            <div className="animate-pulse h-80 bg-slate-800/50 rounded-2xl"></div>
            <div className="animate-pulse h-64 bg-slate-800/50 rounded-2xl"></div>
          </div>
        ) : (
          <>
            {/* ─── KPI Cards ──────────────────────────────────────── */}
            <div className="grid grid-cols-3 gap-4 mb-8">
              <div className="bg-white/5 border border-white/10 rounded-xl p-5 text-center">
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1">
                  Total Interacțiuni
                </p>
                <span className="text-3xl font-black text-white">
                  {interactions.length}
                </span>
              </div>
              <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-5 text-center">
                <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-500 mb-1">
                  Like
                </p>
                <span className="text-3xl font-black text-emerald-400">
                  {totalLikes}
                </span>
              </div>
              <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-5 text-center">
                <p className="text-[10px] font-bold uppercase tracking-widest text-red-500 mb-1">
                  Dislike
                </p>
                <span className="text-3xl font-black text-red-400">
                  {totalDislikes}
                </span>
              </div>
            </div>

            {/* ─── Grafic utilizări pe zi ──────────────────────────── */}
            <div className="bg-slate-800/40 border border-slate-700/50 rounded-2xl p-6 mb-8">
              <h2 className="text-lg font-bold text-white mb-1">
                Utilizări pe zi
              </h2>
              <p className="text-xs text-slate-500 mb-6">
                Ultimele 14 zile · Verde = Like · Roșu = Dislike · Gri = Fără feedback
              </p>
              <UsageChart data={dailyUsage} />
            </div>

          </>
        )}
      </div>
    </div>
  );
}