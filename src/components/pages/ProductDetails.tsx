import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import PageTransition from "@/components/shared/PageTransition";
import PremiumBackground from "@/components/shared/PremiumBackground";
import { useLiveData } from "@/hooks/useLiveData";
import { Button } from "@/components/ui/button";
import { Loader2, ChevronLeft, ChevronRight } from "lucide-react";

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
  return [{ url: "https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=1200&h=700&fit=crop", type: "image" }];
};

const formatPrice = (value: unknown) => {
  const num = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(num)) return "Contact";
  return `$${num.toFixed(2)}`;
};

const ProductDetails = () => {
  const { id } = useParams();
  const { data: products, loading } = useLiveData("products");
  const [mediaIndex, setMediaIndex] = useState(0);
  const navigate = useNavigate();

  const product = useMemo(
    () => products.find((item: any) => String(item.id) === String(id)),
    [products, id]
  );

  const media = product ? getMediaList(product) : [];
  const currentMedia = media[mediaIndex];

  const goToCheckout = () => {
    if (!product) return;
    navigate(`/payment?plan=${encodeURIComponent(product.name)}&price=${encodeURIComponent(formatPrice(product.price))}`);
  };

  return (
    <PageTransition>
      <PremiumBackground>
        <Navigation />
        <main className="pt-32 pb-20">
          <section className="section-padding">
            <div className="container-narrow">
              {loading ? (
                <div className="flex justify-center items-center py-20">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
              ) : !product ? (
                <div className="glass-card p-8 text-center">
                  <h1 className="text-2xl font-bold mb-4">Product not found</h1>
                  <Button onClick={() => navigate("/products")}>Back to Products</Button>
                </div>
              ) : (
                <div className="glass-card overflow-hidden border-border/60">
                  <div className="relative overflow-hidden aspect-video border-b border-border/60">
                    {currentMedia?.type === "video" ? (
                      <video src={currentMedia.url} className="w-full h-full object-cover" controls autoPlay muted loop playsInline />
                    ) : (
                      <img src={currentMedia?.url} alt={product.name} className="w-full h-full object-cover" />
                    )}
                    {media.length > 1 && (
                      <>
                        <button
                          type="button"
                          onClick={() => setMediaIndex((i) => (i - 1 + media.length) % media.length)}
                          className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/60 text-white flex items-center justify-center"
                        >
                          <ChevronLeft className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setMediaIndex((i) => (i + 1) % media.length)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/60 text-white flex items-center justify-center"
                        >
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      </>
                    )}
                  </div>

                  <div className="p-8 space-y-5">
                    <p className="text-xs uppercase tracking-[0.12em] text-muted-foreground">Category: {product.category || "Uncategorized"}</p>
                    <h1 className="text-3xl font-bold">{product.name}</h1>
                    <p className="text-muted-foreground leading-relaxed">{product.description || "No details available."}</p>

                    <div className="flex items-center justify-between border-t border-border/60 pt-5">
                      <div>
                        <p className="text-xs uppercase tracking-[0.12em] text-muted-foreground">Price</p>
                        <p className="text-2xl font-bold text-primary">{formatPrice(product.price)}</p>
                      </div>
                      <Button onClick={goToCheckout}>Buy</Button>
                    </div>
                  </div>
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

export default ProductDetails;
