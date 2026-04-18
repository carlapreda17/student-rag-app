import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { Login } from "./pages/Login";
import { Dashboard } from "./pages/Dashboard";
import { Graphics } from "./pages/Graphics";

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          {/* Redirect default la dashboard (care te va redirecționa la login dacă nu ești logat) */}
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          {/* Catch-all */}
          <Route path="*" element={<Navigate to="/login" replace />} />
          <Route
            path="/graphics"
            element={
              <ProtectedRoute>
                <Graphics />
              </ProtectedRoute>
            }
        />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;