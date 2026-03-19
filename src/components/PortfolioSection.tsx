import { motion, useInView } from "framer-motion";
import { useEffect, useMemo, useRef, useState } from "react";
import { useLiveData } from "@/hooks/useLiveData";
import { Link, useNavigate } from "react-router-dom";
import { FileText, MessageCircle } from "lucide-react";
import { buildCardImageSources } from "@/components/shared/mediaUrl";
import { DEFAULT_HOME_PAGE_SETTINGS, type HomePortfolioSection } from "@/components/shared/homePageSettings";
import { getProjectPdfDocument, getProjectPrimaryCardMedia } from "@/components/shared/projectMedia";
import PdfPreview from "@/components/shared/PdfPreview";

interface Project {
  id: string;
  title: string;
  category: string | null;
  description: string;
  client?: string;
  image_url?: string | null;
  media?: Array<{ url?: string; type?: string; name?: string | null }> | null;
}

const PortfolioCardImage = ({
  project,
  title,
  category,
  index,
}: {
  project: Project;
  title: string;
  category: string;
  index: number;
}) => {
  const previewMedia = useMemo(() => getProjectPrimaryCardMedia(project), [project]);
  const imageUrl = previewMedia?.type === "image" ? previewMedia.url : "";
  const imageSources = useMemo(() => (imageUrl ? buildCardImageSources(imageUrl) : null), [imageUrl]);
  const hasPdf = Boolean(getProjectPdfDocument(project));
  const [isImageReady, setIsImageReady] = useState(previewMedia?.type !== "image");
  const eagerImage = index < 3;

  useEffect(() => {
    setIsImageReady(previewMedia?.type !== "image");
  }, [previewMedia?.type, imageUrl]);

  return (
    <div className="relative overflow-hidden aspect-video">
      {previewMedia?.type === "video" ? (
        <video
          src={previewMedia.url}
          className="w-full h-full object-cover"
          muted
          playsInline
          preload="none"
        />
      ) : previewMedia?.type === "pdf" ? (
        <PdfPreview url={previewMedia.url} title={title} loading={eagerImage ? "eager" : "lazy"} />
      ) : imageSources ? (
        <>
          <div
            className={`absolute inset-0 bg-muted/35 transition-opacity duration-300 ${isImageReady ? "opacity-0" : "opacity-100"}`}
            aria-hidden="true"
          />
          <img
            src={imageSources.src}
            srcSet={imageSources.srcSet}
            alt={title}
            width={600}
            height={400}
            loading={eagerImage ? "eager" : "lazy"}
            fetchPriority={eagerImage ? "high" : "low"}
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            decoding="async"
            onLoad={() => setIsImageReady(true)}
            onError={() => setIsImageReady(true)}
            className={`w-full h-full object-cover transition-[transform,opacity] duration-300 group-hover:scale-[1.02] ${isImageReady ? "opacity-100" : "opacity-0"}`}
          />
        </>
      ) : (
        <div className="flex h-full items-center justify-center bg-muted/20 text-sm text-muted-foreground">
          No Preview
        </div>
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      <div className="absolute top-4 left-4">
        <span className="text-xs px-3 py-1 rounded-full bg-primary/90 text-primary-foreground shadow-glow">
          {category}
        </span>
      </div>
      {hasPdf && (
        <div className="absolute bottom-4 left-4">
          <span className="inline-flex items-center gap-1 rounded-full border border-white/25 bg-black/55 px-2.5 py-1 text-[11px] font-medium text-white">
            <FileText className="h-3.5 w-3.5" />
            PDF
          </span>
        </div>
      )}
    </div>
  );
};

interface PortfolioSectionProps {
  data?: HomePortfolioSection;
}

const PortfolioSection = ({ data }: PortfolioSectionProps) => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });
  const [activeCategory, setActiveCategory] = useState("All");
  const navigate = useNavigate();
  const content = data ?? DEFAULT_HOME_PAGE_SETTINGS.sections.portfolio;

  const { data: projects, loading } = useLiveData("projects", {
    cacheTimeMs: 120_000,
    revalidate: false,
  });
  const projectList = projects as Project[];

  const uniqueCategories = useMemo(
    () => [
      "All",
      ...Array.from(new Set(projectList.map((p) => p.category || "Uncategorized"))),
    ],
    [projectList],
  );

  const filteredProjects = useMemo(
    () =>
      activeCategory === "All"
        ? projectList
        : projectList.filter((p) => (p.category || "Uncategorized") === activeCategory),
    [activeCategory, projectList],
  );
  const visibleProjects = useMemo(() => filteredProjects.slice(0, 6), [filteredProjects]);
  const openDetails = (project: Project) => {
    if (!project?.id) return;
    navigate(`/portfolio/${encodeURIComponent(project.id)}`, { viewTransition: true });
  };

  return (
    <section id="portfolio" className="relative overflow-hidden bg-secondary/30 py-14 md:py-16 lg:py-20">
      <div className="container-narrow relative z-10" ref={ref}>
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          className="text-center max-w-3xl mx-auto mb-12"
        >
          <span className="text-primary font-semibold text-sm uppercase tracking-wider">
            {content.badge}
          </span>
          <h2 className="text-4xl md:text-5xl font-bold mt-4 mb-6 text-foreground">
            {content.title}
            <span className="text-gradient-primary">{content.title_highlight}</span>
          </h2>
          <p className="text-muted-foreground text-lg">
            {content.description}
          </p>
        </motion.div>

        {/* Category Filter */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
          className="flex flex-wrap justify-center gap-3 mb-12"
        >
          {uniqueCategories.map((category) => (
            <button
              key={category}
              onClick={() => setActiveCategory(category)}
              className={`px-6 py-2 rounded-full text-sm font-medium transition-all duration-300 ${activeCategory === category
                ? "bg-primary text-primary-foreground shadow-glow"
                : "bg-card border border-border hover:border-primary/50 text-muted-foreground hover:text-foreground"
                }`}
            >
              {category}
            </button>
          ))}
        </motion.div>

        {/* Projects Grid */}
        {loading ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-64 rounded-2xl bg-muted/20" />
            ))}
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {visibleProjects.map((project, index) => {
              return (
                <div
                  key={project.id || index}
                  className="group cursor-pointer"
                  onClick={() => openDetails(project)}
                >
                  <div className="glass-card dark:backdrop-blur-0 overflow-hidden h-full flex flex-col">
                    <PortfolioCardImage
                      project={project}
                      title={project.title}
                      category={project.category || "Uncategorized"}
                      index={index}
                    />
                    <div className="p-6 flex-grow flex flex-col justify-between">
                      <div>
                        <h3 className="text-lg font-semibold text-foreground mb-2 group-hover:text-primary transition-colors">
                          {project.title}
                        </h3>
                        <p className="text-sm text-muted-foreground line-clamp-3 mb-4">{project.description}</p>
                      </div>
                      {project.client && (
                        <div className="mt-auto pt-4 border-t border-border/50">
                          <p className="text-xs font-semibold tracking-wider text-primary uppercase">
                            CLIENT: <span className="text-primary/80">{project.client}</span>
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}

            {visibleProjects.length === 0 && (
              <div className="col-span-full text-center py-20 text-muted-foreground">
                <p>No projects found in this category.</p>
              </div>
            )}
          </div>
        )}

        <motion.div
          initial={{ opacity: 0 }}
          animate={isInView ? { opacity: 1 } : {}}
          transition={{ duration: 0.6, delay: 0.6 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-3 mt-12"
        >
          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
            <Link
              to={content.primary_href}
              className="inline-flex min-w-40 items-center justify-center rounded-full border border-primary/55 bg-primary/10 px-6 py-3 text-sm font-semibold uppercase tracking-[0.12em] text-primary transition-all duration-300 ease-out hover:-translate-y-0.5 hover:bg-primary hover:text-primary-foreground hover:shadow-[0_10px_24px_rgba(239,68,68,0.35)]"
            >
              {content.primary_label}
            </Link>
          </motion.div>
          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
            <a
              href={content.secondary_href}
              target="_blank"
              rel="noreferrer"
              className="inline-flex min-w-[250px] whitespace-nowrap items-center justify-center gap-2 rounded-full border border-emerald-600/50 dark:border-emerald-500/40 bg-emerald-500/16 dark:bg-emerald-500/12 px-6 py-3 text-sm font-semibold uppercase tracking-[0.08em] text-emerald-700 dark:text-emerald-300 shadow-[0_8px_20px_rgba(16,185,129,0.16)] transition-all duration-300 ease-out hover:-translate-y-0.5 hover:bg-emerald-500/24 dark:hover:bg-emerald-500/20 hover:border-emerald-700/70 dark:hover:border-emerald-400/60"
            >
              {content.secondary_label}
              <MessageCircle className="w-4 h-4" />
            </a>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
};

export default PortfolioSection;
