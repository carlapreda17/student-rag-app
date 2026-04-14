import { createContext, useState } from "react";
import type { ReactNode } from "react";
import type { User } from "../types/auth";
import { authApi } from "../api/auth";

export interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

// eslint-disable-next-line react-refresh/only-export-components
export const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Funcție care citește user-ul din localStorage o singură dată, la inițializare
function getInitialUser(): User | null {
  const storedUser = localStorage.getItem("admin_user");
  const storedToken = localStorage.getItem("admin_token");
  
  if (!storedUser || !storedToken) {
    return null;
  }
  
  try {
    return JSON.parse(storedUser) as User;
  } catch {
    localStorage.removeItem("admin_user");
    localStorage.removeItem("admin_token");
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => getInitialUser());
  const [isLoading] = useState(false);

  const login = async (email: string, password: string) => {
    const response = await authApi.login({ email, password });
    
    if (!response.user.is_admin) {
      throw new Error("Acces interzis. Acest panou este doar pentru administratori.");
    }

    localStorage.setItem("admin_token", response.token);
    localStorage.setItem("admin_user", JSON.stringify(response.user));
    setUser(response.user);
  };

  const logout = () => {
    localStorage.removeItem("admin_token");
    localStorage.removeItem("admin_user");
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}