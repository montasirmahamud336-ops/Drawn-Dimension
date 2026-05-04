import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { getApiBaseUrl } from "@/components/admin/adminAuth";
import { clearPreferredDashboardPath } from "@/components/shared/dashboardPath";

export type AuthUser = {
  id: string;
  email: string | null;
  created_at?: string;
  app_metadata?: Record<string, unknown>;
  user_metadata?: Record<string, unknown>;
  identities?: Array<{ provider?: string }>;
};

export type AuthSession = {
  access_token: string;
  token_type: "Bearer";
  user: AuthUser;
};

interface AuthContextType {
  user: AuthUser | null;
  session: AuthSession | null;
  loading: boolean;
  signUp: (email: string, password: string, fullName?: string) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null; session: AuthSession | null }>;
  signInWithGoogleIdToken: (idToken: string) => Promise<{ error: Error | null; session: AuthSession | null }>;
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
const TOKEN_STORAGE_KEY = "site_user_token";
const USER_STORAGE_KEY = "site_user_payload";

export const getPendingOAuthRedirectPath = () => {
  if (typeof window === "undefined") return null;
  return window.sessionStorage.getItem(OAUTH_POST_LOGIN_REDIRECT_KEY);
};

export const clearPendingOAuthRedirectPath = () => {
  if (typeof window === "undefined") return;
  window.sessionStorage.removeItem(OAUTH_POST_LOGIN_REDIRECT_KEY);
};

const normalizeAuthUser = (value: unknown): AuthUser | null => {
  if (!value || typeof value !== "object") return null;
  const input = value as Record<string, unknown>;
  const id = String(input.id ?? "").trim();
  if (!id) return null;

  return {
    id,
    email: input.email ? String(input.email) : null,
    created_at: input.created_at ? String(input.created_at) : undefined,
    app_metadata:
      input.app_metadata && typeof input.app_metadata === "object"
        ? (input.app_metadata as Record<string, unknown>)
        : { provider: "email" },
    user_metadata:
      input.user_metadata && typeof input.user_metadata === "object"
        ? (input.user_metadata as Record<string, unknown>)
        : {},
    identities: Array.isArray(input.identities)
      ? input.identities
          .filter((item) => item && typeof item === "object")
          .map((item) => ({ provider: String((item as { provider?: unknown }).provider ?? "") || undefined }))
      : [{ provider: "email" }],
  };
};

const buildSession = (accessToken: string, user: AuthUser): AuthSession => ({
  access_token: accessToken,
  token_type: "Bearer",
  user,
});

const persistSession = (nextSession: AuthSession | null) => {
  if (typeof window === "undefined") return;

  if (!nextSession) {
    window.localStorage.removeItem(TOKEN_STORAGE_KEY);
    window.localStorage.removeItem(USER_STORAGE_KEY);
    return;
  }

  window.localStorage.setItem(TOKEN_STORAGE_KEY, nextSession.access_token);
  window.localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(nextSession.user));
};

const loadStoredSession = (): AuthSession | null => {
  if (typeof window === "undefined") return null;

  const accessToken = window.localStorage.getItem(TOKEN_STORAGE_KEY);
  const rawUser = window.localStorage.getItem(USER_STORAGE_KEY);
  if (!accessToken || !rawUser) return null;

  try {
    const parsed = JSON.parse(rawUser);
    const user = normalizeAuthUser(parsed);
    if (!user) return null;
    return buildSession(accessToken, user);
  } catch {
    return null;
  }
};

const parseApiError = async (response: Response, fallback: string) => {
  const contentType = response.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    const body = await response.json().catch(() => null);
    const message = body?.message || body?.detail || body?.error;
    if (message) return String(message);
  }

  const text = await response.text().catch(() => "");
  return text || fallback;
};

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
      const message = await parseApiError(response, "Failed to notify signup event");
      throw new Error(message);
    }
  } catch (error) {
    console.error("Signup notification failed", error);
  }
};

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [session, setSession] = useState<AuthSession | null>(null);
  const [loading, setLoading] = useState(true);

  const applySession = useCallback((nextSession: AuthSession | null) => {
    setSession(nextSession);
    setUser(nextSession?.user ?? null);
    persistSession(nextSession);
  }, []);

  const refreshSession = useCallback(async () => {
    const stored = loadStoredSession();

    if (stored?.access_token) {
      try {
        const apiBase = getApiBaseUrl();
        const response = await fetch(`${apiBase}/auth/user-me`, {
          headers: {
            Authorization: `Bearer ${stored.access_token}`,
          },
        });

        if (response.ok) {
          const payload = await response.json();
          const normalizedUser = normalizeAuthUser(payload);
          if (normalizedUser) {
            applySession(buildSession(stored.access_token, normalizedUser));
            setLoading(false);
            return;
          }
        }
      } catch {
        // Fall through to local session reset.
      }
    }

    applySession(null);
    setLoading(false);
  }, [applySession]);

  useEffect(() => {
    void refreshSession();
  }, [refreshSession]);

  const signUp = async (email: string, password: string, fullName?: string) => {
    try {
      const apiBase = getApiBaseUrl();
      const response = await fetch(`${apiBase}/auth/user-signup`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          password,
          fullName: fullName ?? "",
        }),
      });

      if (!response.ok) {
        return {
          error: new Error(await parseApiError(response, "Failed to create account")),
        };
      }

      const payload = await response.json().catch(() => null);
      const createdUser = normalizeAuthUser(payload?.user);
      if (createdUser?.id) {
        void notifySignup({
          method: "email",
          email,
          fullName: fullName ?? "",
          userId: createdUser.id,
          userCreatedAt: String(payload?.createdAt ?? createdUser.created_at ?? ""),
        });
      }

      return { error: null };
    } catch (error) {
      return {
        error: error instanceof Error ? error : new Error("Failed to create account"),
      };
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      const apiBase = getApiBaseUrl();
      const response = await fetch(`${apiBase}/auth/user-login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        return {
          error: new Error(await parseApiError(response, "Failed to sign in")),
          session: null,
        };
      }

      const payload = await response.json().catch(() => null);
      const accessToken = String(payload?.session?.access_token ?? payload?.token ?? "").trim();
      const normalizedUser = normalizeAuthUser(payload?.session?.user ?? payload?.user);
      if (!accessToken || !normalizedUser) {
        return {
          error: new Error("Login response is incomplete"),
          session: null,
        };
      }

      const nextSession = buildSession(accessToken, normalizedUser);
      applySession(nextSession);

      return {
        error: null,
        session: nextSession,
      };
    } catch (error) {
      return {
        error: error instanceof Error ? error : new Error("Failed to sign in"),
        session: null,
      };
    }
  };

  const signOut = async () => {
    clearPreferredDashboardPath();
    applySession(null);
  };

  const signInWithGoogleIdToken = async (idToken: string) => {
    try {
      const apiBase = getApiBaseUrl();
      const response = await fetch(`${apiBase}/auth/user-google`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ idToken }),
      });

      if (!response.ok) {
        return {
          error: new Error(await parseApiError(response, "Failed to sign in with Google")),
          session: null,
        };
      }

      const payload = await response.json().catch(() => null);
      const accessToken = String(payload?.session?.access_token ?? payload?.token ?? "").trim();
      const normalizedUser = normalizeAuthUser(payload?.session?.user ?? payload?.user);
      if (!accessToken || !normalizedUser) {
        return {
          error: new Error("Google login response is incomplete"),
          session: null,
        };
      }

      const nextSession = buildSession(accessToken, normalizedUser);
      applySession(nextSession);

      if (payload?.created) {
        void notifySignup({
          method: "google",
          email: normalizedUser.email ?? "",
          fullName:
            String(
              normalizedUser.user_metadata?.full_name ??
                normalizedUser.user_metadata?.name ??
                ""
            ).trim() || null,
          accessToken,
          userId: normalizedUser.id,
          userCreatedAt: String(normalizedUser.created_at ?? ""),
        });
      }

      return {
        error: null,
        session: nextSession,
      };
    } catch (error) {
      return {
        error: error instanceof Error ? error : new Error("Failed to sign in with Google"),
        session: null,
      };
    }
  };

  const resetPassword = async (email: string) => {
    try {
      const apiBase = getApiBaseUrl();
      const response = await fetch(`${apiBase}/auth/user-password-request`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      });

      if (!response.ok) {
        return {
          error: new Error(await parseApiError(response, "Failed to send reset link")),
        };
      }

      return { error: null };
    } catch (error) {
      return {
        error: error instanceof Error ? error : new Error("Failed to send reset link"),
      };
    }
  };

  const resendSignupConfirmation = async (_email: string) => {
    return {
      error: new Error("Email verification is no longer required. Please sign in or reset your password."),
    };
  };

  const signInWithProvider = async (
    _provider: "google" | "github" | "azure" | "apple",
    _redirectPath = "/dashboard"
  ) => {
    clearPendingOAuthRedirectPath();
    return {
      error: new Error("Use the Google sign-in button on the auth page."),
    };
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        loading,
        signUp,
        signIn,
        signInWithGoogleIdToken,
        signOut,
        resetPassword,
        resendSignupConfirmation,
        signInWithProvider,
      }}
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
