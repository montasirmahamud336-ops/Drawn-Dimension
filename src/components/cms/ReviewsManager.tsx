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
        r.role.toLowerCase().includes(search.toLowerCase())
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
                    <p className="text-muted-foreground">Manage client testimonials and reviews.</p>
                </div>
                <Button onClick={() => { setCurrentReview(null); setIsEditing(true); }} className="btn-primary gap-2">
                    <Plus className="w-4 h-4" />
                    Upload Review
                </Button>
            </div>

            <div className="flex items-center gap-4">
                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-[400px]">
                    <TabsList>
                        <TabsTrigger value="live" className="gap-2"><MonitorPlay className="w-4 h-4" /> Live Reviews</TabsTrigger>
                        <TabsTrigger value="draft" className="gap-2"><RotateCcw className="w-4 h-4" /> Drafts</TabsTrigger>
                    </TabsList>
                </Tabs>
                <div className="relative flex-1 max-w-sm ml-auto">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search reviews..."
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
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[1, 2, 3].map(i => <div key={i} className="h-64 bg-muted/20 animate-pulse rounded-2xl" />)}
                </div>
            ) : filteredReviews.length === 0 ? (
                <Card className="border-dashed border-2 bg-muted/50 col-span-full">
                    <CardContent className="flex flex-col items-center justify-center py-20 text-center">
                        <MessageSquare className="w-12 h-12 text-muted-foreground mb-4 opacity-20" />
                        <h3 className="text-lg font-medium">No reviews found in {activeTab}</h3>
                        <p className="text-muted-foreground mb-4">Upload a new review to get started.</p>
                        <Button onClick={() => { setCurrentReview(null); setIsEditing(true); }} variant="outline">
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
                            <div className="glass-card overflow-hidden h-full flex flex-col transition-all duration-300 hover:shadow-glow/50 border-border/50 bg-secondary/20">
                                <CardContent className="p-6 flex flex-col h-full">
                                    <div className="flex justify-between items-start mb-4">
                                        <div className="flex items-center gap-3">
                                            {review.image_url ? (
                                                <img src={review.image_url} alt={review.name} className="w-10 h-10 rounded-full object-cover border border-border" />
                                            ) : (
                                                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                                                    {review.name.charAt(0)}
                                                </div>
                                            )}
                                            <div>
                                                <h3 className="font-semibold text-foreground line-clamp-1">{review.name}</h3>
                                                <p className="text-xs text-muted-foreground line-clamp-1">{review.role}{review.company ? `, ${review.company}` : ''}</p>
                                            </div>
                                        </div>
                                        <Badge variant={review.status === "live" ? "default" : "secondary"} className={review.status === "live" ? "bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20" : "bg-yellow-500/10 text-yellow-500"}>
                                            {review.status === "live" ? "Live" : "Draft"}
                                        </Badge>
                                    </div>

                                    {isReorderEnabled && (
                                        <div className="flex justify-end mb-3">
                                            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground/90 rounded-full border border-border/60 bg-background/40 px-2 py-1">
                                                <GripVertical className="w-3.5 h-3.5" />
                                                Drag
                                            </span>
                                        </div>
                                    )}

                                    <div className="flex items-center mb-3">
                                        {Array.from({ length: 5 }).map((_, i) => (
                                            <Star
                                                key={i}
                                                className={`w-4 h-4 ${i < review.rating ? "text-yellow-500 fill-yellow-500" : "text-muted-foreground/30"}`}
                                            />
                                        ))}
                                    </div>

                                    <p className="text-sm text-muted-foreground line-clamp-3 mb-6 italic flex-grow">"{review.content}"</p>

                                    <div className="flex justify-end gap-2 pt-4 border-t border-border/40 mt-auto">
                                        <Button size="sm" variant="ghost" onClick={() => { setCurrentReview(review); setIsEditing(true); }}>
                                            <Edit className="w-4 h-4 mr-1" />
                                            Edit
                                        </Button>

                                        {activeTab === 'draft' ? (
                                            <>
                                                <Button size="icon" className="bg-green-600 hover:bg-green-700 shadow-sm" onClick={() => handleRestore(review)}>
                                                    <RotateCcw className="w-4 h-4" />
                                                </Button>
                                                <Button size="icon" variant="destructive" onClick={() => handleDelete(review, true)}>
                                                    <Trash2 className="w-4 h-4" />
                                                </Button>
                                            </>
                                        ) : (
                                            <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => handleDelete(review, false)}>
                                                <Trash2 className="w-4 h-4 mr-1" />
                                                Delete
                                            </Button>
                                        )}
                                    </div>
                                </CardContent>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default ReviewsManager;
