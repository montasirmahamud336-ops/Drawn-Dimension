// Portfolio.tsx — filter আরও ছোট মোবাইলে, image_url সাপোর্ট ও fetchpriority ফিক্স সহ
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import CTASection from "@/components/CTASection";
import PageTransition from "@/components/shared/PageTransition";
import PageHero from "@/components/shared/PageHero";
import { motion } from "framer-motion";
import { MouseEvent, useEffect, useMemo, useState } from "react";
import { ExternalLink, Loader2, ChevronLeft, ChevronRight, FileText } from "lucide-react";
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
    return { text: "No description available.", truncated: false };
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

  // ✅ image_url থেকে ইমেজ অবজেক্ট তৈরি করা (অ্যাবসলিউট URL)
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
    <div className="relative overflow-hidden aspect-video">
      {current.type === "video" ? (
        <video src={current.url} className="w-full h-full object-cover" muted playsInline preload="none" />
      ) : current.type === "pdf" ? (
        <div className="flex h-full w-full flex-col items-center justify-center gap-3 bg-gradient-to-br from-white to-zinc-100 text-zinc-900">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/12 text-primary shadow-[0_10px_24px_-16px_rgba(239,68,68,0.55)]">
            <FileText className="h-7 w-7" />
          </div>
          <div className="px-6 text-center">
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-zinc-700">
              PDF Project
            </p>
            <p className="mt-1 text-xs text-zinc-500">
              Open the work details page to view the full document.
            </p>
          </div>
        </div>
      ) : (
        <>
          <div
            className={`absolute inset-0 bg-muted/35 transition-opacity duration-300 ${
              isImageReady ? "opacity-0" : "opacity-100"
            }`}
            aria-hidden="true"
          />
          <img
            src={imageSources?.src ?? current.url}
            srcSet={imageSources?.srcSet}
            alt={project.title}
            width={800}
            height={600}
            loading={eagerImage ? "eager" : "lazy"}
            fetchpriority={eagerImage ? "high" : "low"}  // ✅ lowercase fix
            decoding="async"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            onLoad={() => setIsImageReady(true)}
            onError={() => setIsImageReady(true)}
            className={`w-full h-full object-cover transition-[transform,opacity] duration-500 group-hover:scale-[1.03] ${
              isImageReady ? "opacity-100" : "opacity-0"
            }`}
          />
        </>
      )}
      <div className="absolute top-3 left-3">
        <span className="inline-block text-xs px-3 py-1.5 rounded-full border border-white/30 bg-black/40 backdrop-blur-sm text-white shadow-lg">
          {project.displayCategory || project.category || "Uncategorized"}
        </span>
      </div>
      <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
        <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center">
          <ExternalLink className="w-5 h-5 text-white" />
        </div>
      </div>
      {hasPdf && (
        <div className="absolute bottom-3 left-3">
          <span className="inline-flex items-center gap-1 rounded-full border border-white/20 bg-black/60 px-2.5 py-1 text-[11px] font-medium text-white backdrop-blur-sm">
            <FileText className="h-3.5 w-3.5" />
            PDF
          </span>
        </div>
      )}
      {hasMany && (
        <>
          <button
            type="button"
            onClick={prev}
            className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/20 backdrop-blur-md text-white flex items-center justify-center hover:bg-white/30 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={next}
            className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/20 backdrop-blur-md text-white flex items-center justify-center hover:bg-white/30 transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </>
      )}
    </div>
  );
};

const cardVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.05, duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] },
  }),
};

const Portfolio = () => {
  const [activeCategory, setActiveCategory] = useState("All");
  const [visibleCount, setVisibleCount] = useState(9);
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

  const filteredProjects = useMemo(
    () =>
      activeCategory === "All"
        ? normalizedProjects
        : normalizedProjects.filter((p: any) => p.displayCategory === activeCategory),
    [activeCategory, normalizedProjects]
  );
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
    const mobileCount = window.matchMedia("(max-width: 767px)").matches ? 6 : 9;
    setVisibleCount(mobileCount);
  }, [activeCategory]);

  useEffect(() => {
    if (activeCategory !== "All" && !categories.includes(activeCategory)) {
      setActiveCategory("All");
    }
  }, [activeCategory, categories]);

  return (
    <PageTransition>
      <PremiumBackground>
        <Navigation />
        <main>
          <PageHero
            title="Our Portfolio"
            subtitle="Case Studies"
            description="Explore our diverse portfolio showcasing engineering precision, creative innovation, and technical excellence across multiple disciplines."
          />

          <section className="relative overflow-hidden pt-6 md:pt-12 pb-16 md:pb-24">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_85%_18%,rgba(239,68,68,0.14),transparent_34%)] pointer-events-none" />
            <div className="absolute -bottom-24 left-[-8%] w-[24rem] h-[24rem] rounded-full bg-primary/10 blur-3xl pointer-events-none" />
            <div className="container-narrow relative z-10">
              {/* Category Filter */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                className="glass-panel p-2 sm:p-4 border-border/55 bg-gradient-to-br from-background/80 to-primary/[0.05] flex flex-wrap justify-center gap-1.5 sm:gap-3 mb-6 md:mb-10 rounded-2xl"
              >
                {categories.map((category) => (
                  <button
                    key={category}
                    onClick={() => setActiveCategory(category)}
                    className={`px-3 sm:px-6 py-1.5 sm:py-2.5 rounded-full text-[11px] sm:text-sm font-medium transition-all duration-300 ${
                      activeCategory === category
                        ? "bg-primary text-primary-foreground shadow-lg shadow-primary/25"
                        : "bg-white/40 dark:bg-white/5 border border-border/60 hover:border-primary/50 text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {category}
                  </button>
                ))}
              </motion.div>

              {/* Projects Grid */}
              {loading ? (
                <div className="flex justify-center items-center py-20">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
              ) : (
                <motion.div
                  initial="hidden"
                  animate="visible"
                  className="grid md:grid-cols-2 lg:grid-cols-3 gap-8"
                >
                  {visibleProjects.map((project: any, index: number) => {
                    const description = getDescriptionPreview(project.description);

                    return (
                      <motion.div
                        key={project.id || project.title}
                        custom={index}
                        variants={cardVariants}
                        className="group cursor-pointer"
                        onClick={() => openDetails(project)}
                      >
                        <div className="glass-card cms-card-lite overflow-hidden h-full flex flex-col border border-border/30 bg-card/80 backdrop-blur-md rounded-2xl transition-all duration-500 hover:border-primary/30 hover:shadow-2xl hover:shadow-primary/5 hover:-translate-y-1">
                          <PortfolioMedia project={project} cardIndex={index} />
                          <div className="p-6 flex-grow flex flex-col">
                            <h3 className="text-lg font-semibold tracking-tight text-foreground mb-2 group-hover:text-primary transition-colors line-clamp-2">
                              {project.title}
                            </h3>
                            <p className="text-sm text-muted-foreground/90 leading-relaxed mb-6 line-clamp-3">
                              {description.text}
                              {description.truncated && (
                                <span className="ml-1 font-medium text-foreground/80">… Read more</span>
                              )}
                            </p>
                            <div className="mt-auto pt-4 border-t border-border/30 flex justify-center">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  openDetails(project);
                                }}
                                className="inline-flex items-center gap-2 rounded-full bg-primary/10 border border-primary/30 px-6 py-2.5 text-xs font-semibold uppercase tracking-[0.1em] text-primary transition-all duration-300 hover:bg-primary hover:text-primary-foreground hover:border-primary hover:shadow-lg hover:shadow-primary/20"
                              >
                                View Work
                                <ExternalLink className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </motion.div>
              )}

              {!loading && hasMoreProjects && (
                <div className="mt-14 flex justify-center">
                  <button
                    type="button"
                    onClick={() => setVisibleCount((count) => count + 9)}
                    className="inline-flex min-w-40 items-center justify-center rounded-full border-2 border-primary/40 bg-primary/10 px-8 py-3 text-sm font-semibold uppercase tracking-[0.1em] text-primary transition-all duration-300 hover:-translate-y-0.5 hover:bg-primary hover:text-primary-foreground hover:border-primary hover:shadow-[0_12px_28px_rgba(239,68,68,0.35)]"
                  >
                    Load More Projects
                  </button>
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