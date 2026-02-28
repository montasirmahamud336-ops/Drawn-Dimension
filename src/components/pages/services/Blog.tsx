import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, CalendarDays } from "lucide-react";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import PageTransition from "@/components/shared/PageTransition";
import PageHero from "@/components/shared/PageHero";
import PremiumBackground from "@/components/shared/PremiumBackground";
import { getApiBaseUrl } from "@/components/admin/adminAuth";
import { slugifyServiceName } from "@/components/shared/serviceCatalog";
import type { ServiceBasic, ServiceBlogRecord } from "@/components/shared/serviceContent";

const toAbsoluteUrl = (path: string) => {
  if (typeof window === "undefined") return path;
  if (/^https?:\/\//i.test(path)) return path;
  return `${window.location.origin}${path.startsWith("/") ? path : `/${path}`}`;
};

const formatDate = (value?: string | null) => {
  if (!value) return "Latest";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Latest";
  return date.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
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

        if (!servicesRes.ok) throw new Error("Failed to fetch services");
        if (!blogsRes.ok) throw new Error("Failed to fetch blog posts");

        const servicesData = await servicesRes.json();
        const blogsData = await blogsRes.json();
        if (!mounted) return;

        setServices(Array.isArray(servicesData) ? (servicesData as ServiceBasic[]) : []);
        setBlogs(Array.isArray(blogsData) ? (blogsData as ServiceBlogRecord[]) : []);
      } catch (error) {
        if (controller.signal.aborted || !mounted) return;
        console.error("Failed to load blog data", error);
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
        ? services.find((service) => slugifyServiceName((service.slug || service.name || "").trim()) === selectedSlug) ||
          null
        : null,
    [selectedSlug, services]
  );

  const serviceMap = useMemo(() => {
    const map = new Map<number, ServiceBasic>();
    services.forEach((service) => map.set(service.id, service));
    return map;
  }, [services]);

  const visibleBlogs = useMemo(() => {
    if (!selectedService) return blogs;
    return blogs.filter((blog) => blog.service_id === selectedService.id);
  }, [blogs, selectedService]);

  const pageTitle = selectedService
    ? `${selectedService.name} Blog | Drawn Dimension`
    : "Blog | Drawn Dimension";
  const pageDescription = selectedService
    ? `Latest ${selectedService.name} articles, workflow tips, and professional insights from Drawn Dimension.`
    : "Service-wise blog posts from Drawn Dimension covering web design, AutoCAD, PFD/P&ID, SolidWorks, HAZOP, and branding.";
  const canonicalUrl = selectedService
    ? toAbsoluteUrl(`/blog?service=${encodeURIComponent(slugifyServiceName(selectedService.slug || selectedService.name || ""))}`)
    : toAbsoluteUrl("/blog");

  const structuredData = useMemo(
    () => ({
      "@context": "https://schema.org",
      "@graph": [
        {
          "@type": "WebPage",
          name: pageTitle,
          url: canonicalUrl,
          description: pageDescription,
          inLanguage: "en",
        },
        {
          "@type": "Blog",
          name: selectedService ? `${selectedService.name} Blog` : "Drawn Dimension Blog",
          url: canonicalUrl,
          description: pageDescription,
          blogPost: visibleBlogs.slice(0, 20).map((post) => ({
            "@type": "BlogPosting",
            headline: post.title,
            description: post.excerpt,
            url: toAbsoluteUrl(`/blog/${post.slug}`),
            datePublished: post.published_at || post.created_at || undefined,
          })),
        },
      ],
    }),
    [canonicalUrl, pageDescription, pageTitle, selectedService, visibleBlogs]
  );

  useEffect(() => {
    const previousTitle = document.title;
    document.title = pageTitle;

    const upsertMeta = (attr: "name" | "property", key: string, content: string) => {
      let tag = document.head.querySelector(`meta[${attr}="${key}"]`) as HTMLMetaElement | null;
      const created = !tag;
      if (!tag) {
        tag = document.createElement("meta");
        tag.setAttribute(attr, key);
        document.head.appendChild(tag);
      }
      const previousContent = tag.getAttribute("content") ?? "";
      tag.setAttribute("content", content);
      return () => {
        if (created) tag?.remove();
        else tag?.setAttribute("content", previousContent);
      };
    };

    const resetDescription = upsertMeta("name", "description", pageDescription);
    const resetOgTitle = upsertMeta("property", "og:title", pageTitle);
    const resetOgDescription = upsertMeta("property", "og:description", pageDescription);
    const resetOgType = upsertMeta("property", "og:type", "website");
    const resetOgUrl = upsertMeta("property", "og:url", canonicalUrl);
    const resetRobots = upsertMeta("name", "robots", "index, follow, max-image-preview:large");
    const resetTwitterCard = upsertMeta("name", "twitter:card", "summary_large_image");
    const resetTwitterTitle = upsertMeta("name", "twitter:title", pageTitle);
    const resetTwitterDescription = upsertMeta("name", "twitter:description", pageDescription);

    let canonical = document.head.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
    const createdCanonical = !canonical;
    if (!canonical) {
      canonical = document.createElement("link");
      canonical.setAttribute("rel", "canonical");
      document.head.appendChild(canonical);
    }
    const previousCanonicalHref = canonical.getAttribute("href") ?? "";
    canonical.setAttribute("href", canonicalUrl);

    return () => {
      document.title = previousTitle;
      resetDescription();
      resetOgTitle();
      resetOgDescription();
      resetOgType();
      resetOgUrl();
      resetRobots();
      resetTwitterCard();
      resetTwitterTitle();
      resetTwitterDescription();
      if (createdCanonical) canonical?.remove();
      else canonical?.setAttribute("href", previousCanonicalHref);
    };
  }, [canonicalUrl, pageDescription, pageTitle]);

  return (
    <PageTransition>
      <PremiumBackground>
        <Navigation />
        <main>
          <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />
          <PageHero
            title={selectedService ? `${selectedService.name} Blog` : "Service Blog"}
            subtitle="Insights & Updates"
            description="Read service-wise articles and practical guidance from our engineering and creative team."
          />

          <section className="section-padding pt-0">
            <div className="container-narrow">
              <div className="glass-card p-4 border-border/60 mb-6">
                <div className="flex flex-wrap justify-center gap-2">
                  <button
                    type="button"
                    onClick={() => setSearchParams({})}
                    className={`px-4 py-2 rounded-full border text-sm transition-all ${
                      !selectedService ? "border-primary/45 bg-primary/10 text-primary" : "border-border/60 hover:border-primary/35"
                    }`}
                  >
                    All Services
                  </button>
                  {services.map((service) => {
                    const slug = slugifyServiceName((service.slug || service.name || "").trim());
                    const active = selectedService?.id === service.id;
                    return (
                      <button
                        key={service.id}
                        type="button"
                        onClick={() => setSearchParams({ service: slug })}
                        className={`px-4 py-2 rounded-full border text-sm transition-all ${
                          active ? "border-primary/45 bg-primary/10 text-primary" : "border-border/60 hover:border-primary/35"
                        }`}
                      >
                        {service.name}
                      </button>
                    );
                  })}
                </div>
              </div>

              {loading ? (
                <div className="glass-card p-10 text-center text-muted-foreground">Loading blog posts...</div>
              ) : visibleBlogs.length === 0 ? (
                <div className="glass-card p-10 text-center text-muted-foreground">
                  No live blog posts found for this service yet.
                </div>
              ) : (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {visibleBlogs.map((post, index) => {
                    const service = post.service_id ? serviceMap.get(post.service_id) : null;
                    return (
                      <Link key={post.id} to={`/blog/${post.slug}`} className="block">
                        <motion.article
                          initial={{ opacity: 0, y: 28 }}
                          whileInView={{ opacity: 1, y: 0 }}
                          viewport={{ once: true }}
                          transition={{ duration: 0.45, delay: index * 0.05 }}
                          className="glass-card overflow-hidden border-border/60 bg-[linear-gradient(145deg,rgba(255,255,255,0.07),rgba(255,255,255,0.01)_44%,rgba(239,68,68,0.07)_100%)] transition-all duration-300 hover:border-primary/40 hover:shadow-lg"
                        >
                          {post.cover_image_url ? (
                            <img
                              src={post.cover_image_url}
                              alt={`${post.title} cover image`}
                              className="w-full h-44 object-cover border-b border-border/60"
                              loading="lazy"
                            />
                          ) : (
                            <div className="w-full h-44 border-b border-border/60 bg-gradient-to-br from-primary/20 to-background/20" />
                          )}
                          <div className="p-5">
                            <p className="text-xs text-primary font-medium uppercase tracking-wide">
                              {service?.name || "General"}
                            </p>
                            <h2 className="text-lg font-semibold mt-2 text-balance">{post.title}</h2>
                            <p className="text-sm text-muted-foreground mt-2 line-clamp-3">{post.excerpt}</p>
                            <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
                              <span className="inline-flex items-center gap-1">
                                <CalendarDays className="w-3.5 h-3.5" />
                                {formatDate(post.published_at || post.created_at)}
                              </span>
                              <span className="inline-flex items-center gap-1 text-primary">
                                Read
                                <ArrowRight className="w-3.5 h-3.5" />
                              </span>
                            </div>
                          </div>
                        </motion.article>
                      </Link>
                    );
                  })}
                </div>
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
