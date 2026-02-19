import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowRight, Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import PageTransition from "@/components/shared/PageTransition";
import PageHero from "@/components/shared/PageHero";
import PremiumBackground from "@/components/shared/PremiumBackground";

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
  const { signIn, signUp, resetPassword, signInWithProvider } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const signInForm = useForm<SignInFormData>({
    resolver: zodResolver(signInSchema),
    defaultValues: { email: "", password: "" },
  });

  const signUpForm = useForm<SignUpFormData>({
    resolver: zodResolver(signUpSchema),
    defaultValues: { email: "", password: "", fullName: "" },
  });

  const resetForm = useForm<ResetFormData>({
    resolver: zodResolver(resetSchema),
    defaultValues: { email: "" },
  });

  const inputClass =
    "mt-2 w-full rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 h-12";

  const heroContent = isReset
    ? {
      title: "Reset Password",
      subtitle: "Account Recovery",
      description: "We'll send you a reset link to your email.",
    }
    : isSignUp
      ? {
        title: "Create Your Account",
        subtitle: "Client Access",
        description: "Register to access secure messaging, AI assistance, and project updates.",
      }
      : {
        title: "Welcome Back",
        subtitle: "Secure Login",
        description: "Sign in to access your chat history, AI assistant, and project messages.",
      };

  const handleSignIn = async (data: SignInFormData) => {
    setIsLoading(true);
    const { error } = await signIn(data.email, data.password);
    setIsLoading(false);

    if (error) {
      toast({
        title: "Sign in failed",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({ title: "Welcome back!" });
      navigate("/");
    }
  };

  const handleSignUp = async (data: SignUpFormData) => {
    setIsLoading(true);
    const { error } = await signUp(data.email, data.password, data.fullName);
    setIsLoading(false);

    if (error) {
      toast({
        title: "Sign up failed",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Account created!",
        description: "Please check your email to verify your account.",
      });
      setIsSignUp(false);
    }
  };

  const handleOAuth = async (provider: "google" | "github" | "azure" | "apple", label: string) => {
    setOauthLoading(provider);
    const { error } = await signInWithProvider(provider);
    if (error) {
      setOauthLoading(null);
      toast({
        title: `${label} failed`,
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleResetPassword = async (data: ResetFormData) => {
    setIsLoading(true);
    const { error } = await resetPassword(data.email);
    setIsLoading(false);

    if (error) {
      toast({
        title: "Password reset failed",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Check your email",
        description: "We sent you a password reset link.",
      });
      setIsReset(false);
    }
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
                {isReset ? (
                  <Form {...resetForm}>
                    <form onSubmit={resetForm.handleSubmit(handleResetPassword)} className="space-y-6">
                      <FormField
                        control={resetForm.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Email</FormLabel>
                            <FormControl>
                              <Input {...field} type="email" placeholder="you@company.com" className={inputClass} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <button type="submit" className="btn-primary w-full" disabled={isLoading}>
                        {isLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <ArrowRight className="w-4 h-4 mr-2" />}
                        Send Reset Link
                      </button>
                    </form>
                  </Form>
                ) : isSignUp ? (
                  <Form {...signUpForm}>
                    <form onSubmit={signUpForm.handleSubmit(handleSignUp)} className="space-y-6">
                      <FormField
                        control={signUpForm.control}
                        name="fullName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Full Name</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="Your name" className={inputClass} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={signUpForm.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Email</FormLabel>
                            <FormControl>
                              <Input {...field} type="email" placeholder="you@company.com" className={inputClass} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={signUpForm.control}
                        name="password"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Password</FormLabel>
                            <FormControl>
                              <Input {...field} type="password" placeholder="********" className={inputClass} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <button type="submit" className="btn-primary w-full" disabled={isLoading}>
                        {isLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <ArrowRight className="w-4 h-4 mr-2" />}
                        Create Account
                      </button>
                    </form>
                  </Form>
                ) : (
                  <Form {...signInForm}>
                    <form onSubmit={signInForm.handleSubmit(handleSignIn)} className="space-y-6">
                      <FormField
                        control={signInForm.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Email</FormLabel>
                            <FormControl>
                              <Input {...field} type="email" placeholder="you@company.com" className={inputClass} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={signInForm.control}
                        name="password"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Password</FormLabel>
                            <FormControl>
                              <Input {...field} type="password" placeholder="********" className={inputClass} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
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
                      <button type="submit" className="btn-primary w-full" disabled={isLoading}>
                        {isLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <ArrowRight className="w-4 h-4 mr-2" />}
                        Sign In
                      </button>
                    </form>
                  </Form>
                )}

                {!isReset && (
                  <>
                    <div className="my-8 flex items-center gap-4">
                      <div className="h-px flex-1 bg-border" />
                      <span className="text-xs text-muted-foreground">or continue with</span>
                      <div className="h-px flex-1 bg-border" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <button
                        type="button"
                        onClick={() => handleOAuth("google", "Google sign in")}
                        className="btn-outline w-full text-sm disabled:opacity-60 disabled:cursor-not-allowed"
                        disabled={!!oauthLoading}
                      >
                        {oauthLoading === "google" ? "Connecting..." : "Continue with Google"}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleOAuth("github", "GitHub sign in")}
                        className="btn-outline w-full text-sm disabled:opacity-60 disabled:cursor-not-allowed"
                        disabled={!!oauthLoading}
                      >
                        {oauthLoading === "github" ? "Connecting..." : "Continue with GitHub"}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleOAuth("azure", "Microsoft sign in")}
                        className="btn-outline w-full text-sm disabled:opacity-60 disabled:cursor-not-allowed"
                        disabled={!!oauthLoading}
                      >
                        {oauthLoading === "azure" ? "Connecting..." : "Continue with Microsoft"}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleOAuth("apple", "Apple sign in")}
                        className="btn-outline w-full text-sm disabled:opacity-60 disabled:cursor-not-allowed"
                        disabled={!!oauthLoading}
                      >
                        {oauthLoading === "apple" ? "Connecting..." : "Continue with Apple ID"}
                      </button>
                    </div>
                  </>
                )}

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
                        setIsSignUp(!isSignUp);
                        setIsReset(false);
                      }}
                      className="text-sm text-muted-foreground hover:text-primary transition-colors"
                    >
                      {isSignUp ? "Already have an account? Sign in" : "Don't have an account? Sign up"}
                    </button>
                  )}
                </div>
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

