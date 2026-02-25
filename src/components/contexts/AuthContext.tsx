import React, { createContext, useContext, useEffect, useState } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signUp: (email: string, password: string, fullName?: string) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null; session: Session | null }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: Error | null }>;
  resendSignupConfirmation: (email: string) => Promise<{ error: Error | null }>;
  signInWithProvider: (provider: "google" | "github" | "azure" | "apple") => Promise<{ error: Error | null }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const getApiBaseUrl = () => {
  const envBase = (import.meta as any).env?.VITE_API_BASE_URL as string | undefined;
  if (envBase && envBase.trim().length > 0) {
    return envBase.replace(/\/$/, "");
  }

  const { protocol, hostname } = window.location;
  if (hostname === "localhost" || hostname === "127.0.0.1") {
    return `${protocol}//${hostname}:4000`;
  }

  return window.location.origin.replace(/\/$/, "");
};

const notifySignup = async (payload: {
  method: "email" | "google";
  email?: string | null;
  fullName?: string | null;
  accessToken?: string | null;
}) => {
  try {
    const apiBase = getApiBaseUrl();
    await fetch(`${apiBase}/auth/notify-signup`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        method: payload.method,
        email: payload.email ?? "",
        fullName: payload.fullName ?? "",
        accessToken: payload.accessToken ?? "",
      }),
    });
  } catch (error) {
    console.error("Signup notification failed", error);
  }
};

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  const ensureProfile = async (currentUser: User, fallbackName?: string) => {
    const { data, error } = await supabase
      .from("profiles")
      .select("id")
      .eq("user_id", currentUser.id)
      .maybeSingle();

    if (error || data) return;

    await supabase.from("profiles").insert({
      user_id: currentUser.id,
      email: currentUser.email,
      full_name: currentUser.user_metadata?.full_name ?? fallbackName ?? null,
    });
  };

  const handleSession = async (nextSession: Session | null, event?: string) => {
    setSession(nextSession);
    setUser(nextSession?.user ?? null);
    setLoading(false);

    if (nextSession?.user) {
      await ensureProfile(nextSession.user);

      const provider = String(nextSession.user.app_metadata?.provider ?? "").toLowerCase();
      const identities = Array.isArray(nextSession.user.identities)
        ? nextSession.user.identities.map((identity: any) => String(identity?.provider ?? "").toLowerCase())
        : [];
      const isGoogleUser = provider === "google" || identities.includes("google");

      if (event === "SIGNED_IN" && isGoogleUser) {
        void notifySignup({
          method: "google",
          email: nextSession.user.email,
          fullName: String(
            nextSession.user.user_metadata?.full_name ??
            nextSession.user.user_metadata?.name ??
            ""
          ),
          accessToken: nextSession.access_token,
        });
      }
    }
  };

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      handleSession(session, "INITIAL_SESSION");
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, nextSession) => {
        handleSession(nextSession, event);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email: string, password: string, fullName?: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName },
      },
    });
    if (!error && data.session?.user) {
      await ensureProfile(data.session.user, fullName);
    }
    if (!error) {
      void notifySignup({
        method: "email",
        email,
        fullName: fullName ?? "",
      });
    }
    return { error };
  };

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (!error && data.session?.user) {
      await ensureProfile(data.session.user);
    }
    return { error, session: data.session ?? null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const resetPassword = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    return { error };
  };

  const resendSignupConfirmation = async (email: string) => {
    const { error } = await supabase.auth.resend({
      type: "signup",
      email,
      options: { emailRedirectTo: window.location.origin },
    });
    return { error };
  };

  const signInWithProvider = async (provider: "google" | "github" | "azure" | "apple") => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: window.location.origin },
    });
    return { error };
  };

  return (
    <AuthContext.Provider
      value={{ user, session, loading, signUp, signIn, signOut, resetPassword, resendSignupConfirmation, signInWithProvider }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
