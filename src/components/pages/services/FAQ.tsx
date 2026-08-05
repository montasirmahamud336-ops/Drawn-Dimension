import { useEffect, useMemo, useState, useRef } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import PageTransition from "@/components/shared/PageTransition";
import PageHero from "@/components/shared/PageHero";
import PremiumBackground from "@/components/shared/PremiumBackground";
import { getApiBaseUrl } from "@/components/admin/adminAuth";
import { slugifyServiceName } from "@/components/shared/serviceCatalog";
import type { ServiceBasic, ServiceFaqRecord } from "@/components/shared/serviceContent";
import { 
  Search, 
  HelpCircle, 
  Sparkles, 
  MessageSquare, 
  ArrowRight, 
  X, 
  Layers,
  Globe,
  Box,
  FileText,
  ShieldCheck,
  Zap,
  CheckCircle2,
  ThumbsUp,
  ThumbsDown,
  Copy,
  Check,
  ChevronRight,
  ChevronUp,
  ChevronDown,
  Bookmark,
  Cpu
} from "lucide-react";

const toAbsoluteUrl = (path: string) => {
  if (/^https?:\/\//i.test(path)) return path;
  return `https://www.drawndimension.com${path.startsWith("/") ? path : `/${path}`}`;
};

const FAQ = () => {
  const apiBase = getApiBaseUrl();
  const [searchParams, setSearchParams] = useSearchParams();
  const [services, setServices] = useState<ServiceBasic[]>([]);
  const [faqs, setFaqs] = useState<ServiceFaqRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFaqId, setActiveFaqId] = useState<number | null>(null);
  const [feedbackGiven, setFeedbackGiven] = useState<{ [id: number]: "up" | "down" }>({});
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const handleScrollUp = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ top: -140, behavior: "smooth" });
    }
  };

  const handleScrollDown = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ top: 140, behavior: "smooth" });
    }
  };

  useEffect(() => {
    let mounted = true;
    const controller = new AbortController();

    const load = async () => {
      setLoading(true);
      try {
        const [servicesRes, faqRes] = await Promise.all([
          fetch(`${apiBase}/services?status=live`, { signal: controller.signal }),
          fetch(`${apiBase}/service-faqs?status=live`, { signal: controller.signal }),
        ]);

        if (!servicesRes.ok) throw new Error("Failed to fetch services");
        if (!faqRes.ok) throw new Error("Failed to fetch FAQs");

        const servicesData = await servicesRes.json();
        const faqData = await faqRes.json();
        if (!mounted) return;

        const loadedFaqs = Array.isArray(faqData) ? (faqData as ServiceFaqRecord[]) : [];
        setServices(Array.isArray(servicesData) ? (servicesData as ServiceBasic[]) : []);
        setFaqs(loadedFaqs);

        if (loadedFaqs.length > 0) {
          setActiveFaqId(loadedFaqs[0].id);
        }
      } catch (error) {
        if (controller.signal.aborted || !mounted) return;
        console.error("Failed to load FAQ data", error);
        setServices([]);
        setFaqs([]);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    load();
    return () => {
      mounted = false;
      controller.abort();
    };
  }, [apiBase]);

  const selectedSlug = searchParams.get("service")?.trim().toLowerCase() || "";
  
  const serviceMap = useMemo(() => {
    const map = new Map<number, ServiceBasic>();
    services.forEach((service) => map.set(service.id, service));
    return map;
  }, [services]);

  const selectedService = useMemo(
    () =>
      selectedSlug
        ? services.find((service) => slugifyServiceName((service.slug || service.name || "").trim()) === selectedSlug) ||
          null
        : null,
    [selectedSlug, services]
  );

  // Filter FAQs by Category and Search Term
  const filteredFaqs = useMemo(() => {
    let result = faqs;

    if (selectedService) {
      result = result.filter((faq) => faq.service_id === selectedService.id);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (faq) =>
          faq.question.toLowerCase().includes(q) ||
          faq.answer.toLowerCase().includes(q)
      );
    }

    return result;
  }, [faqs, selectedService, searchQuery]);

  // Set active FAQ when filtered list changes
  useEffect(() => {
    if (filteredFaqs.length > 0) {
      if (!activeFaqId || !filteredFaqs.some((f) => f.id === activeFaqId)) {
        setActiveFaqId(filteredFaqs[0].id);
      }
    } else {
      setActiveFaqId(null);
    }
  }, [filteredFaqs, activeFaqId]);

  const activeFaq = useMemo(() => {
    return faqs.find((f) => f.id === activeFaqId) || filteredFaqs[0] || null;
  }, [faqs, activeFaqId, filteredFaqs]);

  const handleCopyLink = (id: number) => {
    navigator.clipboard.writeText(`${window.location.origin}/faq#faq-${id}`);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleFeedback = (id: number, type: "up" | "down") => {
    setFeedbackGiven((prev) => ({ ...prev, [id]: type }));
  };

  const pageTitle = selectedService
    ? `${selectedService.name} FAQ Center | Drawn Dimension`
    : "Help & Knowledge Center | Drawn Dimension Support";

  useEffect(() => {
    document.title = pageTitle;
  }, [pageTitle]);

  // Category Icon Resolver
  const getCategoryIcon = (name: string) => {
    const n = name.toLowerCase();
    if (n.includes("web") || n.includes("dev")) return Globe;
    if (n.includes("3d") || n.includes("solid")) return Box;
    if (n.includes("p&id") || n.includes("process")) return Cpu;
    if (n.includes("cad") || n.includes("drawing")) return Layers;
    return Sparkles;
  };

  return (
    <PageTransition>
      <PremiumBackground>
        <Navigation />
        <main>
          {/* Hero Header */}
          <PageHero
            title={selectedService ? `${selectedService.name} Support Hub` : "Help & Knowledge Center"}
            subtitle="Next-Gen Interactive Portal"
            description="Select any category topic or search below to instantly read verified answers, technical file formats, and delivery timelines."
          />

          <section className="py-10 md:py-16 relative overflow-hidden">
            {/* Ambient Background Glows */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_10%,rgba(239,68,68,0.14),transparent_50%)] pointer-events-none" />
            
            <div className="container-narrow relative z-10 space-y-10 md:space-y-12">
              
              {/* Top Control Bar: Search + Quick Stats */}
              <div className="rounded-3xl border-[2.5px] border-border/70 dark:border-border bg-card/90 backdrop-blur-md p-6 md:p-8 shadow-2xl space-y-6">
                
                <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                  <div>
                    <h2 className="text-xl sm:text-2xl font-bold text-foreground flex items-center gap-2.5">
                      <HelpCircle className="w-6 h-6 text-primary" />
                      <span>Knowledge Portal</span>
                    </h2>
                    <p className="text-xs text-muted-foreground mt-1">
                      Search across {faqs.length} verified technical solutions and engineering FAQs.
                    </p>
                  </div>

                  {/* Search Bar */}
                  <div className="relative w-full md:w-80 lg:w-96">
                    <Search className="w-4 h-4 text-muted-foreground absolute left-4 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search questions or keywords..."
                      className="w-full pl-11 pr-9 py-3 bg-background border-[2px] border-border/70 rounded-2xl focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all text-xs font-semibold text-foreground placeholder:text-muted-foreground shadow-inner"
                    />
                    {searchQuery && (
                      <button
                        type="button"
                        onClick={() => setSearchQuery("")}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Category Topic Cards Grid */}
                <div className="pt-5 border-t border-border/60">
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                    {/* All Topics Card */}
                    <button
                      type="button"
                      onClick={() => setSearchParams({})}
                      className={`p-4 rounded-2xl border-[2px] text-left transition-all duration-300 flex flex-col justify-between gap-3 cursor-pointer group relative overflow-hidden ${
                        !selectedService
                          ? "bg-primary text-primary-foreground border-primary shadow-xl shadow-primary/20 scale-[1.02]"
                          : "bg-background/80 hover:bg-muted/50 text-foreground border-border/70 hover:border-primary/40"
                      }`}
                    >
                      <div className="flex items-center justify-between w-full">
                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                          !selectedService ? "bg-white/20 text-white" : "bg-primary/10 text-primary"
                        }`}>
                          <Sparkles className="w-4 h-4" />
                        </div>
                        <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                          !selectedService ? "bg-white/20 text-white" : "bg-muted text-muted-foreground"
                        }`}>
                          {faqs.length}
                        </span>
                      </div>
                      <div>
                        <span className="text-xs font-bold block truncate">All Topics</span>
                        <span className={`text-[10px] block mt-0.5 ${!selectedService ? "text-white/80" : "text-muted-foreground"}`}>
                          Full Library
                        </span>
                      </div>
                    </button>

                    {/* Service Topic Cards */}
                    {services.map((service) => {
                      const slug = slugifyServiceName((service.slug || service.name || "").trim());
                      const active = selectedService?.id === service.id;
                      const count = faqs.filter((f) => f.service_id === service.id).length;
                      const IconComp = getCategoryIcon(service.name);

                      return (
                        <button
                          key={service.id}
                          type="button"
                          onClick={() => setSearchParams({ service: slug })}
                          className={`p-4 rounded-2xl border-[2px] text-left transition-all duration-300 flex flex-col justify-between gap-3 cursor-pointer group relative overflow-hidden ${
                            active
                              ? "bg-primary text-primary-foreground border-primary shadow-xl shadow-primary/20 scale-[1.02]"
                              : "bg-background/80 hover:bg-muted/50 text-foreground border-border/70 hover:border-primary/40"
                          }`}
                        >
                          <div className="flex items-center justify-between w-full">
                            <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                              active ? "bg-white/20 text-white" : "bg-primary/10 text-primary"
                            }`}>
                              <IconComp className="w-4 h-4" />
                            </div>
                            <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                              active ? "bg-white/20 text-white" : "bg-muted text-muted-foreground"
                            }`}>
                              {count}
                            </span>
                          </div>
                          <div>
                            <span className="text-xs font-bold block truncate">{service.name}</span>
                            <span className={`text-[10px] block mt-0.5 ${active ? "text-white/80" : "text-muted-foreground"}`}>
                              {count} QA Answers
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* DUAL-PANE KNOWLEDGE READER WORKSPACE */}
              {loading ? (
                <div className="rounded-3xl border-[2.5px] border-border/70 bg-card p-12 text-center text-muted-foreground shadow-lg flex flex-col items-center justify-center gap-3">
                  <div className="w-8 h-8 border-3 border-primary/30 border-t-primary rounded-full animate-spin" />
                  <span className="text-sm font-semibold">Loading knowledge workspace...</span>
                </div>
              ) : filteredFaqs.length === 0 ? (
                <div className="rounded-3xl border-[2.5px] border-border/70 bg-card p-12 text-center text-muted-foreground shadow-lg">
                  <HelpCircle className="w-12 h-12 text-muted-foreground/50 mx-auto mb-3" />
                  <h3 className="text-lg font-bold text-foreground mb-1">No Solutions Found</h3>
                  <p className="text-xs text-muted-foreground max-w-md mx-auto">
                    {searchQuery
                      ? `No solutions matched "${searchQuery}". Try searching another keyword.`
                      : "No live FAQs found in this topic."}
                  </p>
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery("")}
                      className="mt-4 px-5 py-2.5 bg-primary/10 text-primary border border-primary/20 rounded-xl text-xs font-bold hover:bg-primary hover:text-white transition-all"
                    >
                      Clear Search Filter
                    </button>
                  )}
                </div>
              ) : (
                <div className="grid lg:grid-cols-12 gap-6 items-start">
                  
                  {/* Left Pane: Questions Selector Box (Native Mouse Wheel Scroll Container) */}
                  <div className="lg:col-span-5 rounded-3xl border-[2.5px] border-border/70 dark:border-border bg-card p-4 md:p-5 shadow-xl">
                    <div className="flex items-center justify-between pb-3 mb-3 border-b border-border/60">
                      <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                        Select a Question
                      </span>
                      <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                        {filteredFaqs.length} Available
                      </span>
                    </div>

                    {/* Native Mouse Wheel Hover Scroll Box */}
                    <div
                      onWheel={(e) => {
                        e.stopPropagation();
                        e.currentTarget.scrollTop += e.deltaY;
                      }}
                      className="space-y-2.5 overflow-y-auto max-h-[460px] pr-2 scrollbar-thin scrollbar-thumb-primary/70 hover:scrollbar-thumb-primary scrollbar-track-muted/20 select-none overscroll-contain touch-pan-y"
                    >
                      {filteredFaqs.map((faq, idx) => {
                        const isActive = activeFaqId === faq.id;
                        const service = serviceMap.get(faq.service_id);

                        return (
                          <div
                            key={faq.id}
                            role="button"
                            tabIndex={0}
                            onClick={() => setActiveFaqId(faq.id)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" || e.key === " ") {
                                setActiveFaqId(faq.id);
                              }
                            }}
                            className={`w-full p-3.5 rounded-2xl border-[2.5px] text-left cursor-pointer flex items-center justify-between gap-3 group relative overflow-hidden select-none transition-colors ${
                              isActive
                                ? "bg-primary text-primary-foreground border-primary shadow-lg shadow-primary/20"
                                : "bg-background/80 hover:bg-muted/50 text-foreground border-border/70 hover:border-primary/40"
                            }`}
                          >
                            <div className="flex items-start gap-3 min-w-0 pointer-events-none">
                              <span className={`w-6 h-6 rounded-lg text-xs font-extrabold flex items-center justify-center shrink-0 mt-0.5 ${
                                isActive ? "bg-white/20 text-white" : "bg-primary/10 text-primary"
                              }`}>
                                {idx + 1}
                              </span>
                              <div className="min-w-0">
                                {service && (
                                  <span className={`text-[10px] font-bold uppercase tracking-wider block mb-0.5 ${
                                    isActive ? "text-white/80" : "text-primary"
                                  }`}>
                                    {service.name}
                                  </span>
                                )}
                                <p className="text-xs sm:text-sm font-bold truncate leading-snug">
                                  {faq.question}
                                </p>
                              </div>
                            </div>

                            <ChevronRight className={`w-4 h-4 shrink-0 transition-transform pointer-events-none ${
                              isActive ? "text-white translate-x-1" : "text-muted-foreground group-hover:text-primary"
                            }`} />
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Right Pane: Solution Reader Card (Fixed matching height) */}
                  <div className="lg:col-span-7 h-[500px] md:h-[550px] min-h-0">
                    {activeFaq ? (
                      <AnimatePresence mode="wait">
                        <motion.div
                          key={activeFaq.id}
                          initial={{ opacity: 0, x: 20 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: -20 }}
                          transition={{ duration: 0.25 }}
                          className="rounded-3xl border-[2.5px] border-border/70 dark:border-border bg-card p-6 sm:p-8 shadow-2xl relative overflow-hidden h-full flex flex-col justify-between"
                        >
                          {/* Accent Glow Line */}
                          <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-transparent via-primary to-transparent" />

                          {/* Reader Header */}
                          <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-border/60">
                            <div className="flex items-center gap-2">
                              <span className="px-3 py-1 rounded-xl bg-primary/10 text-primary border border-primary/20 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
                                <Bookmark className="w-3.5 h-3.5" />
                                {serviceMap.get(activeFaq.service_id)?.name || "Technical Solution"}
                              </span>
                              <span className="text-xs font-semibold text-emerald-500 flex items-center gap-1">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                Verified Answer
                              </span>
                            </div>

                            <button
                              type="button"
                              onClick={() => handleCopyLink(activeFaq.id)}
                              className="px-3 py-1.5 rounded-xl bg-muted/40 border border-border/60 text-xs font-semibold text-muted-foreground hover:text-primary hover:border-primary/30 flex items-center gap-1.5 transition-all cursor-pointer"
                            >
                              {copiedId === activeFaq.id ? (
                                <>
                                  <Check className="w-3.5 h-3.5 text-emerald-500" />
                                  <span className="text-emerald-500">Link Copied!</span>
                                </>
                              ) : (
                                <>
                                  <Copy className="w-3.5 h-3.5" />
                                  <span>Copy Link</span>
                                </>
                              )}
                            </button>
                          </div>

                          {/* Reader Question */}
                          <div>
                            <span className="text-xs font-bold uppercase tracking-wider text-primary">Question</span>
                            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground mt-1 leading-snug">
                              {activeFaq.question}
                            </h2>
                          </div>

                          {/* Reader Answer Box */}
                          <div className="rounded-2xl border-[2px] border-border/60 bg-muted/20 p-5 md:p-6 text-sm text-foreground leading-relaxed whitespace-pre-wrap font-medium max-h-[260px] overflow-y-auto min-h-0 scrollbar-thin scrollbar-thumb-primary/50 scrollbar-track-transparent">
                            {activeFaq.answer}
                          </div>

                          {/* Reader Footer: Feedback & Support CTA */}
                          <div className="pt-5 border-t border-border/60 flex flex-col sm:flex-row items-center justify-between gap-4">
                            {/* Feedback Buttons */}
                            <div className="flex items-center gap-3">
                              <span className="text-xs font-semibold text-muted-foreground">Was this solution helpful?</span>
                              <button
                                type="button"
                                onClick={() => handleFeedback(activeFaq.id, "up")}
                                className={`w-8 h-8 rounded-xl border flex items-center justify-center transition-all cursor-pointer ${
                                  feedbackGiven[activeFaq.id] === "up"
                                    ? "bg-emerald-500 text-white border-emerald-500 shadow-md shadow-emerald-500/20"
                                    : "bg-muted/40 border-border/60 text-muted-foreground hover:text-emerald-500 hover:border-emerald-500/40"
                                }`}
                              >
                                <ThumbsUp className="w-4 h-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleFeedback(activeFaq.id, "down")}
                                className={`w-8 h-8 rounded-xl border flex items-center justify-center transition-all cursor-pointer ${
                                  feedbackGiven[activeFaq.id] === "down"
                                    ? "bg-rose-500 text-white border-rose-500 shadow-md shadow-rose-500/20"
                                    : "bg-muted/40 border-border/60 text-muted-foreground hover:text-rose-500 hover:border-rose-500/40"
                                }`}
                              >
                                <ThumbsDown className="w-4 h-4" />
                              </button>
                            </div>

                            {/* Direct Support Button */}
                            <Link
                              to="/contact"
                              className="px-4 py-2 bg-primary/10 text-primary border border-primary/20 rounded-xl text-xs font-bold hover:bg-primary hover:text-white transition-all flex items-center gap-1.5"
                            >
                              <span>Still Need Help? Contact Us</span>
                              <ArrowRight className="w-3.5 h-3.5" />
                            </Link>
                          </div>

                        </motion.div>
                      </AnimatePresence>
                    ) : null}
                  </div>

                </div>
              )}

              {/* Bottom Support CTA Card */}
              <div className="rounded-3xl border-[2.5px] border-border/70 dark:border-border bg-card p-8 md:p-10 shadow-2xl text-center relative overflow-hidden bg-gradient-to-br from-card via-card to-primary/[0.05]">
                <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-transparent via-primary to-transparent" />

                <div className="w-14 h-14 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary mx-auto mb-4 shadow-sm">
                  <MessageSquare className="w-7 h-7" />
                </div>

                <h3 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
                  Need Custom Project Guidance?
                </h3>
                <p className="text-sm text-muted-foreground mt-2 max-w-lg mx-auto leading-relaxed">
                  Our engineering specialists are available 24/7 for custom project quotes, CAD formats, and NDA signing.
                </p>

                <div className="mt-7 flex flex-wrap items-center justify-center gap-4">
                  <Link
                    to="/contact"
                    className="px-7 py-3.5 bg-primary text-primary-foreground font-bold text-sm rounded-2xl hover:bg-primary/90 transition-all duration-200 shadow-lg shadow-primary/25 inline-flex items-center gap-2.5"
                  >
                    <span>Contact Support Team</span>
                    <ArrowRight className="w-4 h-4" />
                  </Link>

                  <a
                    href="https://wa.me/8801775119416"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-7 py-3.5 bg-card border-[2.5px] border-border/70 text-foreground font-bold text-sm rounded-2xl hover:bg-primary/10 hover:border-primary/40 transition-all duration-200 shadow-sm inline-flex items-center gap-2"
                  >
                    <span>Instant WhatsApp Chat</span>
                  </a>
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

export default FAQ;
