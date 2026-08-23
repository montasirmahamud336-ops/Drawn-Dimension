import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import PageTransition from "@/components/shared/PageTransition";
import { getPdfToolsUrl } from "@/components/shared/pdfToolsUrl";
import { Button } from "@/components/ui/button";
import { ExternalLink, RefreshCw, FileText, Lock } from "lucide-react";

export const PDFToolsEmbed = () => {
  const { session } = useAuth();
  const location = useLocation();
  const { toast } = useToast();
  const [targetUrl, setTargetUrl] = useState<string>(() => getPdfToolsUrl(session?.access_token));

  useEffect(() => {
    try {
      const url = getPdfToolsUrl(session?.access_token);
      setTargetUrl(url);
    } catch (e) {
      console.error("PDF Tools URL resolution error:", e);
    }
  }, [session?.access_token]);

  return (
    <PageTransition>
      <div className="min-h-screen bg-background flex flex-col text-foreground">
        <Navigation />

        <main className="flex-1 pt-20 pb-12 px-2 sm:px-4 lg:px-6 max-w-[1700px] mx-auto w-full">
          {/* Header Banner */}
          <div className="mb-6 p-6 rounded-3xl bg-card border border-border shadow-md flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
                <img src="/pdf-forge-logo.png" alt="PDFForge Logo" className="w-9 h-9 object-contain drop-shadow-md" />
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[11px] font-bold uppercase tracking-wider">
                    ⚡ 100% Free Suite
                  </span>
                </div>
                <h1 className="text-2xl font-black text-foreground tracking-tight">PDFForge Tools Suite</h1>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Merge, split, compress, convert, and manage PDFs seamlessly
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                onClick={() => window.location.reload()}
                className="rounded-xl gap-2 text-xs"
              >
                <RefreshCw className="w-4 h-4" /> Reload Page
              </Button>
              <Button
                onClick={() => window.open(targetUrl, "_blank")}
                className="rounded-xl gap-2 text-xs font-bold bg-primary text-primary-foreground shadow-md"
              >
                <ExternalLink className="w-4 h-4" /> Open Full Screen
              </Button>
            </div>
          </div>

          {/* PDF Tools Frame Container */}
          <div className="w-full h-[780px] rounded-3xl overflow-hidden border border-border shadow-xl bg-card relative">
            <iframe
              src={targetUrl}
              title="PDFForge Tools Suite"
              className="w-full h-full border-0"
              allow="downloads; clipboard-read; clipboard-write"
            />
          </div>
        </main>

        <Footer />
      </div>
    </PageTransition>
  );
};

export default PDFToolsEmbed;
