import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { CalendarDays, ChevronLeft } from "lucide-react";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import PageTransition from "@/components/shared/PageTransition";
import PremiumBackground from "@/components/shared/PremiumBackground";
import { getApiBaseUrl } from "@/components/admin/adminAuth";
import type { ServiceBasic, ServiceBlogRecord } from "@/components/shared/serviceContent";
import { sanitizeRichHtml, stripHtmlToText } from "@/components/shared/richText";

const toAbsoluteUrl = (path: string) => {
  if (typeof window === "undefined") return path;
  if (/^https?:\/\//i.test(path)) return path;
  return `${window.location.origin}${path.startsWith("/") ? path : `/${path}`}`;
};

const formatDate = (value?: string | null) => {
  if (!value) return "Latest";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Latest";
  return date.toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" });
};

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");

const BlogDetails = () => {
  const { slug = "" } = useParams();
  const apiBase = getApiBaseUrl();
  const [post, setPost] = useState<ServiceBlogRecord | null>(null);
  const [serviceName, setServiceName] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    const controller = new AbortController();

    const load = async () => {
      setLoading(true);
      try {
        const res = await fetch(`${apiBase}/service-blogs?status=live&slug=${encodeURIComponent(slug)}&limit=1`, {
          signal: controller.signal,
        });
        if (!res.ok) throw new Error("Failed to fetch blog post");
        const data = await res.json();
        const item = Array.isArray(data) && data.length > 0 ? (data[0] as ServiceBlogRecord) : null;
        if (!mounted) return;
        setPost(item);

        if (item?.service_id) {
          const servicesRes = await fetch(`${apiBase}/services?status=live`, { signal: controller.signal });
          if (servicesRes.ok) {
            const servicesData = await servicesRes.json();
            if (mounted && Array.isArray(servicesData)) {
              const service = (servicesData as ServiceBasic[]).find((row) => row.id === item.service_id);
              setServiceName(service?.name || "");
            }
          }
        } else if (mounted) {
          setServiceName("");
        }
      } catch (error) {
        if (controller.signal.aborted || !mounted) return;
        console.error("Failed to load blog details", error);
        setPost(null);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    load();
    return () => {
      mounted = false;
      controller.abort();
    };
  }, [apiBase, slug]);

  const pageTitle = post ? `${post.title} | Drawn Dimension Blog` : "Blog Post | Drawn Dimension";
  const pageDescription = post?.excerpt || "Service-wise engineering and design insights from Drawn Dimension.";
  const canonicalUrl = toAbsoluteUrl(`/blog/${slug}`);
  const safeContentHtml = useMemo(() => sanitizeRichHtml(post?.content || ""), [post?.content]);
  const plainContent = useMemo(() => stripHtmlToText(post?.content || ""), [post?.content]);

  const structuredData = useMemo(() => {
    if (!post) return null;
    return {
      "@context": "https://schema.org",
      "@type": "BlogPosting",
      headline: post.title,
      description: pageDescription,
      datePublished: post.published_at || post.created_at || undefined,
      image: post.cover_image_url || toAbsoluteUrl("/images/logo.png"),
      articleBody: plainContent,
      url: canonicalUrl,
      publisher: {
        "@type": "Organization",
        name: "Drawn Dimension",
      },
    };
  }, [canonicalUrl, pageDescription, plainContent, post]);

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
    const resetOgType = upsertMeta("property", "og:type", "article");
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
        <main className="pt-28 pb-20">
          {structuredData ? (
            <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />
          ) : null}
          <div className="container-narrow">
            <Link to="/blog" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6">
              <ChevronLeft className="w-4 h-4" />
              Back to Blog
            </Link>

            {loading ? (
              <div className="glass-card p-10 text-center text-muted-foreground">Loading blog post...</div>
            ) : !post ? (
              <div className="glass-card p-10 text-center space-y-4">
                <h1 className="text-3xl font-bold">Blog Post Not Found</h1>
                <p className="text-muted-foreground">This post is not available right now.</p>
                <Link to="/blog" className="btn-outline h-11 px-6">
                  Back to Blog
                </Link>
              </div>
            ) : (
              <article className="glass-card border-border/60 overflow-hidden">
                {post.cover_image_url ? (
                  <img src={post.cover_image_url} alt={`${post.title} cover image`} className="w-full h-72 md:h-96 object-cover" />
                ) : null}
                <div className="p-6 md:p-10">
                  <p className="text-sm text-primary font-medium uppercase tracking-wide">
                    {serviceName || "General"}
                  </p>
                  <h1 className="text-3xl md:text-5xl font-bold tracking-tight mt-3 text-balance">{post.title}</h1>
                  <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
                    <CalendarDays className="w-4 h-4" />
                    <span>{formatDate(post.published_at || post.created_at)}</span>
                  </div>
                  <p className="mt-5 text-muted-foreground leading-relaxed">{post.excerpt}</p>
                  <div
                    className="mt-8 blog-rich-content text-foreground/95"
                    dangerouslySetInnerHTML={{
                      __html:
                        safeContentHtml ||
                        `<p>${escapeHtml(plainContent || "No blog content available.")}</p>`,
                    }}
                  />
                </div>
              </article>
            )}
          </div>
        </main>
        <Footer />
      </PremiumBackground>
    </PageTransition>
  );
};

export default BlogDetails;
