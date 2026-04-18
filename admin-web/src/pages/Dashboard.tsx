import { useEffect, useState } from "react";
import { useAuth } from "../context/useAuth";
import { apiClient } from "../api/client";
import axios from "axios";
import { useNavigate } from "react-router-dom";

// ─── Tipuri ────────────────────────────────────────────────────────

interface AdminStats {
  total_users: number;
  total_interactions: number;
  total_likes?: number;
  total_dislikes?: number;
}

interface MetricResult {
  score: number | null;
  reason: string;
  passed: boolean;
}

interface EvaluationResult {
  faithfulness: MetricResult;
  answer_relevancy: MetricResult;
  hallucination?: MetricResult;
  correctness?: MetricResult;
  ground_truth?: {
    text: string | null;
    model_used: string;
  };
  overall?: {
    score: number | null;
    total_metrics: number;
    passed_metrics: number;
  };
}

interface FailedInteraction {
  id: string;
  question: string;
  answer: string;
  latency_ms: number;
  created_at: string;
  metrics?: EvaluationResult;
}

// ─── Componenta ScoreBar ───────────────────────────────────────────

function ScoreBar({
  label,
  score,
  reason,
  passed,
  invert = false,
}: {
  label: string;
  score: number | null;
  reason: string;
  passed: boolean;
  invert?: boolean;
}) {
  if (score === null) {
    return (
      <div className="mb-4 last:mb-0">
        <div className="flex justify-between items-center mb-1.5">
          <span className="text-sm font-semibold text-slate-300">{label}</span>
          <span className="text-xs font-mono text-slate-500">N/A</span>
        </div>
        <div className="h-2.5 bg-slate-700/50 rounded-full overflow-hidden">
          <div className="h-full w-0 rounded-full" />
        </div>
        <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">{reason}</p>
      </div>
    );
  }

  const displayScore = invert ? 1 - score : score;
  const percentage = Math.round(displayScore * 100);

  const getColor = (val: number, pass: boolean) => {
    if (!pass) return { bar: "bg-red-500", text: "text-red-400" };
    if (val >= 0.8) return { bar: "bg-emerald-500", text: "text-emerald-400" };
    if (val >= 0.6) return { bar: "bg-amber-500", text: "text-amber-400" };
    return { bar: "bg-red-500", text: "text-red-400" };
  };

  const color = getColor(displayScore, passed);

  return (
    <div className="mb-4 last:mb-0">
      <div className="flex justify-between items-center mb-1.5">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-slate-300">{label}</span>
          {invert && (
            <span className="text-[10px] text-slate-500 bg-slate-700/50 px-1.5 py-0.5 rounded">
              inversat
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-sm font-mono font-bold ${color.text}`}>
            {percentage}%
          </span>
          <span className="text-base">{passed ? "✅" : "❌"}</span>
        </div>
      </div>
      <div className="h-2.5 bg-slate-700/50 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-700 ease-out ${color.bar}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
      <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">{reason}</p>
    </div>
  );
}

// ─── Componenta Modal ──────────────────────────────────────────────

function EvaluationModal({
  interaction,
  onClose,
}: {
  interaction: FailedInteraction;
  onClose: () => void;
}) {
  const metrics = interaction.metrics;
  if (!metrics) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

      <div
        className="relative w-full max-w-3xl max-h-[90vh] overflow-y-auto bg-slate-900 border border-slate-700/50 rounded-2xl shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 bg-slate-900/95 backdrop-blur-sm border-b border-slate-700/50 px-6 py-4 flex justify-between items-start">
          <div className="flex-1 mr-4">
            <div className="flex items-center gap-3 mb-1">
              <h2 className="text-lg font-bold text-white">Rezultate Evaluare</h2>
              {metrics.overall?.score != null && (
                <span
                  className={`text-xs font-bold px-2.5 py-1 rounded-lg ${
                    metrics.overall.score >= 0.7
                      ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/20"
                      : metrics.overall.score >= 0.5
                      ? "bg-amber-500/15 text-amber-400 border border-amber-500/20"
                      : "bg-red-500/15 text-red-400 border border-red-500/20"
                  }`}
                >
                  Scor General: {Math.round(metrics.overall.score * 100)}%
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500">
              Evaluare interacțiune din{" "}
              {new Date(interaction.created_at).toLocaleDateString("ro-RO", {
                day: "2-digit",
                month: "long",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-700/50 rounded-lg transition-colors text-slate-400 hover:text-white"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
              <path
                fillRule="evenodd"
                d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                clipRule="evenodd"
              />
            </svg>
          </button>
        </div>

        <div className="px-6 py-5 space-y-6">
          {/* Întrebarea & Răspunsul */}
          <div className="grid grid-cols-1 gap-4">
            <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/30">
              <p className="text-[10px] font-bold uppercase tracking-widest text-indigo-400 mb-2">
                Întrebarea utilizatorului
              </p>
              <p className="text-sm text-slate-200 leading-relaxed">
                {interaction.question}
              </p>
            </div>

            <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/30">
              <p className="text-[10px] font-bold uppercase tracking-widest text-amber-400 mb-2">
                Răspunsul modelului RAG
              </p>
              <p className="text-sm text-slate-300 leading-relaxed">
                {interaction.answer}
              </p>
            </div>

            {metrics.ground_truth?.text && (
              <div className="bg-emerald-500/5 rounded-xl p-4 border border-emerald-500/20">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-400">
                    Răspuns de referință (Ground Truth)
                  </p>
                  <span className="text-[10px] text-slate-500 bg-slate-700/50 px-2 py-0.5 rounded">
                    generat de {metrics.ground_truth.model_used}
                  </span>
                </div>
                <p className="text-sm text-emerald-200/80 leading-relaxed">
                  {metrics.ground_truth.text}
                </p>
              </div>
            )}
          </div>

          {/* Scorurile metricilor */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-4">
              Scoruri pe metrici
            </h3>
            <div className="bg-slate-800/30 rounded-xl p-5 border border-slate-700/30 space-y-1">
              {metrics.faithfulness && (
                <ScoreBar
                  label="Faithfulness"
                  score={metrics.faithfulness.score}
                  reason={metrics.faithfulness.reason}
                  passed={metrics.faithfulness.passed}
                />
              )}
              {metrics.answer_relevancy && (
                <ScoreBar
                  label="Answer Relevancy"
                  score={metrics.answer_relevancy.score}
                  reason={metrics.answer_relevancy.reason}
                  passed={metrics.answer_relevancy.passed}
                />
              )}
              {metrics.hallucination && (
                <ScoreBar
                  label="Hallucination"
                  score={metrics.hallucination.score}
                  reason={metrics.hallucination.reason}
                  passed={metrics.hallucination.passed}
                  invert={true}
                />
              )}
              {metrics.correctness && (
                <ScoreBar
                  label="Correctness (vs Ground Truth)"
                  score={metrics.correctness.score}
                  reason={metrics.correctness.reason}
                  passed={metrics.correctness.passed}
                />
              )}
            </div>
          </div>

          {/* Legendă metrici */}
          <div className="bg-slate-800/20 rounded-xl p-4 border border-slate-700/20">
            <h4 className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-3">
              Ce înseamnă fiecare metrică
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs text-slate-400">
              <div>
                <span className="font-semibold text-slate-300">Faithfulness</span>{" "}
                — Răspunsul e susținut de documentele recuperate?
              </div>
              <div>
                <span className="font-semibold text-slate-300">Answer Relevancy</span>{" "}
                — Răspunsul adresează întrebarea pusă?
              </div>
              <div>
                <span className="font-semibold text-slate-300">Hallucination</span>{" "}
                — Modelul a inventat informații inexistente în context?{" "}
                <span className="text-slate-500">(scor mic = bine)</span>
              </div>
              <div>
                <span className="font-semibold text-slate-300">Correctness</span>{" "}
                — Răspunsul e corect comparativ cu referința generată?
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-slate-900/95 backdrop-blur-sm border-t border-slate-700/50 px-6 py-4 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2.5 bg-slate-700/50 hover:bg-slate-700 text-white rounded-lg text-sm font-medium transition-colors"
          >
            Închide
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Componenta Dashboard (principală) ─────────────────────────────

export function Dashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [stats, setStats] = useState<AdminStats | null>(null);
  const [isLoadingStats, setIsLoadingStats] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [failedLogs, setFailedLogs] = useState<FailedInteraction[]>([]);
  const [isLoadingLogs, setIsLoadingLogs] = useState(true);
  const [evaluatingId, setEvaluatingId] = useState<string | null>(null);
  const [modalInteraction, setModalInteraction] = useState<FailedInteraction | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [statsRes, logsRes] = await Promise.all([
          apiClient.get<AdminStats>("/admin/stats"),
          apiClient.get<FailedInteraction[]>("/admin/failed-interactions"),
        ]);
        setStats(statsRes.data);
        setFailedLogs(logsRes.data);
      } catch (err) {
        console.error("Eroare:", err);
        setError("A apărut o eroare la încărcarea datelor. Te rugăm să încerci din nou mai târziu.");
      } finally {
        setIsLoadingStats(false);
        setIsLoadingLogs(false);
      }
    };
    fetchData();
  }, []);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") setModalInteraction(null);
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, []);

  const handleEvaluate = async (id: string) => {
    setEvaluatingId(id);
    try {
      const response = await apiClient.post(`/admin/evaluate/${id}`);
      if (response.data.status === "success") {
        const updatedLog = failedLogs.find((l) => l.id === id);
        if (updatedLog) {
          const withMetrics = { ...updatedLog, metrics: response.data.metrics };
          setFailedLogs((prev) =>
            prev.map((log) => (log.id === id ? withMetrics : log))
          );
          setModalInteraction(withMetrics);
        }
      }
    } catch (err) {
      if (axios.isAxiosError(err)) {
        console.error("Eroare la evaluare:", err.response?.data);
      }
      alert("A apărut o eroare la evaluare. Verifică terminalul de backend.");
    } finally {
      setEvaluatingId(null);
    }
  };

  const hasMetrics = (log: FailedInteraction) => !!log.metrics;

  const getOverallBadge = (metrics: EvaluationResult) => {
    const scores = [
      metrics.faithfulness?.score,
      metrics.answer_relevancy?.score,
      metrics.correctness?.score,
    ].filter((s): s is number => s !== null && s !== undefined);

    if (scores.length === 0)
      return { label: "N/A", color: "text-slate-500 bg-slate-700/30" };

    const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
    if (avg >= 0.8)
      return { label: `${Math.round(avg * 100)}%`, color: "text-emerald-400 bg-emerald-500/10 border border-emerald-500/20" };
    if (avg >= 0.5)
      return { label: `${Math.round(avg * 100)}%`, color: "text-amber-400 bg-amber-500/10 border border-amber-500/20" };
    return { label: `${Math.round(avg * 100)}%`, color: "text-red-400 bg-red-500/10 border border-red-500/20" };
  };

  return (
    <div className="min-h-screen bg-slate-900 text-white p-8">
      <div className="max-w-6xl mx-auto">

        {/* ─── Header ───────────────────────────────────────────── */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold">Dashboard Admin</h1>
            <p className="text-slate-400 mt-1">
              Bun venit, <span className="text-indigo-400">{user?.username}</span>
            </p>
          </div>
          <button
            onClick={logout}
            className="px-5 py-2 bg-red-600/10 text-red-500 border border-red-600/20 hover:bg-red-600 hover:text-white rounded-lg transition-colors font-medium"
          >
            Delogare
          </button>
        </div>

        {/* ─── Erori ────────────────────────────────────────────── */}
        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl">
            {error}
          </div>
        )}

        {/* ─── Grid Statistici ──────────────────────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">

          {/* Card Utilizatori */}
          <div className="bg-white/5 border border-white/10 rounded-2xl p-6 flex flex-col items-center justify-center relative overflow-hidden">
            <div className="absolute top-0 right-0 -mr-4 -mt-4 w-24 h-24 bg-indigo-500/10 rounded-full blur-2xl"></div>
            <h3 className="text-slate-400 text-sm font-semibold uppercase tracking-wider mb-2">
              Total Utilizatori
            </h3>
            {isLoadingStats ? (
              <div className="animate-pulse h-10 w-16 bg-slate-700 rounded mt-1"></div>
            ) : (
              <span className="text-5xl font-black text-indigo-400">
                {stats?.total_users || 0}
              </span>
            )}
          </div>

          {/* Card Interacțiuni – click navighează la /graphics */}
          <div
            onClick={() => navigate("/graphics")}
            className="cursor-pointer bg-white/5 border border-white/10 hover:border-indigo-500/30 hover:bg-white/10 rounded-2xl p-6 flex flex-col items-center justify-center relative overflow-hidden transition-all duration-300 group"
          >
            <div className="absolute top-0 right-0 -mr-4 -mt-4 w-24 h-24 bg-white/5 group-hover:bg-indigo-500/10 rounded-full blur-2xl transition-colors duration-300"></div>

            <div className="absolute top-5 right-5 p-2 rounded-full bg-slate-700/50 group-hover:bg-indigo-500/20 transition-all duration-300 group-hover:translate-x-1">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-slate-400 group-hover:text-indigo-400 transition-colors">
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </div>

            <h3 className="text-slate-400 text-sm font-semibold uppercase tracking-wider mb-2">
              Total Interacțiuni Chat
            </h3>

            {isLoadingStats ? (
              <div className="animate-pulse h-10 w-16 bg-slate-700 rounded mt-1"></div>
            ) : (
              <span className="text-5xl font-black text-white">
                {stats?.total_interactions || 0}
              </span>
            )}

            <p className="mt-4 text-[10px] text-slate-500 group-hover:text-indigo-400/60 italic transition-colors">
              Click pentru statistici detaliate →
            </p>
          </div>

        </div>

        {/* ─── Tabelul cu interacțiuni ──────────────────────────── */}
        <div className="mt-8 bg-slate-800/40 border border-slate-700/50 rounded-3xl p-8">
          <div className="mb-6">
            <h2 className="text-xl font-bold text-white">
              Interacțiuni Necesitând Evaluare
            </h2>
            <p className="text-sm text-slate-400 mt-1">
              Mesaje cu feedback negativ (Dislike) de la utilizatori.
            </p>
          </div>

          {isLoadingLogs ? (
            <div className="animate-pulse h-32 bg-slate-700/50 rounded-xl w-full"></div>
          ) : failedLogs.length === 0 ? (
            <div className="text-center py-12 bg-slate-800/50 rounded-2xl border border-dashed border-slate-700">
              <span className="text-4xl mb-3 block">🎉</span>
              <p className="text-slate-400">
                Nu există nicio interacțiune eșuată. Sistemul funcționează perfect!
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-700/50 text-xs uppercase tracking-widest text-slate-500">
                    <th className="pb-4 font-semibold px-4">Întrebare User</th>
                    <th className="pb-4 font-semibold px-4">Răspuns</th>
                    <th className="pb-4 font-semibold px-4">Data & Timp</th>
                    <th className="pb-4 font-semibold text-right px-4">Acțiuni</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700/30">
                  {failedLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-700/20 transition-colors">
                      {/* Întrebare cu tooltip */}
                      <td className="py-4 px-4 w-1/3 relative group/question">
                        <p className="text-sm font-medium text-slate-200 line-clamp-2">
                          {log.question}
                        </p>
                        <div className="invisible group-hover/question:visible absolute z-30 left-0 top-full mt-1 w-96 max-h-60 overflow-y-auto p-4 bg-slate-800 border border-slate-600 rounded-xl shadow-2xl text-sm text-slate-200 leading-relaxed">
                          <p className="text-[10px] font-bold uppercase tracking-widest text-indigo-400 mb-2">
                            Întrebare completă
                          </p>
                          {log.question}
                        </div>
                      </td>

                      {/* Răspuns cu tooltip */}
                      <td className="py-4 px-4 w-1/3 relative group/answer">
                        <p className="text-sm text-slate-400 line-clamp-2">
                          {log.answer}
                        </p>
                        <div className="invisible group-hover/answer:visible absolute z-30 left-0 top-full mt-1 w-96 max-h-60 overflow-y-auto p-4 bg-slate-800 border border-slate-600 rounded-xl shadow-2xl text-sm text-slate-300 leading-relaxed">
                          <p className="text-[10px] font-bold uppercase tracking-widest text-amber-400 mb-2">
                            Răspuns complet
                          </p>
                          {log.answer}
                        </div>
                      </td>

                      {/* Data */}
                      <td className="py-4 px-4 text-sm text-slate-500 whitespace-nowrap">
                        {new Date(log.created_at).toLocaleDateString("ro-RO", {
                          day: "2-digit",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>

                      {/* Acțiuni */}
                      <td className="py-4 px-4 text-right">
                        {evaluatingId === log.id ? (
                          <div className="flex items-center justify-end gap-2 text-indigo-400 text-xs font-semibold">
                            <div className="w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                            Se analizează...
                          </div>
                        ) : hasMetrics(log) ? (
                          <div className="flex items-center justify-end gap-2">
                            <span
                              className={`text-xs font-bold px-2.5 py-1 rounded-lg ${getOverallBadge(log.metrics!).color}`}
                            >
                              {getOverallBadge(log.metrics!).label}
                            </span>
                            <button
                              onClick={() => setModalInteraction(log)}
                              className="px-3 py-1.5 bg-slate-700/50 hover:bg-slate-600/50 text-slate-300 hover:text-white rounded-lg text-xs font-medium transition-colors"
                            >
                              Detalii
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => handleEvaluate(log.id)}
                            className="px-4 py-2 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 hover:bg-indigo-500 hover:text-white rounded-lg text-xs font-semibold transition-colors"
                          >
                            Analizează
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* ─── Informații Sesiune ────────────────────────────────── */}
        <div className="bg-slate-800/50 border border-white/5 rounded-2xl p-6 mt-8">
          <h2 className="text-lg font-semibold mb-4 text-slate-300">
            Informații Sesiune
          </h2>
          <div className="grid grid-cols-2 gap-4 font-mono text-sm text-slate-400">
            <p>
              ID: <span className="text-slate-200">{user?.id}</span>
            </p>
            <p>
              Admin: <span className="text-slate-200">{user?.is_admin ? "DA" : "NU"}</span>
            </p>
            <p>
              Email: <span className="text-slate-200">{user?.email}</span>
            </p>
          </div>
        </div>

      </div>

      {/* ─── Modal Evaluare ─────────────────────────────────────── */}
      {modalInteraction && modalInteraction.metrics && (
        <EvaluationModal
          interaction={modalInteraction}
          onClose={() => setModalInteraction(null)}
        />
      )}
    </div>
  );
}
