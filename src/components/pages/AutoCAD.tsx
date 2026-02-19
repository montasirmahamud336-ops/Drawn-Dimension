import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import CTASection from "@/components/CTASection";
import PageTransition from "@/components/shared/PageTransition";
import PageHero from "@/components/shared/PageHero";
import HowWeWork from "@/components/shared/HowWeWork";
import PricingCards from "@/components/shared/PricingCards";
import { motion } from "framer-motion";
import { PenTool, Ruler, FileCheck, Layers, Building, Factory, CheckCircle, Compass, Grid3X3, Maximize } from "lucide-react";
import PremiumBackground from "@/components/shared/PremiumBackground";

const AutoCAD = () => {
  const features = [
    { icon: Ruler, title: "Precision Drafting", description: "Accurate 2D technical drawings with exact measurements and specifications." },
    { icon: Layers, title: "Layer Management", description: "Organized drawing layers for easy modification and clarity." },
    { icon: FileCheck, title: "Industry Standards", description: "Drawings compliant with international engineering standards." },
    { icon: Building, title: "Architectural Plans", description: "Detailed floor plans, elevations, and construction documents." },
    { icon: Factory, title: "Industrial Layouts", description: "Plant layouts, equipment arrangements, and facility plans." },
    { icon: Grid3X3, title: "Detail Drawings", description: "Comprehensive detail drawings for fabrication and construction." },
  ];

  const services = ["2D Technical Drawings", "As-Built Documentation", "Shop Drawings", "Architectural Plans", "Mechanical Drawings", "Electrical Schematics", "Structural Details", "Site Plans"];

  const industries = [
    { icon: Building, name: "Architecture" },
    { icon: Factory, name: "Manufacturing" },
    { icon: Compass, name: "Civil Engineering" },
    { icon: Maximize, name: "Mechanical" },
  ];

  const steps = [
    { step: "01", title: "Requirements", description: "Gather specifications, reference drawings, and project scope" },
    { step: "02", title: "Drafting", description: "Create precise technical drawings per industry standards" },
    { step: "03", title: "Review", description: "Internal QA check and client review with feedback" },
    { step: "04", title: "Delivery", description: "Final drawings in DWG, PDF, and requested formats" },
  ];

  const pricing = [
    { name: "Basic", price: "$299", description: "Simple 2D drawings", features: ["Up to 3 sheets", "Standard details", "1 revision", "DWG + PDF delivery", "5-day turnaround"] },
    { name: "Standard", price: "$799", description: "Detailed documentation", features: ["Up to 10 sheets", "Complex details", "3 revisions", "All formats", "Title block customization"], popular: true },
    { name: "Premium", price: "$1,999", description: "Full project package", features: ["Unlimited sheets", "As-built documentation", "5 revisions", "Rush delivery available", "Dedicated drafter"] },
    { name: "Custom", price: "Contact", description: "Enterprise projects", features: ["Custom scope", "Ongoing support", "Bulk pricing", "Priority turnaround", "Project management"] },
  ];

  return (
    <PageTransition>
      <PremiumBackground>
        <Navigation />
        <main>
          <PageHero title="AutoCAD Technical Drawings" subtitle="Precision Engineering" description="Professional 2D technical drawings and documentation that meet the highest standards of precision." />

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
                  <span className="text-primary font-semibold text-sm uppercase tracking-wider">Our Expertise</span>
                  <h2 className="text-4xl font-bold mt-4 mb-6 text-foreground">Comprehensive AutoCAD Services</h2>
                  <p className="text-muted-foreground mb-8">Our experienced drafters deliver precise technical drawings for various industries.</p>
                  <div className="grid grid-cols-2 gap-4">
                    {services.map((service) => (
                      <div key={service} className="flex items-center gap-3">
                        <CheckCircle className="w-5 h-5 text-primary flex-shrink-0" />
                        <span className="text-sm text-muted-foreground">{service}</span>
                      </div>
                    ))}
                  </div>
                </motion.div>
                <motion.div initial={{ opacity: 0, x: 50 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.8 }} className="glass-card p-8">
                  <h3 className="text-xl font-bold text-foreground mb-6">Industries We Serve</h3>
                  <div className="grid grid-cols-2 gap-6">
                    {industries.map((industry) => (
                      <div key={industry.name} className="flex items-center gap-4 p-4 bg-secondary rounded-xl">
                        <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                          <industry.icon className="w-6 h-6 text-primary" />
                        </div>
                        <span className="font-medium text-foreground">{industry.name}</span>
                      </div>
                    ))}
                  </div>
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

export default AutoCAD;
