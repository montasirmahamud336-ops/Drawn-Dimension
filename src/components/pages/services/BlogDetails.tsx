// BlogDetails.tsx – with comment edit & delete via three‑dot menu
import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  CalendarDays,
  Clock,
  LinkIcon,
  Check,
  ArrowUpRight,
  MessageCircle,
  Send,
  User,
  MoreHorizontal, // ★ new icon for three-dot menu
} from "lucide-react";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import PageTransition from "@/components/shared/PageTransition";
import PremiumBackground from "@/components/shared/PremiumBackground";
import { getApiBaseUrl } from "@/components/admin/adminAuth";
import type { ServiceBasic, ServiceBlogRecord } from "@/components/shared/serviceContent";
import { sanitizeRichHtml, stripHtmlToText } from "@/components/shared/richText";

/* ═══════════════════════════════════════════════════════════
   HELPERS
   ═══════════════════════════════════════════════════════════ */

const toAbsoluteUrl = (path: string) => {
  if (/^https?:\/\//i.test(path)) return path;
  return `https://www.drawndimension.com${path.startsWith("/") ? path : `/${path}`}`;
};

const formatDate = (value?: string | null) => {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
};

const readingTime = (html?: string | null) => {
  if (!html) return null;
  const words = html
    .replace(/<[^>]*>/g, "")
    .split(/\s+/)
    .filter(Boolean).length;
  return `${Math.max(1, Math.ceil(words / 220))} min read`;
};

const escapeHtml = (v: string) =>
  v
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

/* ═══════════════════════════════════════════════════════════
   BRAND SVG ICONS
   ═══════════════════════════════════════════════════════════ */

const FacebookIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
  </svg>
);

const LinkedInIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
  </svg>
);

const XIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
  </svg>
);

/* ═══════════════════════════════════════════════════════════
   READING PROGRESS
   ═══════════════════════════════════════════════════════════ */

const ReadingProgress = () => {
  const [progress, setProgress] = useState(0);
  useEffect(() => {
    const onScroll = () => {
      const el = document.documentElement;
      const top = el.scrollTop || document.body.scrollTop;
      const height = el.scrollHeight - el.clientHeight;
      setProgress(height > 0 ? (top / height) * 100 : 0);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  return (
    <div className="fixed top-0 inset-x-0 z-[60] h-[2px] bg-white/[0.03]">
      <div
        className="h-full bg-gradient-to-r from-primary/70 to-primary transition-[width] duration-150 ease-out"
        style={{ width: `${progress}%` }}
      />
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════
   SHARE
   ═══════════════════════════════════════════════════════════ */

const ShareButtons = ({ url, title }: { url: string; title: string }) => {
  const [copied, setCopied] = useState(false);
  const eu = encodeURIComponent(url);
  const et = encodeURIComponent(title);

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      const t = document.createElement("textarea");
      t.value = url;
      document.body.appendChild(t);
      t.select();
      document.execCommand("copy");
      document.body.removeChild(t);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2400);
  };

  const nativeShare = async () => {
    if (navigator.share) {
      try { await navigator.share({ title, url }); } catch { /* cancel */ }
    } else copyLink();
  };

  const links = [
    { label: "Facebook", icon: <FacebookIcon className="w-[15px] h-[15px]" />, href: `https://www.facebook.com/sharer/sharer.php?u=${eu}`, hover: "hover:text-[#1877F2]" },
    { label: "LinkedIn", icon: <LinkedInIcon className="w-[15px] h-[15px]" />, href: `https://www.linkedin.com/sharing/share-offsite/?url=${eu}`, hover: "hover:text-[#0A66C2]" },
    { label: "X", icon: <XIcon className="w-[14px] h-[14px]" />, href: `https://twitter.com/intent/tweet?url=${eu}&text=${et}`, hover: "hover:text-white" },
  ];

  return (
    <div className="flex items-center gap-1">
      {links.map((l) => (
        <a key={l.label} href={l.href} target="_blank" rel="noopener noreferrer" title={`Share on ${l.label}`}
          className={`w-8 h-8 rounded-full flex items-center justify-center text-white/25 transition-all duration-200 ${l.hover} hover:bg-white/[0.06]`}>
          {l.icon}
        </a>
      ))}
      <button type="button" onClick={copyLink} title={copied ? "Copied" : "Copy link"}
        className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-200 ${copied ? "text-emerald-400 bg-emerald-400/10" : "text-white/25 hover:text-white/60 hover:bg-white/[0.06]"}`}>
        {copied ? <Check className="w-[13px] h-[13px]" /> : <LinkIcon className="w-[13px] h-[13px]" />}
      </button>
      {"share" in navigator && (
        <button type="button" onClick={nativeShare} title="Share"
          className="w-8 h-8 rounded-full flex items-center justify-center text-white/25 hover:text-white/60 hover:bg-white/[0.06] transition-all duration-200">
          <ArrowUpRight className="w-[13px] h-[13px]" />
        </button>
      )}
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════
   PROSE — EDITORIAL GRADE TYPOGRAPHY
   ═══════════════════════════════════════════════════════════ */

const PROSE_CSS = `
/* ── Font import: Inter with all weights ── */
@import url('https://fonts.googleapis.com/css2?family=Inter:opsz,wght@14..32,300..700&display=swap');

/* ── Global text rendering for this block ── */
.blog-prose {
  font-family: 'Inter', ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  font-feature-settings: "cv02", "cv03", "cv04", "cv05", "cv11", "ss01";
  font-variation-settings: "opsz" 32;
  font-size: 17px;
  line-height: 1.78;
  letter-spacing: -0.012em;
  color: rgba(255,255,255,0.80);
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-rendering: optimizeLegibility;
  font-weight: 400;
  text-wrap: pretty;
  -webkit-hyphens: auto;
  hyphens: auto;
  -webkit-hyphenate-character: "­";
}

/* ── Selection ── */
.blog-prose ::selection {
  background: rgba(239,68,68,0.25);
  color: #fff;
}

/* ── Spacing rhythm ── */
.blog-prose > * + * {
  margin-top: 1.55em;
}

/* ── Headings ── */
.blog-prose h2 {
  font-size: 1.55em;
  font-weight: 620;
  letter-spacing: -0.03em;
  line-height: 1.18;
  margin-top: 2.8em;
  margin-bottom: 0.3em;
  color: rgba(255,255,255,0.96);
  font-variation-settings: "opsz" 28;
}

.blog-prose h3 {
  font-size: 1.22em;
  font-weight: 600;
  letter-spacing: -0.02em;
  line-height: 1.25;
  margin-top: 2.4em;
  margin-bottom: 0.2em;
  color: rgba(255,255,255,0.93);
  font-variation-settings: "opsz" 29;
}

.blog-prose h4 {
  font-size: 1.05em;
  font-weight: 600;
  letter-spacing: -0.015em;
  line-height: 1.35;
  margin-top: 2em;
  color: rgba(255,255,255,0.88);
}

/* ── Paragraphs ── */
.blog-prose p {
  margin-top: 1.55em;
  orphans: 2;
  widows: 2;
}

/* ── Lead paragraph (excerpt) ── */
.blog-prose-lead {
  font-family: 'Inter', ui-sans-serif, system-ui, sans-serif;
  font-feature-settings: "cv02", "cv03", "cv04", "cv05", "cv11", "ss01";
  font-variation-settings: "opsz" 34;
  font-size: 20px;
  line-height: 1.65;
  letter-spacing: -0.016em;
  font-weight: 380;
  color: rgba(255,255,255,0.48);
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-rendering: optimizeLegibility;
  text-wrap: pretty;
}

/* ── Strong / bold ── */
.blog-prose strong {
  font-weight: 580;
  color: rgba(255,255,255,0.96);
  letter-spacing: -0.008em;
}

/* ── Links ── */
.blog-prose a {
  color: rgba(239,68,68,0.8);
  text-decoration: underline;
  text-underline-offset: 3px;
  text-decoration-thickness: 1px;
  text-decoration-color: rgba(239,68,68,0.22);
  transition: color 0.2s ease, text-decoration-color 0.2s ease;
  font-weight: 450;
}
.blog-prose a:hover {
  color: rgba(239,68,68,1);
  text-decoration-color: rgba(239,68,68,0.5);
}

/* ── Lists ── */
.blog-prose ul {
  list-style-type: disc;
  padding-left: 1.35em;
  margin-top: 1.4em;
}
.blog-prose ol {
  list-style-type: decimal;
  padding-left: 1.35em;
  margin-top: 1.4em;
}
.blog-prose li {
  margin-top: 0.4em;
  line-height: 1.72;
  padding-left: 0.15em;
}
.blog-prose li::marker {
  color: rgba(255,255,255,0.15);
  font-size: 0.85em;
}

/* ── Nested lists ── */
.blog-prose li ul,
.blog-prose li ol {
  margin-top: 0.3em;
  margin-bottom: 0;
}

/* ── Blockquote ── */
.blog-prose blockquote {
  border-left: 2.5px solid rgba(239,68,68,0.35);
  padding: 1em 0 1em 1.5em;
  margin: 2em 0 2em 0;
  font-style: normal;
  font-weight: 400;
  color: rgba(255,255,255,0.58);
  background: linear-gradient(100deg, rgba(239,68,68,0.025) 0%, transparent 60%);
  border-radius: 0 0.5rem 0.5rem 0;
  font-size: 1.02em;
  line-height: 1.72;
}
.blog-prose blockquote p {
  margin-top: 0;
}
.blog-prose blockquote p + p {
  margin-top: 1em;
}
.blog-prose blockquote strong {
  color: rgba(255,255,255,0.72);
}

/* ── Horizontal rule ── */
.blog-prose hr {
  border: none;
  height: 1px;
  background: linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.07) 30%, rgba(255,255,255,0.07) 70%, transparent 100%);
  margin: 3.5em 0;
}

/* ── Images ── */
.blog-prose img {
  border-radius: 0.75rem;
  margin: 2.8em 0;
  max-width: 100%;
  height: auto;
  border: 1px solid rgba(255,255,255,0.04);
  box-shadow: 0 12px 48px -16px rgba(0,0,0,0.55), 0 0 0 1px rgba(255,255,255,0.02) inset;
}

/* ── Figure ── */
.blog-prose figure {
  margin: 2.8em 0;
}
.blog-prose figcaption {
  font-size: 13px;
  line-height: 1.5;
  color: rgba(255,255,255,0.28);
  text-align: center;
  margin-top: 0.75em;
  font-weight: 400;
  letter-spacing: 0.002em;
}

/* ── Inline code ── */
.blog-prose code {
  font-family: 'SF Mono', 'Fira Code', 'Cascadia Code', 'JetBrains Mono', 'Consolas', monospace;
  font-size: 0.86em;
  font-weight: 450;
  background: rgba(255,255,255,0.06);
  padding: 0.12em 0.38em;
  border-radius: 0.3em;
  border: 1px solid rgba(255,255,255,0.04);
  letter-spacing: -0.01em;
  color: rgba(255,255,255,0.85);
}

/* ── Code block ── */
.blog-prose pre {
  font-family: 'SF Mono', 'Fira Code', 'Cascadia Code', 'JetBrains Mono', 'Consolas', monospace;
  font-size: 0.855em;
  line-height: 1.7;
  background: rgba(0,0,0,0.45);
  padding: 1.3em 1.5em;
  border-radius: 0.85rem;
  overflow-x: auto;
  margin: 2em 0;
  border: 1px solid rgba(255,255,255,0.05);
  box-shadow: 0 4px 24px -8px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.02);
  -webkit-overflow-scrolling: touch;
}
.blog-prose pre code {
  background: none;
  padding: 0;
  border: none;
  font-size: 1em;
  color: rgba(255,255,255,0.72);
}

/* ── Tables ── */
.blog-prose table {
  width: 100%;
  border-collapse: collapse;
  margin: 2em 0;
  font-size: 0.92em;
  line-height: 1.55;
}
.blog-prose th {
  background: rgba(255,255,255,0.03);
  font-weight: 550;
  font-size: 0.78em;
  text-transform: uppercase;
  letter-spacing: 0.065em;
  color: rgba(255,255,255,0.45);
  border: 1px solid rgba(255,255,255,0.06);
  padding: 0.7em 1em;
  text-align: left;
}
.blog-prose td {
  border: 1px solid rgba(255,255,255,0.05);
  padding: 0.6em 1em;
  color: rgba(255,255,255,0.72);
  vertical-align: top;
}
.blog-prose tr:hover td {
  background: rgba(255,255,255,0.015);
}

/* ── Edge cases ── */
.blog-prose > :first-child { margin-top: 0; }
.blog-prose > :last-child { margin-bottom: 0; }
.blog-prose > h2:first-child,
.blog-prose > h3:first-child { margin-top: 0; }

/* ── Responsive ── */
@media (max-width: 640px) {
  .blog-prose {
    font-size: 16px;
    line-height: 1.72;
    letter-spacing: -0.01em;
  }
  .blog-prose-lead {
    font-size: 18px;
    line-height: 1.6;
  }
  .blog-prose h2 {
    font-size: 1.4em;
    margin-top: 2.2em;
  }
  .blog-prose h3 {
    font-size: 1.15em;
    margin-top: 1.8em;
  }
  .blog-prose blockquote {
    padding-left: 1.1em;
  }
  .blog-prose img {
    border-radius: 0.5rem;
    margin: 2em 0;
  }
}
`;

/* ═══════════════════════════════════════════════════════════
   SKELETON
   ═══════════════════════════════════════════════════════════ */

const DetailSkeleton = () => (
  <div className="animate-pulse">
    <div className="h-4 w-16 rounded bg-white/[0.04] mb-8" />
    <div className="h-11 w-full rounded bg-white/[0.04]" />
    <div className="h-11 w-3/4 rounded bg-white/[0.04] mt-3" />
    <div className="h-5 w-2/5 rounded bg-white/[0.03] mt-6" />
    <div className="flex gap-6 mt-5">
      <div className="h-3.5 w-32 rounded bg-white/[0.03]" />
      <div className="h-3.5 w-20 rounded bg-white/[0.03]" />
    </div>
    <div className="mt-10 space-y-4">
      {Array.from({ length: 12 }).map((_, i) => (
        <div
          key={i}
          className="h-[20px] rounded bg-white/[0.03]"
          style={{ width: `${80 + Math.random() * 20}%` }}
        />
      ))}
    </div>
  </div>
);

/* ═══════════════════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════════════════ */

const BlogDetails = () => {
  const { slug = "" } = useParams();
  const apiBase = getApiBaseUrl();
  const [post, setPost] = useState<ServiceBlogRecord | null>(null);
  const [serviceName, setServiceName] = useState("");
  const [relatedPosts, setRelatedPosts] = useState<ServiceBlogRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const contentRef = useRef<HTMLDivElement>(null);

  // ── Comment state ──
  const [comments, setComments] = useState<{ name: string; body: string; date: string }[]>([]);
  const [newName, setNewName] = useState("");
  const [newComment, setNewComment] = useState("");
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editBody, setEditBody] = useState("");
  const [menuOpenIndex, setMenuOpenIndex] = useState<number | null>(null);

  // Load comments from localStorage when slug changes
  useEffect(() => {
    try {
      const stored = localStorage.getItem(`blog-comments-${slug}`);
      if (stored) {
        const parsed = JSON.parse(stored);
        setComments(Array.isArray(parsed) ? parsed : []);
      } else {
        setComments([]);
      }
    } catch {
      setComments([]);
    }
  }, [slug]);

  // Save comments to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem(`blog-comments-${slug}`, JSON.stringify(comments));
  }, [comments, slug]);

  const addComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    const comment = {
      name: newName.trim() || "Anonymous",
      body: newComment.trim(),
      date: new Date().toISOString(),
    };
    setComments((prev) => [comment, ...prev]);
    setNewName("");
    setNewComment("");
  };

  const deleteComment = (index: number) => {
    setComments((prev) => prev.filter((_, i) => i !== index));
    setMenuOpenIndex(null);
  };

  const startEdit = (index: number) => {
    setEditingIndex(index);
    setEditBody(comments[index].body);
    setMenuOpenIndex(null);
  };

  const cancelEdit = () => {
    setEditingIndex(null);
    setEditBody("");
  };

  const saveEdit = (index: number) => {
    if (!editBody.trim()) return;
    setComments((prev) =>
      prev.map((c, i) => (i === index ? { ...c, body: editBody.trim() } : c))
    );
    setEditingIndex(null);
    setEditBody("");
  };

  // Close menu on outside click
  useEffect(() => {
    const handler = () => setMenuOpenIndex(null);
    document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, []);

  useEffect(() => {
    let mounted = true;
    const ctrl = new AbortController();

    const load = async () => {
      setLoading(true);
      try {
        const res = await fetch(
          `${apiBase}/service-blogs?status=live&slug=${encodeURIComponent(slug)}&limit=1`,
          { signal: ctrl.signal },
        );
        if (!res.ok) throw new Error("fetch failed");
        const data = await res.json();
        const item =
          Array.isArray(data) && data.length > 0
            ? (data[0] as ServiceBlogRecord)
            : null;
        if (!mounted) return;
        setPost(item);

        const tasks: Promise<void>[] = [];
        if (item?.service_id) {
          tasks.push(
            fetch(`${apiBase}/services?status=live`, {
              signal: ctrl.signal,
            })
              .then((r) => (r.ok ? r.json() : []))
              .then((sd) => {
                if (mounted && Array.isArray(sd)) {
                  const s = (sd as ServiceBasic[]).find(
                    (x) => x.id === item.service_id,
                  );
                  setServiceName(s?.name || "");
                }
              })
              .catch(() => {}),
          );
          tasks.push(
            fetch(
              `${apiBase}/service-blogs?status=live&service_id=${item.service_id}&limit=5`,
              { signal: ctrl.signal },
            )
              .then((r) => (r.ok ? r.json() : []))
              .then((rd) => {
                if (mounted && Array.isArray(rd))
                  setRelatedPosts(
                    (rd as ServiceBlogRecord[])
                      .filter((p) => p.slug !== slug)
                      .slice(0, 3),
                  );
              })
              .catch(() => {}),
          );
        } else if (mounted) setServiceName("");
        await Promise.allSettled(tasks);
      } catch (e) {
        if (ctrl.signal.aborted || !mounted) return;
        console.error(e);
        setPost(null);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    return () => {
      mounted = false;
      ctrl.abort();
    };
  }, [apiBase, slug]);

  const pageTitle = post
    ? `${post.title} | Drawn Dimension Blog`
    : "Blog Post | Drawn Dimension";
  const pageDescription =
    post?.excerpt || "Engineering and design insights from Drawn Dimension.";
  const canonicalUrl = toAbsoluteUrl(`/blog/${slug}`);
  const safeHtml = useMemo(
    () => sanitizeRichHtml(post?.content || ""),
    [post?.content],
  );
  const plainText = useMemo(
    () => stripHtmlToText(post?.content || ""),
    [post?.content],
  );

  const structuredData = useMemo(() => {
    if (!post) return null;
    return {
      "@context": "https://schema.org",
      "@type": "BlogPosting",
      headline: post.title,
      description: pageDescription,
      datePublished: post.published_at || post.created_at || undefined,
      image: post.cover_image_url || toAbsoluteUrl("/images/logo.png"),
      articleBody: plainText,
      url: canonicalUrl,
      publisher: { "@type": "Organization", name: "Drawn Dimension" },
    };
  }, [canonicalUrl, pageDescription, plainText, post]);

  useEffect(() => {
    const prev = document.title;
    document.title = pageTitle;
    const upsert = (
      attr: "name" | "property",
      key: string,
      content: string,
    ) => {
      let el = document.head.querySelector(
        `meta[${attr}="${key}"]`,
      ) as HTMLMetaElement | null;
      const c = !el;
      if (!el) {
        el = document.createElement("meta");
        el.setAttribute(attr, key);
        document.head.appendChild(el);
      }
      const old = el.getAttribute("content") ?? "";
      el.setAttribute("content", content);
      return () => {
        if (c) el?.remove();
        else el?.setAttribute("content", old);
      };
    };
    const cl = [
      upsert("name", "description", pageDescription),
      upsert("property", "og:title", pageTitle),
      upsert("property", "og:description", pageDescription),
      upsert("property", "og:type", "article"),
      upsert("property", "og:url", canonicalUrl),
      upsert("name", "robots", "index, follow, max-image-preview:large"),
      upsert("name", "twitter:card", "summary_large_image"),
      upsert("name", "twitter:title", pageTitle),
      upsert("name", "twitter:description", pageDescription),
    ];
    let lk = document.head.querySelector(
      'link[rel="canonical"]',
    ) as HTMLLinkElement | null;
    const lc = !lk;
    if (!lk) {
      lk = document.createElement("link");
      lk.setAttribute("rel", "canonical");
      document.head.appendChild(lk);
    }
    const oh = lk.getAttribute("href") ?? "";
    lk.setAttribute("href", canonicalUrl);
    return () => {
      document.title = prev;
      cl.forEach((f) => f());
      if (lc) lk?.remove();
      else lk?.setAttribute("href", oh);
    };
  }, [canonicalUrl, pageDescription, pageTitle]);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
  }, [slug]);

  /* ═══════════════════════════════════════════════════════════
     RENDER
     ═══════════════════════════════════════════════════════════ */

  return (
    <PageTransition>
      <PremiumBackground>
        <Navigation />
        <style dangerouslySetInnerHTML={{ __html: PROSE_CSS }} />
        {post && <ReadingProgress />}

        <main>
          {structuredData && (
            <script
              type="application/ld+json"
              dangerouslySetInnerHTML={{
                __html: JSON.stringify(structuredData),
              }}
            />
          )}

          {loading ? (
            <div className="pt-32 pb-28">
              <div className="max-w-4xl max-w-[680px] px-6">
                <DetailSkeleton />
              </div>
            </div>
          ) : !post ? (
            <div className="flex flex-col items-center justify-center min-h-[80vh] text-center px-6">
              <p className="text-7xl font-bold tracking-tighter text-white/[0.05]">
                404
              </p>
              <h1 className="text-xl font-semibold mt-2 tracking-tight">
                Article not found
              </h1>
              <p className="text-sm text-muted-foreground mt-2 max-w-xs leading-relaxed">
                This post may have been moved or removed.
              </p>
              <Link
                to="/blog"
                className="mt-7 text-sm font-medium text-primary hover:text-primary/80 transition-colors"
              >
                ← Back to blog
              </Link>
            </div>
          ) : (
            <>
              {/* ═══ HERO ═══ */}
              {post.cover_image_url ? (
                <div className="relative w-full h-[52vh] min-h-[380px] max-h-[580px] overflow-hidden">
                  <img
                    src={post.cover_image_url}
                    alt=""
                    className="absolute inset-0 w-full h-full object-cover scale-105"
                    loading="eager"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[rgba(0,0,0,0.88)] via-[rgba(0,0,0,0.28)] to-[rgba(0,0,0,0.12)]" />
                  <div className="absolute inset-0 bg-gradient-to-r from-[rgba(0,0,0,0.35)] to-transparent" />
                  <div className="absolute inset-0 flex items-end">
                    <div className="max-auto w-full max-w-4xl px-6 pb-12 md:pb-16">
                      <motion.div
                        initial={{ opacity: 0, y: 28 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{
                          duration: 0.7,
                          ease: [0.22, 1, 0.36, 1],
                        }}
                      >
                        {serviceName && (
                          <Link
                            to={`/blog?service=${serviceName.toLowerCase().replace(/\s+/g, "-")}`}
                            className="inline-block text-[10px] font-semibold uppercase tracking-[0.18em] text-white/50 border border-white/[0.12] px-2.5 py-[3px] rounded hover:text-white/70 hover:border-white/20 transition-colors"
                          >
                            {serviceName}
                          </Link>
                        )}
                        <h1 className="text-[1.75rem] sm:text-[2.15rem] md:text-[2.65rem] lg:text-[2.9rem] font-bold tracking-[-0.035em] leading-[1.1] mt-4 text-white">
                          {post.title}
                        </h1>
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-5">
                          {(post.published_at || post.created_at) && (
                            <span className="flex items-center gap-1.5 text-[12.5px] text-white/35">
                              <CalendarDays className="w-3 h-3" />
                              {formatDate(post.published_at || post.created_at)}
                            </span>
                          )}
                          {readingTime(post.content) && (
                            <span className="flex items-center gap-1.5 text-[12.5px] text-white/35">
                              <Clock className="w-3 h-3" />
                              {readingTime(post.content)}
                            </span>
                          )}
                          <div className="ml-auto">
                            <ShareButtons
                              url={canonicalUrl}
                              title={post.title}
                            />
                          </div>
                        </div>
                      </motion.div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="pt-36 md:pt-44 pb-4">
                  <div className="mx-auto max-w-5xl px-6">
                    <motion.div
                      initial={{ opacity: 0, y: 28 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{
                        duration: 0.7,
                        ease: [0.22, 1, 0.36, 1],
                      }}
                    >
                      {serviceName && (
                        <Link
                          to={`/blog?service=${serviceName.toLowerCase().replace(/\s+/g, "-")}`}
                          className="inline-block text-[10px] font-semibold uppercase tracking-[0.18em] text-primary/60 border border-primary/[0.12] px-2.5 py-[3px] rounded hover:text-primary hover:border-primary/25 transition-colors"
                        >
                          {serviceName}
                        </Link>
                      )}
                      <h1 className="text-[1.75rem] sm:text-[2.15rem] md:text-[2.65rem] lg:text-[2.9rem] font-bold tracking-[-0.035em] leading-[1.1] mt-5">
                        {post.title}
                      </h1>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-5 text-muted-foreground">
                        {(post.published_at || post.created_at) && (
                          <span className="flex items-center gap-1.5 text-[12.5px]">
                            <CalendarDays className="w-3 h-3 opacity-50" />
                            {formatDate(post.published_at || post.created_at)}
                          </span>
                        )}
                        {readingTime(post.content) && (
                          <span className="flex items-center gap-1.5 text-[12.5px]">
                            <Clock className="w-3 h-3 opacity-50" />
                            {readingTime(post.content)}
                          </span>
                        )}
                        <div className="ml-auto">
                          <ShareButtons
                            url={canonicalUrl}
                            title={post.title}
                          />
                        </div>
                      </div>
                    </motion.div>
                  </div>
                </div>
              )}

              {/* ═══ ARTICLE BODY ═══ */}
              <motion.div
                ref={contentRef}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.6, delay: 0.2 }}
                className="mx-auto max-w-5xl px-6 pt-14 pb-6 md:pt-20"
              >
                {/* Lead paragraph — the excerpt */}
                {post.excerpt && (
                  <p className="blog-prose-lead" style={{ marginTop: 0 }}>
                    {post.excerpt}
                  </p>
                )}

                {/* Decorative separator after lead */}
                {post.excerpt && (
                  <div
                    className="my-10 mx-auto"
                    style={{
                      width: 32,
                      height: 2,
                      borderRadius: 1,
                      background: "rgba(239,68,68,0.25)",
                    }}
                  />
                )}

                {/* Main body */}
                <div
                  className="blog-prose"
                  dangerouslySetInnerHTML={{
                    __html:
                      safeHtml ||
                      `<p>${escapeHtml(plainText || "No content available.")}</p>`,
                  }}
                />

                {/* Bottom share */}
                <div
                  className="mt-20 pt-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
                  style={{ borderTop: "1px solid rgba(255,255,255,0.04)" }}
                >
                  <p className="text-[12.5px] text-white/20 tracking-wide">
                    Share this article
                  </p>
                  <ShareButtons url={canonicalUrl} title={post.title} />
                </div>

                {/* ═══ COMMENTS SECTION ═══ */}
                <div
                  className="mt-16 pt-10"
                  style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}
                >
                  <div className="flex items-center gap-3 mb-8">
                    <MessageCircle className="w-5 h-5 text-primary/60" />
                    <h2 className="text-lg font-semibold tracking-tight text-white/90">
                      Comments ({comments.length})
                    </h2>
                  </div>

                  {/* Comment form */}
                  <form onSubmit={addComment} className="mb-10 space-y-4">
                    <input
                      type="text"
                      placeholder="Your name (optional)"
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      maxLength={60}
                      className="w-full bg-white/[0.03] border border-white/[0.08] rounded-xl px-4 py-3 text-sm text-white/80 placeholder:text-white/20 focus:outline-none focus:border-primary/40 focus:bg-white/[0.05] transition-colors"
                    />
                    <div className="flex gap-3">
                      <textarea
                        placeholder="Write a comment..."
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        rows={3}
                        required
                        className="flex-1 bg-white/[0.03] border border-white/[0.08] rounded-xl px-4 py-3 text-sm text-white/80 placeholder:text-white/20 focus:outline-none focus:border-primary/40 focus:bg-white/[0.05] transition-colors resize-none"
                      />
                      <button
                        type="submit"
                        disabled={!newComment.trim()}
                        className="self-end inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-primary/90 hover:bg-primary text-white text-sm font-medium disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                      >
                        <Send className="w-4 h-4" />
                        Post
                      </button>
                    </div>
                  </form>

                  {/* Comment list */}
                  {comments.length === 0 ? (
                    <p className="text-sm text-white/25 italic py-4">
                      No comments yet. Be the first to share your thoughts.
                    </p>
                  ) : (
                    <div className="space-y-5">
                      {comments.map((c, i) => (
                        <motion.div
                          key={i}
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: i * 0.03 }}
                          className="bg-white/[0.02] border border-white/[0.05] rounded-xl p-5 relative"
                        >
                          {editingIndex === i ? (
                            // ── Edit mode ──
                            <div className="space-y-3">
                              <textarea
                                value={editBody}
                                onChange={(e) => setEditBody(e.target.value)}
                                rows={3}
                                className="w-full bg-white/[0.05] border border-primary/40 rounded-xl px-4 py-3 text-sm text-white/80 focus:outline-none resize-none"
                              />
                              <div className="flex justify-end gap-2">
                                <button
                                  onClick={cancelEdit}
                                  className="px-4 py-1.5 text-xs font-medium text-white/40 hover:text-white/70 transition-colors"
                                >
                                  Cancel
                                </button>
                                <button
                                  onClick={() => saveEdit(i)}
                                  disabled={!editBody.trim()}
                                  className="px-4 py-1.5 text-xs font-medium bg-primary/90 hover:bg-primary text-white rounded-lg disabled:opacity-30 transition-all"
                                >
                                  Save
                                </button>
                              </div>
                            </div>
                          ) : (
                            // ── Normal display ──
                            <>
                              <div className="flex items-center gap-3 mb-2">
                                <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-primary/10 text-primary text-xs font-semibold">
                                  <User className="w-3.5 h-3.5" />
                                </span>
                                <span className="font-medium text-white/80 text-sm">
                                  {c.name}
                                </span>
                                <span className="text-[11px] text-white/25 ml-auto">
                                  {formatDate(c.date)}
                                </span>
                                {/* Three‑dot menu */}
                                <div className="relative">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setMenuOpenIndex(menuOpenIndex === i ? null : i);
                                    }}
                                    className="w-7 h-7 flex items-center justify-center rounded-full text-white/25 hover:text-white/60 hover:bg-white/[0.05] transition-colors"
                                  >
                                    <MoreHorizontal className="w-4 h-4" />
                                  </button>
                                  {menuOpenIndex === i && (
                                    <div className="absolute right-0 top-full mt-1 w-28 bg-[#1a1a1a] border border-white/[0.1] rounded-lg shadow-xl z-20 overflow-hidden">
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          startEdit(i);
                                        }}
                                        className="w-full text-left px-3 py-2 text-xs text-white/70 hover:bg-white/[0.05] transition-colors"
                                      >
                                        Edit
                                      </button>
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          deleteComment(i);
                                        }}
                                        className="w-full text-left px-3 py-2 text-xs text-red-400 hover:bg-white/[0.05] transition-colors"
                                      >
                                        Delete
                                      </button>
                                    </div>
                                  )}
                                </div>
                              </div>
                              <p className="text-sm text-white/60 leading-relaxed pl-10">
                                {c.body}
                              </p>
                            </>
                          )}
                        </motion.div>
                      ))}
                    </div>
                  )}
                </div>
              </motion.div>

              {/* ═══ RELATED ═══ */}
              {relatedPosts.length > 0 && (
                <section
                  className="border-t border-white/[0.03]"
                >
                  <div className="mx-auto max-w-[1060px] px-6 py-20 md:py-28">
                    <motion.div
                      initial={{ opacity: 0, y: 16 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.5 }}
                    >
                      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-primary/40 mb-2">
                        {serviceName || "More"}
                      </p>
                      <h2 className="text-[1.5rem] md:text-[1.75rem] font-bold tracking-[-0.03em]">
                        Continue reading
                      </h2>
                    </motion.div>

                    <div className="grid md:grid-cols-3 gap-0 mt-10 border border-white/[0.04] rounded-xl overflow-hidden">
                      {relatedPosts.map((rp, i) => (
                        <Link
                          key={rp.id}
                          to={`/blog/${rp.slug}`}
                          className={`group relative block overflow-hidden bg-white/[0.008] hover:bg-white/[0.025] transition-colors duration-300 ${
                            i > 0 ? "md:border-l border-white/[0.04]" : ""
                          }`}
                        >
                          <div className="relative aspect-[4/3] overflow-hidden">
                            {rp.cover_image_url ? (
                              <img
                                src={rp.cover_image_url}
                                alt=""
                                className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.06]"
                                loading="lazy"
                              />
                            ) : (
                              <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.05] to-transparent" />
                            )}
                            <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/35 to-transparent" />
                          </div>
                          <div className="p-5 md:p-6">
                            <span className="text-[10px] font-medium uppercase tracking-[0.12em] text-white/18">
                              {formatDate(
                                rp.published_at || rp.created_at,
                              )}
                            </span>
                            <h3 className="text-[14.5px] md:text-[15px] font-semibold leading-snug mt-2 text-foreground/75 group-hover:text-foreground transition-colors line-clamp-2 tracking-[-0.01em]">
                              {rp.title}
                            </h3>
                            <span className="inline-flex items-center gap-1 text-[11.5px] font-medium text-primary/50 mt-3 group-hover:text-primary/80 transition-colors">
                              Read
                              <ArrowUpRight className="w-2.5 h-2.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                            </span>
                          </div>
                        </Link>
                      ))}
                    </div>

                    <Link
                      to="/blog"
                      className="inline-flex items-center gap-1.5 text-[12.5px] font-medium text-white/20 hover:text-white/50 mt-8 transition-colors"
                    >
                      <ArrowLeft className="w-3 h-3" />
                      All articles
                    </Link>
                  </div>
                </section>
              )}
            </>
          )}
        </main>

        <Footer />
      </PremiumBackground>
    </PageTransition>
  );
};

export default BlogDetails;
