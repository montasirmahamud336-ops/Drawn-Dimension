import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import CTASection from "@/components/CTASection";
import PageTransition from "@/components/shared/PageTransition";
import PageHero from "@/components/shared/PageHero";
import HowWeWork from "@/components/shared/HowWeWork";
import PricingCards from "@/components/shared/PricingCards";
import { motion } from "framer-motion";
import {
  Globe, Code, Smartphone, Zap, Shield, Palette,
  CheckCircle, Monitor
} from "lucide-react";
import PremiumBackground from "@/components/shared/PremiumBackground";

const WebDesign = () => {
  const features = [
    { icon: Code, title: "Custom Development", description: "Tailored solutions built from scratch using modern frameworks like React, Next.js, and Vue.js." },
    { icon: Smartphone, title: "Responsive Design", description: "Pixel-perfect designs that look stunning on all devices from desktop to mobile." },
    { icon: Zap, title: "Performance Optimized", description: "Lightning-fast load times with optimized assets and efficient code structure." },
    { icon: Shield, title: "Secure & Scalable", description: "Built with security best practices and architecture that grows with your business." },
    { icon: Palette, title: "UI/UX Design", description: "Intuitive interfaces designed for exceptional user experience and engagement." },
    { icon: Globe, title: "SEO Optimized", description: "Search engine optimized from the ground up to maximize your online visibility." },
  ];

  const deliverables = [
    "Custom website design and development",
    "Responsive mobile-first approach",
    "Content Management System (CMS) integration",
    "E-commerce functionality",
    "API integrations and third-party services",
    "Ongoing maintenance and support",
  ];

  const steps = [
    { step: "01", title: "Discovery", description: "Understanding your goals, audience, and requirements through detailed consultation" },
    { step: "02", title: "Design", description: "Creating wireframes and visual designs for your approval with iterative feedback" },
    { step: "03", title: "Development", description: "Building your website with clean, efficient, and maintainable code" },
    { step: "04", title: "Launch", description: "Rigorous testing, performance optimization, and deployment to production" },
  ];

  const pricing = [
    { name: "Starter", price: "$999", description: "Perfect for small businesses", features: ["5-page website", "Responsive design", "Basic SEO", "Contact form", "1 revision round"] },
    { name: "Professional", price: "$2,499", description: "For growing businesses", features: ["10-page website", "Custom design", "Advanced SEO", "CMS integration", "3 revision rounds", "Analytics setup"], popular: true },
    { name: "Enterprise", price: "$5,999", description: "Full-scale web solutions", features: ["Unlimited pages", "Custom animations", "E-commerce ready", "API integrations", "5 revision rounds", "3 months support"] },
    { name: "Custom", price: "Contact", description: "Tailored to your needs", features: ["Custom scope", "Dedicated team", "Priority support", "SLA guarantee", "Unlimited revisions", "Ongoing partnership"] },
  ];

  return (
    <PageTransition>
      <PremiumBackground>
        <Navigation />
        <main>
          <PageHero title="Web Design & Development" subtitle="Digital Solutions" description="Transform your online presence with stunning, high-performance websites that drive results." />

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
                  <span className="text-primary font-semibold text-sm uppercase tracking-wider">What You Get</span>
                  <h2 className="text-4xl font-bold mt-4 mb-6 text-foreground">Complete Web Solutions</h2>
                  <p className="text-muted-foreground mb-8">We deliver end-to-end web development services covering every aspect of your online presence.</p>
                  <ul className="space-y-4">
                    {deliverables.map((item) => (
                      <li key={item} className="flex items-start gap-3">
                        <CheckCircle className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                        <span className="text-muted-foreground">{item}</span>
                      </li>
                    ))}
                  </ul>
                </motion.div>
                <motion.div initial={{ opacity: 0, x: 50 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.8 }} className="glass-card p-8">
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center">
                      <Monitor className="w-8 h-8 text-primary" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-foreground">Modern Tech Stack</h3>
                      <p className="text-muted-foreground text-sm">Built for performance</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    {["React", "Next.js", "TypeScript", "Tailwind", "Node.js", "PostgreSQL"].map((tech) => (
                      <div key={tech} className="bg-secondary rounded-lg p-3 text-center">
                        <span className="text-sm text-foreground">{tech}</span>
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

export default WebDesign;
