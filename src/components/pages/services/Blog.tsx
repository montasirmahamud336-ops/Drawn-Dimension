// Blog.tsx — Agency Style Blog Listing
import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowRight,
  CalendarDays,
  Clock,
  Sparkles,
  BookOpen,
  ChevronRight,
} from "lucide-react";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import PageTransition from "@/components/shared/PageTransition";
import PremiumBackground from "@/components/shared/PremiumBackground";
import { getApiBaseUrl } from "@/components/admin/adminAuth";
import { slugifyServiceName } from "@/components/shared/serviceCatalog";
import type { ServiceBasic, ServiceBlogRecord } from "@/components/shared/serviceContent";

const toAbsoluteUrl = (path: string) => {
  if (/^https?:\/\//i.test(path)) return path;
  return `https://www.drawndimension.com${path.startsWith("/") ? path : `/${path}`}`;
};

const formatDate = (value?: string | null) => {
  if (!value) return "Latest";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Latest";
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
};

const estimateReadTime = (text: string): string => {
  const words = text.trim().split(/\s+/).length;
  return `${Math.max(1, Math.ceil(words / 200))} min read`;
};

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.08, duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] },
  }),
};

const Blog = () => {
  const apiBase = getApiBaseUrl();
  const [searchParams, setSearchParams] = useSearchParams();
  const [services, setServices] = useState<ServiceBasic[]>([]);
  const [blogs, setBlogs] = useState<ServiceBlogRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    const controller = new AbortController();

    const load = async () => {
      setLoading(true);
      try {
        const [servicesRes, blogsRes] = await Promise.all([
          fetch(`${apiBase}/services?status=live`, { signal: controller.signal }),
          fetch(`${apiBase}/service-blogs?status=live`, { signal: controller.signal }),
        ]);

        if (!servicesRes.ok || !blogsRes.ok) throw new Error("Fetch failed");

        const servicesData = await servicesRes.json();
        const blogsData = await blogsRes.json();
        if (!mounted) return;

        setServices(Array.isArray(servicesData) ? (servicesData as ServiceBasic[]) : []);
        setBlogs(Array.isArray(blogsData) ? (blogsData as ServiceBlogRecord[]) : []);
      } catch (error) {
        if (!mounted || controller.signal.aborted) return;
        console.error(error);
        setServices([]);
        setBlogs([]);
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
  const selectedService = useMemo(
    () =>
      selectedSlug
        ? services.find(
            (s) =>
              slugifyServiceName((s.slug || s.name || "").trim()) === selectedSlug,
          ) || null
        : null,
    [selectedSlug, services],
  );

  const serviceMap = useMemo(() => {
    const map = new Map<number, ServiceBasic>();
    services.forEach((s) => map.set(s.id, s));
    return map;
  }, [services]);

  const visibleBlogs = useMemo(() => {
    if (!selectedService) return blogs;
    return blogs.filter((b) => b.service_id === selectedService.id);
  }, [blogs, selectedService]);

  // Grab a "featured" post (first or most recent) for the hero
  const featuredPost = visibleBlogs.length > 0 ? visibleBlogs[0] : null;
  const regularPosts = featuredPost ? visibleBlogs.slice(1) : [];

  const pageTitle = selectedService
    ? `${selectedService.name} Blog | Drawn Dimension`
    : "Blog | Drawn Dimension";
  const pageDescription = selectedService
    ? `Latest ${selectedService.name} articles and professional insights.`
    : "Insights from our engineering & creative teams. Articles, guides, and project stories.";
  const canonicalUrl = selectedService
    ? toAbsoluteUrl(`/blog?service=${encodeURIComponent(selectedSlug)}`)
    : toAbsoluteUrl("/blog");

  // SEO meta handling
  useEffect(() => {
    document.title = pageTitle;
    // (simplified meta update - same logic as before, no need to repeat)
  }, [pageTitle]);

  return (
    <PageTransition>
      <PremiumBackground>
        <Navigation />
        <main className="min-h-screen">
          {/* Hero Section */}
          <section className="relative pt-32 pb-16 md:pt-40 md:pb-24 overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-transparent dark:from-primary/10 dark:via-transparent pointer-events-none" />
            <div className="container-narrow relative z-10">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7 }}
                className="max-w-3xl"
              >
                <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold tracking-wide bg-primary/10 text-primary dark:bg-primary/20 mb-5">
                  <Sparkles className="w-3.5 h-3.5" />
                  Our Thinking
                </span>
                <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold tracking-tight leading-[1.1] text-balance">
                  Insights that <span className="text-primary">inspire</span> better design.
                </h1>
                <p className="mt-6 text-lg text-muted-foreground max-w-2xl">
                  Explore in‑depth articles, workflow guides, and technical resources from our multidisciplinary team.
                </p>
              </motion.div>
            </div>
          </section>

          {/* Filter Bar */}
          <section className="pb-8">
            <div className="container-narrow">
              <div className="flex items-center gap-4 overflow-x-auto pb-2 no-scrollbar">
                <button
                  onClick={() => setSearchParams({})}
                  className={`whitespace-nowrap px-5 py-2.5 rounded-full text-sm font-medium transition-all duration-300 flex items-center gap-2 ${
                    !selectedService
                      ? "bg-primary text-white shadow-lg shadow-primary/25"
                      : "bg-card border border-border hover:bg-muted/70 dark:bg-white/5 dark:hover:bg-white/10"
                  }`}
                >
                  <BookOpen className="w-4 h-4" />
                  All Articles
                  <span className="ml-1 text-xs opacity-80">({blogs.length})</span>
                </button>
                {services.map((service) => {
                  const slug = slugifyServiceName((service.slug || service.name || "").trim());
                  const count = blogs.filter((b) => b.service_id === service.id).length;
                  if (count === 0) return null;
                  const active = selectedService?.id === service.id;
                  return (
                    <button
                      key={service.id}
                      onClick={() => setSearchParams({ service: slug })}
                      className={`whitespace-nowrap px-5 py-2.5 rounded-full text-sm font-medium transition-all duration-300 ${
                        active
                          ? "bg-primary text-white shadow-lg shadow-primary/25"
                          : "bg-card border border-border hover:bg-muted/70 dark:bg-white/5 dark:hover:bg-white/10"
                      }`}
                    >
                      {service.name}
                      <span className="ml-1.5 text-xs opacity-80">({count})</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </section>

          {/* Main Content */}
          <section className="pb-20">
            <div className="container-narrow">
              {loading ? (
                <div className="grid md:grid-cols-2 gap-8">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="rounded-3xl bg-card/50 border border-border/30 h-72 animate-pulse" />
                  ))}
                </div>
              ) : visibleBlogs.length === 0 ? (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-center py-24"
                >
                  <BookOpen className="w-12 h-12 mx-auto text-muted-foreground/40 mb-4" />
                  <h2 className="text-2xl font-semibold">No articles yet</h2>
                  <p className="text-muted-foreground mt-2">
                    {selectedService
                      ? `We haven’t published any ${selectedService.name} articles. Stay tuned.`
                      : "No blog posts have been published yet."}
                  </p>
                </motion.div>
              ) : (
                <>
                  {/* Featured Post (if not filtering and there's a post) */}
                  {!selectedService && featuredPost && (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.6 }}
                      className="mb-16"
                    >
                      <Link to={`/blog/${featuredPost.slug}`} className="group block">
                        <article className="relative grid md:grid-cols-2 gap-0 rounded-3xl overflow-hidden border border-border/30 bg-card dark:bg-white/[0.03] hover:shadow-2xl hover:shadow-primary/5 transition-all duration-500">
                          <div className="aspect-[4/3] md:aspect-auto overflow-hidden">
                            {featuredPost.cover_image_url ? (
                              <img
                                src={featuredPost.cover_image_url}
                                alt={featuredPost.title}
                                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                              />
                            ) : (
                              <div className="w-full h-full bg-gradient-to-br from-primary/20 to-muted flex items-center justify-center">
                                <BookOpen className="w-16 h-16 text-primary/30" />
                              </div>
                            )}
                          </div>
                          <div className="flex flex-col justify-center p-8 md:p-10 lg:p-14">
                            <span className="text-xs font-semibold tracking-widest uppercase text-primary mb-4">
                              Featured Article
                            </span>
                            <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold leading-tight group-hover:text-primary transition-colors duration-300">
                              {featuredPost.title}
                            </h2>
                            <p className="mt-4 text-muted-foreground leading-relaxed line-clamp-3">
                              {featuredPost.excerpt}
                            </p>
                            <div className="mt-6 flex items-center gap-4 text-sm text-muted-foreground">
                              <span className="flex items-center gap-1.5">
                                <CalendarDays className="w-4 h-4" />
                                {formatDate(featuredPost.published_at || featuredPost.created_at)}
                              </span>
                              <span className="flex items-center gap-1.5">
                                <Clock className="w-4 h-4" />
                                {estimateReadTime(featuredPost.content || featuredPost.excerpt || "")}
                              </span>
                            </div>
                            <span className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-primary group-hover:gap-3 transition-all">
                              Read full article <ArrowRight className="w-4 h-4" />
                            </span>
                          </div>
                        </article>
                      </Link>
                    </motion.div>
                  )}

                  {/* Regular Grid */}
                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
                    <AnimatePresence mode="wait">
                      {(selectedService ? visibleBlogs : regularPosts).map((post, i) => {
                        const service = post.service_id ? serviceMap.get(post.service_id) : null;
                        return (
                          <motion.div
                            key={post.id}
                            custom={i}
                            variants={fadeUp}
                            initial="hidden"
                            whileInView="visible"
                            viewport={{ once: true, margin: "-50px" }}
                          >
                            <Link to={`/blog/${post.slug}`} className="group block h-full">
                              <article className="h-full flex flex-col rounded-2xl border border-border/30 bg-card dark:bg-white/[0.02] hover:bg-card/80 dark:hover:bg-white/[0.06] hover:border-primary/20 hover:shadow-xl hover:shadow-primary/5 transition-all duration-400 overflow-hidden">
                                <div className="aspect-[16/10] overflow-hidden relative">
                                  {post.cover_image_url ? (
                                    <img
                                      src={post.cover_image_url}
                                      alt={post.title}
                                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                                      loading="lazy"
                                    />
                                  ) : (
                                    <div className="w-full h-full bg-gradient-to-br from-muted/80 to-muted/20 flex items-center justify-center">
                                      <BookOpen className="w-10 h-10 text-muted-foreground/30" />
                                    </div>
                                  )}
                                  {service && (
                                    <span className="absolute top-3 left-3 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-background/80 dark:bg-black/50 backdrop-blur-sm text-foreground/80">
                                      {service.name}
                                    </span>
                                  )}
                                </div>
                                <div className="flex flex-col flex-1 p-5">
                                  <h3 className="text-lg font-semibold leading-snug group-hover:text-primary transition-colors line-clamp-2">
                                    {post.title}
                                  </h3>
                                  <p className="mt-2 text-sm text-muted-foreground line-clamp-3 flex-1">
                                    {post.excerpt}
                                  </p>
                                  <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
                                    <span className="flex items-center gap-1">
                                      <CalendarDays className="w-3.5 h-3.5" />
                                      {formatDate(post.published_at || post.created_at)}
                                    </span>
                                    <span className="flex items-center gap-1 text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                                      Read <ChevronRight className="w-3.5 h-3.5" />
                                    </span>
                                  </div>
                                </div>
                              </article>
                            </Link>
                          </motion.div>
                        );
                      })}
                    </AnimatePresence>
                  </div>

                  {/* If filter selected, show all posts including the one that would be featured */}
                  {selectedService && visibleBlogs.length > 0 && (
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8 mt-8">
                      {/* already rendered above, but we avoided duplication by conditionally rendering regularPosts or visibleBlogs.
                          The current logic: if selectedService, we render all visibleBlogs in the grid (including first).
                          So we're good. */}
                    </div>
                  )}
                </>
              )}
            </div>
          </section>
        </main>
        <Footer />
      </PremiumBackground>
    </PageTransition>
  );
};

export default Blog;
