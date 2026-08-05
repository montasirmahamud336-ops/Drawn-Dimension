import { useState, useEffect, useRef } from "react";
import { Plus, Edit, Trash2, Star, MessageSquare, MonitorPlay, RotateCcw, Search, GripVertical } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getAdminToken } from "@/components/admin/adminAuth";
import ReviewForm from "./ReviewForm";
import { getReviewsApiBase } from "@/components/shared/reviewsApi";
import { moveItemById } from "./reorderUtils";

interface Review {
    id: string;
    name: string;
    role: string;
    company?: string;
    country?: string;
    content: string;
    rating: number;
    image_url?: string;
    status: "draft" | "live";
    display_order?: number;
    created_at?: string;
}

const ReviewsManager = () => {
    const [reviews, setReviews] = useState<Review[]>([]);
    const [loading, setLoading] = useState(true);
    const [isEditing, setIsEditing] = useState(false);
    const [currentReview, setCurrentReview] = useState<Review | null>(null);
    const [activeTab, setActiveTab] = useState("live");
    const [search, setSearch] = useState("");
    const [draggingReviewId, setDraggingReviewId] = useState<string | null>(null);
    const [hasOrderChange, setHasOrderChange] = useState(false);
    const [isSavingOrder, setIsSavingOrder] = useState(false);
    const reviewsRef = useRef<Review[]>([]);
    const apiBase = getReviewsApiBase();
    const isReorderEnabled = search.trim().length === 0 && !isSavingOrder;

    useEffect(() => {
        reviewsRef.current = reviews;
    }, [reviews]);

    const fetchReviews = async () => {
        setLoading(true);
        try {
            const token = getAdminToken();
            const response = await fetch(`${apiBase}/reviews?status=${activeTab}`, {
                headers: {
                    "Authorization": `Bearer ${token}`
                }
            });
            if (response.ok) {
                const data = await response.json();
                setReviews(data);
            }
        } catch (error) {
            console.error("Failed to fetch reviews", error);
            toast.error("Failed to load reviews");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchReviews();
    }, [activeTab]);

    const saveReviewOrder = async (orderedReviews: Review[]) => {
        try {
            setIsSavingOrder(true);
            const token = getAdminToken();
            const response = await fetch(`${apiBase}/reviews/reorder`, {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify({
                    orderedIds: orderedReviews.map((review) => review.id)
                })
            });

            if (!response.ok) {
                throw new Error("Failed to save order");
            }

            toast.success("Review order updated");
        } catch (error) {
            console.error("Error saving review order:", error);
            toast.error("Could not save review order");
            fetchReviews();
        } finally {
            setIsSavingOrder(false);
        }
    };

    const handleDragStart = (reviewId: string) => {
        if (!isReorderEnabled) return;
        setDraggingReviewId(reviewId);
        setHasOrderChange(false);
    };

    const handleDragEnter = (targetReviewId: string) => {
        if (!isReorderEnabled || !draggingReviewId || draggingReviewId === targetReviewId) return;

        setReviews((prev) => {
            const next = moveItemById(prev, draggingReviewId, targetReviewId);
            if (next !== prev) reviewsRef.current = next;
            return next;
        });
        setHasOrderChange(true);
        setDraggingReviewId(targetReviewId);
    };

    const handleDragEnd = () => {
        const shouldSave = hasOrderChange;
        const orderedReviews = reviewsRef.current;
        setDraggingReviewId(null);
        setHasOrderChange(false);

        if (shouldSave && orderedReviews.length > 0) {
            void saveReviewOrder(orderedReviews);
        }
    };

    const handleSave = async (data: any) => {
        try {
            const token = getAdminToken();
            if (!token) {
                toast.error("Session expired. Please login again.");
                return;
            }
            const isUpdate = Boolean(currentReview?.id);
            const url = isUpdate
                ? `${apiBase}/reviews/${currentReview.id}`
                : `${apiBase}/reviews`;
            const method = isUpdate ? "PATCH" : "POST";

            const response = await fetch(url, {
                method,
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify(data),
            });

            if (response.ok) {
                setIsEditing(false);
                setCurrentReview(null);
                fetchReviews();
                toast.success(isUpdate ? "Review updated" : "Review uploaded successfully");
            } else {
                const contentType = response.headers.get("content-type") || "";
                let message = "Failed to save review";
                if (contentType.includes("application/json")) {
                    const body = await response.json().catch(() => null);
                    message = body?.detail || body?.message || message;
                } else {
                    const text = await response.text().catch(() => "");
                    if (text) message = text;
                }
                toast.error(message);
            }
        } catch (error) {
            console.error("Error saving review:", error);
            toast.error("Error saving review");
        }
    };

    const handleDelete = async (review: Review, isHardDelete: boolean) => {
        const confirmMessage = isHardDelete
            ? "This review is in Drafts. Deleting it will be PERMANENT. Are you sure?"
            : "This review is currently LIVE. Deleting it will move it to Drafts first. Continue?";

        if (!confirm(confirmMessage)) return;

        try {
            const token = getAdminToken();
            let response;

            if (!isHardDelete) {
                // Soft delete: Move to draft
                response = await fetch(`${apiBase}/reviews/${review.id}`, {
                    method: "PATCH",
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${token}`
                    },
                    body: JSON.stringify({ ...review, status: "draft" })
                });
            } else {
                // Hard delete: Remove permanently
                response = await fetch(`${apiBase}/reviews/${review.id}`, {
                    method: "DELETE",
                    headers: {
                        "Authorization": `Bearer ${token}`
                    }
                });
            }

            if (response.ok) {
                if (!isHardDelete) {
                    toast.success("Review moved to Drafts");
                } else {
                    toast.success("Review permanently deleted");
                }
                fetchReviews();
            } else {
                toast.error("Failed to delete review");
            }
        } catch (error) {
            console.error("Error deleting review:", error);
            toast.error("Error deleting review");
        }
    };

    const handleRestore = async (review: Review) => {
        try {
            const token = getAdminToken();
            const response = await fetch(`${apiBase}/reviews/${review.id}`, {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify({ ...review, status: "live" })
            });

            if (response.ok) {
                toast.success("Review restored to Live");
                fetchReviews();
            } else {
                toast.error("Failed to restore review");
            }
        } catch (error) {
            console.error("Error restoring review:", error);
            toast.error("Error restoring review");
        }
    };

    const filteredReviews = reviews.filter(r =>
        r.name.toLowerCase().includes(search.toLowerCase()) ||
        r.content.toLowerCase().includes(search.toLowerCase()) ||
        r.role.toLowerCase().includes(search.toLowerCase()) ||
        (r.country || "").toLowerCase().includes(search.toLowerCase())
    );

    if (isEditing) {
        return (
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <h2 className="text-2xl font-bold tracking-tight">{currentReview ? "Edit Review" : "Upload New Review"}</h2>
                </div>
                <ReviewForm
                    initialData={currentReview}
                    onSave={handleSave}
                    onCancel={() => { setIsEditing(false); setCurrentReview(null); }}
                />
            </div>
        );
    }

                return (
                <div className="space-y-6">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <div>
                            <h2 className="text-3xl font-bold tracking-tight text-foreground">Client Reviews</h2>
                            <p className="text-muted-foreground text-sm">Manage client testimonials and reviews.</p>
                        </div>
                        <Button onClick={() => { setCurrentReview(null); setIsEditing(true); }} className="btn-primary gap-2 rounded-xl shadow-sm">
                            <Plus className="w-4 h-4" />
                            Upload Review
                        </Button>
                    </div>

                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full sm:w-[350px]">
                            <TabsList className="grid w-full grid-cols-2 rounded-xl border border-border/70 p-1">
                                <TabsTrigger value="live" className="gap-2 rounded-lg"><MonitorPlay className="w-4 h-4" /> Live Reviews</TabsTrigger>
                                <TabsTrigger value="draft" className="gap-2 rounded-lg"><RotateCcw className="w-4 h-4" /> Drafts</TabsTrigger>
                            </TabsList>
                        </Tabs>
                        <div className="relative w-full sm:w-80">
                            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search reviews..."
                                className="pl-9 rounded-xl border-border/70 bg-background/50 h-10"
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
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {[1, 2, 3].map(i => <div key={i} className="h-64 bg-muted/20 animate-pulse rounded-2xl border-[2.5px] border-border/70" />)}
                        </div>
                    ) : filteredReviews.length === 0 ? (
                        <Card className="border-dashed border-2 border-border/70 bg-card/50 col-span-full rounded-2xl">
                            <CardContent className="flex flex-col items-center justify-center py-20 text-center">
                                <MessageSquare className="w-12 h-12 text-muted-foreground mb-4 opacity-20" />
                                <h3 className="text-lg font-medium text-foreground">No reviews found in {activeTab}</h3>
                                <p className="text-muted-foreground text-sm mb-4">Upload a new review to get started.</p>
                                <Button onClick={() => { setCurrentReview(null); setIsEditing(true); }} variant="outline" className="rounded-xl">
                                    <Plus className="w-4 h-4 mr-2" />
                                    Upload Review
                                </Button>
                            </CardContent>
                        </Card>
                    ) : (
                        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                            {filteredReviews.map((review) => (
                                <div
                                    key={review.id}
                                    className={`group relative ${isReorderEnabled ? "cursor-grab active:cursor-grabbing" : ""} ${draggingReviewId === review.id ? "opacity-70" : ""}`}
                                    draggable={isReorderEnabled}
                                    onDragStart={() => handleDragStart(review.id)}
                                    onDragEnter={() => handleDragEnter(review.id)}
                                    onDragOver={(event) => {
                                        if (isReorderEnabled) event.preventDefault();
                                    }}
                                    onDrop={(event) => event.preventDefault()}
                                    onDragEnd={handleDragEnd}
                                >
                                    <div className="rounded-2xl border-[2.5px] border-border/70 dark:border-border bg-card p-6 shadow-md transition-all duration-300 ease-out hover:-translate-y-1 hover:shadow-xl hover:border-primary/40 h-full flex flex-col justify-between">
                                        <div>
                                            <div className="flex justify-between items-start mb-4">
                                                <div className="flex items-center gap-3">
                                                    {review.image_url ? (
                                                        <img src={review.image_url} alt={review.name} className="w-11 h-11 rounded-full object-cover ring-2 ring-primary/20" />
                                                    ) : (
                                                        <div className="w-11 h-11 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold ring-2 ring-primary/20">
                                                            {review.name.charAt(0)}
                                                        </div>
                                                    )}
                                                    <div>
                                                        <h3 className="font-bold text-foreground line-clamp-1">{review.name}</h3>
                                                        <p className="text-xs text-muted-foreground line-clamp-1">
                                                            {[review.role, review.company, review.country].filter(Boolean).join(", ")}
                                                        </p>
                                                    </div>
                                                </div>
                                                <Badge variant={review.status === "live" ? "default" : "secondary"} className={review.status === "live" ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 border-0" : "bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 border-0"}>
                                                    {review.status === "live" ? "Live" : "Draft"}
                                                </Badge>
                                            </div>

                                            {isReorderEnabled && (
                                                <div className="flex justify-end mb-2">
                                                    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground/90 rounded-full border border-border/60 bg-background/40 px-2 py-0.5">
                                                        <GripVertical className="w-3.5 h-3.5" />
                                                        Drag
                                                    </span>
                                                </div>
                                            )}

                                            <div className="flex items-center gap-0.5 mb-3">
                                                {Array.from({ length: 5 }).map((_, i) => (
                                                    <Star
                                                        key={i}
                                                        className={`w-4 h-4 ${i < review.rating ? "text-amber-400 fill-amber-400 drop-shadow-sm" : "text-muted-foreground/20"}`}
                                                    />
                                                ))}
                                            </div>

                                            <p className="text-sm text-muted-foreground line-clamp-3 mb-6 italic">&ldquo;{review.content}&rdquo;</p>
                                        </div>

                                        <div className="flex justify-end gap-2 pt-4 border-t border-border/60">
                                            <Button size="sm" variant="ghost" onClick={() => { setCurrentReview(review); setIsEditing(true); }} className="rounded-xl">
                                                <Edit className="w-4 h-4 mr-1" />
                                                Edit
                                            </Button>

                                            {activeTab === 'draft' ? (
                                                <>
                                                    <Button size="icon" className="bg-green-600 hover:bg-green-700 shadow-sm rounded-xl" onClick={() => handleRestore(review)}>
                                                        <RotateCcw className="w-4 h-4" />
                                                    </Button>
                                                    <Button size="icon" variant="destructive" className="rounded-xl" onClick={() => handleDelete(review, true)}>
                                                        <Trash2 className="w-4 h-4" />
                                                    </Button>
                                                </>
                                            ) : (
                                                <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive hover:bg-destructive/10 rounded-xl" onClick={() => handleDelete(review, false)}>
                                                    <Trash2 className="w-4 h-4 mr-1" />
                                                    Delete
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
                );
};

                export default ReviewsManager;
