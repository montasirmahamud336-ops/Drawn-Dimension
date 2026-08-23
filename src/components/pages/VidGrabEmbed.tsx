import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import PageTransition from "@/components/shared/PageTransition";
import { getVidGrabUrl } from "@/components/shared/vidgrabUrl";
import { Button } from "@/components/ui/button";
import { ExternalLink, RefreshCw, Video, Lock, ShieldCheck, Zap, DownloadCloud } from "lucide-react";

export const VidGrabEmbed = () => {
  const { session } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [targetUrl, setTargetUrl] = useState<string>(() => getVidGrabUrl(session?.access_token));

  useEffect(() => {
    try {
      const url = getVidGrabUrl(session?.access_token);
      setTargetUrl(url);
    } catch (e) {
      console.error("VidGrab URL resolution error:", e);
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
              <div className="w-14 h-14 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-500 shrink-0">
                <Video className="w-7 h-7" />
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 text-[11px] font-bold uppercase tracking-wider">
                    ⚡ 4K High-Speed Engine
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[11px] font-bold uppercase tracking-wider flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5" /> Direct Browser Stream
                  </span>
                </div>
                <h1 className="text-2xl font-black text-foreground tracking-tight">VidGrab Video Downloader</h1>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Download YouTube, Instagram Reels, TikTok, and Facebook videos directly in full resolution
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                onClick={() => window.location.reload()}
                className="rounded-xl gap-2 text-xs"
              >
                <RefreshCw className="w-4 h-4" /> Reload
              </Button>
              <Button
                onClick={() => window.open(targetUrl, "_blank")}
                className="rounded-xl gap-2 text-xs font-bold bg-amber-500 hover:bg-amber-600 text-black shadow-md"
              >
                <ExternalLink className="w-4 h-4" /> Open Full Screen
              </Button>
            </div>
          </div>

          {/* If user is not logged in, require Drawn Dimension authentication */}
          {!session ? (
            <div className="w-full min-h-[600px] rounded-3xl border border-border shadow-xl bg-card/60 backdrop-blur-xl flex flex-col items-center justify-center text-center p-8 relative overflow-hidden">
              <div className="w-20 h-20 rounded-3xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500 mb-6 shadow-inner">
                <Lock className="w-10 h-10" />
              </div>
              <h2 className="text-3xl font-black text-foreground tracking-tight mb-3">
                Member Account Required
              </h2>
              <p className="text-sm text-muted-foreground max-w-lg mb-8 leading-relaxed">
                To prevent server abuse and ensure ultra-fast 4K streaming speeds for everyone, VidGrab Downloader is exclusively accessible to registered Drawn Dimension members.
              </p>
              <div className="flex flex-col sm:flex-row items-center gap-4">
                <Button
                  onClick={() => navigate("/auth?redirect=/vidgrab")}
                  className="rounded-2xl px-8 py-6 text-sm font-bold bg-amber-500 hover:bg-amber-600 text-black shadow-lg shadow-amber-500/20 gap-2.5"
                >
                  <Zap className="w-4 h-4" /> Sign In to Access Downloader
                </Button>
                <Button
                  variant="outline"
                  onClick={() => navigate("/auth?mode=signup&redirect=/vidgrab")}
                  className="rounded-2xl px-8 py-6 text-sm font-medium border-border hover:bg-accent gap-2"
                >
                  Create Free Account
                </Button>
              </div>
            </div>
          ) : (
            /* Authenticated: Render High Speed Downloader Frame */
            <div className="w-full h-[850px] rounded-3xl overflow-hidden border border-border shadow-xl bg-card relative">
              <iframe
                src={targetUrl}
                title="VidGrab Video Downloader"
                className="w-full h-full border-0"
                allow="downloads; clipboard-read; clipboard-write; fullscreen"
              />
            </div>
          )}
        </main>

        <Footer />
      </div>
    </PageTransition>
  );
};

export default VidGrabEmbed;
