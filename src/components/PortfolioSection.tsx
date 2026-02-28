import { motion, useInView, useReducedMotion } from "framer-motion";
import { useMemo, useRef, useState } from "react";
import { useLiveData } from "@/hooks/useLiveData";
import { Link, useNavigate } from "react-router-dom";
import { MessageCircle } from "lucide-react";

const PortfolioSection = () => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });
  const shouldReduceMotion = useReducedMotion();
  const [activeCategory, setActiveCategory] = useState("All");
  const navigate = useNavigate();
  const whatsappUrl = "https://wa.me/8801775119416";

  interface Project {
    id: string;
    title: string;
    category: string | null;
    description: string;
    client?: string;
    image_url?: string | null;
  }

  const { data: projects, loading } = useLiveData("projects");
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
            Our Portfolio
          </span>
          <h2 className="text-4xl md:text-5xl font-bold mt-4 mb-6 text-foreground">
            Projects That
            <span className="text-gradient-primary">Speak Excellence</span>
          </h2>
          <p className="text-muted-foreground text-lg">
            Explore our diverse portfolio showcasing engineering precision, creative
            innovation, and technical expertise across multiple disciplines.
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
                <motion.div
                  key={project.id || index}
                  initial={shouldReduceMotion ? false : { opacity: 0, y: 14 }}
                  animate={isInView ? { opacity: 1, y: 0 } : {}}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={
                    shouldReduceMotion
                      ? { duration: 0 }
                      : { duration: 0.34, delay: index * 0.04, ease: [0.22, 1, 0.36, 1] }
                  }
                  className="group cursor-pointer"
                  onClick={() => openDetails(project)}
                >
                  <div className="glass-card overflow-hidden h-full flex flex-col">
                    <div className="relative overflow-hidden aspect-video">
                      <img
                        src={project.image_url || "https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=600&h=400&fit=crop"}
                        alt={project.title}
                        width={600}
                        height={400}
                        loading={index < 3 ? "eager" : "lazy"}
                        fetchPriority={index < 3 ? "high" : "auto"}
                        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                        decoding="async"
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                      <div className="absolute top-4 left-4">
                        <span className="text-xs px-3 py-1 rounded-full bg-primary/90 text-primary-foreground shadow-glow">
                          {project.category || "Uncategorized"}
                        </span>
                      </div>
                    </div>
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
                </motion.div>
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
              to="/portfolio"
              className="inline-flex min-w-40 items-center justify-center rounded-full border border-primary/55 bg-primary/10 px-6 py-3 text-sm font-semibold uppercase tracking-[0.12em] text-primary transition-all duration-300 ease-out hover:-translate-y-0.5 hover:bg-primary hover:text-primary-foreground hover:shadow-[0_10px_24px_rgba(239,68,68,0.35)]"
            >
              View More
            </Link>
          </motion.div>
          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex min-w-[250px] whitespace-nowrap items-center justify-center gap-2 rounded-full border border-emerald-600/50 dark:border-emerald-500/40 bg-emerald-500/16 dark:bg-emerald-500/12 px-6 py-3 text-sm font-semibold uppercase tracking-[0.08em] text-emerald-700 dark:text-emerald-300 shadow-[0_8px_20px_rgba(16,185,129,0.16)] transition-all duration-300 ease-out hover:-translate-y-0.5 hover:bg-emerald-500/24 dark:hover:bg-emerald-500/20 hover:border-emerald-700/70 dark:hover:border-emerald-400/60"
            >
              Message on WhatsApp
              <MessageCircle className="w-4 h-4" />
            </a>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
};

export default PortfolioSection;
