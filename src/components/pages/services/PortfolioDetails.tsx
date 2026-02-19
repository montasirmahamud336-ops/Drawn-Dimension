import { useMemo, useRef, useState, type TouchEvent } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import PageTransition from "@/components/shared/PageTransition";
import PremiumBackground from "@/components/shared/PremiumBackground";
import { useLiveData } from "@/hooks/useLiveData";
import { Button } from "@/components/ui/button";
import { Loader2, ChevronLeft, ChevronRight } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";

type MediaItem = {
  url: string;
  type: "image" | "video";
};

const detectMediaType = (value: string) => {
  const v = value.toLowerCase();
  if (v.includes(".mp4") || v.includes(".mov") || v.includes(".webm")) return "video";
  return "image";
};

const getMediaList = (item: any): MediaItem[] => {
  if (Array.isArray(item?.media) && item.media.length > 0) {
    return item.media
      .filter((m: any) => typeof m?.url === "string" && m.url.length > 0)
      .map((m: any) => ({ url: m.url, type: m.type === "video" ? "video" : "image" }));
  }
  if (item?.image_url) {
    return [{ url: item.image_url, type: detectMediaType(item.image_url) }];
  }
  return [{ url: "https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=1200&h=700&fit=crop", type: "image" }];
};

const normalizeCategory = (raw?: string | null) => {
  if (!raw) return "Uncategorized";
  const value = raw.toLowerCase();
  if (["web design", "web design & development", "web development"].some((v) => value.includes(v))) return "Web Design";
  if (["autocad", "solidworks", "3d", "cad"].some((v) => value.includes(v))) return "CAD & 3D";
  if (["pfd", "p&id", "hazop", "engineering"].some((v) => value.includes(v))) return "Engineering";
  if (["branding", "graphic design"].some((v) => value.includes(v))) return "Branding";
  return raw;
};

const asDisplayValue = (value: unknown) => {
  if (value === null || value === undefined) return "Not Available";
  const text = String(value).trim();
  return text.length > 0 ? text : "Not Available";
};

const PortfolioDetails = () => {
  const { id } = useParams();
  const { data: projects, loading } = useLiveData("projects");
  const [mediaIndex, setMediaIndex] = useState(0);
  const [direction, setDirection] = useState<1 | -1>(1);
  const touchStartXRef = useRef<number | null>(null);
  const navigate = useNavigate();

  const project = useMemo(
    () => projects.find((item: any) => String(item.id) === String(id)),
    [projects, id]
  );

  const media = project ? getMediaList(project) : [];
  const currentMedia = media[mediaIndex];
  const hasManyMedia = media.length > 1;
  const category = normalizeCategory(project?.category);
  const createdBy = asDisplayValue(project?.creator);
  const clientName = asDisplayValue(project?.client_name ?? project?.client);
  const projectCost = asDisplayValue(project?.project_cost);
  const projectDuration = asDisplayValue(project?.project_duration);

  const showPrevMedia = () => {
    if (!hasManyMedia) return;
    setDirection(-1);
    setMediaIndex((i) => (i - 1 + media.length) % media.length);
  };

  const showNextMedia = () => {
    if (!hasManyMedia) return;
    setDirection(1);
    setMediaIndex((i) => (i + 1) % media.length);
  };

  const handleTouchStart = (e: TouchEvent<HTMLDivElement>) => {
    touchStartXRef.current = e.changedTouches[0]?.clientX ?? null;
  };

  const handleTouchEnd = (e: TouchEvent<HTMLDivElement>) => {
    if (!hasManyMedia || touchStartXRef.current === null) return;
    const endX = e.changedTouches[0]?.clientX ?? touchStartXRef.current;
    const delta = endX - touchStartXRef.current;
    touchStartXRef.current = null;
    if (Math.abs(delta) < 40) return;
    if (delta > 0) {
      showPrevMedia();
      return;
    }
    showNextMedia();
  };

  return (
    <PageTransition>
      <PremiumBackground>
        <Navigation />
        <main className="pt-32 pb-20">
          <section className="section-padding">
            <div className="container-narrow">
              {loading ? (
                <div className="flex justify-center items-center py-20">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
              ) : !project ? (
                <div className="glass-card p-8 text-center">
                  <h1 className="text-2xl font-bold mb-4">Work not found</h1>
                  <Button onClick={() => navigate("/portfolio")}>Back to Portfolio</Button>
                </div>
              ) : (
                <div className="glass-card overflow-hidden border-border/60 shadow-[0_22px_52px_rgba(0,0,0,0.35)]">
                  <div
                    className="relative overflow-hidden aspect-video border-b border-border/60 bg-black/25"
                    onTouchStart={handleTouchStart}
                    onTouchEnd={handleTouchEnd}
                  >
                    <AnimatePresence initial={false} mode="wait" custom={direction}>
                      <motion.div
                        key={`${currentMedia?.url || "media"}-${mediaIndex}`}
                        custom={direction}
                        initial={{ opacity: 0, x: direction > 0 ? 28 : -28 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: direction > 0 ? -28 : 28 }}
                        transition={{ duration: 0.25, ease: "easeOut" }}
                        className="absolute inset-0"
                      >
                        {currentMedia?.type === "video" ? (
                          <video src={currentMedia.url} className="w-full h-full object-cover" controls autoPlay muted loop playsInline />
                        ) : (
                          <img src={currentMedia?.url} alt={project.title} className="w-full h-full object-cover" />
                        )}
                      </motion.div>
                    </AnimatePresence>
                    <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
                    {hasManyMedia && (
                      <>
                        <button
                          type="button"
                          onClick={showPrevMedia}
                          className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/60 text-white flex items-center justify-center transition-all duration-200 hover:bg-black/75 hover:scale-105"
                        >
                          <ChevronLeft className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={showNextMedia}
                          className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/60 text-white flex items-center justify-center transition-all duration-200 hover:bg-black/75 hover:scale-105"
                        >
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      </>
                    )}
                  </div>
                  {hasManyMedia && (
                    <div className="flex gap-3 overflow-x-auto px-5 py-4 border-b border-border/60 bg-background/20">
                      {media.map((item, index) => (
                        <button
                          key={`${item.url}-${index}`}
                          type="button"
                          onClick={() => {
                            setDirection(index >= mediaIndex ? 1 : -1);
                            setMediaIndex(index);
                          }}
                          className={`relative shrink-0 w-24 h-16 rounded-lg overflow-hidden border transition-all duration-300 ${index === mediaIndex
                            ? "border-primary ring-2 ring-primary/70 shadow-[0_10px_24px_rgba(239,68,68,0.25)]"
                            : "border-border/60 hover:border-primary/45 hover:-translate-y-0.5"
                            }`}
                        >
                          {item.type === "video" ? (
                            <video src={item.url} className="w-full h-full object-cover" muted playsInline />
                          ) : (
                            <img src={item.url} alt={`${project.title} thumbnail ${index + 1}`} className="w-full h-full object-cover" />
                          )}
                        </button>
                      ))}
                    </div>
                  )}

                  <div className="p-6 sm:p-8 space-y-6">
                    <div className="space-y-4">
                      <span className="inline-flex items-center rounded-full border border-border/70 bg-background/35 px-3 py-1 text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
                        {category}
                      </span>
                      <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground">{project.title}</h1>
                      <p className="text-base leading-7 text-muted-foreground">{project.description || "No details available."}</p>
                    </div>

                    <div className="rounded-xl border border-border/60 bg-background/30 divide-y divide-border/60">
                      <div className="flex items-start justify-between gap-4 px-4 py-3">
                        <span className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Created By</span>
                        <span className="text-sm font-medium text-foreground text-right">{createdBy}</span>
                      </div>
                      <div className="flex items-start justify-between gap-4 px-4 py-3">
                        <span className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Client</span>
                        <span className="text-sm font-medium text-foreground text-right">{clientName}</span>
                      </div>
                      <div className="flex items-start justify-between gap-4 px-4 py-3">
                        <span className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Project Cost</span>
                        <span className="text-sm font-medium text-foreground text-right">{projectCost}</span>
                      </div>
                      <div className="flex items-start justify-between gap-4 px-4 py-3">
                        <span className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Project Duration</span>
                        <span className="text-sm font-medium text-foreground text-right">{projectDuration}</span>
                      </div>
                    </div>

                    <div className="flex justify-end border-t border-border/60 pt-6">
                      <Button onClick={() => navigate("/contact")}>Contact Us</Button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </section>
        </main>
        <Footer />
      </PremiumBackground>
    </PageTransition>
  );
};

export default PortfolioDetails;
