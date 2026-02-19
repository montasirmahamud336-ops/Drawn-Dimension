import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import CTASection from "@/components/CTASection";
import PageTransition from "@/components/shared/PageTransition";
import PageHero from "@/components/shared/PageHero";
import HowWeWork from "@/components/shared/HowWeWork";
import PricingCards from "@/components/shared/PricingCards";
import { motion } from "framer-motion";
import { ShieldCheck, AlertTriangle, FileSearch, ClipboardCheck, Users, BookOpen, Shield, Target, Eye } from "lucide-react";
import PremiumBackground from "@/components/shared/PremiumBackground";

const HAZOP = () => {
  const features = [
    { icon: FileSearch, title: "Systematic Analysis", description: "Structured examination of process operations to identify potential hazards." },
    { icon: AlertTriangle, title: "Risk Identification", description: "Comprehensive identification of process deviations and their consequences." },
    { icon: ClipboardCheck, title: "Safeguard Assessment", description: "Evaluation of existing safeguards and recommendations for improvements." },
    { icon: Users, title: "Expert Facilitation", description: "Experienced HAZOP leaders guiding multidisciplinary team sessions." },
    { icon: BookOpen, title: "Documentation", description: "Detailed HAZOP reports with action items and follow-up tracking." },
    { icon: Shield, title: "Compliance Support", description: "Ensuring regulatory compliance with safety standards and requirements." },
  ];

  const studyTypes = [
    { title: "HAZOP", description: "Hazard and Operability Study for process hazard identification" },
    { title: "HAZID", description: "Hazard Identification study for early project phases" },
    { title: "SIL Assessment", description: "Safety Integrity Level determination for safety functions" },
    { title: "LOPA", description: "Layer of Protection Analysis for risk quantification" },
    { title: "Bow-Tie Analysis", description: "Visual risk assessment linking causes to consequences" },
    { title: "What-If Analysis", description: "Brainstorming-based hazard identification technique" },
  ];

  const steps = [
    { step: "01", title: "Preparation", description: "P&ID review, node identification, and team assembly" },
    { step: "02", title: "Workshop", description: "Systematic examination using guide words and parameters" },
    { step: "03", title: "Documentation", description: "Recording findings, causes, consequences, and safeguards" },
    { step: "04", title: "Recommendations", description: "Action items, risk ranking, and follow-up tracking" },
  ];

  const pricing = [
    { name: "Basic", price: "$1,999", description: "Single-node study", features: ["Up to 5 nodes", "Basic HAZOP report", "1 review session", "Action item tracking", "PDF report"] },
    { name: "Standard", price: "$4,999", description: "Process unit study", features: ["Up to 15 nodes", "Full HAZOP report", "SIL assessment", "3 review sessions", "Risk matrix"], popular: true },
    { name: "Premium", price: "$12,999", description: "Full facility study", features: ["Unlimited nodes", "Multi-study package", "LOPA included", "On-site facilitation", "Follow-up audit"] },
    { name: "Custom", price: "Contact", description: "Enterprise safety", features: ["Custom scope", "Ongoing safety support", "Regulatory consultation", "Training included", "Annual reviews"] },
  ];

  return (
    <PageTransition>
      <PremiumBackground>
        <Navigation />
        <main>
          <PageHero title="HAZOP Study & Risk Analysis" subtitle="Process Safety" description="Comprehensive hazard and operability studies ensuring safety, compliance, and operational excellence." />

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
                <span className="text-primary font-semibold text-sm uppercase tracking-wider">Our Services</span>
                <h2 className="text-4xl font-bold mt-4 text-foreground">Risk Assessment Studies</h2>
              </motion.div>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {studyTypes.map((study, index) => (
                  <motion.div key={study.title} initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5, delay: index * 0.1 }} className="glass-card p-6">
                    <h3 className="font-semibold text-foreground mb-2">{study.title}</h3>
                    <p className="text-sm text-muted-foreground">{study.description}</p>
                  </motion.div>
                ))}
              </div>
            </div>
          </section>

          <HowWeWork steps={steps} />

          <section className="section-padding">
            <div className="container-narrow">
              <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.8 }} className="glass-card p-12 text-center">
                <ShieldCheck className="w-16 h-16 text-primary mx-auto mb-6" />
                <h2 className="text-3xl font-bold text-foreground mb-4">Safety Is Not Optional</h2>
                <p className="text-muted-foreground max-w-2xl mx-auto mb-8">
                  A thorough HAZOP study identifies potential hazards before they become incidents. Our experienced team helps maintain safe operations.
                </p>
                <div className="grid grid-cols-3 gap-8 max-w-2xl mx-auto">
                  {[
                    { icon: Target, label: "Hazard Prevention" },
                    { icon: Shield, label: "Regulatory Compliance" },
                    { icon: Eye, label: "Operational Excellence" },
                  ].map(({ icon: Icon, label }) => (
                    <div key={label} className="flex flex-col items-center">
                      <Icon className="w-8 h-8 text-primary mb-2" />
                      <div className="text-sm text-muted-foreground">{label}</div>
                    </div>
                  ))}
                </div>
              </motion.div>
            </div>
          </section>

          <PricingCards tiers={pricing} />
          <CTASection />
        </main>
        <Footer />
      </PremiumBackground>
    </PageTransition>
  );
};

export default HAZOP;
