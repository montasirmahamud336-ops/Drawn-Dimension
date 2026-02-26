import { motion } from "framer-motion";
import { useInView } from "framer-motion";
import { useRef } from "react";
import {
  Globe, PenTool, Box, GitBranch, ShieldCheck, Palette,
  Wrench, ArrowRight, ArrowUpRight, MessageCircle
} from "lucide-react";
import { Link } from "react-router-dom";

const ServicesSection = () => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });
  const whatsappUrl = "https://wa.me/8801775119416";

  const services = [
    { icon: Globe, title: "Web Design & Development", description: "Stunning, responsive websites built with modern technologies. From landing pages to complex web applications.", features: ["Custom Design", "React/Next.js", "E-commerce", "CMS Integration"], link: "/services/web-design" },
    { icon: PenTool, title: "AutoCAD Technical Drawings", description: "Precise 2D technical drawings and documentation for engineering, architecture, and manufacturing projects.", features: ["2D Drafting", "As-Built Drawings", "Shop Drawings", "Detail Plans"], link: "/services/autocad" },
    { icon: Box, title: "3D SolidWorks Modeling", description: "Advanced 3D modeling and simulation for product design, prototyping, and mechanical engineering.", features: ["3D Modeling", "Assembly Design", "FEA Analysis", "Rendering"], link: "/services/solidworks" },
    { icon: GitBranch, title: "PFD & P&ID Diagrams", description: "Comprehensive process flow diagrams and piping & instrumentation diagrams for industrial applications.", features: ["Process Design", "P&ID Standards", "Equipment Specs", "Control Systems"], link: "/services/pfd-pid" },
    { icon: ShieldCheck, title: "HAZOP Study & Risk Analysis", description: "Thorough hazard and operability studies to ensure safety and compliance in industrial processes.", features: ["Risk Assessment", "Safety Analysis", "Compliance", "Documentation"], link: "/services/hazop" },
    { icon: Palette, title: "Graphic Design & Branding", description: "Creative visual solutions from marketing materials to complete brand identities that captivate audiences.", features: ["Brand Identity", "Marketing Materials", "Social Media", "Print Design"], link: "/services/graphic-design" },
  ];

  return (
    <section id="services" className="relative overflow-hidden bg-secondary/30 py-14 md:py-16 lg:py-20">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_20%,rgba(239,68,68,0.14),transparent_36%)] pointer-events-none" />
      <div className="container-narrow relative z-10" ref={ref}>
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          className="text-center max-w-3xl mx-auto mb-16"
        >
          <span className="text-primary font-semibold text-sm uppercase tracking-wider">Our Services</span>
          <h2 className="text-4xl md:text-5xl font-bold mt-4 mb-6 text-foreground">
            Comprehensive Solutions for
            <span className="text-gradient-primary block">Every Challenge</span>
          </h2>
          <p className="text-muted-foreground/95 text-lg leading-relaxed">
            From concept to completion, we provide end-to-end services that combine engineering precision with creative innovation.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {services.map((service, index) => (
            <motion.div
              key={service.title}
              initial={{ opacity: 0, y: 50 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.7, delay: index * 0.1, ease: [0.22, 1, 0.36, 1] }}
              className="group"
            >
              <div className="service-card h-full flex flex-col bg-gradient-to-br from-background via-background to-primary/[0.05] border-border/60 relative overflow-hidden">
                <div className="pointer-events-none absolute top-0 left-6 right-6 h-px bg-gradient-to-r from-transparent via-primary/70 to-transparent" />
                <div className="flex items-start justify-between mb-6">
                  <div className="w-14 h-14 bg-primary/12 border border-primary/25 rounded-2xl flex items-center justify-center group-hover:bg-primary/20 transition-all duration-500 ease-out">
                    <service.icon className="w-7 h-7 text-primary" />
                  </div>
                </div>

                <h3 className="text-xl font-semibold text-foreground mb-3 group-hover:text-primary transition-colors duration-300 tracking-tight">
                  {service.title}
                </h3>
                <p className="text-muted-foreground/95 text-sm mb-6 flex-grow leading-relaxed">
                  {service.description}
                </p>

                <div className="flex flex-wrap gap-2 mb-6 pt-4 border-t border-border/50">
                  {service.features.map((feature) => (
                    <span key={feature} className="text-xs px-3 py-1.5 rounded-full border border-primary/20 bg-primary/[0.12] text-primary font-medium">
                      {feature}
                    </span>
                  ))}
                </div>

                <Link
                  to={service.link}
                  className="inline-flex items-center justify-center gap-2 w-full py-3 rounded-xl text-sm font-semibold bg-secondary/85 text-secondary-foreground hover:bg-primary hover:text-primary-foreground border border-border hover:border-primary transition-all duration-300"
                >
                  Get Started
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8, delay: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="mt-12 glass-panel p-8 text-center border-primary/20 bg-gradient-to-br from-background/90 to-primary/[0.05]"
        >
          <div className="flex items-center justify-center gap-3 mb-4">
            <Wrench className="w-6 h-6 text-primary" />
            <h3 className="text-xl font-semibold text-foreground">And Many More Engineering Services</h3>
          </div>
          <p className="text-muted-foreground max-w-2xl mx-auto mb-6">
            We offer a wide range of additional engineering and digital services tailored to your specific needs.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 w-full">
            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Link to="/services" className="btn-primary inline-flex items-center gap-2 w-full sm:w-auto sm:min-w-[280px]">
                View All Services
                <ArrowUpRight className="w-4 h-4" />
              </Link>
            </motion.div>
            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center justify-center gap-2 h-[48px] w-full sm:w-auto sm:min-w-[280px] whitespace-nowrap px-8 rounded-xl border border-emerald-600/50 dark:border-emerald-500/35 bg-emerald-500/16 dark:bg-emerald-500/12 text-emerald-700 dark:text-emerald-300 font-semibold hover:bg-emerald-500/24 dark:hover:bg-emerald-500/20 hover:border-emerald-700/70 dark:hover:border-emerald-400/55 shadow-[0_8px_20px_rgba(16,185,129,0.16)] transition-all duration-300"
              >
                Message Us on WhatsApp
                <MessageCircle className="w-4 h-4" />
              </a>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default ServicesSection;
