import { useCallback, useEffect, useMemo, useRef, useState, type TouchEvent, type WheelEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
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
  ExternalLink,
  FileText,
  X,
  UserRound,
  Building2,
  BadgeDollarSign,
  Timer,
  ArrowLeft,
} from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { getProjectPdfDocument, getProjectMediaList, type ProjectMediaItem } from "@/components/shared/projectMedia";
import PdfPreview from "@/components/shared/PdfPreview";

/* ═══════════════════════════════════════════════════════════
   UTILITIES
   ═══════════════════════════════════════════════════════════ */

const normalizeCategory = (raw?: string | null) => {
  if (!raw) return "Uncategorized";
  const v = raw.toLowerCase();
  if (["web design", "web design & development", "web development"].some((k) => v.includes(k))) return "Web Design";
  if (["autocad", "solidworks", "3d", "cad"].some((k) => v.includes(k))) return "CAD & 3D";
  if (["pfd", "p&id", "hazop", "engineering"].some((k) => v.includes(k))) return "Engineering";
  if (["branding", "graphic design"].some((k) => v.includes(k))) return "Branding";
  return raw;
};

const display = (value: unknown) => {
  if (value === null || value === undefined) return null;
  const t = String(value).trim();
  return t.length > 0 ? t : null;
};

const getDescriptionParagraphs = (value: unknown): string[] => {
  const raw = String(value ?? "").trim();
  if (!raw) return ["No details available."];
  const normalized = raw.replace(/\r\n/g, "\n").replace(/[ \t]+/g, " ").trim();
  const byBreak = normalized.split(/\n{1,}/).map((p) => p.trim()).filter(Boolean);
  if (byBreak.length > 1) return byBreak;
  const sentences = (normalized.match(/[^.!?]+[.!?]?/g) ?? []).map((s) => s.trim()).filter(Boolean);
  if (sentences.length <= 2) return [normalized];
  const paragraphs: string[] = [];
  for (let i = 0; i < sentences.length; i += 2) paragraphs.push(sentences.slice(i, i + 2).join(" "));
  return paragraphs;
};

/* ═══════════════════════════════════════════════════════════
   COMPONENT
   ═══════════════════════════════════════════════════════════ */

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

  /* ── derived data ── */

  const project = useMemo(
    () => projects.find((item: any) => String(item.id) === String(id)),
    [projects, id],
  );

  const fallbackMedia: ProjectMediaItem = useMemo(
    () => ({ url: "https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=1200&h=700&fit=crop", type: "image" }),
    [],
  );

  const media = useMemo(() => (project ? getProjectMediaList(project) : []), [project]);
  const effectiveMedia = media.length > 0 ? media : [fallbackMedia];
  const currentMedia = effectiveMedia[mediaIndex] ?? fallbackMedia;
  const hasManyMedia = effectiveMedia.length > 1;
  const pdfDocument = project ? getProjectPdfDocument(project) : null;
  const category = normalizeCategory(project?.category);
  const descriptionParagraphs = useMemo(() => getDescriptionParagraphs(project?.description), [project?.description]);

  const createdBy = display(project?.creator);
  const clientName = display(project?.client);
  const projectCost = display(project?.project_cost);
  const projectDuration = display(project?.project_duration);

  const metaItems = useMemo(() => [
    { label: "Created By", value: createdBy, icon: UserRound },
    { label: "Client", value: clientName, icon: Building2 },
    { label: "Budget", value: projectCost, icon: BadgeDollarSign },
    { label: "Duration", value: projectDuration, icon: Timer },
  ], [createdBy, clientName, projectCost, projectDuration]);

  /* ── effects ── */

  useEffect(() => { setMediaIndex(0); setIsViewerOpen(false); }, [project?.id]);

  /* ── handlers ── */

  const closeViewer = useCallback((fromWheel = false) => {
    reopenBlockUntilRef.current = Date.now() + 260;
    if (!fromWheel) { isWheelClosingRef.current = false; pendingWheelDeltaRef.current = 0; }
    setIsViewerOpen(false);
  }, []);

  const showPrev = useCallback(() => {
    if (!hasManyMedia) return;
    setDirection(-1);
    setMediaIndex((i) => (i - 1 + effectiveMedia.length) % effectiveMedia.length);
  }, [effectiveMedia.length, hasManyMedia]);

  const showNext = useCallback(() => {
    if (!hasManyMedia) return;
    setDirection(1);
    setMediaIndex((i) => (i + 1) % effectiveMedia.length);
  }, [effectiveMedia.length, hasManyMedia]);

  const selectMedia = useCallback((index: number) => {
    setDirection(index >= mediaIndex ? 1 : -1);
    setMediaIndex(index);
  }, [mediaIndex]);

  const openViewer = useCallback(() => {
    if (Date.now() < reopenBlockUntilRef.current) return;
    isWheelClosingRef.current = false;
    pendingWheelDeltaRef.current = 0;
    setIsViewerOpen(true);
  }, []);

  const requestViewerClose = useCallback((e?: { preventDefault?: () => void; stopPropagation?: () => void }) => {
    e?.preventDefault?.();
    e?.stopPropagation?.();
    closeViewer();
  }, [closeViewer]);

  /* touch */
  const onTouchStart = (e: TouchEvent<HTMLDivElement>) => { touchStartXRef.current = e.changedTouches[0]?.clientX ?? null; };
  const onTouchEnd = (e: TouchEvent<HTMLDivElement>) => {
    if (!hasManyMedia || touchStartXRef.current === null) return;
    const delta = (e.changedTouches[0]?.clientX ?? touchStartXRef.current) - touchStartXRef.current;
    touchStartXRef.current = null;
    if (Math.abs(delta) < 40) return;
    delta > 0 ? showPrev() : showNext();
  };
  const onViewerTouchStart = (e: TouchEvent<HTMLDivElement>) => { viewerTouchStartXRef.current = e.changedTouches[0]?.clientX ?? null; };
  const onViewerTouchEnd = (e: TouchEvent<HTMLDivElement>) => {
    if (!hasManyMedia || viewerTouchStartXRef.current === null) return;
    const delta = (e.changedTouches[0]?.clientX ?? viewerTouchStartXRef.current) - viewerTouchStartXRef.current;
    viewerTouchStartXRef.current = null;
    if (Math.abs(delta) < 40) return;
    delta > 0 ? showPrev() : showNext();
  };

  /* wheel on viewer */
  const handleViewerWheel = (e: WheelEvent<HTMLDivElement>) => {
    if (isWheelClosingRef.current) return;
    const delta = Math.abs(e.deltaY) > Math.abs(e.deltaX) ? e.deltaY : e.deltaX;
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
    requestAnimationFrame(() => window.scrollBy({ top: delta, behavior: "auto" }));
  }, [isViewerOpen]);

  /* keyboard */
  useEffect(() => {
    if (!isViewerOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeViewer();
      if (e.key === "ArrowLeft") { e.preventDefault(); showPrev(); }
      if (e.key === "ArrowRight") { e.preventDefault(); showNext(); }
    };
    window.addEventListener("keydown", onKey);
    return () => { window.removeEventListener("keydown", onKey); document.body.style.overflow = prev; };
  }, [isViewerOpen, closeViewer, showPrev, showNext]);

  /* ═══════════════════════════════════════════════════════════
     RENDER
     ═══════════════════════════════════════════════════════════ */

  return (
    <PageTransition>
      <PremiumBackground>
        <div className={isViewerOpen ? "invisible pointer-events-none" : ""}>
          <Navigation />
        </div>

        <main className="pt-28 pb-24">
          {loading ? (
            <div className="flex justify-center items-center py-32">
              <Loader2 className="w-7 h-7 animate-spin text-primary" />
            </div>
          ) : !project ? (
            <div className="flex flex-col items-center justify-center py-32 text-center px-6">
              <h1 className="text-xl font-semibold">Work not found</h1>
              <Button onClick={() => navigate("/portfolio")} variant="outline" className="mt-6 rounded-full">
                Back to Portfolio
              </Button>
            </div>
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5 }}
            >
              {/* ──────────────────────────────────────────────
                  BACK LINK
                  ────────────────────────────────────────────── */}
              <div className="max-w-[1200px] mx-auto px-6 mb-8">
                <Link
                  to="/portfolio"
                  className="inline-flex items-center gap-1.5 text-[13px] font-medium text-muted-foreground hover:text-foreground transition-colors"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  Portfolio
                </Link>
              </div>

              {/* ──────────────────────────────────────────────
                  MEDIA SECTION
                  ────────────────────────────────────────────── */}
              <section className="max-w-[1200px] mx-auto px-6">
                <div
                  className={`relative overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.02] group ${
                    currentMedia.type === "pdf" ? "h-[70vh] min-h-[520px]" : "aspect-video"
                  }`}
                  onTouchStart={onTouchStart}
                  onTouchEnd={onTouchEnd}
                >
                  <AnimatePresence initial={false} mode="wait" custom={direction}>
                    <motion.div
                      key={`${currentMedia?.url || "m"}-${mediaIndex}`}
                      custom={direction}
                      initial={{ opacity: 0, x: direction > 0 ? 24 : -24 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: direction > 0 ? -24 : 24 }}
                      transition={{ duration: 0.22, ease: "easeOut" }}
                      className="absolute inset-0"
                    >
                      {currentMedia?.type === "video" ? (
                        <video src={currentMedia.url} className="w-full h-full object-cover" controls autoPlay muted loop playsInline />
                      ) : currentMedia?.type === "pdf" ? (
                        <div className="flex h-full w-full flex-col bg-white">
                          <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-5 py-3 text-slate-900">
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                                <FileText className="h-4 w-4" />
                              </div>
                              <div className="min-w-0">
                                <p className="truncate text-sm font-semibold">{project.title}</p>
                                <p className="text-xs text-slate-500">Scroll to read the full document.</p>
                              </div>
                            </div>
                            <a href={currentMedia.url} target="_blank" rel="noreferrer"
                              className="inline-flex shrink-0 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-medium text-slate-700 hover:border-primary hover:text-primary transition-colors">
                              <ExternalLink className="h-3.5 w-3.5" /> Open PDF
                            </a>
                          </div>
                          <iframe src={`${currentMedia.url}#view=FitH`} title={`${project.title} PDF`} className="h-full w-full bg-white" />
                        </div>
                      ) : (
                        <img src={currentMedia?.url} alt={project.title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.012]" />
                      )}
                    </motion.div>
                  </AnimatePresence>

                  {/* bottom gradient + zoom hint */}
                  {currentMedia?.type === "image" && (
                    <>
                      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent" />
                      <button type="button" onClick={openViewer} className="absolute inset-0 z-10 cursor-zoom-in" aria-label="Open full view" />
                      <div className="pointer-events-none absolute right-4 bottom-4 z-20 inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-black/50 px-3 py-1.5 text-[11px] font-medium text-white/90 backdrop-blur-sm opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                        <Maximize2 className="w-3 h-3" /> Expand
                      </div>
                    </>
                  )}

                  {/* nav arrows */}
                  {hasManyMedia && (
                    <>
                      <button type="button" onClick={showPrev}
                        className="absolute left-3 top-1/2 -translate-y-1/2 z-20 w-9 h-9 rounded-full border border-white/15 bg-black/50 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-200 hover:bg-black/70">
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                      <button type="button" onClick={showNext}
                        className="absolute right-3 top-1/2 -translate-y-1/2 z-20 w-9 h-9 rounded-full border border-white/15 bg-black/50 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-200 hover:bg-black/70">
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </>
                  )}

                  {/* media counter */}
                  {hasManyMedia && (
                    <div className="absolute left-4 bottom-4 z-20 text-[11px] font-medium text-white/60 tabular-nums">
                      {mediaIndex + 1} / {effectiveMedia.length}
                    </div>
                  )}
                </div>

                {/* thumbnails */}
                {hasManyMedia && (
                  <div className="flex gap-2.5 mt-3 overflow-x-auto pb-1">
                    {effectiveMedia.map((item, index) => (
                      <button
                        key={`${item.url}-${index}`}
                        type="button"
                        onClick={() => selectMedia(index)}
                        className={`relative shrink-0 w-20 h-[52px] rounded-lg overflow-hidden border transition-all duration-200 ${
                          index === mediaIndex
                            ? "border-primary/70 ring-1 ring-primary/40"
                            : "border-white/[0.06] opacity-50 hover:opacity-80 hover:border-white/[0.12]"
                        }`}
                      >
                        {item.type === "video" ? (
                          <video src={item.url} className="w-full h-full object-cover" muted playsInline />
                        ) : item.type === "pdf" ? (
                          <PdfPreview url={item.url} title={`thumb ${index + 1}`} />
                        ) : (
                          <img src={item.url} alt={`Thumbnail ${index + 1}`} className="w-full h-full object-cover" />
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </section>

              {/* ──────────────────────────────────────────────
                  CONTENT — TWO COLUMN
                  ────────────────────────────────────────────── */}
              <section className="max-w-[1200px] mx-auto px-6 mt-14 md:mt-18">
                <div className="grid lg:grid-cols-[1fr_340px] gap-12 lg:gap-16">

                  {/* LEFT — title, description, CTA */}
                  <div className="min-w-0">
                    <span className="inline-block text-[10px] font-semibold uppercase tracking-[0.18em] text-primary/70 border border-primary/15 px-2.5 py-[3px] rounded">
                      {category}
                    </span>

                    <h1 className="text-3xl sm:text-4xl md:text-[2.6rem] font-bold tracking-[-0.03em] leading-[1.1] mt-5">
                      {project.title}
                    </h1>

                    <div className="mt-7 space-y-4 text-[15.5px] leading-[1.78] text-foreground/65">
                      {descriptionParagraphs.map((p, i) => (
                        <p key={`${i}-${p.slice(0, 28)}`}>{p}</p>
                      ))}
                    </div>

                    {/* PDF link */}
                    {pdfDocument && (
                      <a
                        href={pdfDocument.url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-2.5 mt-8 px-4 py-2.5 rounded-lg border border-white/[0.06] bg-white/[0.02] text-[13px] font-medium text-foreground/70 hover:text-foreground hover:border-white/[0.12] hover:bg-white/[0.04] transition-all"
                      >
                        <FileText className="w-4 h-4 text-primary/70" />
                        View Project PDF
                        <ExternalLink className="w-3 h-3 text-muted-foreground/40" />
                      </a>
                    )}

                    {/* CTA */}
                    <div className="flex flex-col sm:flex-row gap-3 mt-10 pt-8 border-t border-white/[0.05]">
                      <Button
                        variant="outline"
                        onClick={() => navigate("/portfolio")}
                        className="rounded-lg border-white/[0.08] bg-transparent px-6 h-11 text-[13px] font-medium hover:bg-white/[0.04]"
                      >
                        All Projects
                      </Button>
                      <Button
                        onClick={() => navigate("/start-project")}
                        className="rounded-lg px-7 h-11 text-[13px] font-medium"
                      >
                        Discuss Your Project
                      </Button>
                    </div>
                  </div>

                  {/* RIGHT — metadata sidebar */}
                  <aside className="lg:pt-[calc(10px+0.625rem)]">
                    <div className="space-y-px rounded-xl border border-white/[0.06] overflow-hidden">
                      {metaItems.map((item) => (
                        <div
                          key={item.label}
                          className="flex items-start gap-4 px-5 py-4 bg-white/[0.015] hover:bg-white/[0.03] transition-colors"
                        >
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/[0.04] text-muted-foreground/50 mt-0.5">
                            <item.icon className="w-3.5 h-3.5" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-[11px] uppercase tracking-[0.1em] text-muted-foreground/40 font-medium">
                              {item.label}
                            </p>
                            {item.value ? (
                              <p className="text-[14px] font-medium text-foreground/85 mt-1 leading-snug break-words">
                                {item.value}
                              </p>
                            ) : (
                              <p className="text-[13px] text-muted-foreground/25 mt-1">—</p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* inquiry card */}
                    <div className="mt-4 rounded-xl border border-primary/10 bg-primary/[0.03] p-5">
                      <p className="text-[13px] text-foreground/60 leading-relaxed">
                        Need a similar execution for your project?
                      </p>
                      <Button
                        onClick={() => navigate("/start-project")}
                        className="w-full mt-4 rounded-lg h-10 text-[13px] font-medium"
                      >
                        Start a Conversation
                      </Button>
                    </div>
                  </aside>
                </div>
              </section>
            </motion.div>
          )}
        </main>

        <Footer />

        {/* ═══════════════════════════════════════════════════
            FULL-SCREEN VIEWER
            ═══════════════════════════════════════════════════ */}
        {typeof document !== "undefined" &&
          createPortal(
            <AnimatePresence>
              {isViewerOpen && currentMedia && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.18 }}
                  className="fixed inset-0 z-[1000] overscroll-none bg-black/80 backdrop-blur-md"
                  onWheel={handleViewerWheel}
                >
                  <button type="button" className="absolute inset-0 z-0 bg-transparent" onPointerDown={requestViewerClose} onClick={requestViewerClose} aria-label="Close" />

                  <div className="relative z-10 h-full pointer-events-none">
                    {/* top gradient */}
                    <div className="pointer-events-none absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-black/50 to-transparent" />

                    {/* close button */}
                    <button
                      type="button"
                      onPointerDown={requestViewerClose}
                      onClick={requestViewerClose}
                      className="pointer-events-auto absolute top-5 right-5 z-50 inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/15 bg-black/60 text-white transition-colors hover:bg-white/10"
                      aria-label="Close"
                    >
                      <X className="w-4 h-4" />
                    </button>

                    {/* nav arrows */}
                    {hasManyMedia && (
                      <>
                        <button type="button" onClick={showPrev}
                          className="pointer-events-auto absolute left-4 top-1/2 -translate-y-1/2 z-40 hidden sm:inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-black/40 text-white transition-colors hover:bg-black/60">
                          <ChevronLeft className="w-4 h-4" />
                        </button>
                        <button type="button" onClick={showNext}
                          className="pointer-events-auto absolute right-4 top-1/2 -translate-y-1/2 z-40 hidden sm:inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-black/40 text-white transition-colors hover:bg-black/60">
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      </>
                    )}

                    <div className="flex h-full flex-col">
                      {/* main image */}
                      <div className="flex-1 px-4 pt-14 pb-4 sm:px-10 sm:pt-20">
                        <AnimatePresence initial={false} mode="wait" custom={direction}>
                          <motion.div
                            key={`v-${currentMedia.url}-${mediaIndex}`}
                            custom={direction}
                            initial={{ opacity: 0, x: direction > 0 ? 28 : -28 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: direction > 0 ? -28 : 28 }}
                            transition={{ duration: 0.22, ease: "easeOut" }}
                            className="h-full w-full flex items-center justify-center"
                          >
                            <div
                              className="pointer-events-auto max-h-[calc(100dvh-10rem)] max-w-full"
                              onTouchStart={onViewerTouchStart}
                              onTouchEnd={onViewerTouchEnd}
                            >
                              {currentMedia.type === "video" ? (
                                <video src={currentMedia.url} className="h-auto w-auto max-h-[calc(100dvh-10rem)] max-w-full rounded-xl object-contain shadow-2xl" controls autoPlay muted loop playsInline />
                              ) : (
                                <img src={currentMedia.url} alt={project.title} className="h-auto w-auto max-h-[calc(100dvh-10rem)] max-w-full rounded-xl object-contain shadow-2xl" />
                              )}
                            </div>
                          </motion.div>
                        </AnimatePresence>
                      </div>

                      {/* bottom thumbnails */}
                      {hasManyMedia && (
                        <div className="pointer-events-auto border-t border-white/[0.06] bg-black/50 px-4 py-3 sm:px-10 sm:py-3.5">
                          <div className="mx-auto flex max-w-4xl gap-2 overflow-x-auto pb-0.5">
                            {effectiveMedia.map((item, index) => (
                              <button
                                key={`vt-${item.url}-${index}`}
                                type="button"
                                onClick={() => selectMedia(index)}
                                className={`relative shrink-0 w-20 h-[52px] rounded-lg overflow-hidden border transition-all duration-200 ${
                                  index === mediaIndex
                                    ? "border-primary/70 ring-1 ring-primary/40"
                                    : "border-white/15 opacity-40 hover:opacity-70 hover:border-white/30"
                                }`}
                                aria-label={`Media ${index + 1}`}
                              >
                                {item.type === "video" ? (
                                  <video src={item.url} className="w-full h-full object-cover" muted playsInline />
                                ) : item.type === "pdf" ? (
                                  <PdfPreview url={item.url} title={`vt ${index + 1}`} />
                                ) : (
                                  <img src={item.url} alt={`Thumb ${index + 1}`} className="w-full h-full object-cover" />
                                )}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>,
            document.body,
          )}
      </PremiumBackground>
    </PageTransition>
  );
};

export default PortfolioDetails;
