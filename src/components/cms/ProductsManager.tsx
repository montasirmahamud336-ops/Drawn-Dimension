import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Search, Edit, Trash2, RotateCcw, ShoppingBag, Archive, GripVertical } from "lucide-react";
import { getAdminToken, getApiBaseUrl } from "@/components/admin/adminAuth";
import { toast } from "sonner";
import ProductForm from "./ProductForm";
import { moveItemById } from "./reorderUtils";

const ProductsManager = () => {
    const [products, setProducts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState("live");
    const [search, setSearch] = useState("");
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingProduct, setEditingProduct] = useState<any | null>(null);
    const [draggingProductId, setDraggingProductId] = useState<string | null>(null);
    const [hasOrderChange, setHasOrderChange] = useState(false);
    const [isSavingOrder, setIsSavingOrder] = useState(false);
    const productsRef = useRef<any[]>([]);

    const apiBase = getApiBaseUrl();
    const token = getAdminToken();
    const isReorderEnabled = search.trim().length === 0 && !isSavingOrder;

    useEffect(() => {
        productsRef.current = products;
    }, [products]);

    const fetchProducts = async () => {
        setLoading(true);
        try {
            const res = await fetch(`${apiBase}/products?status=${activeTab}`);
            if (res.ok) {
                const data = await res.json();
                setProducts(data);
            }
        } catch (error) {
            console.error("Failed to fetch products", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchProducts();
    }, [activeTab]);

    const saveProductOrder = async (orderedProducts: any[]) => {
        try {
            setIsSavingOrder(true);
            const res = await fetch(`${apiBase}/products/reorder`, {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({
                    orderedIds: orderedProducts.map((product) => product.id)
                })
            });

            if (!res.ok) {
                throw new Error("Failed to save order");
            }

            toast.success("Product order updated");
        } catch (error) {
            toast.error("Could not save product order");
            fetchProducts();
        } finally {
            setIsSavingOrder(false);
        }
    };

    const handleDragStart = (productId: string) => {
        if (!isReorderEnabled) return;
        setDraggingProductId(productId);
        setHasOrderChange(false);
    };

    const handleDragEnter = (targetProductId: string) => {
        if (!isReorderEnabled || !draggingProductId || draggingProductId === targetProductId) return;

        setProducts((prev) => {
            const next = moveItemById(prev, draggingProductId, targetProductId);
            if (next !== prev) productsRef.current = next;
            return next;
        });
        setHasOrderChange(true);
        setDraggingProductId(targetProductId);
    };

    const handleDragEnd = () => {
        const shouldSave = hasOrderChange;
        const orderedProducts = productsRef.current;
        setDraggingProductId(null);
        setHasOrderChange(false);

        if (shouldSave && orderedProducts.length > 0) {
            void saveProductOrder(orderedProducts);
        }
    };

    const handleDelete = async (id: string, isHardDelete: boolean) => {
        if (!confirm(isHardDelete ? "Permanently delete this product?" : "Move product to Drafts?")) return;

        try {
            let res;
            if (isHardDelete) {
                res = await fetch(`${apiBase}/products/${id}`, {
                    method: "DELETE",
                    headers: { Authorization: `Bearer ${token}` }
                });
            } else {
                res = await fetch(`${apiBase}/products/${id}`, {
                    method: "PATCH",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${token}`
                    },
                    body: JSON.stringify({ status: "draft" })
                });
            }

            if (res.ok) {
                toast.success(isHardDelete ? "Product deleted" : "Product moved to Drafts");
                fetchProducts();
            } else {
                throw new Error("Failed to delete");
            }
        } catch (error) {
            toast.error("Operation failed");
        }
    };

    const handleRestore = async (id: string) => {
        try {
            const res = await fetch(`${apiBase}/products/${id}`, {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({ status: "live" })
            });

            if (res.ok) {
                toast.success("Product restored to Live");
                fetchProducts();
            }
        } catch (error) {
            toast.error("Restore failed");
        }
    };

    const filteredProducts = products.filter(p =>
        p.name.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Live Products</h2>
                    <p className="text-muted-foreground">Manage your e-commerce products.</p>
                </div>
                <Button onClick={() => { setEditingProduct(null); setIsFormOpen(true); }} className="gap-2 bg-pink-600 hover:bg-pink-700">
                    <Plus className="w-4 h-4" /> Add Product
                </Button>
            </div>

            <div className="flex items-center gap-4">
                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-[400px]">
                    <TabsList>
                        <TabsTrigger value="live" className="gap-2"><ShoppingBag className="w-4 h-4" /> Live Products</TabsTrigger>
                        <TabsTrigger value="draft" className="gap-2"><Archive className="w-4 h-4" /> Drafts</TabsTrigger>
                    </TabsList>
                </Tabs>
                <div className="relative flex-1 max-w-sm ml-auto">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search products..."
                        className="pl-8"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
            </div>

            <p className="text-xs text-muted-foreground">
                {isReorderEnabled
                    ? "Drag and drop cards to control website display order."
                    : "Clear search text before dragging cards to reorder."}
            </p>

            {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {[1, 2, 3].map(i => <div key={i} className="h-64 bg-muted/20 animate-pulse rounded-xl" />)}
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {filteredProducts.map((product) => (
                        <Card
                            key={product.id}
                            className={`overflow-hidden group border-border/40 bg-card/50 hover:shadow-lg transition-all duration-300 ${isReorderEnabled ? "cursor-grab active:cursor-grabbing" : ""} ${draggingProductId === product.id ? "opacity-70" : ""}`}
                            draggable={isReorderEnabled}
                            onDragStart={() => handleDragStart(product.id)}
                            onDragEnter={() => handleDragEnter(product.id)}
                            onDragOver={(event) => {
                                if (isReorderEnabled) event.preventDefault();
                            }}
                            onDrop={(event) => event.preventDefault()}
                            onDragEnd={handleDragEnd}
                        >
                            <div className="aspect-square relative overflow-hidden bg-muted">
                                {product.image_url ? (
                                    <img src={product.image_url} alt={product.name} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                                ) : (
                                    <div className="flex items-center justify-center h-full text-muted-foreground">No Image</div>
                                )}
                                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                    <Button size="icon" variant="secondary" onClick={() => { setEditingProduct(product); setIsFormOpen(true); }}>
                                        <Edit className="w-4 h-4" />
                                    </Button>
                                    {activeTab === 'draft' ? (
                                        <>
                                            <Button size="icon" variant="default" className="bg-green-600 hover:bg-green-700" onClick={() => handleRestore(product.id)}>
                                                <RotateCcw className="w-4 h-4" />
                                            </Button>
                                            <Button size="icon" variant="destructive" onClick={() => handleDelete(product.id, true)}>
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        </>
                                    ) : (
                                        <Button size="icon" variant="destructive" onClick={() => handleDelete(product.id, false)}>
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                    )}
                                </div>
                            </div>
                            <CardContent className="p-4">
                                {isReorderEnabled && (
                                    <div className="flex justify-end mb-2">
                                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground/90 rounded-full border border-border/60 bg-background/40 px-2 py-1">
                                            <GripVertical className="w-3.5 h-3.5" />
                                            Drag
                                        </span>
                                    </div>
                                )}
                                <div className="flex justify-between items-start gap-2">
                                    <h3 className="font-semibold truncate flex-1">{product.name}</h3>
                                    <span className="font-bold text-primary">${product.price}</span>
                                </div>
                                <p className="text-sm text-muted-foreground line-clamp-2 mt-1">{product.description}</p>
                                {product.status === 'draft' && <span className="text-xs bg-yellow-500/10 text-yellow-500 px-2 py-0.5 rounded mt-2 inline-block">Draft</span>}
                            </CardContent>
                        </Card>
                    ))}
                    {filteredProducts.length === 0 && (
                        <div className="col-span-full text-center py-12 text-muted-foreground">
                            No products found in {activeTab}.
                        </div>
                    )}
                </div>
            )}

            <ProductForm
                open={isFormOpen}
                onOpenChange={setIsFormOpen}
                product={editingProduct}
                onSuccess={() => fetchProducts()}
            />
        </div>
    );
};

export default ProductsManager;
