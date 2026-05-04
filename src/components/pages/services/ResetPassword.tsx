import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Lock, ArrowRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PasswordInput } from "@/components/ui/password-input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import PageTransition from "@/components/shared/PageTransition";
import PremiumBackground from "@/components/shared/PremiumBackground";
import { getApiBaseUrl } from "@/components/admin/adminAuth";

const resetSchema = z.object({
  password: z.string().min(6, "Password must be at least 6 characters"),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type ResetFormData = z.infer<typeof resetSchema>;

const ResetPassword = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [resetToken, setResetToken] = useState("");
  const { toast } = useToast();
  const navigate = useNavigate();

  const resetForm = useForm<ResetFormData>({
    resolver: zodResolver(resetSchema),
    defaultValues: { password: "", confirmPassword: "" },
  });

  useEffect(() => {
    const initResetToken = async () => {
      const params = new URLSearchParams(window.location.search);
      const token = params.get("token")?.trim() ?? "";
      setResetToken(token);
      setIsReady(true);
    };
    void initResetToken();
  }, []);

  const handleReset = async (data: ResetFormData) => {
    setIsLoading(true);
    try {
      const response = await fetch(`${getApiBaseUrl()}/auth/user-password-reset`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          token: resetToken,
          password: data.password,
        }),
      });

      if (!response.ok) {
        const contentType = response.headers.get("content-type") || "";
        let message = "Password update failed";

        if (contentType.includes("application/json")) {
          const body = await response.json().catch(() => null);
          message = body?.message || body?.detail || body?.error || message;
        } else {
          const text = await response.text().catch(() => "");
          if (text) {
            message = text;
          }
        }

        throw new Error(message);
      }

      toast({ title: "Password updated" });
      navigate("/auth");
    } catch (error: unknown) {
      toast({
        title: "Password update failed",
        description: error instanceof Error ? error.message : "Password update failed",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <PageTransition>
      <PremiumBackground>
        <Navigation />

        <main className="pt-32 pb-20 px-4">
          <div className="container-narrow max-w-md mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass-card p-8"
            >
              <div className="text-center mb-8">
                <h1 className="text-3xl font-bold text-foreground mb-2">Set New Password</h1>
                <p className="text-muted-foreground">Enter a new password for your account</p>
              </div>

              {!isReady ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                </div>
              ) : !resetToken ? (
                <div className="text-center space-y-4">
                  <p className="text-sm text-muted-foreground">
                    This link is invalid or expired. Please request a new reset link.
                  </p>
                  <Button onClick={() => navigate("/auth")} className="w-full">
                    Back to Sign In
                  </Button>
                </div>
              ) : (
                <Form {...resetForm}>
                  <form onSubmit={resetForm.handleSubmit(handleReset)} className="space-y-4">
                    <FormField
                      control={resetForm.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>New Password</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                              <PasswordInput {...field} placeholder="********" className="pl-10" />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={resetForm.control}
                      name="confirmPassword"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Confirm Password</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                              <PasswordInput {...field} placeholder="********" className="pl-10" />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Button type="submit" className="w-full" disabled={isLoading}>
                      {isLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <ArrowRight className="w-4 h-4 mr-2" />}
                      Update Password
                    </Button>
                  </form>
                </Form>
              )}
            </motion.div>
          </div>
        </main>

        <Footer />
      </PremiumBackground>
    </PageTransition>
  );
};

export default ResetPassword;
