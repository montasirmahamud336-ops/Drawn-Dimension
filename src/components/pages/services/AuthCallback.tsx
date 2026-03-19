import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useAuth, clearPendingOAuthRedirectPath, getPendingOAuthRedirectPath } from "@/contexts/AuthContext";
import { getPreferredDashboardPath } from "@/components/shared/dashboardPath";

const AuthCallback = () => {
  const navigate = useNavigate();
  const { user, session, loading } = useAuth();

  useEffect(() => {
    if (loading) return;

    const targetPath = getPendingOAuthRedirectPath() || getPreferredDashboardPath();

    if (user || session?.user) {
      clearPendingOAuthRedirectPath();
      navigate(targetPath, { replace: true });
      return;
    }

    clearPendingOAuthRedirectPath();
    navigate("/auth", { replace: true });
  }, [loading, navigate, session?.user, user]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="flex flex-col items-center gap-3 text-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <div>
          <p className="text-base font-semibold text-foreground">Completing sign in</p>
          <p className="text-sm text-muted-foreground">Please wait while we finish your Google login.</p>
        </div>
      </div>
    </div>
  );
};

export default AuthCallback;
