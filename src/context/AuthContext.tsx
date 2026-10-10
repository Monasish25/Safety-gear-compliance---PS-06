import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { User, Role } from "../types";
import { login as apiLogin, logout as apiLogout, getMe, getAuthToken, setAuthToken } from "../lib/api";
import { supabase } from "../lib/supabase";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<User>;
  signUp: (email: string, password: string, name?: string, role?: Role) => Promise<{ user: User | null; session: any }>;
  logout: () => Promise<void>;
  hasRole: (roles: Role[]) => boolean;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function mapSupabaseUser(sbUser: any): User {
  const role = (sbUser.user_metadata?.role || sbUser.app_metadata?.role || "HEAD") as Role;
  return {
    id: sbUser.id,
    email: sbUser.email || "",
    name: sbUser.user_metadata?.name || sbUser.email?.split("@")[0] || "Safety Officer",
    role: role,
    isActive: true,
    forcePasswordChange: false,
    createdAt: sbUser.created_at || new Date().toISOString(),
  };
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const initAuth = useCallback(async () => {
    try {
      // 1. Check Supabase active session
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setUser(mapSupabaseUser(session.user));
        if (session.access_token) {
          setAuthToken(session.access_token);
        }
        return;
      }

      // 2. Fallback check for existing backend session token
      const token = getAuthToken();
      if (token) {
        try {
          const me = await getMe();
          setUser(me);
          return;
        } catch {
          setAuthToken(null);
        }
      }

      setUser(null);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    initAuth();

    // Listen to Supabase auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        setUser(mapSupabaseUser(session.user));
        if (session.access_token) {
          setAuthToken(session.access_token);
        }
      } else {
        const token = getAuthToken();
        if (!token) {
          setUser(null);
        }
      }
      setLoading(false);
    });

    const handleAuthExpired = () => {
      setUser(null);
      setAuthToken(null);
    };

    window.addEventListener("auth:expired", handleAuthExpired);
    return () => {
      subscription.unsubscribe();
      window.removeEventListener("auth:expired", handleAuthExpired);
    };
  }, [initAuth]);

  const login = async (email: string, password: string): Promise<User> => {
    // 1. Authenticate with Supabase
    const { data, error: sbError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (!sbError && data?.user) {
      const mappedUser = mapSupabaseUser(data.user);
      if (data.session?.access_token) {
        setAuthToken(data.session.access_token);
      }
      setUser(mappedUser);
      return mappedUser;
    }

    // 2. Fallback to backend authentication (e.g. for internal admin accounts)
    try {
      const res = await apiLogin(email, password);
      setUser(res.user);
      return res.user;
    } catch (backendError: any) {
      throw new Error(sbError?.message || backendError?.message || "Invalid credentials.");
    }
  };

  const signUp = async (
    email: string,
    password: string,
    name?: string,
    role: Role = "HEAD"
  ): Promise<{ user: User | null; session: any }> => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name: name || email.split("@")[0],
          role: role,
        },
      },
    });

    if (error) {
      throw new Error(error.message);
    }

    if (data.session && data.user) {
      const mappedUser = mapSupabaseUser(data.user);
      if (data.session.access_token) {
        setAuthToken(data.session.access_token);
      }
      setUser(mappedUser);
      return { user: mappedUser, session: data.session };
    }

    return {
      user: data.user ? mapSupabaseUser(data.user) : null,
      session: data.session,
    };
  };

  const logout = async () => {
    try {
      await supabase.auth.signOut();
    } catch {
      // Ignore
    }
    try {
      await apiLogout();
    } catch {
      // Ignore
    } finally {
      setUser(null);
      setAuthToken(null);
    }
  };

  const hasRole = (roles: Role[]): boolean => {
    if (!user) return false;
    return roles.includes(user.role);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isAuthenticated: !!user,
        login,
        signUp,
        logout,
        hasRole,
        refreshUser: initAuth,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
