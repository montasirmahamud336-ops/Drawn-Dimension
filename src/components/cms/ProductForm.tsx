import { useState, useEffect, type ChangeEvent } from "react";
import { useForm } from "react-hook-form";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { getAdminToken, getApiBaseUrl } from "@/components/admin/adminAuth";
import { toast } from "sonner";
import { CMS_BUCKET, ensureCmsBucket } from "@/integrations/supabase/storage";
import { Loader2, Upload, X } from "lucide-react";
import { PRODUCT_CATEGORY_OPTIONS } from "@/data/productCategories";

interface ProductFormProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    product: any | null;
    onSuccess: () => void;
}

type MediaItem = {
    url: string;
    type: "image" | "video";
};

type PendingMedia = {
    id: string;
    file: File;
    url: string;
    type: "image" | "video";
};

const detectMediaType = (value: string) => {
    const v = value.toLowerCase();
    if (v.includes(".mp4") || v.includes(".mov") || v.includes(".webm")) return "video";
    return "image";
};

const normalizeMedia = (item: any): MediaItem[] => {
    if (Array.isArray(item?.media) && item.media.length > 0) {
        return item.media
            .filter((m: any) => typeof m?.url === "string" && m.url.length > 0)
            .map((m: any) => ({
                url: m.url,
                type: m.type === "video" ? "video" : "image",
            }));
    }
    if (item?.image_url) {
        return [{ url: item.image_url, type: detectMediaType(item.image_url) }];
    }
    return [];
};

const normalizeProductCategoryOption = (value: unknown) => {
    const category = String(value ?? "").toLowerCase();

    if (category.includes("python")) return "Python Tools";
    if (category.includes("wordpress")) return "WordPress Website";
    if (category.includes("e-commerce") || category.includes("ecommerce")) return "E-commerce Website";
    if (category.includes("portfolio")) return "Portfolio Website";
    if (category.includes("realstate") || category.includes("real estate") || category.includes("realestate")) {
        return "Realstate Website";
    }

    return "";
};

const ProductForm = ({ open, onOpenChange, product, onSuccess }: ProductFormProps) => {
    const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm();
    const [loading, setLoading] = useState(false);
    const [existingMedia, setExistingMedia] = useState<MediaItem[]>([]);
    const [pendingMedia, setPendingMedia] = useState<PendingMedia[]>([]);

    const clearPendingMedia = () => {
        setPendingMedia((prev) => {
            prev.forEach((m) => URL.revokeObjectURL(m.url));
            return [];
        });
    };

    useEffect(() => {
        if (!open) return;
        if (product) {
            setValue("name", product.name);
            setValue("description", product.description);
            setValue("price", product.price);
            setValue("category", normalizeProductCategoryOption(product.category));
            setExistingMedia(normalizeMedia(product));
        } else {
            reset();
            setExistingMedia([]);
        }
        clearPendingMedia();
    }, [product, open, reset, setValue]);

    useEffect(() => {
        return () => {
            clearPendingMedia();
        };
    }, []);

    const handleMediaChange = (e: ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        if (files.length === 0) return;
        const next: PendingMedia[] = files.map((file) => ({
            id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
            file,
            url: URL.createObjectURL(file),
            type: file.type.startsWith("video/") ? "video" : "image",
        }));
        setPendingMedia((prev) => [...prev, ...next]);
        e.target.value = "";
    };

    const removeExistingMedia = (index: number) => {
        setExistingMedia((prev) => prev.filter((_, i) => i !== index));
    };

    const removePendingMedia = (id: string) => {
        setPendingMedia((prev) => {
            const target = prev.find((m) => m.id === id);
            if (target) URL.revokeObjectURL(target.url);
            return prev.filter((m) => m.id !== id);
        });
    };

    const onSubmit = async (data: any) => {
        setLoading(true);
        const apiBase = getApiBaseUrl();
        const token = getAdminToken();
        if (!token) {
            toast.error("Session expired. Please login again.");
            setLoading(false);
            return;
        }

        try {
            let uploadedMedia: MediaItem[] = [];

            if (pendingMedia.length > 0) {
                await ensureCmsBucket();
                uploadedMedia = await Promise.all(
                    pendingMedia.map(async (item) => {
                        const fileExt = item.file.name.split(".").pop() || "bin";
                        const fileName = `products/${Date.now()}-${Math.random().toString(36).slice(2)}.${fileExt}`;

                        const { error: uploadError } = await supabase.storage
                            .from(CMS_BUCKET)
                            .upload(fileName, item.file);

                        if (uploadError) throw uploadError;

                        const { data: { publicUrl } } = supabase.storage.from(CMS_BUCKET).getPublicUrl(fileName);
                        return { url: publicUrl, type: item.type };
                    })
                );
            }

            const finalMedia = [...existingMedia, ...uploadedMedia];
            if (!product && finalMedia.length === 0) {
                throw new Error("Please upload at least one image or video");
            }

            const payload = {
                name: data.name,
                description: data.description,
                price: parseFloat(data.price),
                image_url: finalMedia[0]?.url || null,
                media: finalMedia,
                category: data.category,
                status: product?.status || "live",
            };

            const url = product ? `${apiBase}/products/${product.id}` : `${apiBase}/products`;
            const method = product ? "PATCH" : "POST";

            const res = await fetch(url, {
                method,
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify(payload),
            });

            if (!res.ok) {
                const contentType = res.headers.get("content-type") || "";
                let message = "Failed to save product";
                if (contentType.includes("application/json")) {
                    const body = await res.json().catch(() => null);
                    message = body?.detail || body?.message || message;
                } else {
                    const text = await res.text().catch(() => "");
                    if (text) message = text;
                }
                throw new Error(message);
            }

            toast.success(product ? "Product updated" : "Product created");
            clearPendingMedia();
            onSuccess();
            onOpenChange(false);
        } catch (error: any) {
            toast.error(error.message || "Something went wrong");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>{product ? "Edit Product" : "Upload New Product"}</DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 mt-4">
                    <div className="grid gap-2">
                        <Label htmlFor="product-media-upload">Product Media (Images/Videos)</Label>
                        <div className="flex flex-wrap gap-3">
                            {existingMedia.map((media, index) => (
                                <div key={`existing-${index}`} className="relative w-24 h-20 rounded-lg overflow-hidden border border-border">
                                    {media.type === "video" ? (
                                        <video src={media.url} className="w-full h-full object-cover" muted playsInline />
                                    ) : (
                                        <img src={media.url} alt="Existing media" className="w-full h-full object-cover" />
                                    )}
                                    <button
                                        type="button"
                                        onClick={() => removeExistingMedia(index)}
                                        className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/70 text-white flex items-center justify-center"
                                    >
                                        <X className="w-3 h-3" />
                                    </button>
                                </div>
                            ))}
                            {pendingMedia.map((media) => (
                                <div key={media.id} className="relative w-24 h-20 rounded-lg overflow-hidden border border-border">
                                    {media.type === "video" ? (
                                        <video src={media.url} className="w-full h-full object-cover" muted playsInline />
                                    ) : (
                                        <img src={media.url} alt="Selected media" className="w-full h-full object-cover" />
                                    )}
                                    <button
                                        type="button"
                                        onClick={() => removePendingMedia(media.id)}
                                        className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/70 text-white flex items-center justify-center"
                                    >
                                        <X className="w-3 h-3" />
                                    </button>
                                </div>
                            ))}
                        </div>
                        <div>
                            <Label htmlFor="product-media-upload" className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 border border-input rounded-md hover:bg-accent hover:text-accent-foreground transition-colors">
                                <Upload className="w-4 h-4" />
                                Select Multiple Media
                            </Label>
                            <Input
                                id="product-media-upload"
                                type="file"
                                accept="image/*,video/*"
                                multiple
                                className="hidden"
                                onChange={handleMediaChange}
                            />
                            <p className="text-xs text-muted-foreground mt-2">Add multiple images/videos and remove any before saving.</p>
                        </div>
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="name">Product Name</Label>
                        <Input id="name" {...register("name", { required: true })} placeholder="Product Name" />
                        {errors.name && <span className="text-destructive text-sm">Name is required</span>}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-2">
                            <Label htmlFor="price">Price ($)</Label>
                            <Input id="price" type="number" step="0.01" {...register("price", { required: true })} placeholder="0.00" />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="category">Category</Label>
                            <Input type="hidden" {...register("category", { required: true })} />
                            <Select
                                value={watch("category") || ""}
                                onValueChange={(value) => setValue("category", value, { shouldValidate: true })}
                            >
                                <SelectTrigger id="category">
                                    <SelectValue placeholder="Select a category" />
                                </SelectTrigger>
                                <SelectContent>
                                    {PRODUCT_CATEGORY_OPTIONS.map((category) => (
                                        <SelectItem key={category} value={category}>
                                            {category}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            {errors.category && <span className="text-destructive text-sm">Category is required</span>}
                        </div>
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="description">Description</Label>
                        <Textarea id="description" {...register("description")} placeholder="Product Description" rows={3} />
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                        <Button type="submit" disabled={loading}>
                            {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                            {product ? "Save Changes" : "Create Product"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
};

export default ProductForm;
