import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import CTASection from "@/components/CTASection";
import PageTransition from "@/components/shared/PageTransition";
import PageHero from "@/components/shared/PageHero";
import HowWeWork from "@/components/shared/HowWeWork";
import PricingCards from "@/components/shared/PricingCards";
import { motion } from "framer-motion";
import { GitBranch, Workflow, FileText, Settings, Database, Shield, CheckCircle, Factory, Droplets, Flame, Wind } from "lucide-react";
import PremiumBackground from "@/components/shared/PremiumBackground";

const PFDPID = () => {
  const features = [
    { icon: Workflow, title: "Process Flow Diagrams", description: "Clear PFDs showing major equipment, process streams, and material flow." },
    { icon: GitBranch, title: "P&ID Development", description: "Comprehensive piping and instrumentation diagrams with full detail." },
    { icon: Settings, title: "Equipment Specifications", description: "Detailed equipment schedules and specification sheets." },
    { icon: Database, title: "Instrument Lists", description: "Complete instrumentation databases and tag lists." },
    { icon: Shield, title: "Standards Compliance", description: "Adherence to ISA, ANSI, and industry-specific standards." },
    { icon: FileText, title: "Documentation", description: "Comprehensive documentation packages for operations and maintenance." },
  ];

  const industries = [
    { icon: Factory, name: "Petrochemical", description: "Refineries and chemical plants" },
    { icon: Droplets, name: "Water Treatment", description: "Municipal and industrial water" },
    { icon: Flame, name: "Oil & Gas", description: "Upstream and downstream facilities" },
    { icon: Wind, name: "Power Generation", description: "Thermal and renewable energy" },
  ];

  const deliverables = ["Process Flow Diagrams (PFD)", "Piping & Instrumentation Diagrams (P&ID)", "Equipment Data Sheets", "Instrument Index", "Line Lists", "Control Philosophy Documents", "Cause & Effect Diagrams", "Loop Diagrams"];

  const steps = [
    { step: "01", title: "Process Review", description: "Study process requirements, existing documentation, and safety data" },
    { step: "02", title: "Diagram Development", description: "Create PFDs and P&IDs following ISA/ANSI standards" },
    { step: "03", title: "Technical Review", description: "Multi-discipline review with process, mechanical, and instrumentation teams" },
    { step: "04", title: "Final Package", description: "Deliver approved diagrams with supporting documentation" },
  ];

  const pricing = [
    { name: "Basic", price: "$599", description: "Simple PFD/P&ID", features: ["Up to 2 diagrams", "Standard symbols", "1 revision", "PDF delivery", "Basic review"] },
    { name: "Standard", price: "$1,999", description: "Process documentation", features: ["Up to 8 diagrams", "Equipment data sheets", "3 revisions", "DWG + PDF", "Standards compliance"], popular: true },
    { name: "Premium", price: "$4,999", description: "Complete package", features: ["Unlimited diagrams", "Full documentation set", "5 revisions", "All formats", "Instrument index"] },
    { name: "Custom", price: "Contact", description: "Plant-wide projects", features: ["Custom scope", "Dedicated team", "Ongoing updates", "Site visits", "Compliance audit"] },
  ];

  return (
    <PageTransition>
      <PremiumBackground>
        <Navigation />
        <main>
          <PageHero title="PFD & P&ID Diagrams" subtitle="Process Engineering" description="Professional process flow diagrams and piping & instrumentation diagrams for industrial facilities." />

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
              <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.8 }} className="text-center mb-16">
                <span className="text-primary font-semibold text-sm uppercase tracking-wider">Industries We Serve</span>
                <h2 className="text-4xl font-bold mt-4 text-foreground">Specialized Industry Expertise</h2>
              </motion.div>
              <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                {industries.map((industry, index) => (
                  <motion.div key={industry.name} initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5, delay: index * 0.1 }} className="glass-card p-6 text-center group hover:border-primary/40 transition-all duration-300">
                    <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:bg-primary/20 transition-colors">
                      <industry.icon className="w-8 h-8 text-primary" />
                    </div>
                    <h3 className="font-semibold text-foreground mb-2">{industry.name}</h3>
                    <p className="text-sm text-muted-foreground">{industry.description}</p>
                  </motion.div>
                ))}
              </div>
            </div>
          </section>

          <section className="section-padding">
            <div className="container-narrow">
              <div className="grid lg:grid-cols-2 gap-16 items-center">
                <motion.div initial={{ opacity: 0, x: -50 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.8 }}>
                  <span className="text-primary font-semibold text-sm uppercase tracking-wider">What We Deliver</span>
                  <h2 className="text-4xl font-bold mt-4 mb-6 text-foreground">Complete Documentation</h2>
                  <p className="text-muted-foreground mb-8">Comprehensive documentation packages that support your facility throughout its lifecycle.</p>
                  <div className="grid grid-cols-2 gap-4">
                    {deliverables.map((item) => (
                      <div key={item} className="flex items-center gap-3">
                        <CheckCircle className="w-5 h-5 text-primary flex-shrink-0" />
                        <span className="text-sm text-muted-foreground">{item}</span>
                      </div>
                    ))}
                  </div>
                </motion.div>
                <motion.div initial={{ opacity: 0, x: 50 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.8 }} className="glass-card p-8">
                  <GitBranch className="w-16 h-16 text-primary mb-6" />
                  <h3 className="text-2xl font-bold text-foreground mb-4">Standards Compliance</h3>
                  <p className="text-muted-foreground mb-6">All diagrams comply with international standards and industry best practices.</p>
                  <div className="flex flex-wrap gap-3">
                    {["ISA 5.1", "ANSI", "ISO 14617", "IEC 62424"].map((standard) => (
                      <span key={standard} className="px-4 py-2 bg-primary/10 rounded-full text-sm text-primary font-medium">{standard}</span>
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

export default PFDPID;
