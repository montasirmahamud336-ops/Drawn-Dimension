import { useCallback, useEffect, useMemo, useRef, useState, type TouchEvent, type WheelEvent } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { createPortal } from "react-dom";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import PageTransition from "@/components/shared/PageTransition";
import PremiumBackground from "@/components/shared/PremiumBackground";
import { useLiveData } from "@/hooks/useLiveData";
import { Button } from "@/components/ui/button";
import {
  Loader2,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  X,
  UserRound,
  Building2,
  BadgeDollarSign,
  Timer,
} from "lucide-react";
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

const isFallbackValue = (value: string) => value === "Not Available";

const PortfolioDetails = () => {
  const { id } = useParams();
  const { data: projects, loading } = useLiveData("projects");
  const [mediaIndex, setMediaIndex] = useState(0);
  const [direction, setDirection] = useState<1 | -1>(1);
  const [isViewerOpen, setIsViewerOpen] = useState(false);
  const touchStartXRef = useRef<number | null>(null);
  const viewerTouchStartXRef = useRef<number | null>(null);
  const isWheelClosingRef = useRef(false);
  const pendingWheelDeltaRef = useRef(0);
  const reopenBlockUntilRef = useRef(0);
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
  const detailCards = useMemo(
    () => [
      { label: "Created By", value: createdBy, icon: UserRound },
      { label: "Client", value: clientName, icon: Building2 },
      { label: "Project Cost", value: projectCost, icon: BadgeDollarSign },
      { label: "Project Duration", value: projectDuration, icon: Timer },
    ],
    [createdBy, clientName, projectCost, projectDuration]
  );

  const closeViewer = useCallback((fromWheel = false) => {
    reopenBlockUntilRef.current = Date.now() + 260;
    if (!fromWheel) {
      isWheelClosingRef.current = false;
      pendingWheelDeltaRef.current = 0;
    }
    setIsViewerOpen(false);
  }, []);

  const showPrevMedia = useCallback(() => {
    if (!hasManyMedia) return;
    setDirection(-1);
    setMediaIndex((i) => (i - 1 + media.length) % media.length);
  }, [hasManyMedia, media.length]);

  const showNextMedia = useCallback(() => {
    if (!hasManyMedia) return;
    setDirection(1);
    setMediaIndex((i) => (i + 1) % media.length);
  }, [hasManyMedia, media.length]);

  const selectMedia = useCallback(
    (index: number) => {
      setDirection(index >= mediaIndex ? 1 : -1);
      setMediaIndex(index);
    },
    [mediaIndex]
  );

  const openViewer = useCallback(() => {
    if (Date.now() < reopenBlockUntilRef.current) return;
    isWheelClosingRef.current = false;
    pendingWheelDeltaRef.current = 0;
    setIsViewerOpen(true);
  }, []);

  const requestViewerClose = useCallback(
    (event?: { preventDefault?: () => void; stopPropagation?: () => void }) => {
      event?.preventDefault?.();
      event?.stopPropagation?.();
      closeViewer();
    },
    [closeViewer]
  );

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

  const handleViewerTouchStart = (e: TouchEvent<HTMLDivElement>) => {
    viewerTouchStartXRef.current = e.changedTouches[0]?.clientX ?? null;
  };

  const handleViewerTouchEnd = (e: TouchEvent<HTMLDivElement>) => {
    if (!hasManyMedia || viewerTouchStartXRef.current === null) return;
    const endX = e.changedTouches[0]?.clientX ?? viewerTouchStartXRef.current;
    const delta = endX - viewerTouchStartXRef.current;
    viewerTouchStartXRef.current = null;
    if (Math.abs(delta) < 40) return;
    if (delta > 0) {
      showPrevMedia();
      return;
    }
    showNextMedia();
  };

  const handleViewerWheel = (event: WheelEvent<HTMLDivElement>) => {
    if (isWheelClosingRef.current) return;
    const delta = Math.abs(event.deltaY) > Math.abs(event.deltaX) ? event.deltaY : event.deltaX;
    if (Math.abs(delta) < 1) return;
    isWheelClosingRef.current = true;
    pendingWheelDeltaRef.current = delta;
    closeViewer(true);
  };

  useEffect(() => {
    if (isViewerOpen || !isWheelClosingRef.current) return;
    const delta = pendingWheelDeltaRef.current;
    isWheelClosingRef.current = false;
    pendingWheelDeltaRef.current = 0;
    if (Math.abs(delta) < 1) return;
    requestAnimationFrame(() => {
      window.scrollBy({ top: delta, behavior: "auto" });
    });
  }, [isViewerOpen]);

  useEffect(() => {
    if (!isViewerOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeViewer();
        return;
      }
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        showPrevMedia();
      }
      if (event.key === "ArrowRight") {
        event.preventDefault();
        showNextMedia();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [isViewerOpen, closeViewer, showPrevMedia, showNextMedia]);

  return (
    <PageTransition>
      <PremiumBackground>
        <div className={isViewerOpen ? "invisible pointer-events-none" : ""}>
          <Navigation />
        </div>
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
                <>
                <div className="relative overflow-hidden rounded-[26px] border border-slate-300/70 dark:border-border/60 bg-[linear-gradient(160deg,rgba(255,255,255,0.94)_0%,rgba(249,249,252,0.96)_48%,rgba(255,244,244,0.9)_100%)] dark:bg-[linear-gradient(160deg,rgba(8,8,10,0.96)_0%,rgba(14,14,18,0.92)_48%,rgba(21,10,10,0.9)_100%)] shadow-[0_24px_60px_rgba(22,28,45,0.15)] dark:shadow-[0_24px_60px_rgba(0,0,0,0.45)] before:pointer-events-none before:absolute before:inset-[1px] before:rounded-[24px] before:border before:border-black/[0.05] dark:before:border-white/[0.06] before:content-['']">
                  <div className="pointer-events-none absolute -left-24 top-[-32%] h-72 w-72 rounded-full bg-primary/14 blur-3xl opacity-30 dark:opacity-50" />
                  <div className="pointer-events-none absolute -right-20 bottom-[-36%] h-72 w-72 rounded-full bg-primary/10 blur-3xl opacity-25 dark:opacity-45" />
                  <div
                    className="relative overflow-hidden aspect-video border-b border-slate-300/70 dark:border-border/60 bg-black/10 dark:bg-black/25 group"
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
                          <img src={currentMedia?.url} alt={project.title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.015]" />
                        )}
                      </motion.div>
                    </AnimatePresence>
                    <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
                    {currentMedia?.type === "image" && (
                      <>
                        <button
                          type="button"
                          onClick={openViewer}
                          className="absolute inset-0 z-10 cursor-zoom-in"
                          aria-label="Open full image view"
                        >
                          <span className="sr-only">Open full image view</span>
                        </button>
                        <div className="pointer-events-none absolute right-4 bottom-4 z-20 inline-flex items-center gap-2 rounded-full border border-white/30 bg-black/45 px-3 py-1.5 text-xs font-medium text-white/95 backdrop-blur-sm opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                          <Maximize2 className="w-3.5 h-3.5" />
                          Full View
                        </div>
                      </>
                    )}
                    {hasManyMedia && (
                      <>
                        <button
                          type="button"
                          onClick={showPrevMedia}
                          className="absolute left-3 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full border border-white/20 bg-black/60 text-white flex items-center justify-center transition-all duration-200 hover:bg-black/75 hover:scale-105"
                          aria-label="Previous media"
                        >
                          <ChevronLeft className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={showNextMedia}
                          className="absolute right-3 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full border border-white/20 bg-black/60 text-white flex items-center justify-center transition-all duration-200 hover:bg-black/75 hover:scale-105"
                          aria-label="Next media"
                        >
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      </>
                    )}
                  </div>
                  {hasManyMedia && (
                    <div className="flex gap-3 overflow-x-auto px-5 py-4 border-b border-slate-300/70 dark:border-border/60 bg-[linear-gradient(180deg,rgba(255,255,255,0.45)_0%,rgba(255,255,255,0)_100%)] dark:bg-[linear-gradient(180deg,rgba(255,255,255,0.03)_0%,rgba(255,255,255,0)_100%)] sm:px-6">
                      {media.map((item, index) => (
                        <button
                          key={`${item.url}-${index}`}
                          type="button"
                          onClick={() => selectMedia(index)}
                          className={`relative shrink-0 w-24 h-16 rounded-xl overflow-hidden border transition-all duration-300 ${index === mediaIndex
                            ? "border-primary ring-2 ring-primary/70 shadow-[0_10px_24px_rgba(239,68,68,0.28)]"
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

                  <div className="relative p-5 sm:p-8 md:p-10 space-y-7">
                    <div className="pointer-events-none absolute -top-20 -right-20 h-56 w-56 rounded-full bg-primary/10 blur-3xl opacity-30 dark:opacity-55" />
                    <div className="space-y-5 relative">
                      <span className="inline-flex items-center rounded-full border border-primary/35 bg-primary/10 px-3 py-1.5 text-[11px] uppercase tracking-[0.14em] text-primary shadow-[0_0_22px_rgba(239,68,68,0.2)]">
                        {category}
                      </span>
                      <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground leading-tight">{project.title}</h1>
                      <p className="text-[15px] sm:text-base leading-7 text-muted-foreground max-w-4xl">
                        {project.description || "No details available."}
                      </p>
                    </div>

                    <div className="grid gap-3.5 sm:grid-cols-2 md:gap-4">
                      {detailCards.map((item) => (
                        <motion.div
                          key={item.label}
                          initial={{ opacity: 0, y: 8 }}
                          whileInView={{ opacity: 1, y: 0 }}
                          viewport={{ once: true, margin: "-20px" }}
                          transition={{ duration: 0.3, ease: "easeOut" }}
                          className="group relative overflow-hidden rounded-2xl border border-slate-300/75 dark:border-border/60 bg-[linear-gradient(145deg,rgba(255,255,255,0.84),rgba(255,255,255,0.62))] dark:bg-[linear-gradient(145deg,rgba(255,255,255,0.06),rgba(255,255,255,0.02))] px-5 py-4 backdrop-blur-sm transition-all duration-300 hover:border-primary/45 hover:shadow-[0_14px_28px_rgba(239,68,68,0.14)]"
                        >
                          <div className="pointer-events-none absolute inset-0 rounded-2xl border border-transparent transition-colors duration-300 group-hover:border-primary/25" />
                          <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-2xl">
                            <span className="absolute -left-1/3 top-0 h-full w-1/3 -skew-x-12 bg-gradient-to-r from-transparent via-white/15 to-transparent translate-x-0 transition-transform duration-700 ease-out group-hover:translate-x-[420%]" />
                          </div>
                          <div className="flex items-center justify-between gap-4">
                            <div className="min-w-0">
                              <span className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
                                <item.icon className="h-3.5 w-3.5 text-primary/85" />
                                {item.label}
                              </span>
                              <div className="mt-2">
                                {isFallbackValue(item.value) ? (
                                  <span className="inline-flex rounded-full border border-slate-300/80 dark:border-border/70 bg-white/75 dark:bg-background/45 px-3 py-1 text-xs font-medium text-muted-foreground">
                                    {item.value}
                                  </span>
                                ) : (
                                  <span className="text-[15px] sm:text-base font-semibold leading-tight text-foreground break-words">
                                    {item.value}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </div>

                    <div className="border-t border-slate-300/80 dark:border-border/60 pt-6">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <p className="text-sm text-muted-foreground">
                          Need a similar execution plan for your project? Let&apos;s discuss your requirements.
                        </p>
                        <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                          <Button
                            variant="outline"
                            onClick={() => navigate("/portfolio")}
                            className="rounded-full border-slate-300/80 dark:border-border/70 bg-white/65 dark:bg-background/30 px-6 hover:bg-white/90 dark:hover:bg-background/60"
                          >
                            Back to Portfolio
                          </Button>
                          <Button
                            onClick={() => navigate("/contact")}
                            className="rounded-full px-7 shadow-[0_12px_26px_rgba(239,68,68,0.32)]"
                          >
                            Contact Us
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                {typeof document !== "undefined" &&
                  createPortal(
                    <AnimatePresence>
                      {isViewerOpen && currentMedia && (
                        <motion.div
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="fixed inset-0 z-[1000] overscroll-none bg-slate-950/55 dark:bg-black/45 backdrop-blur-xl"
                          onWheel={handleViewerWheel}
                        >
                          <button
                            type="button"
                            className="absolute inset-0 z-0 bg-transparent"
                            onPointerDown={requestViewerClose}
                            onClick={requestViewerClose}
                            aria-label="Close full view"
                          />
                          <div className="relative z-10 h-full pointer-events-none">
                            <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.16)_0%,rgba(255,255,255,0.04)_35%,rgba(0,0,0,0.48)_100%)] dark:bg-[linear-gradient(135deg,rgba(255,255,255,0.12)_0%,rgba(255,255,255,0.03)_35%,rgba(0,0,0,0.5)_100%)]" />
                            <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-black/55 to-transparent" />

                            <button
                              type="button"
                              onPointerDown={requestViewerClose}
                              onClick={requestViewerClose}
                              className="pointer-events-auto absolute top-4 right-4 z-50 inline-flex h-12 w-12 items-center justify-center rounded-full border border-slate-200/65 dark:border-white/25 bg-white/90 dark:bg-black/75 text-slate-800 dark:text-white shadow-[0_10px_26px_rgba(0,0,0,0.25)] dark:shadow-[0_10px_26px_rgba(0,0,0,0.45)] transition-all duration-200 hover:bg-primary hover:border-primary/70 hover:text-primary-foreground"
                              aria-label="Close full view"
                            >
                              <X className="w-5 h-5" />
                            </button>

                            {hasManyMedia && (
                              <>
                                <button
                                  type="button"
                                  onClick={showPrevMedia}
                                  className="pointer-events-auto absolute left-4 top-1/2 -translate-y-1/2 z-40 hidden sm:inline-flex h-12 w-12 items-center justify-center rounded-full border border-slate-200/60 dark:border-white/20 bg-white/85 dark:bg-black/50 text-slate-800 dark:text-white transition-all duration-200 hover:bg-white dark:hover:bg-black/75"
                                  aria-label="Previous media"
                                >
                                  <ChevronLeft className="w-5 h-5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={showNextMedia}
                                  className="pointer-events-auto absolute right-4 top-1/2 -translate-y-1/2 z-40 hidden sm:inline-flex h-12 w-12 items-center justify-center rounded-full border border-slate-200/60 dark:border-white/20 bg-white/85 dark:bg-black/50 text-slate-800 dark:text-white transition-all duration-200 hover:bg-white dark:hover:bg-black/75"
                                  aria-label="Next media"
                                >
                                  <ChevronRight className="w-5 h-5" />
                                </button>
                              </>
                            )}

                            <div className="flex h-full flex-col pointer-events-none">
                              <div className="flex-1 px-4 pt-16 pb-5 sm:px-8 sm:pt-20">
                                <AnimatePresence initial={false} mode="wait" custom={direction}>
                                  <motion.div
                                    key={`viewer-${currentMedia.url}-${mediaIndex}`}
                                    custom={direction}
                                    initial={{ opacity: 0, x: direction > 0 ? 34 : -34 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: direction > 0 ? -34 : 34 }}
                                    transition={{ duration: 0.25, ease: "easeOut" }}
                                    className="h-full w-full flex items-center justify-center"
                                  >
                                    <div
                                      className="pointer-events-auto max-h-[calc(100dvh-11.5rem)] max-w-full"
                                      onTouchStart={handleViewerTouchStart}
                                      onTouchEnd={handleViewerTouchEnd}
                                    >
                                      {currentMedia.type === "video" ? (
                                        <video
                                          src={currentMedia.url}
                                          className="h-auto w-auto max-h-[calc(100dvh-11.5rem)] max-w-full rounded-2xl object-contain shadow-[0_18px_44px_rgba(0,0,0,0.5)]"
                                          controls
                                          autoPlay
                                          muted
                                          loop
                                          playsInline
                                        />
                                      ) : (
                                        <img
                                          src={currentMedia.url}
                                          alt={project.title}
                                          className="h-auto w-auto max-h-[calc(100dvh-11.5rem)] max-w-full rounded-2xl object-contain shadow-[0_18px_44px_rgba(0,0,0,0.5)]"
                                        />
                                      )}
                                    </div>
                                  </motion.div>
                                </AnimatePresence>
                              </div>

                              <div className="pointer-events-auto border-t border-white/10 bg-black/55 px-4 py-3 sm:px-8 sm:py-4">
                                <div className="mx-auto flex max-w-5xl gap-3 overflow-x-auto pb-1">
                                  {media.map((item, index) => (
                                    <button
                                      key={`viewer-thumb-${item.url}-${index}`}
                                      type="button"
                                      onClick={() => selectMedia(index)}
                                      className={`relative shrink-0 w-24 h-16 sm:w-[110px] sm:h-[72px] rounded-xl overflow-hidden border transition-all duration-300 ${index === mediaIndex
                                        ? "border-primary ring-2 ring-primary/80 shadow-[0_10px_24px_rgba(239,68,68,0.32)]"
                                        : "border-white/25 hover:border-primary/55"
                                        }`}
                                      aria-label={`Open media ${index + 1}`}
                                    >
                                      {item.type === "video" ? (
                                        <video src={item.url} className="w-full h-full object-cover" muted playsInline />
                                      ) : (
                                        <img src={item.url} alt={`${project.title} gallery thumbnail ${index + 1}`} className="w-full h-full object-cover" />
                                      )}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>,
                    document.body
                  )}
                </>
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
