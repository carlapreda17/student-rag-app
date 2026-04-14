import { useAuth } from "../context/useAuth";

export function Dashboard() {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen bg-slate-900 text-white p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold">Dashboard Admin</h1>
            <p className="text-slate-400 mt-1">
              Bun venit, <span className="text-indigo-400">{user?.username}</span>
            </p>
          </div>
          <button
            onClick={logout}
            className="px-4 py-2 bg-red-600 hover:bg-red-500 rounded-lg transition"
          >
            Delogare
          </button>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-2xl p-8">
          <h2 className="text-xl font-semibold mb-2">✅ Autentificare reușită!</h2>
          <p className="text-slate-400">
            Flow-ul de login merge. Aici vom construi dashboard-ul real în pașii următori.
          </p>
          
          <div className="mt-6 p-4 bg-slate-900/50 rounded-lg font-mono text-sm">
            <p><span className="text-slate-500">ID:</span> {user?.id}</p>
            <p><span className="text-slate-500">Username:</span> {user?.username}</p>
            <p><span className="text-slate-500">Email:</span> {user?.email}</p>
            <p><span className="text-slate-500">Is Admin:</span> {user?.is_admin ? "✓" : "✗"}</p>
          </div>
        </div>
      </div>
    </div>
  );
}