// Portfolio.tsx — Redesigned Next-Gen Agency Portfolio Showcase
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import CTASection from "@/components/CTASection";
import PageTransition from "@/components/shared/PageTransition";
import { motion, AnimatePresence } from "framer-motion";
import { MouseEvent, useEffect, useMemo, useState } from "react";
import { 
  ExternalLink, 
  Loader2, 
  ChevronLeft, 
  ChevronRight, 
  FileText, 
  Search, 
  Sparkles, 
  LayoutGrid, 
  List, 
  ArrowRight, 
  Layers, 
  CheckCircle2, 
  Eye, 
  Share2, 
  Check, 
  SlidersHorizontal,
  X
} from "lucide-react";
import PremiumBackground from "@/components/shared/PremiumBackground";
import { useLiveData } from "@/hooks/useLiveData";
import { useNavigate } from "react-router-dom";
import { buildCardImageSources } from "@/components/shared/mediaUrl";
import {
  getProjectMediaList,
  getProjectPdfDocument,
  getProjectVisualMedia,
  type ProjectMediaItem,
} from "@/components/shared/projectMedia";
import {
  buildProjectCategoryFilters,
  getPortfolioFilterCategories,
  getProjectCategoryLabel,
} from "@/components/shared/projectAssociations";
import { getApiBaseUrl } from "@/components/admin/adminAuth";

const DESCRIPTION_PREVIEW_LIMIT = 135;

const getDescriptionPreview = (value: unknown) => {
  const text = typeof value === "string" ? value.trim() : "";
  if (!text) {
    return { text: "No project description available.", truncated: false };
  }

  if (text.length <= DESCRIPTION_PREVIEW_LIMIT) {
    return { text, truncated: false };
  }

  const shortened = text
    .slice(0, DESCRIPTION_PREVIEW_LIMIT)
    .trimEnd()
    .replace(/[.,;:!?-]+$/, "");
  return { text: shortened, truncated: true };
};

const PortfolioMedia = ({
  project,
  cardIndex,
}: {
  project: any;
  cardIndex: number;
}) => {
  const visualMedia = getProjectVisualMedia(project);
  const rawMedia = visualMedia.length > 0 ? visualMedia : getProjectMediaList(project);

  const imageFromUrl: ProjectMediaItem[] = [];
  if (!rawMedia.length && project.image_url) {
    const sources = buildCardImageSources(project.image_url);
    imageFromUrl.push({ url: sources.src, type: "image" });
  }

  const media = rawMedia.length ? rawMedia : imageFromUrl;

  const fallbackMedia: ProjectMediaItem = {
    url: "https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=800&h=600&fit=crop",
    type: "image",
  };
  const [index, setIndex] = useState(0);
  const current = media[index] ?? fallbackMedia;
  const hasMany = media.length > 1;
  const hasPdf = Boolean(getProjectPdfDocument(project));
  const imageSources = current.type === "image" ? buildCardImageSources(current.url) : null;
  const [isImageReady, setIsImageReady] = useState(current.type === "video");
  const eagerImage = cardIndex < 3;

  useEffect(() => {
    setIsImageReady(current.type !== "image");
  }, [current.type, current.url]);

  const prev = (e: MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (!hasMany) return;
    setIndex((i) => (i - 1 + media.length) % media.length);
  };

  const next = (e: MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (!hasMany) return;
    setIndex((i) => (i + 1) % media.length);
  };

  return (
    <div className="relative overflow-hidden aspect-[16/10] bg-muted/40 group/media">
      {current.type === "video" ? (
        <video src={current.url} className="w-full h-full object-cover" muted playsInline preload="none" />
      ) : current.type === "pdf" ? (
        <div className="flex h-full w-full flex-col items-center justify-center gap-3 bg-gradient-to-br from-card via-muted/40 to-muted/80 text-foreground">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/15 text-primary shadow-lg shadow-primary/20 border border-primary/30">
            <FileText className="h-7 w-7" />
          </div>
          <div className="px-6 text-center">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-primary">
              PDF Documentation
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Click to view full blueprint & specifications
            </p>
          </div>
        </div>
      ) : (
        <>
          <div
            className={`absolute inset-0 bg-muted/40 transition-opacity duration-300 ${
              isImageReady ? "opacity-0" : "opacity-100"
            }`}
            aria-hidden="true"
          />
          <img
            src={imageSources?.src ?? current.url}
            srcSet={imageSources?.srcSet}
            alt={project.title}
            width={800}
            height={500}
            loading={eagerImage ? "eager" : "lazy"}
            fetchpriority={eagerImage ? "high" : "low"}
            decoding="async"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            onLoad={() => setIsImageReady(true)}
            onError={() => setIsImageReady(true)}
            className={`w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-105 transform-gpu ${
              isImageReady ? "opacity-100" : "opacity-0"
            }`}
          />
        </>
      )}

      {/* Category Pill Tag Overlay */}
      <div className="absolute top-3.5 left-3.5 z-10">
        <span className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-full border border-white/20 bg-black/65 backdrop-blur-md text-white shadow-xl">
          <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
          {project.displayCategory || project.category || "General"}
        </span>
      </div>

      {/* Media Count / PDF Badge */}
      <div className="absolute top-3.5 right-3.5 z-10 flex items-center gap-2">
        {hasPdf && (
          <span className="inline-flex items-center gap-1 rounded-full border border-primary/40 bg-primary/20 backdrop-blur-md px-2.5 py-1 text-[11px] font-bold text-white shadow-lg">
            <FileText className="h-3.5 w-3.5 text-primary" />
            PDF
          </span>
        )}
        {hasMany && (
          <span className="inline-flex items-center gap-1 rounded-full border border-white/20 bg-black/60 backdrop-blur-md px-2.5 py-1 text-[11px] font-bold text-white shadow-lg">
            {index + 1}/{media.length}
          </span>
        )}
      </div>

      {/* Slide Navigation Buttons */}
      {hasMany && (
        <>
          <button
            type="button"
            onClick={prev}
            className="absolute left-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/65 text-white flex items-center justify-center hover:bg-primary transition-all duration-200 opacity-0 group-hover/media:opacity-100 shadow-lg z-10"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={next}
            className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/65 text-white flex items-center justify-center hover:bg-primary transition-all duration-200 opacity-0 group-hover/media:opacity-100 shadow-lg z-10"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </>
      )}

      {/* Hover Gradient Overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
    </div>
  );
};

const PortfolioSkeleton = () => (
  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
    {[1, 2, 3, 4, 5, 6].map((i) => (
      <div
        key={i}
        className="rounded-3xl border border-border/50 bg-card/60 overflow-hidden shadow-lg animate-pulse flex flex-col justify-between"
      >
        <div className="aspect-[16/10] bg-muted/60 relative overflow-hidden" />
        <div className="p-6 space-y-4 flex-1 flex flex-col justify-between">
          <div className="space-y-2">
            <div className="h-5 w-4/5 bg-muted/80 rounded-xl" />
            <div className="h-5 w-3/5 bg-muted/80 rounded-xl" />
          </div>
          <div className="space-y-2">
            <div className="h-3.5 w-full bg-muted/50 rounded-lg" />
            <div className="h-3.5 w-5/6 bg-muted/50 rounded-lg" />
          </div>
          <div className="pt-4 border-t border-border/40 flex justify-between items-center">
            <div className="h-4 w-24 bg-muted/60 rounded-full" />
            <div className="h-8 w-28 bg-primary/20 rounded-full" />
          </div>
        </div>
      </div>
    ))}
  </div>
);

const Portfolio = () => {
  const [activeCategory, setActiveCategory] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "compact">("grid");
  const [visibleCount, setVisibleCount] = useState(6);
  const [managedCategories, setManagedCategories] = useState<string[]>([]);
  const navigate = useNavigate();

  const { data: projects, loading } = useLiveData("projects", {
    cacheTimeMs: 120_000,
    revalidate: false,
  });

  const openDetails = (project: any) => {
    if (!project?.id) return;
    navigate(`/portfolio/${encodeURIComponent(project.id)}`, { viewTransition: true });
  };

  const normalizedProjects = useMemo(
    () =>
      projects.map((project: any) => ({
        ...project,
        displayCategory: getProjectCategoryLabel(project.category),
      })),
    [projects]
  );

  const categories = useMemo(
    () => buildProjectCategoryFilters(normalizedProjects, managedCategories),
    [managedCategories, normalizedProjects]
  );

  // Filter projects by category AND search query
  const filteredProjects = useMemo(() => {
    return normalizedProjects.filter((p: any) => {
      const matchesCategory =
        activeCategory === "All" || p.displayCategory === activeCategory;
      const query = searchQuery.trim().toLowerCase();
      const matchesSearch =
        !query ||
        p.title?.toLowerCase().includes(query) ||
        p.description?.toLowerCase().includes(query) ||
        p.displayCategory?.toLowerCase().includes(query);

      return matchesCategory && matchesSearch;
    });
  }, [activeCategory, normalizedProjects, searchQuery]);

  const visibleProjects = useMemo(
    () => filteredProjects.slice(0, visibleCount),
    [filteredProjects, visibleCount]
  );
  const hasMoreProjects = visibleCount < filteredProjects.length;

  useEffect(() => {
    let cancelled = false;
    const apiBase = getApiBaseUrl();

    const loadManagedCategories = async () => {
      try {
        const response = await fetch(`${apiBase}/home-page-settings`);
        if (!response.ok) throw new Error("Failed to load portfolio category settings");
        const payload = await response.json();
        if (!cancelled) setManagedCategories(getPortfolioFilterCategories(payload));
      } catch (error) {
        if (!cancelled) setManagedCategories([]);
        console.error("Failed to load portfolio category settings", error);
      }
    };

    void loadManagedCategories();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const initialCount = window.matchMedia("(max-width: 767px)").matches ? 4 : 6;
    setVisibleCount(initialCount);
  }, [activeCategory, searchQuery]);

  useEffect(() => {
    if (activeCategory !== "All" && !categories.includes(activeCategory)) {
      setActiveCategory("All");
    }
  }, [activeCategory, categories]);

  return (
    <PageTransition>
      <PremiumBackground>
        <Navigation />
        <main className="min-h-screen">
          
          {/* Agency Hero Section */}
          <section className="relative pt-32 pb-16 md:pt-40 md:pb-24 overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-transparent pointer-events-none" />
            <div className="absolute top-20 right-[-10rem] w-[28rem] h-[28rem] rounded-full bg-primary/10 blur-3xl pointer-events-none" />
            <div className="container-narrow relative z-10">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7 }}
                className="max-w-3xl"
              >
                <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold tracking-wide bg-primary/10 text-primary dark:bg-primary/20 mb-5 border border-primary/20">
                  <Sparkles className="w-3.5 h-3.5 animate-pulse" />
                  Engineering & Creative Portfolio
                </span>
                <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold tracking-tight leading-[1.08] text-balance">
                  Masterpieces crafted with <span className="text-gradient-primary">precision</span> & passion.
                </h1>
                <p className="mt-6 text-lg md:text-xl text-muted-foreground max-w-2xl leading-relaxed">
                  Explore our curated portfolio of technical drawings, P&ID schematics, 3D SolidWorks models, and custom web applications.
                </p>

                {/* Real-time Quick Stats Strip */}
                <div className="mt-10 grid grid-cols-2 sm:grid-cols-4 gap-4 pt-8 border-t border-border/50">
                  <div>
                    <p className="text-2xl sm:text-3xl font-extrabold text-foreground">{normalizedProjects.length}+</p>
                    <p className="text-xs font-medium text-muted-foreground mt-0.5">Completed Works</p>
                  </div>
                  <div>
                    <p className="text-2xl sm:text-3xl font-extrabold text-primary">100%</p>
                    <p className="text-xs font-medium text-muted-foreground mt-0.5">Technical Accuracy</p>
                  </div>
                  <div>
                    <p className="text-2xl sm:text-3xl font-extrabold text-foreground">{categories.length - 1}</p>
                    <p className="text-xs font-medium text-muted-foreground mt-0.5">Specialized Disciplines</p>
                  </div>
                  <div>
                    <p className="text-2xl sm:text-3xl font-extrabold text-primary">4.9/5</p>
                    <p className="text-xs font-medium text-muted-foreground mt-0.5">Client Satisfaction</p>
                  </div>
                </div>
              </motion.div>
            </div>
          </section>

          {/* Interactive Search & Filter Bar */}
          <section className="pb-10">
            <div className="container-narrow space-y-6">
              
              {/* Filter Controls Row */}
              <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 p-4 rounded-3xl border border-border/60 bg-card/80 backdrop-blur-xl shadow-xl">
                
                {/* Real-time Search Box */}
                <div className="relative flex-1">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search projects by title, category, or spec..."
                    className="w-full pl-10 pr-10 py-2.5 rounded-2xl bg-muted/30 border border-border/50 focus:border-primary/60 focus:bg-background text-sm placeholder:text-muted-foreground/70 transition-all outline-none"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery("")}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {/* View Mode Toggle Buttons */}
                <div className="flex items-center justify-between md:justify-end gap-3 shrink-0">
                  <span className="text-xs font-medium text-muted-foreground hidden sm:inline">
                    Showing <span className="text-foreground font-bold">{filteredProjects.length}</span> works
                  </span>
                  <div className="flex items-center p-1 rounded-2xl bg-muted/40 border border-border/50">
                    <button
                      type="button"
                      onClick={() => setViewMode("grid")}
                      title="Grid View"
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
                        viewMode === "grid"
                          ? "bg-primary text-primary-foreground shadow-md"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <LayoutGrid className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Grid</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setViewMode("compact")}
                      title="Compact List View"
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
                        viewMode === "compact"
                          ? "bg-primary text-primary-foreground shadow-md"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <List className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Compact</span>
                    </button>
                  </div>
                </div>

              </div>

              {/* Category Pills Bar */}
              <div className="flex items-center gap-2 overflow-x-auto pb-2 no-scrollbar scroll-smooth">
                {categories.map((category) => {
                  const count =
                    category === "All"
                      ? normalizedProjects.length
                      : normalizedProjects.filter((p: any) => p.displayCategory === category).length;

                  const isActive = activeCategory === category;

                  return (
                    <button
                      key={category}
                      type="button"
                      onClick={() => setActiveCategory(category)}
                      className={`whitespace-nowrap px-5 py-2.5 rounded-full text-xs sm:text-sm font-semibold transition-all duration-300 flex items-center gap-2 cursor-pointer ${
                        isActive
                          ? "bg-primary text-white shadow-lg shadow-primary/25 border border-primary scale-[1.02]"
                          : "bg-card border border-border/60 hover:border-primary/50 text-muted-foreground hover:text-foreground hover:bg-muted/50"
                      }`}
                    >
                      {category}
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          isActive
                            ? "bg-white/20 text-white"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>

            </div>
          </section>

          {/* Main Showcase Section */}
          <section className="pb-24">
            <div className="container-narrow">
              
              {loading ? (
                <PortfolioSkeleton />
              ) : filteredProjects.length === 0 ? (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-center py-24 rounded-3xl border border-border/50 bg-card/40 p-8"
                >
                  <Layers className="w-12 h-12 mx-auto text-muted-foreground/40 mb-4" />
                  <h3 className="text-xl font-bold">No projects found</h3>
                  <p className="text-sm text-muted-foreground mt-2 max-w-md mx-auto">
                    {searchQuery
                      ? `No works matched "${searchQuery}". Try searching another keyword or clearing filters.`
                      : `No published projects found in "${activeCategory}".`}
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveCategory("All");
                      setSearchQuery("");
                    }}
                    className="mt-6 px-6 py-2.5 bg-primary/10 border border-primary/30 text-primary hover:bg-primary hover:text-white rounded-full text-xs font-bold transition-all duration-300"
                  >
                    Reset All Filters
                  </button>
                </motion.div>
              ) : viewMode === "grid" ? (
                /* GRID VIEW */
                <motion.div
                  initial="hidden"
                  animate="visible"
                  className="grid md:grid-cols-2 lg:grid-cols-3 gap-8"
                >
                  {visibleProjects.map((project: any, index: number) => {
                    const description = getDescriptionPreview(project.description);

                    return (
                      <article
                        key={project.id || project.title}
                        className="group cursor-pointer flex flex-col rounded-3xl border border-border/60 bg-card/90 dark:bg-card/70 hover:border-primary/50 hover:shadow-2xl hover:shadow-primary/10 hover:-translate-y-1.5 transition-all duration-400 overflow-hidden"
                        onClick={() => openDetails(project)}
                      >
                        <PortfolioMedia project={project} cardIndex={index} />
                        <div className="p-6 flex-1 flex flex-col justify-between">
                          <div>
                            <h3 className="text-lg font-bold tracking-tight text-foreground group-hover:text-primary transition-colors leading-snug line-clamp-2">
                              {project.title}
                            </h3>
                            <p className="mt-2.5 text-xs sm:text-sm text-muted-foreground leading-relaxed line-clamp-3">
                              {description.text}
                              {description.truncated && (
                                <span className="ml-1 font-semibold text-primary">… Details</span>
                              )}
                            </p>
                          </div>

                          <div className="mt-6 pt-4 border-t border-border/40 flex items-center justify-between">
                            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                              Case Study
                            </span>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                openDetails(project);
                              }}
                              className="inline-flex items-center gap-1.5 text-xs font-bold text-primary group-hover:translate-x-1 transition-transform"
                            >
                              View Specs
                              <ArrowRight className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </motion.div>
              ) : (
                /* COMPACT LIST VIEW */
                <div className="space-y-4">
                  {visibleProjects.map((project: any, index: number) => {
                    const description = getDescriptionPreview(project.description);

                    return (
                      <article
                        key={project.id || project.title}
                        onClick={() => openDetails(project)}
                        className="group cursor-pointer rounded-2xl border border-border/60 bg-card/90 hover:border-primary/50 hover:bg-card p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition-all duration-300 shadow-md hover:shadow-xl"
                      >
                        <div className="flex items-center gap-4 min-w-0 flex-1">
                          <div className="w-20 h-16 rounded-xl overflow-hidden shrink-0 bg-muted/40 relative">
                            {project.image_url ? (
                              <img
                                src={project.image_url}
                                alt={project.title}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                                <FileText className="w-6 h-6" />
                              </div>
                            )}
                          </div>

                          <div className="min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 uppercase tracking-wider">
                                {project.displayCategory || project.category || "General"}
                              </span>
                            </div>
                            <h3 className="text-base font-bold text-foreground group-hover:text-primary transition-colors truncate">
                              {project.title}
                            </h3>
                            <p className="text-xs text-muted-foreground truncate max-w-xl mt-0.5">
                              {description.text}
                            </p>
                          </div>
                        </div>

                        <button
                          type="button"
                          className="px-4 py-2 rounded-xl bg-primary/10 border border-primary/30 text-primary group-hover:bg-primary group-hover:text-white text-xs font-bold flex items-center gap-1.5 transition-all duration-300 shrink-0 self-end sm:self-center"
                        >
                          View Work <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      </article>
                    );
                  })}
                </div>
              )}

              {/* Load More Button & Footer Progress */}
              {!loading && hasMoreProjects && (
                <div className="mt-16 flex flex-col items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setVisibleCount((count) => count + 6)}
                    className="inline-flex items-center gap-2.5 px-8 py-3.5 rounded-full border-2 border-primary/40 bg-primary/10 text-primary font-bold text-xs uppercase tracking-widest hover:bg-primary hover:text-white hover:border-primary hover:shadow-xl hover:shadow-primary/25 hover:-translate-y-0.5 transition-all duration-300 cursor-pointer"
                  >
                    Load More Projects
                    <ArrowRight className="w-4 h-4" />
                  </button>
                  <span className="text-xs text-muted-foreground">
                    Showing <span className="font-bold text-foreground">{visibleCount}</span> of{" "}
                    <span className="font-bold text-foreground">{filteredProjects.length}</span> projects
                  </span>
                </div>
              )}

            </div>
          </section>

          <CTASection />
        </main>
        <Footer />
      </PremiumBackground>
    </PageTransition>
  );
};

export default Portfolio;
