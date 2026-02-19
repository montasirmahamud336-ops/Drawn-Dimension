import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import CTASection from "@/components/CTASection";
import PageTransition from "@/components/shared/PageTransition";
import PageHero from "@/components/shared/PageHero";
import HowWeWork from "@/components/shared/HowWeWork";
import PricingCards from "@/components/shared/PricingCards";
import { motion } from "framer-motion";
import { Box, Cpu, Layers, RotateCcw, Eye, Settings, CheckCircle, Cog, Package, Zap } from "lucide-react";
import PremiumBackground from "@/components/shared/PremiumBackground";

const SolidWorks = () => {
  const features = [
    { icon: Box, title: "3D Part Modeling", description: "Precise 3D models with complex geometries and parametric features." },
    { icon: Layers, title: "Assembly Design", description: "Complex assemblies with proper constraints and motion studies." },
    { icon: Cpu, title: "FEA Analysis", description: "Finite element analysis for stress, strain, and deformation studies." },
    { icon: Eye, title: "Photorealistic Rendering", description: "High-quality visualizations for presentations and marketing." },
    { icon: RotateCcw, title: "Motion Simulation", description: "Kinematic and dynamic motion studies for mechanism analysis." },
    { icon: Settings, title: "Design Automation", description: "Parametric design tools for efficient design iterations." },
  ];

  const capabilities = ["Product Design & Development", "Mechanical Component Modeling", "Sheet Metal Design", "Weldment Structures", "Surface Modeling", "Mold Design", "Design Validation", "Technical Documentation"];

  const steps = [
    { step: "01", title: "Concept", description: "Understanding requirements and creating initial design concepts" },
    { step: "02", title: "Modeling", description: "Detailed 3D modeling with precise specifications and parameters" },
    { step: "03", title: "Analysis", description: "FEA simulation and motion studies for design validation" },
    { step: "04", title: "Delivery", description: "Final models, drawings, renders, and full documentation" },
  ];

  const pricing = [
    { name: "Basic", price: "$499", description: "Simple part modeling", features: ["Single part model", "2D drawings", "1 revision", "STEP/IGES export", "Standard rendering"] },
    { name: "Standard", price: "$1,499", description: "Assembly projects", features: ["Multi-part assembly", "FEA analysis", "3 revisions", "All file formats", "HD renderings"], popular: true },
    { name: "Premium", price: "$3,999", description: "Complex engineering", features: ["Full product design", "Motion simulation", "5 revisions", "Design optimization", "Animation delivery"] },
    { name: "Custom", price: "Contact", description: "Enterprise solutions", features: ["Custom scope", "Dedicated engineer", "Unlimited revisions", "Ongoing support", "IP protection"] },
  ];

  return (
    <PageTransition>
      <PremiumBackground>
        <Navigation />
        <main>
          <PageHero title="3D SolidWorks Modeling" subtitle="Advanced Design" description="Cutting-edge 3D modeling and simulation for product design and mechanical engineering." />

          <section className="section-padding">
            <div className="container-narrow">
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {features.map((feature, index) => (
                  <motion.div key={feature.title} initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5, delay: index * 0.1 }} className="glass-card p-6 group hover:border-primary/40 transition-all duration-300">
                    <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                      <feature.icon className="w-6 h-6 text-primary" />
                    </div>
                    <h3 className="font-semibold text-foreground mb-2">{feature.title}</h3>
                    <p className="text-sm text-muted-foreground">{feature.description}</p>
                  </motion.div>
                ))}
              </div>
            </div>
          </section>

          <section className="section-padding">
            <div className="container-narrow">
              <div className="grid lg:grid-cols-2 gap-16 items-center">
                <motion.div initial={{ opacity: 0, x: -50 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.8 }}>
                  <span className="text-primary font-semibold text-sm uppercase tracking-wider">Our Capabilities</span>
                  <h2 className="text-4xl font-bold mt-4 mb-6 text-foreground">Full-Spectrum 3D Design</h2>
                  <p className="text-muted-foreground mb-8">From concept to production-ready designs, our SolidWorks experts deliver comprehensive solutions.</p>
                  <div className="grid grid-cols-2 gap-4">
                    {capabilities.map((cap) => (
                      <div key={cap} className="flex items-center gap-3">
                        <CheckCircle className="w-5 h-5 text-primary flex-shrink-0" />
                        <span className="text-sm text-muted-foreground">{cap}</span>
                      </div>
                    ))}
                  </div>
                </motion.div>
                <motion.div initial={{ opacity: 0, x: 50 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.8 }} className="grid grid-cols-2 gap-4">
                  {[
                    { icon: Cog, label: "Mechanical", value: "500+" },
                    { icon: Package, label: "Products", value: "200+" },
                    { icon: Box, label: "Assemblies", value: "1000+" },
                    { icon: Zap, label: "Simulations", value: "300+" },
                  ].map((stat) => (
                    <div key={stat.label} className="glass-card p-6 text-center">
                      <stat.icon className="w-8 h-8 text-primary mx-auto mb-3" />
                      <div className="text-2xl font-bold text-foreground">{stat.value}</div>
                      <div className="text-sm text-muted-foreground">{stat.label}</div>
                    </div>
                  ))}
                </motion.div>
              </div>
            </div>
          </section>

          <HowWeWork steps={steps} />
          <PricingCards tiers={pricing} />
          <CTASection />
        </main>
        <Footer />
      </PremiumBackground>
    </PageTransition>
  );
};

export default SolidWorks;
