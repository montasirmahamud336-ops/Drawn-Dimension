import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Cookie, ShieldCheck, X } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

const CONSENT_KEY = "dd_cookie_consent_choice";

export default function CookieConsent() {
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    const consentChoice = localStorage.getItem(CONSENT_KEY);
    if (!consentChoice) {
      // Small delay so it appears smoothly after page load
      const timer = setTimeout(() => {
        setShowBanner(true);
        window.dispatchEvent(new CustomEvent("cookie-banner-visibility", { detail: { open: true } }));
      }, 1200);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleAcceptAll = () => {
    localStorage.setItem(CONSENT_KEY, "accepted_all");
    setShowBanner(false);
    window.dispatchEvent(new CustomEvent("cookie-banner-visibility", { detail: { open: false } }));
  };

  const handleAcceptEssential = () => {
    localStorage.setItem(CONSENT_KEY, "essential_only");
    setShowBanner(false);
    window.dispatchEvent(new CustomEvent("cookie-banner-visibility", { detail: { open: false } }));
  };

  if (!showBanner) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 50, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 50, scale: 0.95 }}
        transition={{ duration: 0.35, ease: "easeOut" }}
        className="fixed bottom-4 right-4 left-4 sm:left-auto sm:max-w-md z-[99] bg-card/95 backdrop-blur-md border-[2.5px] border-border/70 dark:border-border rounded-2xl p-4 sm:p-5 shadow-2xl overflow-hidden"
      >
        {/* Subtle accent glow */}
        <div className="absolute -top-12 -right-12 w-28 h-28 bg-primary/15 rounded-full blur-2xl pointer-events-none" />

        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-primary/15 flex items-center justify-center text-primary flex-shrink-0">
              <Cookie className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-foreground tracking-tight flex items-center gap-1.5">
                We Value Your Privacy
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
              </h4>
              <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">
                Cookie & Data Usage
              </p>
            </div>
          </div>
          <button
            onClick={handleAcceptEssential}
            className="text-muted-foreground hover:text-foreground p-1 rounded-lg hover:bg-muted/80 transition-colors"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="text-xs text-muted-foreground leading-relaxed mb-4">
          We use cookies and essential tokens to secure your login, remember preferences, and optimize your experience. Read our{" "}
          <Link to="/privacy-policy" className="text-primary font-semibold hover:underline">
            Privacy Policy
          </Link>{" "}
          for more details.
        </p>

        <div className="flex flex-col sm:flex-row items-center gap-2">
          <Button
            size="sm"
            onClick={handleAcceptAll}
            className="w-full sm:flex-1 rounded-lg text-xs h-9 font-semibold bg-primary hover:bg-primary/90 text-primary-foreground transition-all duration-200 ease-out hover:shadow-[0_0_8px_rgba(220,38,38,0.4),0_0_20px_rgba(220,38,38,0.2)] active:scale-[0.97]"
          >
            Accept All Cookies
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={handleAcceptEssential}
            className="w-full sm:w-auto rounded-lg text-xs h-9 font-medium"
          >
            Essential Only
          </Button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
