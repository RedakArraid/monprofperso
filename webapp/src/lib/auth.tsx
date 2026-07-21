import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { api, tokenStore } from "@/lib/api";

export type User = {
  id: number;
  full_name: string;
  phone: string;
  role: string;
  teacher_id?: number | null;
  initials?: string;
};

type AuthCtx = {
  user: User | null;
  loading: boolean;
  isTeacher: boolean;
  login: (token: string, user: User) => void;
  logout: () => void;
  refresh: () => Promise<User | null>;
};

const Ctx = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!tokenStore.get()) {
      setUser(null);
      setLoading(false);
      return null;
    }
    try {
      const me = await api<User>("/api/me");
      setUser(me);
      tokenStore.set(tokenStore.get()!, me.role);
      return me;
    } catch {
      tokenStore.clear();
      setUser(null);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const login = useCallback((token: string, u: User) => {
    tokenStore.set(token, u.role);
    setUser(u);
  }, []);

  const logout = useCallback(() => {
    tokenStore.clear();
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({
      user,
      loading,
      isTeacher: Boolean(user && (user.role === "teacher" || user.teacher_id)),
      login,
      logout,
      refresh,
    }),
    [user, loading, login, logout, refresh],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useAuth outside provider");
  return v;
}

export function redirectAfterLogin(user: User) {
  if (user.role === "admin") {
    localStorage.setItem("mpp_admin_jwt", tokenStore.get() || "");
    window.location.href = "/admin/";
    return;
  }
  if (user.role === "teacher" || user.teacher_id) {
    window.location.href = "/espace/#/prof-espace";
    return;
  }
  window.location.href = "/espace/#/accueil";
}
