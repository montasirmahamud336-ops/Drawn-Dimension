import { Link, useLocation } from "react-router-dom";
import { useEffect } from "react";
import PageTransition from "@/components/shared/PageTransition";
import PremiumBackground from "@/components/shared/PremiumBackground";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <PageTransition>
      <PremiumBackground className="flex items-center justify-center">
        <div className="container-narrow relative z-10 py-20">
          <div className="glass-card border-border/60 bg-[linear-gradient(155deg,rgba(255,255,255,0.05),rgba(255,255,255,0.01)_44%,rgba(239,68,68,0.08)_100%)] p-10 md:p-14 text-center max-w-2xl mx-auto shadow-[0_18px_48px_-28px_rgba(15,23,42,0.6)]">
            <p className="text-xs uppercase tracking-[0.22em] text-primary mb-4">Error Page</p>
            <h1 className="mb-3 text-5xl md:text-6xl font-bold text-foreground">404</h1>
            <p className="mb-7 text-lg md:text-xl text-muted-foreground">Oops! Page not found</p>
            <Link
              to="/"
              className="inline-flex items-center rounded-full border border-primary/45 bg-primary/10 px-6 py-2.5 text-sm font-semibold uppercase tracking-[0.12em] text-primary transition-all duration-300 hover:bg-primary hover:text-primary-foreground"
            >
              Return to Home
            </Link>
          </div>
        </div>
      </PremiumBackground>
    </PageTransition>
  );
};

export default NotFound;
