import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import CTASection from "@/components/CTASection";
import PageTransition from "@/components/shared/PageTransition";
import PageHero from "@/components/shared/PageHero";
import HowWeWork from "@/components/shared/HowWeWork";
import PricingCards from "@/components/shared/PricingCards";
import { motion } from "framer-motion";
import { Palette, Image, FileImage, Share2, Printer, Sparkles, CheckCircle, Instagram, Facebook, Linkedin, Twitter } from "lucide-react";
import PremiumBackground from "@/components/shared/PremiumBackground";

const GraphicDesign = () => {
  const features = [
    { icon: Palette, title: "Brand Identity", description: "Complete brand identity systems including logos, color palettes, and style guides." },
    { icon: FileImage, title: "Marketing Materials", description: "Brochures, flyers, presentations, and promotional materials." },
    { icon: Share2, title: "Social Media", description: "Engaging social media graphics and content templates." },
    { icon: Printer, title: "Print Design", description: "High-quality print-ready designs for all your offline marketing needs." },
    { icon: Image, title: "Digital Assets", description: "Web graphics, banners, email templates, and digital advertisements." },
    { icon: Sparkles, title: "Creative Concepts", description: "Unique creative concepts that make your brand stand out." },
  ];

  const services = ["Logo Design & Branding", "Business Cards & Stationery", "Brochures & Catalogs", "Flyers & Posters", "Social Media Graphics", "Presentation Design", "Packaging Design", "Trade Show Materials"];

  const platforms = [
    { icon: Instagram, name: "Instagram", description: "Posts, Stories, Reels" },
    { icon: Facebook, name: "Facebook", description: "Posts, Covers, Ads" },
    { icon: Linkedin, name: "LinkedIn", description: "Professional Graphics" },
    { icon: Twitter, name: "Twitter", description: "Headers, Posts" },
  ];

  const steps = [
    { step: "01", title: "Brief", description: "Understand your brand, audience, goals, and design preferences" },
    { step: "02", title: "Concepts", description: "Create multiple design concepts and mood boards for review" },
    { step: "03", title: "Refinement", description: "Iterate on the chosen direction with your feedback" },
    { step: "04", title: "Delivery", description: "Final files in all required formats with brand guidelines" },
  ];

  const pricing = [
    { name: "Starter", price: "$399", description: "Essential branding", features: ["Logo design", "Business card", "2 concepts", "1 revision", "Digital files"] },
    { name: "Professional", price: "$1,299", description: "Complete brand kit", features: ["Full brand identity", "Stationery suite", "Social media kit", "3 revisions", "Brand guidelines"], popular: true },
    { name: "Premium", price: "$2,999", description: "Full creative suite", features: ["Everything in Pro", "Marketing materials", "Packaging design", "5 revisions", "Print-ready files"] },
    { name: "Custom", price: "Contact", description: "Ongoing creative", features: ["Custom scope", "Dedicated designer", "Monthly deliverables", "Unlimited revisions", "Priority support"] },
  ];

  return (
    <PageTransition>
      <PremiumBackground>
        <Navigation />
        <main>
          <PageHero title="Graphic Design & Branding" subtitle="Creative Solutions" description="Eye-catching designs that communicate your brand's story and captivate your audience." />

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
                  <span className="text-primary font-semibold text-sm uppercase tracking-wider">Design Services</span>
                  <h2 className="text-4xl font-bold mt-4 mb-6 text-foreground">Complete Creative Suite</h2>
                  <p className="text-muted-foreground mb-8">From concept to final delivery, our creative team produces stunning visuals that elevate your brand.</p>
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
                  <h3 className="text-xl font-bold text-foreground mb-6">Tools We Use</h3>
                  <div className="grid grid-cols-2 gap-4">
                    {["Adobe Photoshop", "Adobe Illustrator", "Canva Pro", "Figma", "InDesign", "After Effects"].map((tool) => (
                      <div key={tool} className="bg-secondary rounded-lg p-4 text-center">
                        <span className="text-sm text-foreground">{tool}</span>
                      </div>
                    ))}
                  </div>
                </motion.div>
              </div>
            </div>
          </section>

          <section className="section-padding">
            <div className="container-narrow">
              <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.8 }} className="text-center mb-16">
                <span className="text-primary font-semibold text-sm uppercase tracking-wider">Social Media Design</span>
                <h2 className="text-4xl font-bold mt-4 text-foreground">Platform-Specific Graphics</h2>
              </motion.div>
              <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                {platforms.map((platform, index) => (
                  <motion.div key={platform.name} initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5, delay: index * 0.1 }} className="glass-card p-6 text-center group hover:border-primary/40 transition-all duration-300">
                    <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:bg-primary/20 transition-colors">
                      <platform.icon className="w-7 h-7 text-primary" />
                    </div>
                    <h3 className="font-semibold text-foreground mb-1">{platform.name}</h3>
                    <p className="text-sm text-muted-foreground">{platform.description}</p>
                  </motion.div>
                ))}
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

export default GraphicDesign;
