import { useState } from "react";
import type { FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/useAuth";
import axios from "axios";

export function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

      try {
      await login(email, password);
      navigate("/dashboard");
    } catch (err) {
      // Eroare de la axios (backend)
      if (axios.isAxiosError(err) && err.response?.data?.detail) {
        setError(err.response.data.detail);
      } 
      // Eroare aruncată manual (ex: nu e admin)
      else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("A apărut o eroare. Încearcă din nou.");
      }
    } finally {
      setIsSubmitting(false);
    }
}

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-900 p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-block p-3 bg-indigo-500/10 rounded-2xl mb-4">
            <span className="text-4xl">🛡️</span>
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">Panou Admin</h1>
          <p className="text-slate-400 text-sm">
            Te rugăm să te autentifici pentru a accesa dashboard-ul
          </p>
        </div>

        {/* Card formular */}
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8 shadow-2xl">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-slate-200 mb-2">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-3 bg-slate-900/50 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
                placeholder="admin@disertatie.ro"
                disabled={isSubmitting}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-200 mb-2">
                Parolă
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full px-4 py-3 bg-slate-900/50 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
                placeholder="••••••••"
                disabled={isSubmitting}
              />
            </div>

            {error && (
              <div className="px-4 py-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                <p className="text-sm text-red-300">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-800 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition shadow-lg shadow-indigo-500/20"
            >
              {isSubmitting ? "Se autentifică..." : "Autentificare"}
            </button>
          </form>
        </div>

        <p className="text-center text-slate-500 text-xs mt-6">
          Acces rezervat administratorilor
        </p>
      </div>
    </div>
  );
}