import { FormEvent, useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { z } from "zod";
import { ArrowRight, Eye, EyeOff, KeyRound, Loader2, Mail, ShieldCheck, UserCircle2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import PageTransition from "@/components/shared/PageTransition";
import PageHero from "@/components/shared/PageHero";
import PremiumBackground from "@/components/shared/PremiumBackground";
import { getApiBaseUrl } from "@/components/admin/adminAuth";

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

const Auth = () => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [isReset, setIsReset] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showSignUpPassword, setShowSignUpPassword] = useState(false);
  const [showSignInPassword, setShowSignInPassword] = useState(false);
  const [oauthLoading, setOauthLoading] = useState<null | "google" | "github" | "azure" | "apple">(null);
  const [searchParams, setSearchParams] = useSearchParams();

  const { signIn, signUp, resetPassword, resendSignupConfirmation, signInWithProvider } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const prefillEmail = searchParams.get("email") ?? "";
  const nextParam = searchParams.get("next") ?? "";
  const modeParam = (searchParams.get("mode") ?? "").toLowerCase();
  const isEmployeeLoginFlow = nextParam.startsWith("/employee/dashboard");
  const oauthRedirectPath = isEmployeeLoginFlow ? "/employee/dashboard" : "/dashboard";

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
      const isEmailNotConfirmed = normalizedMessage.includes("email not confirmed");
      const isInvalidCredentials =
        normalizedMessage.includes("invalid login credentials") ||
        normalizedMessage.includes("invalid credentials");

      if (isEmailNotConfirmed) {
        const { error: resendError } = await resendSignupConfirmation(parsed.data.email);

        toast({
          title: "Email not confirmed",
          description: resendError
            ? getAuthErrorMessage(resendError.message, "resend")
            : "Your email is not confirmed yet, so we have sent a new verification link to your email.",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Sign in failed",
        description: isInvalidCredentials
          ? "No account was found for this email, so please sign up first or check your password and try again."
          : getAuthErrorMessage(error.message, "signin"),
        variant: "destructive",
      });
      return;
    }

    const isEmployee = await hasEmployeeDashboardAccess(session?.access_token);
    const postLoginPath = resolvePostLoginPath(isEmployee);
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
      description: "Please check your email to verify your account.",
    });
    form.reset();
    setAuthMode("signin");
  };

  const handleOAuth = async (provider: "google" | "github" | "azure" | "apple", label: string) => {
    setOauthLoading(provider);
    const { error } = await signInWithProvider(provider, oauthRedirectPath);

    if (error) {
      setOauthLoading(null);
      toast({
        title: `${label} failed`,
        description: getAuthErrorMessage(error.message, "oauth"),
        variant: "destructive",
      });
    }
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
                        <ShieldCheck className="h-3.5 w-3.5" />
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

                    {!isReset && !isEmployeeLoginFlow && (
                      <>
                        <div className="my-7 flex items-center gap-3.5">
                          <div className="h-px flex-1 bg-gradient-to-r from-transparent via-border to-border/20" />
                          <span className="text-xs uppercase tracking-[0.14em] text-muted-foreground">or continue with</span>
                          <div className="h-px flex-1 bg-gradient-to-l from-transparent via-border to-border/20" />
                        </div>
                        <div className="grid grid-cols-1 gap-4">
                          <button
                            type="button"
                            onClick={() => handleOAuth("google", "Google sign in")}
                            className="inline-flex h-12 w-full items-center justify-center rounded-xl border border-border/80 bg-background/65 px-5 text-sm font-semibold text-foreground transition-all duration-300 hover:border-primary/45 hover:bg-secondary/55 disabled:cursor-not-allowed disabled:opacity-60"
                            disabled={!!oauthLoading}
                          >
                            {oauthLoading === "google" ? (
                              "Connecting..."
                            ) : (
                              <span className="inline-flex items-center gap-2">
                                <svg viewBox="0 0 533.5 544.3" aria-hidden="true" className="h-5 w-5 shrink-0">
                                  <path
                                    fill="#4285F4"
                                    d="M533.5 278.4c0-18.5-1.5-37.1-4.7-55.2H272v104.5h147.1c-6.1 33.3-25 62.7-53.3 82.4v68h86.1c50.5-46.5 81.6-115 81.6-199.7z"
                                  />
                                  <path
                                    fill="#34A853"
                                    d="M272 544.3c73.7 0 135.7-24.4 181-66.1l-86.1-68c-24 16.3-54.9 25.7-94.9 25.7-72.9 0-134.6-49.2-156.7-115.5H26.5v70.1c46.4 92.4 141 153.8 245.5 153.8z"
                                  />
                                  <path
                                    fill="#FBBC04"
                                    d="M115.3 320.4c-11.4-33.3-11.4-69.5 0-102.8V147.5H26.5c-38.8 77.4-38.8 169 0 246.4l88.8-70.1z"
                                  />
                                  <path
                                    fill="#EA4335"
                                    d="M272 107.7c42.2-.7 82.7 15.2 113.2 44.1l84.4-84.4C405.3 24.3 340.8-.6 272 0 167.5 0 72.9 61.4 26.5 153.8l88.8 70.1C137.3 156.8 199.1 107.7 272 107.7z"
                                  />
                                </svg>
                                Continue with Google
                              </span>
                            )}
                          </button>
                        </div>
                      </>
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


