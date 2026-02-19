import { motion } from "framer-motion";
import { useInView } from "framer-motion";
import { useRef, useState } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { useLiveData } from "@/hooks/useLiveData";

const PortfolioSection = () => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });
  const [activeCategory, setActiveCategory] = useState("All");

  interface Project {
    id: string;
    title: string;
    category: string | null;
    description: string;
    client?: string;
    image_url?: string | null;
  }

  const { data: projects, loading } = useLiveData("projects");

  const uniqueCategories = [
    "All",
    ...Array.from(
      new Set((projects as Project[]).map((p) => p.category || "Uncategorized"))
    )
  ];

  const filteredProjects = activeCategory === "All"
    ? (projects as Project[])
    : (projects as Project[]).filter(p => (p.category || "Uncategorized") === activeCategory);

  return (
    <section id="portfolio" className="section-padding relative overflow-hidden bg-secondary/30">
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
            {filteredProjects.map((project, index) => {
              return (
                <motion.div
                  key={project.id || index}
                  layout
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.5, delay: index * 0.1, ease: [0.22, 1, 0.36, 1] }}
                  className="group cursor-pointer"
                >
                  <div className="glass-card overflow-hidden h-full flex flex-col">
                    <div className="relative overflow-hidden aspect-video">
                      <img
                        src={project.image_url || "https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=600&h=400&fit=crop"}
                        alt={project.title}
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
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

            {filteredProjects.length === 0 && (
              <div className="col-span-full text-center py-20 text-muted-foreground">
                <p>No projects found in this category.</p>
              </div>
            )}
          </div>
        )}

        {/* Navigation Arrows (Optional) */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={isInView ? { opacity: 1 } : {}}
          transition={{ duration: 0.6, delay: 0.6 }}
          className="flex justify-center gap-4 mt-12"
        >
          <button className="w-12 h-12 rounded-full border border-border hover:border-primary hover:bg-primary/10 flex items-center justify-center transition-all">
            <ArrowLeft className="w-5 h-5 text-muted-foreground" />
          </button>
          <button className="w-12 h-12 rounded-full border border-border hover:border-primary hover:bg-primary/10 flex items-center justify-center transition-all">
            <ArrowRight className="w-5 h-5 text-muted-foreground" />
          </button>
        </motion.div>
      </div>
    </section>
  );
};

export default PortfolioSection;
