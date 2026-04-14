import { Navigate } from "react-router-dom";
import type { ReactNode } from "react";
import { useAuth } from "../context/useAuth";

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-slate-500">Se încarcă...</p>
      </div>
    );
  }

  if (!user || !user.is_admin) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}