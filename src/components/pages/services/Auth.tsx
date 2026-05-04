import { FormEvent, useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useRef } from "react";
import { motion } from "framer-motion";
import { z } from "zod";
import { ArrowRight, Eye, EyeOff, KeyRound, Loader2, Mail, UserCircle2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import PageTransition from "@/components/shared/PageTransition";
import PageHero from "@/components/shared/PageHero";
import PremiumBackground from "@/components/shared/PremiumBackground";
import { getApiBaseUrl } from "@/components/admin/adminAuth";
import { EMPLOYEE_DASHBOARD_PATH, setPreferredDashboardPath } from "@/components/shared/dashboardPath";

const signInSchema = z.object({
  email: z.string().trim().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

const signUpSchema = signInSchema.extend({
  fullName: z.string().trim().min(2, "Name must be at least 2 characters").max(100, "Name too long"),
});

const resetSchema = z.object({
  email: z.string().trim().email("Invalid email address"),
});

type SignInFormData = z.infer<typeof signInSchema>;
type SignUpFormData = z.infer<typeof signUpSchema>;
type ResetFormData = z.infer<typeof resetSchema>;
type GoogleCredentialResponse = {
  credential?: string;
};

declare global {
  interface Window {
    google?: {
      accounts?: {
        id?: {
          initialize: (options: {
            client_id: string;
            callback: (response: GoogleCredentialResponse) => void;
            auto_select?: boolean;
            cancel_on_tap_outside?: boolean;
          }) => void;
          renderButton: (
            parent: HTMLElement,
            options: Record<string, string | number | boolean>
          ) => void;
          cancel?: () => void;
        };
      };
    };
  }
}

let googleIdentityScriptPromise: Promise<void> | null = null;

const loadGoogleIdentityScript = () => {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("Google sign-in is only available in the browser."));
  }

  if (window.google?.accounts?.id) {
    return Promise.resolve();
  }

  if (googleIdentityScriptPromise) {
    return googleIdentityScriptPromise;
  }

  googleIdentityScriptPromise = new Promise<void>((resolve, reject) => {
    const existingScript = document.querySelector<HTMLScriptElement>(
      'script[src="https://accounts.google.com/gsi/client"]'
    );

    if (existingScript) {
      existingScript.addEventListener("load", () => resolve(), { once: true });
      existingScript.addEventListener(
        "error",
        () => reject(new Error("Failed to load Google sign-in.")),
        { once: true }
      );
      return;
    }

    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load Google sign-in."));
    document.head.appendChild(script);
  });

  return googleIdentityScriptPromise;
};

const Auth = () => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [isReset, setIsReset] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [googleInitError, setGoogleInitError] = useState<string | null>(null);
  const [showSignUpPassword, setShowSignUpPassword] = useState(false);
  const [showSignInPassword, setShowSignInPassword] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();
  const googleButtonRef = useRef<HTMLDivElement | null>(null);

  const { signIn, signInWithGoogleIdToken, signUp, resetPassword } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const prefillEmail = searchParams.get("email") ?? "";
  const nextParam = searchParams.get("next") ?? "";
  const modeParam = (searchParams.get("mode") ?? "").toLowerCase();
  const isEmployeeLoginFlow = nextParam.startsWith("/employee/dashboard");
  const googleClientId = String(import.meta.env.VITE_GOOGLE_CLIENT_ID ?? "").trim();

  const resolvePostLoginPath = (hasEmployeeDashboardAccess: boolean) => {
    if (isEmployeeLoginFlow) {
      return "/employee/dashboard";
    }

    // Prevent redirects to home from stale/malformed next query values.
    if (nextParam.startsWith("/dashboard")) {
      return nextParam;
    }

    return hasEmployeeDashboardAccess ? "/employee/dashboard" : "/dashboard";
  };

  const setAuthMode = (mode: "signin" | "signup" | "reset") => {
    const params = new URLSearchParams(searchParams);
    params.set("mode", mode);
    setSearchParams(params, { replace: true });
  };

  useEffect(() => {
    if (isEmployeeLoginFlow) {
      setIsSignUp(false);
      setIsReset(false);
      return;
    }

    if (modeParam === "signup") {
      setIsSignUp(true);
      setIsReset(false);
      return;
    }

    if (modeParam === "reset") {
      setIsSignUp(false);
      setIsReset(true);
      return;
    }

    setIsSignUp(false);
    setIsReset(false);
  }, [isEmployeeLoginFlow, modeParam]);

  const heroContent = !isEmployeeLoginFlow && isReset
    ? {
      title: "Reset Password",
      subtitle: "Account Recovery",
      description: "We'll send you a reset link to your email.",
    }
    : !isEmployeeLoginFlow && isSignUp
      ? {
        title: "Create Your Account",
        subtitle: "Client Access",
        description: "Register to access secure messaging, AI assistance, and project updates.",
      }
      : {
        title: isEmployeeLoginFlow ? "Welcome Employee" : "Welcome Back",
        subtitle: isEmployeeLoginFlow ? "Employee Login" : "Secure Login",
        description: isEmployeeLoginFlow
          ? "Sign in to access your assigned work details and employee dashboard."
          : "Sign in to access your chat history, AI assistant, and project messages.",
      };

  const formPanelMeta = !isEmployeeLoginFlow && isReset
    ? {
      badge: "Password Reset",
      title: "Recover Your Access",
      description: "Enter your email and we'll send a secure reset link.",
    }
    : !isEmployeeLoginFlow && isSignUp
      ? {
        badge: "New Client",
        title: "Let's Create Your Account",
        description: "Set up your account to track projects, chat, and get updates in one place.",
      }
      : {
        badge: isEmployeeLoginFlow ? "Employee Access" : "Client Access",
        title: isEmployeeLoginFlow ? "Employee Sign In" : "Sign In To Continue",
        description: isEmployeeLoginFlow
          ? "Use your credentials to access employee dashboard and assigned work."
          : "Sign in to access your dashboard, chats, and project progress.",
      };

  const fieldLabelClass = "mb-2 block text-sm font-medium text-foreground/95";
  const inputShellClass =
    "group relative flex items-center rounded-xl border border-border/75 bg-background/75 transition-all duration-300 focus-within:border-primary/55 focus-within:ring-2 focus-within:ring-primary/20";
  const inputBaseClass =
    "h-12 w-full bg-transparent px-4 text-sm text-foreground placeholder:text-muted-foreground/70 focus:outline-none";
  const inputWithIconClass = `${inputBaseClass} pl-11`;
  const passwordInputClass = `${inputBaseClass} pl-11 pr-12`;
  const inputIconClass = "pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/85 transition-colors duration-300 group-focus-within:text-primary";
  const passwordToggleClass =
    "absolute right-3 top-1/2 inline-flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground/80 transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35";
  const submitButtonClass =
    "inline-flex h-12 w-full items-center justify-center rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground shadow-[0_14px_32px_-14px_hsla(var(--primary)/0.85)] transition-all duration-300 hover:bg-primary/90 hover:shadow-[0_18px_34px_-14px_hsla(var(--primary)/0.9)] disabled:cursor-not-allowed disabled:opacity-60";

  const getValidationMessage = (error: z.ZodError) =>
    error.issues[0]?.message ?? "Please check your input and try again.";

  const getAuthErrorMessage = (
    rawMessage: string,
    context: "signin" | "signup" | "resend" | "reset" | "oauth" = "signin",
  ) => {
    const message = rawMessage.toLowerCase();

    if (message.includes("rate limit")) {
      if (context === "signup") {
        return "Too many sign-up attempts were made in a short time. Please wait about a minute and try again.";
      }
      if (context === "resend") {
        return "Too many verification email requests were made. Please wait about a minute and try again.";
      }
      if (context === "reset") {
        return "Too many password reset requests were made. Please wait about a minute and try again.";
      }
      return "Too many requests were made in a short time. Please wait about a minute and try again.";
    }

    return rawMessage;
  };

  const hasEmployeeDashboardAccess = async (accessToken: string | null | undefined) => {
    if (!accessToken) return false;

    try {
      const apiBase = getApiBaseUrl();
      const response = await fetch(`${apiBase}/employee/dashboard`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) return false;

      const body = await response.json().catch(() => null);
      return Boolean(body?.employee);
    } catch (error) {
      return false;
    }
  };

  const handleSignIn = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);

    const parsed = signInSchema.safeParse({
      email: String(formData.get("email") ?? ""),
      password: String(formData.get("password") ?? ""),
    } satisfies SignInFormData);

    if (!parsed.success) {
      toast({
        title: "Sign in failed",
        description: getValidationMessage(parsed.error),
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    const { error, session } = await signIn(parsed.data.email, parsed.data.password);
    setIsLoading(false);

    if (error) {
      const normalizedMessage = error.message.toLowerCase();
      const isInvalidCredentials =
        normalizedMessage.includes("invalid login credentials") ||
        normalizedMessage.includes("invalid credentials") ||
        normalizedMessage.includes("no local password is set yet");

      toast({
        title: "Sign in failed",
        description: isInvalidCredentials
          ? "If this email was from the old system, use Forgot password once to activate your new login. Otherwise, check your password and try again."
          : getAuthErrorMessage(error.message, "signin"),
        variant: "destructive",
      });
      return;
    }

    const isEmployee = await hasEmployeeDashboardAccess(session?.access_token);
    const postLoginPath = resolvePostLoginPath(isEmployee);
    setPreferredDashboardPath(isEmployee ? EMPLOYEE_DASHBOARD_PATH : postLoginPath);
    toast({ title: isEmployeeLoginFlow ? "Welcome employee!" : "Welcome back!" });
    navigate(postLoginPath);
  };

  const handleSignUp = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);

    const parsed = signUpSchema.safeParse({
      fullName: String(formData.get("fullName") ?? ""),
      email: String(formData.get("email") ?? ""),
      password: String(formData.get("password") ?? ""),
    } satisfies SignUpFormData);

    if (!parsed.success) {
      toast({
        title: "Sign up failed",
        description: getValidationMessage(parsed.error),
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    const { error } = await signUp(parsed.data.email, parsed.data.password, parsed.data.fullName);
    setIsLoading(false);

    if (error) {
      toast({
        title: "Sign up failed",
        description: getAuthErrorMessage(error.message, "signup"),
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Account created!",
      description: "Your account is ready. You can sign in now.",
    });
    form.reset();
    setAuthMode("signin");
  };

  const handleResetPassword = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);

    const parsed = resetSchema.safeParse({
      email: String(formData.get("email") ?? ""),
    } satisfies ResetFormData);

    if (!parsed.success) {
      toast({
        title: "Password reset failed",
        description: getValidationMessage(parsed.error),
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    const { error } = await resetPassword(parsed.data.email);
    setIsLoading(false);

    if (error) {
      toast({
        title: "Password reset failed",
        description: getAuthErrorMessage(error.message, "reset"),
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Check your email",
      description: "We sent you a password reset link.",
    });
    form.reset();
    setAuthMode("signin");
  };

  useEffect(() => {
    if (isEmployeeLoginFlow || isReset) {
      setGoogleInitError(null);
      if (googleButtonRef.current) {
        googleButtonRef.current.innerHTML = "";
      }
      return;
    }

    if (!googleClientId) {
      setGoogleInitError("Google sign-in is not configured yet.");
      return;
    }

    let cancelled = false;

    const initializeGoogleButton = async () => {
      try {
        await loadGoogleIdentityScript();
        if (cancelled) return;

        const googleIdentity = window.google?.accounts?.id;
        const container = googleButtonRef.current;

        if (!googleIdentity || !container) {
          throw new Error("Google sign-in is unavailable right now.");
        }

        setGoogleInitError(null);
        container.innerHTML = "";

        googleIdentity.initialize({
          client_id: googleClientId,
          callback: async (response) => {
            const credential = String(response?.credential ?? "").trim();
            if (!credential) {
              toast({
                title: "Google sign in failed",
                description: "Google did not return a valid credential.",
                variant: "destructive",
              });
              return;
            }

            setIsGoogleLoading(true);
            const { error, session } = await signInWithGoogleIdToken(credential);
            setIsGoogleLoading(false);

            if (error) {
              toast({
                title: "Google sign in failed",
                description: getAuthErrorMessage(error.message, "oauth"),
                variant: "destructive",
              });
              return;
            }

            const isEmployee = await hasEmployeeDashboardAccess(session?.access_token);
            const postLoginPath = resolvePostLoginPath(isEmployee);
            setPreferredDashboardPath(isEmployee ? EMPLOYEE_DASHBOARD_PATH : postLoginPath);
            toast({ title: "Signed in with Google" });
            navigate(postLoginPath);
          },
          auto_select: false,
          cancel_on_tap_outside: true,
        });

        const buttonWidth = Math.max(Math.min(container.clientWidth || 0, 320), 220);

        googleIdentity.renderButton(container, {
          type: "standard",
          theme: "outline",
          size: "large",
          text: "continue_with",
          shape: "pill",
          logo_alignment: "left",
          width: buttonWidth,
        });
      } catch (error) {
        if (cancelled) return;
        setGoogleInitError(
          error instanceof Error ? error.message : "Google sign-in is unavailable right now."
        );
      }
    };

    void initializeGoogleButton();

    return () => {
      cancelled = true;
      window.google?.accounts?.id?.cancel?.();
      if (googleButtonRef.current) {
        googleButtonRef.current.innerHTML = "";
      }
    };
  }, [
    getAuthErrorMessage,
    googleClientId,
    isEmployeeLoginFlow,
    isReset,
    navigate,
    resolvePostLoginPath,
    signInWithGoogleIdToken,
    toast,
  ]);

  return (
    <PageTransition>
      <PremiumBackground className="flex flex-col">
        <Navigation />

        <main className="flex-grow">
          <PageHero
            title={heroContent.title}
            subtitle={heroContent.subtitle}
            description={heroContent.description}
          />

          <section className="pt-6 pb-16 md:pt-8 md:pb-20 lg:pt-10 lg:pb-24">
            <div className="container-narrow max-w-2xl">
              <div className="relative overflow-hidden rounded-[1.75rem] bg-gradient-to-br from-primary/55 via-primary/20 to-border/45 p-[1px] shadow-[0_28px_80px_-44px_rgba(239,68,68,0.6)]">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="relative overflow-hidden rounded-[calc(1.75rem-1px)] border border-border/55 bg-card/85 p-6 backdrop-blur-xl md:p-8 lg:p-10"
                >
                  <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(239,68,68,0.12),transparent_52%)]" />

                  <div className="relative z-10">
                    <div className="mb-7">
                      <span className="inline-flex items-center gap-2 rounded-full border border-primary/35 bg-primary/10 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
                        <KeyRound className="h-3.5 w-3.5" />
                        {formPanelMeta.badge}
                      </span>
                      <h2 className="mt-4 text-2xl font-bold tracking-tight text-foreground md:text-[2rem]">
                        {formPanelMeta.title}
                      </h2>
                      <p className="mt-2 text-sm leading-relaxed text-muted-foreground md:text-base">
                        {formPanelMeta.description}
                      </p>
                    </div>

                    {!isEmployeeLoginFlow && isReset ? (
                      <form onSubmit={handleResetPassword} className="space-y-5" noValidate>
                        <div>
                          <label htmlFor="reset-email" className={fieldLabelClass}>Email</label>
                          <div className={inputShellClass}>
                            <Mail className={inputIconClass} />
                            <input
                              id="reset-email"
                              name="email"
                              type="email"
                              placeholder="you@company.com"
                              autoComplete="email"
                              className={inputWithIconClass}
                            />
                          </div>
                        </div>
                        <button type="submit" className={submitButtonClass} disabled={isLoading}>
                          {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ArrowRight className="mr-2 h-4 w-4" />}
                          Send Reset Link
                        </button>
                      </form>
                    ) : !isEmployeeLoginFlow && isSignUp ? (
                      <form onSubmit={handleSignUp} className="space-y-5" noValidate>
                        <div>
                          <label htmlFor="signup-fullname" className={fieldLabelClass}>Full Name</label>
                          <div className={inputShellClass}>
                            <UserCircle2 className={inputIconClass} />
                            <input
                              id="signup-fullname"
                              name="fullName"
                              type="text"
                              placeholder="Your name"
                              autoComplete="name"
                              className={inputWithIconClass}
                            />
                          </div>
                        </div>
                        <div>
                          <label htmlFor="signup-email" className={fieldLabelClass}>Email</label>
                          <div className={inputShellClass}>
                            <Mail className={inputIconClass} />
                            <input
                              id="signup-email"
                              name="email"
                              type="email"
                              placeholder="you@company.com"
                              autoComplete="email"
                              className={inputWithIconClass}
                            />
                          </div>
                        </div>
                        <div>
                          <label htmlFor="signup-password" className={fieldLabelClass}>Password</label>
                          <div className={inputShellClass}>
                            <KeyRound className={inputIconClass} />
                            <input
                              id="signup-password"
                              name="password"
                              type={showSignUpPassword ? "text" : "password"}
                              placeholder="********"
                              autoComplete="new-password"
                              className={passwordInputClass}
                            />
                            <button
                              type="button"
                              onClick={() => setShowSignUpPassword((prev) => !prev)}
                              className={passwordToggleClass}
                              aria-label={showSignUpPassword ? "Hide password" : "Show password"}
                              title={showSignUpPassword ? "Hide password" : "Show password"}
                            >
                              {showSignUpPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </button>
                          </div>
                        </div>
                        <button type="submit" className={submitButtonClass} disabled={isLoading}>
                          {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ArrowRight className="mr-2 h-4 w-4" />}
                          Create Account
                        </button>
                      </form>
                    ) : (
                      <form onSubmit={handleSignIn} className="space-y-5" noValidate>
                        <div>
                          <label htmlFor="signin-email" className={fieldLabelClass}>Email</label>
                          <div className={inputShellClass}>
                            <Mail className={inputIconClass} />
                            <input
                              id="signin-email"
                              name="email"
                              type="email"
                              placeholder="you@company.com"
                              defaultValue={prefillEmail}
                              autoComplete="email"
                              className={inputWithIconClass}
                            />
                          </div>
                        </div>
                        <div>
                          <label htmlFor="signin-password" className={fieldLabelClass}>Password</label>
                          <div className={inputShellClass}>
                            <KeyRound className={inputIconClass} />
                            <input
                              id="signin-password"
                              name="password"
                              type={showSignInPassword ? "text" : "password"}
                              placeholder="********"
                              autoComplete="current-password"
                              className={passwordInputClass}
                            />
                            <button
                              type="button"
                              onClick={() => setShowSignInPassword((prev) => !prev)}
                              className={passwordToggleClass}
                              aria-label={showSignInPassword ? "Hide password" : "Show password"}
                              title={showSignInPassword ? "Hide password" : "Show password"}
                            >
                              {showSignInPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </button>
                          </div>
                        </div>
                        {!isEmployeeLoginFlow && (
                          <div className="flex justify-end">
                            <button
                              type="button"
                              onClick={() => {
                                setAuthMode("reset");
                              }}
                              className="text-xs font-medium text-muted-foreground transition-colors hover:text-primary"
                            >
                              Forgot password?
                            </button>
                          </div>
                        )}
                        <button type="submit" className={submitButtonClass} disabled={isLoading}>
                          {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ArrowRight className="mr-2 h-4 w-4" />}
                          Sign In
                        </button>
                      </form>
                    )}

                    {!isEmployeeLoginFlow && !isReset && (
                      <div className="mt-6 space-y-4">
                        <div className="flex items-center gap-3">
                          <div className="h-px flex-1 bg-border/70" />
                          <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground/80">
                            Or continue with Google
                          </span>
                          <div className="h-px flex-1 bg-border/70" />
                        </div>
                        <div className="flex justify-center">
                          <div
                            ref={googleButtonRef}
                            className="w-full max-w-[320px] overflow-hidden rounded-full"
                          />
                        </div>
                        {isGoogleLoading && (
                          <p className="text-center text-xs font-medium text-muted-foreground">
                            Completing Google sign-in...
                          </p>
                        )}
                        {googleInitError && (
                          <p className="text-center text-xs font-medium text-destructive">
                            {googleInitError}
                          </p>
                        )}
                      </div>
                    )}

                    {!isEmployeeLoginFlow && (
                      <div className="mt-6 text-center">
                        {isReset ? (
                          <button
                            onClick={() => setAuthMode("signin")}
                            className="text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
                          >
                            Back to sign in
                          </button>
                        ) : (
                          <button
                            onClick={() => {
                              setAuthMode(isSignUp ? "signin" : "signup");
                            }}
                            className="text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
                          >
                            {isSignUp ? "Already have an account? Sign in" : "Don't have an account? Sign up"}
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </motion.div>
              </div>
            </div>
          </section>
        </main>

        <Footer />
      </PremiumBackground>
    </PageTransition>
  );
};

export default Auth;


