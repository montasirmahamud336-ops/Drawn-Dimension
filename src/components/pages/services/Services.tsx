import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import CTASection from "@/components/CTASection";
import PageTransition from "@/components/shared/PageTransition";
import PageHero from "@/components/shared/PageHero";
import ServiceCard from "@/components/shared/ServiceCard";
import { Globe, PenTool, Box, GitBranch, ShieldCheck, Palette } from "lucide-react";
import { motion } from "framer-motion";
import PremiumBackground from "@/components/shared/PremiumBackground";

const Services = () => {
  const services = [
    {
      icon: Globe,
      title: "Web Design & Development",
      description: "Stunning, responsive websites built with modern technologies. From landing pages to complex web applications.",
      link: "/services/web-design",
      features: ["Custom Design", "React/Next.js", "E-commerce", "CMS Integration"],
    },
    {
      icon: PenTool,
      title: "AutoCAD Technical Drawings",
      description: "Precise 2D technical drawings and documentation for engineering, architecture, and manufacturing projects.",
      link: "/services/autocad",
      features: ["2D Drafting", "As-Built Drawings", "Shop Drawings", "Detail Plans"],
    },
    {
      icon: Box,
      title: "3D SolidWorks Modeling",
      description: "Advanced 3D modeling and simulation for product design, prototyping, and mechanical engineering.",
      link: "/services/solidworks",
      features: ["3D Modeling", "Assembly Design", "FEA Analysis", "Rendering"],
    },
    {
      icon: GitBranch,
      title: "PFD & P&ID Diagrams",
      description: "Comprehensive process flow diagrams and piping & instrumentation diagrams for industrial applications.",
      link: "/services/pfd-pid",
      features: ["Process Design", "P&ID Standards", "Equipment Specs", "Control Systems"],
    },
    {
      icon: ShieldCheck,
      title: "HAZOP Study & Risk Analysis",
      description: "Thorough hazard and operability studies to ensure safety and compliance in industrial processes.",
      link: "/services/hazop",
      features: ["Risk Assessment", "Safety Analysis", "Compliance", "Documentation"],
    },
    {
      icon: Palette,
      title: "Graphic Design & Branding",
      description: "Creative visual solutions from marketing materials to complete brand identities that captivate audiences.",
      link: "/services/graphic-design",
      features: ["Brand Identity", "Marketing Materials", "Social Media", "Print Design"],
    },
  ];

  return (
    <PageTransition>
      <PremiumBackground>
        <Navigation />
        <main>
          <PageHero
            title="Our Services"
            subtitle="What We Offer"
            description="Comprehensive engineering and digital solutions tailored to transform your vision into reality."
          />

          <section className="section-padding relative overflow-hidden">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_14%_18%,rgba(239,68,68,0.12),transparent_34%)] pointer-events-none" />
            <div className="absolute -bottom-24 right-[-8%] w-[24rem] h-[24rem] rounded-full bg-primary/10 blur-3xl pointer-events-none" />
            <div className="container-narrow relative z-10">
              <motion.div
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.55 }}
                className="glass-panel p-4 sm:p-5 md:p-6 border-border/55 bg-gradient-to-br from-background/80 to-primary/[0.05] mb-10"
              >
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {[
                    { value: "ISO", label: "Certified process quality" },
                    { value: "24/7", label: "Dedicated project support" },
                    { value: "500+", label: "Successful project delivery" },
                  ].map((item) => (
                    <div
                      key={item.value}
                      className="rounded-2xl border border-border/50 bg-background/65 px-5 py-4 text-center"
                    >
                      <div className="text-2xl md:text-3xl font-bold text-primary tracking-tight">{item.value}</div>
                      <div className="mt-1 text-sm text-muted-foreground">{item.label}</div>
                    </div>
                  ))}
                </div>
              </motion.div>

              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {services.map((service, index) => (
                  <ServiceCard key={service.title} {...service} index={index} />
                ))}
              </div>
            </div>
          </section>

          <CTASection />
        </main>
        <Footer />
      </PremiumBackground>
    </PageTransition>
  );
};

export default Services;
