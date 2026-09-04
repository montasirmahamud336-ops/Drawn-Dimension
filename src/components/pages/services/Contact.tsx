import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import PageTransition from "@/components/shared/PageTransition";
import PageHero from "@/components/shared/PageHero";
import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { 
  Mail, 
  Phone, 
  MapPin, 
  Send, 
  CheckCircle, 
  Clock, 
  Globe, 
  Sparkles, 
  ShieldCheck, 
  Zap, 
  Copy, 
  Check, 
  HelpCircle,
  ChevronDown
} from "lucide-react";
import PremiumBackground from "@/components/shared/PremiumBackground";
import { getApiBaseUrl } from "@/components/admin/adminAuth";

const servicesList = [
  "Web Design & Development",
  "AutoCAD Technical Drawings",
  "3D SolidWorks Modeling",
  "PFD & P&ID Diagrams",
  "HAZOP Study & Risk Analysis",
  "Graphic Design & Branding",
  "Other Engineering Services",
];

const faqsList = [
  {
    q: "How fast can you start working on my project?",
    a: "Usually within 24 to 48 hours after our initial discovery call and requirements confirmation."
  },
  {
    q: "What technical formats do you deliver for engineering drawings?",
    a: "We provide native DWG, STEP, SLDPRT, PDF, high-resolution PNGs, and any custom formats required by your shop floor or team."
  },
  {
    q: "Do you offer non-disclosure agreements (NDAs)?",
    a: "Yes, absolutely. We respect intellectual property and strictly sign NDAs prior to reviewing proprietary CAD files or specs."
  },
  {
    q: "How do project milestones and payments work?",
    a: "We offer flexible milestone-based billing and direct online invoice payments with full transparency."
  }
];

const Contact = () => {
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [selectedService, setSelectedService] = useState<string>("Web Design & Development");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(label);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const form = e.currentTarget as HTMLFormElement;
    const formData = new FormData(form);

    const firstName = String(formData.get("firstName") ?? "").trim();
    const lastName = String(formData.get("lastName") ?? "").trim();
    const email = String(formData.get("email") ?? "").trim();
    const phone = String(formData.get("phone") ?? "").trim();
    const details = String(formData.get("details") ?? "").trim();

    setSubmitError(null);
    setIsLoading(true);

    try {
      const apiBase = getApiBaseUrl();
      const response = await fetch(`${apiBase}/form-messages`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          firstName,
          lastName,
          email,
          phone,
          service: selectedService,
          details,
          sourcePage: "/contact",
        }),
      });

      if (!response.ok) {
        const contentType = response.headers.get("content-type") || "";
        let message = "Failed to send message. Please try again.";

        if (contentType.includes("application/json")) {
          const body = await response.json().catch(() => null);
          if (body?.message) {
            message = String(body.message);
          }
        } else {
          const text = await response.text().catch(() => "");
          if (text) message = text;
        }

        throw new Error(message);
      }

      setIsSubmitted(true);
      setTimeout(() => setIsSubmitted(false), 5000);
      form.reset();
    } catch (error: any) {
      setSubmitError(error?.message || "Failed to send message. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const contactCards = [
    {
      icon: Mail,
      title: "Email Us",
      value: "info@drawndimension.com",
      subtext: "Guaranteed response within 24h",
      href: "mailto:info@drawndimension.com",
      copyText: "info@drawndimension.com",
    },
    {
      icon: Phone,
      title: "Direct WhatsApp",
      value: "+880 1775-119416",
      subtext: "Instant chat available",
      href: "https://wa.me/8801775119416",
      copyText: "+8801775119416",
    },
    {
      icon: MapPin,
      title: "Main Office",
      value: "Dhaka, Bangladesh",
      subtext: "Serving Clients Worldwide",
      href: "https://maps.google.com/?q=Dhaka,Bangladesh",
      copyText: null,
    },
    {
      icon: Clock,
      title: "Working Hours",
      value: "9:00 AM - 6:00 PM",
      subtext: "Sun - Thu (UTC+6)",
      href: null,
      copyText: null,
    },
  ];

  return (
    <PageTransition>
      <PremiumBackground>
        <Navigation />
        <main>
          {/* Page Hero */}
          <PageHero
            title="Let's Build Something Great Together"
            subtitle="Get In Touch"
            description="Have a high-precision engineering project or custom design requirement? Send us a message and our team will get back to you with a tailored execution plan."
          />

          <section className="py-12 md:py-16 relative overflow-hidden">
            {/* Ambient Background Glows */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_25%,rgba(239,68,68,0.12),transparent_40%)] pointer-events-none" />
            <div className="absolute top-1/2 right-[-10%] w-[30rem] h-[30rem] rounded-full bg-primary/10 blur-[100px] pointer-events-none" />

            <div className="container-narrow relative z-10 space-y-12 md:space-y-16">
              
              {/* Main Contact Grid Container */}
              <div className="flex flex-col lg:grid lg:grid-cols-12 gap-8 lg:gap-10 items-stretch">
              
              {/* Quick Contact Info Cards Grid (Mobile Order 2, Desktop Order 1 - Top Bar) */}
              <div className="order-2 lg:order-1 lg:col-span-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5">
                {contactCards.map((card, index) => {
                  const Component = card.href ? motion.a : motion.div;
                  const linkProps = card.href
                    ? {
                        href: card.href,
                        target: card.href.startsWith("http") ? "_blank" : undefined,
                        rel: card.href.startsWith("http") ? "noopener noreferrer" : undefined,
                      }
                    : {};

                  return (
                    <Component
                      key={card.title}
                      {...linkProps}
                      initial={{ opacity: 0, y: 20 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.4, delay: index * 0.08 }}
                      className={`relative overflow-hidden rounded-3xl border-[2.5px] border-border/70 dark:border-border bg-card p-6 transition-all duration-300 hover:-translate-y-1.5 hover:shadow-2xl hover:border-primary/40 group flex flex-col justify-between shadow-md ${
                        card.href ? "cursor-pointer" : ""
                      }`}
                    >
                      <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-primary to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                      
                      <div className="flex items-start justify-between gap-3 mb-4">
                        <div className="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary group-hover:scale-110 group-hover:bg-primary group-hover:text-primary-foreground transition-all duration-300 shadow-sm">
                          <card.icon className="w-6 h-6" />
                        </div>
                        
                        {card.copyText && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              handleCopy(card.copyText!, card.title);
                            }}
                            title="Copy to clipboard"
                            className="w-8 h-8 rounded-xl bg-muted/40 border border-border/60 text-muted-foreground hover:text-primary hover:border-primary/30 flex items-center justify-center transition-all z-10"
                          >
                            {copiedField === card.title ? (
                              <Check className="w-4 h-4 text-emerald-500" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        )}
                      </div>

                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                          {card.title}
                        </p>
                        <p className="text-base font-bold text-foreground group-hover:text-primary transition-colors truncate">
                          {card.value}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {card.subtext}
                        </p>
                      </div>
                    </Component>
                  );
                })}
              </div>

              {/* Left Column: Status, Perks & Global Info (Mobile Order 3, Desktop Order 2 - Left Side) */}
              <motion.div
                initial={{ opacity: 0, x: -30 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6 }}
                className="lg:col-span-5 order-3 lg:order-2 flex flex-col justify-between gap-5 md:gap-6 h-full"
              >
                {/* Live Status Card */}
                <div className="rounded-3xl border-[2.5px] border-border/70 dark:border-border bg-card p-6 md:p-7 shadow-xl relative overflow-hidden flex-1 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-3 mb-3">
                      <span className="relative flex h-3.5 w-3.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                        <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500" />
                      </span>
                      <span className="text-xs font-bold uppercase tracking-wider text-emerald-500">
                        Live Availability
                      </span>
                    </div>
                    <h3 className="text-xl font-bold text-foreground">
                      Accepting New Projects
                    </h3>
                    <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
                      Our engineering and design teams are actively taking on new CAD modeling, web development, and P&ID projects with fast turnaround times.
                    </p>
                  </div>
                  
                  <div className="mt-5 pt-4 border-t border-border/60 flex items-center gap-4 text-xs font-medium text-muted-foreground">
                    <div className="flex items-center gap-1.5 text-foreground font-semibold">
                      <Zap className="w-4 h-4 text-primary" />
                      <span>Fast 2-4h response</span>
                    </div>
                    <span>•</span>
                    <div className="flex items-center gap-1.5 text-foreground font-semibold">
                      <ShieldCheck className="w-4 h-4 text-primary" />
                      <span>100% Confidential NDA</span>
                    </div>
                  </div>
                </div>

                {/* Why Contact Us Card */}
                <div className="rounded-3xl border-[2.5px] border-border/70 dark:border-border bg-card p-6 md:p-7 shadow-xl space-y-4 flex-1 flex flex-col justify-center">
                  <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-primary" />
                    Why Partner With Us?
                  </h3>
                  
                  <ul className="space-y-3 text-sm text-muted-foreground">
                    <li className="flex items-start gap-3">
                      <CheckCircle className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                      <span><strong className="text-foreground">Direct Technical Consultation:</strong> Speak directly with senior engineers and designers.</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <CheckCircle className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                      <span><strong className="text-foreground">Global Quality Standards:</strong> ASME, ISO, and DIN compliant technical drawings.</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <CheckCircle className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                      <span><strong className="text-foreground">Clear Milestone Billing:</strong> Transparent pricing without hidden costs or extra fees.</span>
                    </li>
                  </ul>
                </div>

                {/* Global Presence Card */}
                <div className="rounded-3xl border-[2.5px] border-border/70 dark:border-border bg-card p-6 md:p-7 shadow-xl bg-gradient-to-br from-card to-primary/[0.04] flex-1 flex flex-col justify-center">
                  <div className="flex items-center gap-3 mb-2.5">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0">
                      <Globe className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-bold text-foreground">Worldwide Delivery</h4>
                      <p className="text-xs text-muted-foreground">Operating across UTC+0 to UTC+12</p>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    We seamlessly coordinate across North America, Europe, Australia, and Asia-Pacific timezones.
                  </p>
                </div>
              </motion.div>

              {/* Right Column: Contact Form (Mobile Order 1 - FIRST, Desktop Order 3 - Right Side) */}
              <motion.div
                initial={{ opacity: 0, x: 30 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: 0.1 }}
                className="lg:col-span-7 order-1 lg:order-3 h-full"
              >
                  <form
                    onSubmit={handleSubmit}
                    className="rounded-3xl border-[2.5px] border-border/70 dark:border-border bg-card p-7 md:p-8 shadow-2xl relative overflow-hidden h-full flex flex-col justify-between"
                  >
                    {/* Top Glow Bar Accent */}
                    <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-transparent via-primary to-transparent" />

                    <div className="mb-8">
                      <span className="text-xs font-bold uppercase tracking-wider text-primary">Start a Conversation</span>
                      <h3 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground mt-1">
                        Project Inquiry Brief
                      </h3>
                      <p className="text-sm text-muted-foreground mt-1.5">
                        Fill out your details below and we will prepare a customized proposal for your project.
                      </p>
                    </div>

                    {/* Custom Animated Glassmorphic Dropdown */}
                    <div className="mb-5">
                      <label className="block text-xs font-bold uppercase tracking-wider text-foreground mb-2">
                        Service Interested In <span className="text-primary">*</span>
                      </label>
                      
                      {/* Hidden input for form data */}
                      <input type="hidden" name="service" value={selectedService} />

                      <div className="relative">
                        <button
                          type="button"
                          onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                          className={`w-full px-4 py-3.5 bg-background border-[2px] rounded-2xl text-left text-sm font-semibold text-foreground flex items-center justify-between transition-all shadow-sm ${
                            isDropdownOpen
                              ? "border-primary ring-1 ring-primary shadow-lg shadow-primary/10"
                              : "border-border/70 hover:border-primary/40"
                          }`}
                        >
                          <span className="flex items-center gap-2.5 truncate">
                            <Sparkles className="w-4 h-4 text-primary shrink-0" />
                            <span className="truncate">{selectedService}</span>
                          </span>
                          <ChevronDown
                            className={`w-4 h-4 text-muted-foreground transition-transform duration-300 shrink-0 ${
                              isDropdownOpen ? "rotate-180 text-primary" : ""
                            }`}
                          />
                        </button>

                        <AnimatePresence>
                          {isDropdownOpen && (
                            <>
                              {/* Click Outside Overlay */}
                              <div
                                className="fixed inset-0 z-20"
                                onClick={() => setIsDropdownOpen(false)}
                              />

                              {/* Dropdown Menu Popover */}
                              <motion.div
                                data-lenis-prevent
                                initial={{ opacity: 0, y: -8, scale: 0.98 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: -8, scale: 0.98 }}
                                transition={{ duration: 0.15, ease: "easeOut" }}
                                className="absolute left-0 right-0 top-full mt-2 z-30 bg-card/95 backdrop-blur-xl border-[2.5px] border-border/80 dark:border-border rounded-2xl shadow-2xl overflow-hidden py-1.5 max-h-60 overflow-y-auto"
                              >
                                {servicesList.map((srv) => (
                                  <button
                                    key={srv}
                                    type="button"
                                    onClick={() => {
                                      setSelectedService(srv);
                                      setIsDropdownOpen(false);
                                    }}
                                    className={`w-full px-4 py-3 text-xs sm:text-sm text-left font-semibold flex items-center justify-between transition-colors ${
                                      selectedService === srv
                                        ? "bg-primary/10 text-primary font-bold"
                                        : "text-foreground hover:bg-muted/50"
                                    }`}
                                  >
                                    <span className="truncate">{srv}</span>
                                    {selectedService === srv && (
                                      <Check className="w-4 h-4 text-primary shrink-0 ml-2" />
                                    )}
                                  </button>
                                ))}
                              </motion.div>
                            </>
                          )}
                        </AnimatePresence>
                      </div>
                    </div>

                    {/* Inputs Section */}
                    <div className="space-y-5">
                      <div className="grid sm:grid-cols-2 gap-5">
                        <div>
                          <label className="block text-xs font-bold uppercase tracking-wider text-foreground mb-2">
                            First Name <span className="text-primary">*</span>
                          </label>
                          <input
                            type="text"
                            name="firstName"
                            required
                            className="w-full px-4 py-3.5 bg-background border-[2px] border-border/70 rounded-2xl focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all text-sm text-foreground placeholder:text-muted-foreground"
                            placeholder="John"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold uppercase tracking-wider text-foreground mb-2">
                            Last Name <span className="text-primary">*</span>
                          </label>
                          <input
                            type="text"
                            name="lastName"
                            required
                            className="w-full px-4 py-3.5 bg-background border-[2px] border-border/70 rounded-2xl focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all text-sm text-foreground placeholder:text-muted-foreground"
                            placeholder="Doe"
                          />
                        </div>
                      </div>

                      <div className="grid sm:grid-cols-2 gap-5">
                        <div>
                          <label className="block text-xs font-bold uppercase tracking-wider text-foreground mb-2">
                            Email Address <span className="text-primary">*</span>
                          </label>
                          <input
                            type="email"
                            name="email"
                            required
                            className="w-full px-4 py-3.5 bg-background border-[2px] border-border/70 rounded-2xl focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all text-sm text-foreground placeholder:text-muted-foreground"
                            placeholder="john@example.com"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold uppercase tracking-wider text-foreground mb-2">
                            WhatsApp / Phone
                          </label>
                          <input
                            type="tel"
                            name="phone"
                            className="w-full px-4 py-3.5 bg-background border-[2px] border-border/70 rounded-2xl focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all text-sm text-foreground placeholder:text-muted-foreground"
                            placeholder="+1 (555) 000-0000"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-foreground mb-2">
                          Project Details & Requirements <span className="text-primary">*</span>
                        </label>
                        <textarea
                          name="details"
                          required
                          rows={4}
                          className="w-full px-4 py-3.5 bg-background border-[2px] border-border/70 rounded-2xl focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all text-sm text-foreground placeholder:text-muted-foreground resize-none"
                          placeholder="Describe your project goals, scope, CAD file formats, or desired deadline..."
                        />
                      </div>
                    </div>

                    {/* Submit Button */}
                    <div className="mt-8">
                      <motion.button
                        type="submit"
                        disabled={isSubmitted || isLoading}
                        whileHover={{ scale: 1.01 }}
                        whileTap={{ scale: 0.99 }}
                        className="w-full py-4 px-6 bg-primary text-primary-foreground font-bold text-sm rounded-2xl hover:bg-primary/90 transition-all duration-200 shadow-lg shadow-primary/25 flex items-center justify-center gap-2.5 disabled:opacity-70 disabled:cursor-not-allowed"
                      >
                        {isSubmitted ? (
                          <>
                            <CheckCircle className="w-5 h-5 text-white animate-bounce" />
                            <span>Message Sent Successfully! We will respond shortly.</span>
                          </>
                        ) : isLoading ? (
                          <>
                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            <span>Sending Message...</span>
                          </>
                        ) : (
                          <>
                            <Send className="w-5 h-5" />
                            <span>Send Project Message</span>
                          </>
                        )}
                      </motion.button>

                      {submitError && (
                        <p className="mt-3 text-sm font-medium text-destructive text-center">{submitError}</p>
                      )}
                    </div>
                  </form>
                </motion.div>
              </div>

              {/* Quick FAQ Section */}
              <div className="pt-8 border-t border-border/60">
                <div className="text-center mb-8">
                  <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-primary/30 bg-primary/10 text-primary text-xs font-bold uppercase tracking-wider mb-2 shadow-sm">
                    <HelpCircle className="w-3.5 h-3.5" />
                    <span>Got Questions?</span>
                  </span>
                  <h3 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
                    Frequently Asked Questions
                  </h3>
                </div>

                <div className="grid md:grid-cols-2 gap-4 max-w-4xl mx-auto">
                  {faqsList.map((faq, index) => (
                    <div
                      key={index}
                      className="rounded-2xl border-[2.5px] border-border/70 bg-card p-5 transition-all duration-200 hover:border-primary/40 shadow-sm"
                    >
                      <h4 className="font-bold text-foreground text-sm flex items-start gap-2.5">
                        <span className="text-primary font-bold">Q.</span>
                        {faq.q}
                      </h4>
                      <p className="text-xs text-muted-foreground mt-2 pl-5 leading-relaxed">
                        {faq.a}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          </section>
        </main>
        <Footer />
      </PremiumBackground>
    </PageTransition>
  );
};

export default Contact;
