import React, { createContext, useContext, useEffect, useState } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { getApiBaseUrl } from "@/components/admin/adminAuth";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signUp: (email: string, password: string, fullName?: string) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null; session: Session | null }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: Error | null }>;
  resendSignupConfirmation: (email: string) => Promise<{ error: Error | null }>;
  signInWithProvider: (
    provider: "google" | "github" | "azure" | "apple",
    redirectPath?: string
  ) => Promise<{ error: Error | null }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);
const OAUTH_POST_LOGIN_REDIRECT_KEY = "post_auth_redirect_path";

const notifySignup = async (payload: {
  method: "email" | "google";
  email?: string | null;
  fullName?: string | null;
  accessToken?: string | null;
  userId?: string | null;
  userCreatedAt?: string | null;
}) => {
  try {
    const apiBase = getApiBaseUrl();
    const response = await fetch(`${apiBase}/auth/notify-signup`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        method: payload.method,
        email: payload.email ?? "",
        fullName: payload.fullName ?? "",
        accessToken: payload.accessToken ?? "",
        userId: payload.userId ?? "",
        userCreatedAt: payload.userCreatedAt ?? "",
      }),
    });

    if (!response.ok) {
      const contentType = response.headers.get("content-type") || "";
      let message = "Failed to notify signup event";

      if (contentType.includes("application/json")) {
        const body = await response.json().catch(() => null);
        if (body?.message) {
          message = String(body.message);
        }
      } else {
        const text = await response.text().catch(() => "");
        if (text) {
          message = text;
        }
      }

      throw new Error(message);
    }
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

  const handleSession = async (nextSession: Session | null, _event?: string) => {
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

      if ((_event === "SIGNED_IN" || _event === "INITIAL_SESSION") && isGoogleUser) {
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

      const pendingOAuthRedirect = window.sessionStorage.getItem(OAUTH_POST_LOGIN_REDIRECT_KEY);
      if (pendingOAuthRedirect) {
        if (window.location.pathname === pendingOAuthRedirect) {
          window.sessionStorage.removeItem(OAUTH_POST_LOGIN_REDIRECT_KEY);
        } else if (window.location.pathname === "/" || window.location.pathname === "/auth") {
          window.sessionStorage.removeItem(OAUTH_POST_LOGIN_REDIRECT_KEY);
          window.location.replace(pendingOAuthRedirect);
          return;
        }
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
        userId: data.user?.id ?? "",
        userCreatedAt: data.user?.created_at ?? "",
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

  const signInWithProvider = async (
    provider: "google" | "github" | "azure" | "apple",
    redirectPath = "/dashboard"
  ) => {
    const safeRedirectPath = redirectPath.startsWith("/") ? redirectPath : "/dashboard";
    window.sessionStorage.setItem(OAUTH_POST_LOGIN_REDIRECT_KEY, safeRedirectPath);
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: `${window.location.origin}${safeRedirectPath}` },
    });
    if (error) {
      window.sessionStorage.removeItem(OAUTH_POST_LOGIN_REDIRECT_KEY);
    }
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
