import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import CTASection from "@/components/CTASection";
import PageTransition from "@/components/shared/PageTransition";
import PageHero from "@/components/shared/PageHero";
import { motion, AnimatePresence } from "framer-motion";
import { MouseEvent, useMemo, useState } from "react";
import { ExternalLink, Loader2, ChevronLeft, ChevronRight } from "lucide-react";
import PremiumBackground from "@/components/shared/PremiumBackground";
import { useLiveData } from "@/hooks/useLiveData";
import { useNavigate } from "react-router-dom";

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
  return [{ url: "https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=800&h=600&fit=crop", type: "image" }];
};

const PortfolioMedia = ({ project }: { project: any }) => {
  const media = getMediaList(project);
  const [index, setIndex] = useState(0);
  const [direction, setDirection] = useState<1 | -1>(1);
  const current = media[index];
  const hasMany = media.length > 1;

  const prev = (e: MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (!hasMany) return;
    setDirection(-1);
    setIndex((i) => (i - 1 + media.length) % media.length);
  };

  const next = (e: MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (!hasMany) return;
    setDirection(1);
    setIndex((i) => (i + 1) % media.length);
  };

  return (
    <div className="relative overflow-hidden aspect-video">
      <AnimatePresence initial={false} mode="wait" custom={direction}>
        <motion.div
          key={`${current.url}-${index}`}
          custom={direction}
          initial={{ opacity: 0, x: direction > 0 ? 24 : -24 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: direction > 0 ? -24 : 24 }}
          transition={{ duration: 0.22, ease: "easeOut" }}
          className="absolute inset-0"
        >
          {current.type === "video" ? (
            <video src={current.url} className="w-full h-full object-cover" autoPlay muted loop playsInline />
          ) : (
            <img
              src={current.url}
              alt={project.title}
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
            />
          )}
        </motion.div>
      </AnimatePresence>
      <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      <div className="absolute top-4 left-4">
        <span className="text-xs px-3 py-1 rounded-full border border-primary/35 bg-primary/90 text-primary-foreground shadow-[0_8px_18px_rgba(239,68,68,0.35)]">
          {project.displayCategory || project.category || "Uncategorized"}
        </span>
      </div>
      <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
        <div className="w-10 h-10 rounded-full bg-primary/80 flex items-center justify-center">
          <ExternalLink className="w-5 h-5 text-primary-foreground" />
        </div>
      </div>
      {hasMany && (
        <>
          <button
            type="button"
            onClick={prev}
            className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/60 text-white flex items-center justify-center"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={next}
            className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/60 text-white flex items-center justify-center"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </>
      )}
    </div>
  );
};

const Portfolio = () => {
  const [activeCategory, setActiveCategory] = useState("All");
  const navigate = useNavigate();

  const categories = ["All", "Web Design", "CAD & 3D", "Engineering", "Branding"];

  const { data: projects, loading } = useLiveData("projects");
  const openDetails = (project: any) => {
    if (!project?.id) return;
    navigate(`/portfolio/${encodeURIComponent(project.id)}`);
  };

  const normalizeCategory = (raw?: string | null) => {
    if (!raw) return "Uncategorized";
    const value = raw.toLowerCase();
    if (["web design", "web design & development", "web development"].some((v) => value.includes(v))) {
      return "Web Design";
    }
    if (["autocad", "solidworks", "3d", "cad"].some((v) => value.includes(v))) {
      return "CAD & 3D";
    }
    if (["pfd", "p&id", "hazop", "engineering"].some((v) => value.includes(v))) {
      return "Engineering";
    }
    if (["branding", "graphic design"].some((v) => value.includes(v))) {
      return "Branding";
    }
    if (categories.includes(raw)) {
      return raw;
    }
    return raw;
  };

  const normalizedProjects = useMemo(
    () =>
      projects.map((project: any) => ({
        ...project,
        displayCategory: normalizeCategory(project.category),
      })),
    [projects]
  );

  const filteredProjects = activeCategory === "All"
    ? normalizedProjects
    : normalizedProjects.filter((p: any) => p.displayCategory === activeCategory);


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

          <section className="section-padding relative overflow-hidden">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_85%_18%,rgba(239,68,68,0.14),transparent_34%)] pointer-events-none" />
            <div className="absolute -bottom-24 left-[-8%] w-[24rem] h-[24rem] rounded-full bg-primary/10 blur-3xl pointer-events-none" />
            <div className="container-narrow relative z-10">
              {/* Category Filter */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                className="glass-panel p-4 sm:p-5 border-border/55 bg-gradient-to-br from-background/80 to-primary/[0.05] flex flex-wrap justify-center gap-3 mb-12"
              >
                {categories.map((category) => (
                  <button
                    key={category}
                    onClick={() => setActiveCategory(category)}
                    className={`px-6 py-2 rounded-full text-sm font-medium transition-all duration-300 ${activeCategory === category
                      ? "bg-primary text-primary-foreground shadow-[0_10px_24px_rgba(239,68,68,0.35)]"
                      : "bg-card/80 border border-border hover:border-primary/50 text-muted-foreground hover:text-foreground"
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
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <AnimatePresence mode="wait">
                    {filteredProjects.map((project: any, index: number) => (
                      <motion.div
                        key={project.id || project.title}
                        layout
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        transition={{ duration: 0.4, delay: index * 0.05 }}
                        className="group cursor-pointer"
                        onClick={() => openDetails(project)}
                      >
                        <div className="glass-card overflow-hidden h-full flex flex-col bg-[linear-gradient(158deg,rgba(255,255,255,0.04),rgba(255,255,255,0.01)_42%,rgba(239,68,68,0.08)_100%)] border-border/60 group-hover:border-primary/40 transition-all duration-500 group-hover:-translate-y-1">
                          <PortfolioMedia project={project} />
                          <div className="p-6 flex-grow flex flex-col">
                            <h3 className="text-lg font-semibold tracking-tight text-foreground mb-2 group-hover:text-primary transition-colors">
                              {project.title}
                            </h3>
                            <p className="text-sm text-muted-foreground/95 leading-relaxed mb-4 flex-grow">{project.description}</p>
                            <div className="mt-auto flex items-center justify-between">
                              <p className="text-xs uppercase tracking-[0.12em] text-primary/90">Client: {project.client || "Confidential"}</p>
                              <span className="text-xs uppercase tracking-[0.12em] text-primary">Contact Us</span>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
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
