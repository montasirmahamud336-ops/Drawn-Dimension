import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import PageTransition from "@/components/shared/PageTransition";
import PageHero from "@/components/shared/PageHero";
import PremiumBackground from "@/components/shared/PremiumBackground";
import CTASection from "@/components/CTASection";
import { motion } from "framer-motion";
import { ExternalLink, ShoppingCart, Server, Code, Globe, Loader2, ChevronLeft, ChevronRight } from "lucide-react";
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
    if (!Number.isFinite(num)) return "Contact";
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

    // Keep unknown/non-python website categories visible under web design.
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
        <div className="relative overflow-hidden aspect-video">
            {current.type === "video" ? (
                <video src={current.url} className="w-full h-full object-cover" autoPlay muted loop playsInline />
            ) : (
                <img
                    src={current.url}
                    alt={product.name}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            <div className="absolute top-4 left-4">
                <span className="text-xs px-3 py-1 rounded-full border border-primary/35 bg-primary/90 text-primary-foreground shadow-[0_8px_18px_rgba(239,68,68,0.35)]">
                    {formatPrice(product.price)}
                </span>
            </div>
            <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <div className="w-10 h-10 rounded-full bg-primary/80 flex items-center justify-center">
                    <ShoppingCart className="w-5 h-5 text-primary-foreground" />
                </div>
            </div>
            {hasMany && (
                <>
                    <button
                        type="button"
                        onClick={prev}
                        className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/60 text-white flex items-center justify-center"
                    >
                        <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button
                        type="button"
                        onClick={next}
                        className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/60 text-white flex items-center justify-center"
                    >
                        <ChevronRight className="w-4 h-4" />
                    </button>
                </>
            )}
        </div>
    );
};

interface ProductSectionProps {
    title: string;
    subtitle: string;
    icon: React.ElementType;
    products: any[];
    onCardClick: (product: any) => void;
    delay?: number;
}

const ProductSection = ({ title, subtitle, icon: Icon, products, onCardClick, delay = 0 }: ProductSectionProps) => {
    if (products.length === 0) return null;

    return (
        <section className="section-padding relative">
            <div className="container-narrow">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6, delay }}
                    className="flex items-center gap-4 mb-10"
                >
                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                        <Icon className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                        <span className="text-primary font-semibold text-sm uppercase tracking-wider block">{subtitle}</span>
                        <h2 className="text-3xl font-bold text-foreground">{title}</h2>
                    </div>
                </motion.div>

                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {products.map((product, index) => (
                        <motion.div
                            key={product.id}
                            initial={{ opacity: 0, y: 30 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.5, delay: delay + index * 0.1 }}
                            className="group cursor-pointer"
                            onClick={() => onCardClick(product)}
                        >
                            <div className="glass-card overflow-hidden h-full flex flex-col bg-[linear-gradient(158deg,rgba(255,255,255,0.04),rgba(255,255,255,0.01)_42%,rgba(239,68,68,0.08)_100%)] border-border/60 group-hover:border-primary/40 transition-all duration-500 group-hover:-translate-y-1">
                                <ProductMedia product={product} />
                                <div className="p-6 flex-grow flex flex-col">
                                    <h3 className="text-lg font-semibold tracking-tight text-foreground mb-2 group-hover:text-primary transition-colors">
                                        {product.name}
                                    </h3>
                                    <p className="text-sm text-muted-foreground/95 leading-relaxed mb-4 flex-grow">
                                        {product.description}
                                    </p>
                                    <div className="mt-auto flex items-center justify-between">
                                        <p className="text-sm font-semibold text-primary">{formatPrice(product.price)}</p>
                                        <div className="flex items-center gap-2 text-primary/90 text-sm font-medium uppercase tracking-wider group/link">
                                            Buy <ExternalLink className="w-4 h-4 transition-transform group-hover/link:translate-x-1" />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    )
};

const Products = () => {
    const { data: products, loading } = useLiveData("products");
    const navigate = useNavigate();
    const [activeTopFilter, setActiveTopFilter] = useState<ProductTopFilter>("Web Design");
    const [activeWebFilter, setActiveWebFilter] = useState<(typeof WEB_FILTERS)[number]>(WEB_FILTER_ALL);

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
                    return product._filters.sub === activeWebFilter;
                }
                return true;
            }),
        [categorizedProducts, activeTopFilter, activeWebFilter],
    );

    const activeSection = useMemo(() => {
        if (activeTopFilter === "Python Tools") {
            return {
                title: "Python Tools",
                subtitle: "Automation & Utilities",
                icon: Server,
            };
        }

        if (activeWebFilter !== WEB_FILTER_ALL) {
            return {
                title: activeWebFilter,
                subtitle: "Web Design",
                icon: Globe,
            };
        }

        return {
            title: "Web Design Websites",
            subtitle: "Website Solutions",
            icon: Globe,
        };
    }, [activeTopFilter, activeWebFilter]);

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
                <main>
                    <PageHero
                        title="Digital Products"
                        subtitle="Ready-to-Use Solutions"
                        description="Premium websites, themes, and automation tools to accelerate your digital journey."
                    />

                    {loading ? (
                        <div className="flex justify-center items-center py-20">
                            <Loader2 className="w-8 h-8 animate-spin text-primary" />
                        </div>
                    ) : (
                        <>
                            <section className="section-padding relative overflow-hidden pb-2">
                                <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_15%,rgba(239,68,68,0.14),transparent_34%)] pointer-events-none" />
                                <div className="container-narrow relative z-10 space-y-4">
                                    <motion.div
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ duration: 0.6 }}
                                        className="glass-panel p-4 sm:p-5 border-border/55 bg-gradient-to-br from-background/80 to-primary/[0.05] flex flex-wrap justify-center gap-3"
                                    >
                                        {TOP_FILTERS.map((category) => (
                                            <button
                                                key={category}
                                                onClick={() => handleTopFilterChange(category)}
                                                className={`px-6 py-2 rounded-full text-sm font-medium transition-all duration-300 ${activeTopFilter === category
                                                    ? "bg-primary text-primary-foreground shadow-[0_10px_24px_rgba(239,68,68,0.35)]"
                                                    : "bg-card/80 border border-border hover:border-primary/50 text-muted-foreground hover:text-foreground"
                                                    }`}
                                            >
                                                {category}
                                            </button>
                                        ))}
                                    </motion.div>

                                    {activeTopFilter === "Web Design" && (
                                        <motion.div
                                            initial={{ opacity: 0, y: 12 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ duration: 0.4 }}
                                            className="glass-panel p-3 border-border/45 bg-background/55 flex flex-wrap justify-center gap-2"
                                        >
                                            {WEB_FILTERS.map((subCategory) => (
                                                <button
                                                    key={subCategory}
                                                    onClick={() => setActiveWebFilter(subCategory)}
                                                    className={`px-4 py-2 rounded-full text-xs sm:text-sm font-medium transition-all duration-300 ${activeWebFilter === subCategory
                                                        ? "bg-primary text-primary-foreground shadow-[0_8px_20px_rgba(239,68,68,0.3)]"
                                                        : "bg-card/80 border border-border text-muted-foreground hover:border-primary/50 hover:text-foreground"
                                                        }`}
                                                >
                                                    {subCategory}
                                                </button>
                                            ))}
                                        </motion.div>
                                    )}
                                </div>
                            </section>

                            <ProductSection
                                title={activeSection.title}
                                subtitle={activeSection.subtitle}
                                icon={activeSection.icon}
                                products={filteredProducts}
                                onCardClick={openDetails}
                                delay={0}
                            />

                            {products.length === 0 && (
                                <div className="text-center py-20 text-muted-foreground">
                                    No products available at the moment.
                                </div>
                            )}

                            {products.length > 0 && filteredProducts.length === 0 && (
                                <div className="text-center pb-20 text-muted-foreground">
                                    No products found in this category.
                                </div>
                            )}
                        </>
                    )}

                    <CTASection />
                </main>
                <Footer />
            </PremiumBackground>
        </PageTransition>
    );
};

export default Products;
