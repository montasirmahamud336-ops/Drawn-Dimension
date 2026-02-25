import { FormEvent, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { z } from "zod";
import { ArrowRight, Loader2 } from "lucide-react";
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
  const [oauthLoading, setOauthLoading] = useState<null | "google" | "github" | "azure" | "apple">(null);
  const [searchParams] = useSearchParams();

  const { signIn, signUp, resetPassword, resendSignupConfirmation, signInWithProvider } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const prefillEmail = searchParams.get("email") ?? "";
  const nextParam = searchParams.get("next") ?? "";
  const isEmployeeLoginFlow = nextParam.startsWith("/employee/dashboard");

  const inputClass =
    "mt-2 w-full rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 h-12";

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
    const safeNext = nextParam.startsWith("/") ? nextParam : "";
    toast({ title: isEmployeeLoginFlow ? "Welcome employee!" : "Welcome back!" });
    navigate(safeNext || (isEmployee ? "/employee/dashboard" : "/"));
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
    setIsSignUp(false);
  };

  const handleOAuth = async (provider: "google" | "github" | "azure" | "apple", label: string) => {
    setOauthLoading(provider);
    const { error } = await signInWithProvider(provider);

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
    setIsReset(false);
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

          <section className="section-padding">
            <div className="container-narrow max-w-2xl">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass-card p-8"
              >
                {!isEmployeeLoginFlow && isReset ? (
                  <form onSubmit={handleResetPassword} className="space-y-6" noValidate>
                    <div>
                      <label htmlFor="reset-email" className="text-sm font-medium text-foreground">Email</label>
                      <input
                        id="reset-email"
                        name="email"
                        type="email"
                        placeholder="you@company.com"
                        autoComplete="email"
                        className={inputClass}
                      />
                    </div>
                    <button type="submit" className="btn-primary w-full" disabled={isLoading}>
                      {isLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <ArrowRight className="w-4 h-4 mr-2" />}
                      Send Reset Link
                    </button>
                  </form>
                ) : !isEmployeeLoginFlow && isSignUp ? (
                  <form onSubmit={handleSignUp} className="space-y-6" noValidate>
                    <div>
                      <label htmlFor="signup-fullname" className="text-sm font-medium text-foreground">Full Name</label>
                      <input
                        id="signup-fullname"
                        name="fullName"
                        type="text"
                        placeholder="Your name"
                        autoComplete="name"
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <label htmlFor="signup-email" className="text-sm font-medium text-foreground">Email</label>
                      <input
                        id="signup-email"
                        name="email"
                        type="email"
                        placeholder="you@company.com"
                        autoComplete="email"
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <label htmlFor="signup-password" className="text-sm font-medium text-foreground">Password</label>
                      <input
                        id="signup-password"
                        name="password"
                        type="password"
                        placeholder="********"
                        autoComplete="new-password"
                        className={inputClass}
                      />
                    </div>
                    <button type="submit" className="btn-primary w-full" disabled={isLoading}>
                      {isLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <ArrowRight className="w-4 h-4 mr-2" />}
                      Create Account
                    </button>
                  </form>
                ) : (
                  <form onSubmit={handleSignIn} className="space-y-6" noValidate>
                    <div>
                      <label htmlFor="signin-email" className="text-sm font-medium text-foreground">Email</label>
                      <input
                        id="signin-email"
                        name="email"
                        type="email"
                        placeholder="you@company.com"
                        defaultValue={prefillEmail}
                        autoComplete="email"
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <label htmlFor="signin-password" className="text-sm font-medium text-foreground">Password</label>
                      <input
                        id="signin-password"
                        name="password"
                        type="password"
                        placeholder="********"
                        autoComplete="current-password"
                        className={inputClass}
                      />
                    </div>
                    {!isEmployeeLoginFlow && (
                      <div className="flex justify-end">
                        <button
                          type="button"
                          onClick={() => {
                            setIsReset(true);
                            setIsSignUp(false);
                          }}
                          className="text-xs text-muted-foreground hover:text-primary transition-colors"
                        >
                          Forgot password?
                        </button>
                      </div>
                    )}
                    <button type="submit" className="btn-primary w-full" disabled={isLoading}>
                      {isLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <ArrowRight className="w-4 h-4 mr-2" />}
                      Sign In
                    </button>
                  </form>
                )}

                {!isReset && !isEmployeeLoginFlow && (
                  <>
                    <div className="my-8 flex items-center gap-4">
                      <div className="h-px flex-1 bg-border" />
                      <span className="text-xs text-muted-foreground">or continue with</span>
                      <div className="h-px flex-1 bg-border" />
                    </div>
                    <div className="grid grid-cols-1 gap-4">
                      <button
                        type="button"
                        onClick={() => handleOAuth("google", "Google sign in")}
                        className="btn-outline w-full text-sm disabled:opacity-60 disabled:cursor-not-allowed"
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
                        onClick={() => setIsReset(false)}
                        className="text-sm text-muted-foreground hover:text-primary transition-colors"
                      >
                        Back to sign in
                      </button>
                    ) : (
                      <button
                        onClick={() => {
                          setIsSignUp((prev) => !prev);
                          setIsReset(false);
                        }}
                        className="text-sm text-muted-foreground hover:text-primary transition-colors"
                      >
                        {isSignUp ? "Already have an account? Sign in" : "Don't have an account? Sign up"}
                      </button>
                    )}
                  </div>
                )}
              </motion.div>
            </div>
          </section>
        </main>

        <Footer />
      </PremiumBackground>
    </PageTransition>
  );
};

export default Auth;
