// Products.tsx — Redesigned Next-Gen Digital Products & Software Marketplace
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import PageTransition from "@/components/shared/PageTransition";
import PremiumBackground from "@/components/shared/PremiumBackground";
import CTASection from "@/components/CTASection";
import { motion, AnimatePresence } from "framer-motion";
import { 
  ExternalLink, 
  ShoppingCart, 
  Server, 
  Code, 
  Globe, 
  Loader2, 
  ChevronLeft, 
  ChevronRight, 
  Search, 
  Sparkles, 
  LayoutGrid, 
  List, 
  ArrowRight, 
  Layers, 
  CheckCircle2, 
  X, 
  Tag,
  ShieldCheck
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { MouseEvent, useMemo, useState } from "react";
import { useLiveData } from "@/hooks/useLiveData";
import { PYTHON_TOOLS_CATEGORY, WEB_DESIGN_CATEGORIES } from "@/data/productCategories";

type MediaItem = {
  url: string;
  type: "image" | "video";
};

const detectMediaType = (value: string) => {
  const v = value.toLowerCase();
  if (v.includes(".mp4") || v.includes(".mov") || v.includes(".webm")) return "video";
  return "image";
};

const getMediaList = (item: any): MediaItem[] => {
  if (Array.isArray(item?.media) && item.media.length > 0) {
    return item.media
      .filter((m: any) => typeof m?.url === "string" && m.url.length > 0)
      .map((m: any) => ({ url: m.url, type: m.type === "video" ? "video" : "image" }));
  }

  if (item?.image_url) {
    return [{ url: item.image_url, type: detectMediaType(item.image_url) }];
  }

  return [{ url: "https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=600&h=400&fit=crop", type: "image" }];
};

const formatPrice = (value: unknown) => {
  const num = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(num) || num <= 0) return "Contact";
  return `$${num.toFixed(2)}`;
};

type ProductTopFilter = "Web Design" | "Python Tools";

const WEB_FILTER_ALL = "All Websites";
const TOP_FILTERS: ProductTopFilter[] = ["Web Design", "Python Tools"];
const WEB_FILTERS = [WEB_FILTER_ALL, ...WEB_DESIGN_CATEGORIES] as const;

const classifyProductCategory = (
  value: unknown,
): { top: ProductTopFilter; sub: (typeof WEB_DESIGN_CATEGORIES)[number] | typeof PYTHON_TOOLS_CATEGORY } => {
  const category = String(value ?? "").toLowerCase();

  if (category.includes("python")) {
    return { top: "Python Tools", sub: "Python Tools" };
  }
  if (category.includes("wordpress")) {
    return { top: "Web Design", sub: "WordPress Website" };
  }
  if (category.includes("e-commerce") || category.includes("ecommerce")) {
    return { top: "Web Design", sub: "E-commerce Website" };
  }
  if (category.includes("portfolio")) {
    return { top: "Web Design", sub: "Portfolio Website" };
  }
  if (category.includes("realstate") || category.includes("real estate") || category.includes("realestate")) {
    return { top: "Web Design", sub: "Realstate Website" };
  }

  return { top: "Web Design", sub: "Portfolio Website" };
};

const ProductMedia = ({ product }: { product: any }) => {
  const media = getMediaList(product);
  const [index, setIndex] = useState(0);
  const current = media[index];
  const hasMany = media.length > 1;

  const prev = (e: MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIndex((i) => (i - 1 + media.length) % media.length);
  };

  const next = (e: MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIndex((i) => (i + 1) % media.length);
  };

  return (
    <div className="relative overflow-hidden aspect-[16/10] bg-muted/40 group/media">
      {current.type === "video" ? (
        <video src={current.url} className="w-full h-full object-cover" autoPlay muted loop playsInline />
      ) : (
        <img
          src={current.url}
          alt={product.name}
          className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-105 transform-gpu"
        />
      )}

      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />

      {/* Price Badge */}
      <div className="absolute top-3.5 left-3.5 z-10">
        <span className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-full border border-primary/40 bg-primary/95 text-white shadow-lg shadow-primary/30 backdrop-blur-md">
          {formatPrice(product.price)}
        </span>
      </div>

      {/* Quick Action Overlay Badge */}
      <div className="absolute top-3.5 right-3.5 z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
        <div className="w-9 h-9 rounded-full bg-black/70 backdrop-blur-md border border-white/20 flex items-center justify-center text-white shadow-xl">
          <ShoppingCart className="w-4 h-4" />
        </div>
      </div>

      {/* Slider Controls */}
      {hasMany && (
        <>
          <button
            type="button"
            onClick={prev}
            className="absolute left-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/65 text-white flex items-center justify-center hover:bg-primary transition-all duration-200 opacity-0 group-hover/media:opacity-100 shadow-lg z-10"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={next}
            className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/65 text-white flex items-center justify-center hover:bg-primary transition-all duration-200 opacity-0 group-hover/media:opacity-100 shadow-lg z-10"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </>
      )}
    </div>
  );
};

const ProductsSkeleton = () => (
  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
    {[1, 2, 3, 4, 5, 6].map((i) => (
      <div
        key={i}
        className="rounded-3xl border border-border/50 bg-card/60 overflow-hidden shadow-lg animate-pulse flex flex-col justify-between"
      >
        <div className="aspect-[16/10] bg-muted/60 relative overflow-hidden" />
        <div className="p-6 space-y-4 flex-1 flex flex-col justify-between">
          <div className="space-y-2">
            <div className="h-5 w-4/5 bg-muted/80 rounded-xl" />
            <div className="h-5 w-3/5 bg-muted/80 rounded-xl" />
          </div>
          <div className="space-y-2">
            <div className="h-3.5 w-full bg-muted/50 rounded-lg" />
            <div className="h-3.5 w-5/6 bg-muted/50 rounded-lg" />
          </div>
          <div className="pt-4 border-t border-border/40 flex justify-between items-center">
            <div className="h-5 w-20 bg-primary/20 rounded-full" />
            <div className="h-8 w-28 bg-primary/20 rounded-full" />
          </div>
        </div>
      </div>
    ))}
  </div>
);

const Products = () => {
  const { data: products, loading } = useLiveData("products");
  const navigate = useNavigate();
  const [activeTopFilter, setActiveTopFilter] = useState<ProductTopFilter>("Web Design");
  const [activeWebFilter, setActiveWebFilter] = useState<(typeof WEB_FILTERS)[number]>(WEB_FILTER_ALL);
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "compact">("grid");

  const openDetails = (product: any) => {
    if (!product?.id) return;
    navigate(`/products/${encodeURIComponent(product.id)}`);
  };

  const categorizedProducts = useMemo(
    () =>
      products.map((product: any) => ({
        ...product,
        _filters: classifyProductCategory(product.category),
      })),
    [products],
  );

  const filteredProducts = useMemo(
    () =>
      categorizedProducts.filter((product: any) => {
        if (product._filters.top !== activeTopFilter) {
          return false;
        }
        if (activeTopFilter === "Web Design" && activeWebFilter !== WEB_FILTER_ALL) {
          if (product._filters.sub !== activeWebFilter) return false;
        }
        const query = searchQuery.trim().toLowerCase();
        if (query) {
          const matches =
            product.name?.toLowerCase().includes(query) ||
            product.description?.toLowerCase().includes(query) ||
            product.category?.toLowerCase().includes(query);
          if (!matches) return false;
        }
        return true;
      }),
    [categorizedProducts, activeTopFilter, activeWebFilter, searchQuery],
  );

  const handleTopFilterChange = (value: ProductTopFilter) => {
    setActiveTopFilter(value);
    if (value !== "Web Design") {
      setActiveWebFilter(WEB_FILTER_ALL);
    }
  };

  return (
    <PageTransition>
      <PremiumBackground>
        <Navigation />
        <main className="min-h-screen">
          
          {/* Marketplace Hero Section */}
          <section className="relative pt-32 pb-16 md:pt-40 md:pb-24 overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-transparent pointer-events-none" />
            <div className="absolute top-20 right-[-10rem] w-[28rem] h-[28rem] rounded-full bg-primary/10 blur-3xl pointer-events-none" />
            <div className="container-narrow relative z-10">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7 }}
                className="max-w-3xl"
              >
                <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold tracking-wide bg-primary/10 text-primary dark:bg-primary/20 mb-5 border border-primary/20">
                  <Sparkles className="w-3.5 h-3.5 animate-pulse" />
                  Turnkey Software & Web Products
                </span>
                <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold tracking-tight leading-[1.08] text-balance">
                  Ready-to-use <span className="text-gradient-primary">digital products</span> & utilities.
                </h1>
                <p className="mt-6 text-lg md:text-xl text-muted-foreground max-w-2xl leading-relaxed">
                  Browse our production-ready websites, custom scripts, and Python automation tools designed to accelerate your growth.
                </p>

                {/* Real-Time Marketplace Stats Bar */}
                <div className="mt-10 grid grid-cols-2 sm:grid-cols-4 gap-4 pt-8 border-t border-border/50">
                  <div>
                    <p className="text-2xl sm:text-3xl font-extrabold text-foreground">{products.length}+</p>
                    <p className="text-xs font-medium text-muted-foreground mt-0.5">Live Products</p>
                  </div>
                  <div>
                    <p className="text-2xl sm:text-3xl font-extrabold text-primary">Instant</p>
                    <p className="text-xs font-medium text-muted-foreground mt-0.5">Delivery & Handover</p>
                  </div>
                  <div>
                    <p className="text-2xl sm:text-3xl font-extrabold text-foreground">100%</p>
                    <p className="text-xs font-medium text-muted-foreground mt-0.5">Verified Quality</p>
                  </div>
                  <div>
                    <p className="text-2xl sm:text-3xl font-extrabold text-primary">24/7</p>
                    <p className="text-xs font-medium text-muted-foreground mt-0.5">Dedicated Support</p>
                  </div>
                </div>
              </motion.div>
            </div>
          </section>

          {/* Interactive Search & Filter Section */}
          <section className="pb-12">
            <div className="container-narrow space-y-6">
              
              {/* Search & Top Filter Bar */}
              <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 p-4 rounded-3xl border border-border/60 bg-card/80 backdrop-blur-xl shadow-xl">
                
                {/* Search Box */}
                <div className="relative flex-1">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search products by title, tech stack, or feature..."
                    className="w-full pl-10 pr-10 py-2.5 rounded-2xl bg-muted/30 border border-border/50 focus:border-primary/60 focus:bg-background text-sm placeholder:text-muted-foreground/70 transition-all outline-none"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery("")}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {/* View Mode Toggle */}
                <div className="flex items-center justify-between md:justify-end gap-3 shrink-0">
                  <span className="text-xs font-medium text-muted-foreground hidden sm:inline">
                    Showing <span className="text-foreground font-bold">{filteredProducts.length}</span> items
                  </span>
                  <div className="flex items-center p-1 rounded-2xl bg-muted/40 border border-border/50">
                    <button
                      type="button"
                      onClick={() => setViewMode("grid")}
                      title="Grid View"
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
                        viewMode === "grid"
                          ? "bg-primary text-primary-foreground shadow-md"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <LayoutGrid className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Grid</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setViewMode("compact")}
                      title="Compact View"
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
                        viewMode === "compact"
                          ? "bg-primary text-primary-foreground shadow-md"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <List className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Compact</span>
                    </button>
                  </div>
                </div>

              </div>

              {/* Main Category Tabs Bar */}
              <div className="flex flex-wrap items-center justify-between gap-4">
                {/* Primary Category Buttons */}
                <div className="flex items-center gap-2 p-1.5 rounded-2xl bg-card border border-border/60 shadow-md">
                  {TOP_FILTERS.map((category) => {
                    const isActive = activeTopFilter === category;
                    const count = categorizedProducts.filter((p: any) => p._filters.top === category).length;

                    return (
                      <button
                        key={category}
                        type="button"
                        onClick={() => handleTopFilterChange(category)}
                        className={`px-5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all duration-300 flex items-center gap-2 cursor-pointer ${
                          isActive
                            ? "bg-primary text-white shadow-lg shadow-primary/25 scale-[1.02]"
                            : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
                        }`}
                      >
                        {category === "Web Design" ? (
                          <Globe className="w-4 h-4" />
                        ) : (
                          <Server className="w-4 h-4" />
                        )}
                        {category}
                        <span className={`px-2 py-0.5 rounded-full text-[10px] ${isActive ? "bg-white/20 text-white" : "bg-muted text-muted-foreground"}`}>
                          {count}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* Sub-Category Pills Bar (When Web Design selected) */}
                {activeTopFilter === "Web Design" && (
                  <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
                    {WEB_FILTERS.map((subCat) => {
                      const isActive = activeWebFilter === subCat;
                      const count =
                        subCat === WEB_FILTER_ALL
                          ? categorizedProducts.filter((p: any) => p._filters.top === "Web Design").length
                          : categorizedProducts.filter((p: any) => p._filters.sub === subCat).length;

                      return (
                        <button
                          key={subCat}
                          type="button"
                          onClick={() => setActiveWebFilter(subCat)}
                          className={`whitespace-nowrap px-4 py-2 rounded-full text-xs font-semibold transition-all duration-300 flex items-center gap-1.5 cursor-pointer ${
                            isActive
                              ? "bg-primary/20 text-primary border border-primary/40 shadow-sm"
                              : "bg-card/70 border border-border/50 text-muted-foreground hover:border-primary/40 hover:text-foreground"
                          }`}
                        >
                          {subCat}
                          <span className="text-[10px] opacity-70">({count})</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

            </div>
          </section>

          {/* Main Products Grid */}
          <section className="pb-24">
            <div className="container-narrow">
              
              {loading ? (
                <ProductsSkeleton />
              ) : filteredProducts.length === 0 ? (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-center py-24 rounded-3xl border border-border/50 bg-card/40 p-8"
                >
                  <Layers className="w-12 h-12 mx-auto text-muted-foreground/40 mb-4" />
                  <h3 className="text-xl font-bold">No products available</h3>
                  <p className="text-sm text-muted-foreground mt-2 max-w-md mx-auto">
                    {searchQuery
                      ? `No items matched "${searchQuery}". Try searching another keyword or resetting filters.`
                      : `No live products found in this category.`}
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTopFilter("Web Design");
                      setActiveWebFilter(WEB_FILTER_ALL);
                      setSearchQuery("");
                    }}
                    className="mt-6 px-6 py-2.5 bg-primary/10 border border-primary/30 text-primary hover:bg-primary hover:text-white rounded-full text-xs font-bold transition-all duration-300"
                  >
                    Reset All Filters
                  </button>
                </motion.div>
              ) : viewMode === "grid" ? (
                /* GRID VIEW */
                <motion.div
                  initial="hidden"
                  animate="visible"
                  className="grid md:grid-cols-2 lg:grid-cols-3 gap-8"
                >
                  {filteredProducts.map((product: any) => (
                    <article
                      key={product.id}
                      onClick={() => openDetails(product)}
                      className="group cursor-pointer flex flex-col rounded-3xl border border-border/60 bg-card/90 dark:bg-card/70 hover:border-primary/50 hover:shadow-2xl hover:shadow-primary/10 hover:-translate-y-1.5 transition-all duration-400 overflow-hidden"
                    >
                      <ProductMedia product={product} />
                      <div className="p-6 flex-1 flex flex-col justify-between">
                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                              {product._filters?.sub || "Web Solution"}
                            </span>
                          </div>
                          <h3 className="text-lg font-bold tracking-tight text-foreground group-hover:text-primary transition-colors leading-snug line-clamp-2">
                            {product.name}
                          </h3>
                          <p className="mt-2.5 text-xs sm:text-sm text-muted-foreground leading-relaxed line-clamp-3">
                            {product.description || "Production-ready digital asset designed with modern architecture and high performance."}
                          </p>
                        </div>

                        <div className="mt-6 pt-4 border-t border-border/40 flex items-center justify-between">
                          <div className="flex flex-col">
                            <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                              Price
                            </span>
                            <span className="text-base font-extrabold text-primary">
                              {formatPrice(product.price)}
                            </span>
                          </div>

                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              openDetails(product);
                            }}
                            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary/10 border border-primary/30 text-primary group-hover:bg-primary group-hover:text-white text-xs font-bold transition-all duration-300 shadow-sm"
                          >
                            View Product
                            <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </article>
                  ))}
                </motion.div>
              ) : (
                /* COMPACT LIST VIEW */
                <div className="space-y-4">
                  {filteredProducts.map((product: any) => (
                    <article
                      key={product.id}
                      onClick={() => openDetails(product)}
                      className="group cursor-pointer rounded-2xl border border-border/60 bg-card/90 hover:border-primary/50 hover:bg-card p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition-all duration-300 shadow-md hover:shadow-xl"
                    >
                      <div className="flex items-center gap-4 min-w-0 flex-1">
                        <div className="w-20 h-16 rounded-xl overflow-hidden shrink-0 bg-muted/40 relative">
                          {product.image_url ? (
                            <img
                              src={product.image_url}
                              alt={product.name}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                              <Code className="w-6 h-6" />
                            </div>
                          )}
                        </div>

                        <div className="min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 uppercase tracking-wider">
                              {product._filters?.sub || "Digital Product"}
                            </span>
                          </div>
                          <h3 className="text-base font-bold text-foreground group-hover:text-primary transition-colors truncate">
                            {product.name}
                          </h3>
                          <p className="text-xs text-muted-foreground truncate max-w-xl mt-0.5">
                            {product.description}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 shrink-0 self-end sm:self-center">
                        <span className="text-sm font-extrabold text-primary">
                          {formatPrice(product.price)}
                        </span>
                        <button
                          type="button"
                          className="px-4 py-2 rounded-xl bg-primary/10 border border-primary/30 text-primary group-hover:bg-primary group-hover:text-white text-xs font-bold flex items-center gap-1.5 transition-all duration-300"
                        >
                          View Product <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              )}

            </div>
          </section>

          <CTASection />
        </main>
        <Footer />
      </PremiumBackground>
    </PageTransition>
  );
};

export default Products;
