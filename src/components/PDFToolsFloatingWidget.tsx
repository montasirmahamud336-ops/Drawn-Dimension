import { useLocation } from "react-router-dom";
import { Wrench } from "lucide-react";

export const PDFToolsFloatingWidget = () => {
  const location = useLocation();
  const path = location.pathname.toLowerCase();

  // Show ONLY when user is inside Dashboard pages
  const isDashboardPage =
    path === "/dashboard" ||
    path.startsWith("/dashboard/") ||
    path === "/employee-dashboard" ||
    path.startsWith("/employee-dashboard/") ||
    path === "/me/dashboard";

  if (!isDashboardPage) {
    return null;
  }

  return (
    <div className="fixed bottom-24 right-6 z-50">
      <button
        onClick={() => window.open("http://localhost:8001/", "_blank")}
        className="relative w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-glow-lg flex items-center justify-center hover:scale-105 transition-transform cursor-pointer"
        aria-label="Open PDF Tools Suite"
        type="button"
      >
        <div className="absolute -top-1 -right-1 px-2 py-0.5 rounded-full bg-card border border-border text-foreground text-[10px] font-bold uppercase tracking-wider shadow-sm">
          Tools
        </div>
        <Wrench className="w-6 h-6" />
      </button>
    </div>
  );
};

export default PDFToolsFloatingWidget;
