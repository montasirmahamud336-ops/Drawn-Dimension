import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Save, X, Upload } from "lucide-react";
import { toast } from "sonner";
import { getAdminToken } from "@/components/admin/adminAuth";
import { ensureCmsBucket, uploadCmsFile } from "@/integrations/supabase/storage";
import { SERVICES } from "@/data/servicesData";

interface Review {
    id?: string;
    name: string;
    role: string;
    company?: string;
    content: string;
    rating: number;
    image_url?: string;
    project?: string;
    status: "draft" | "live";
}

interface ReviewFormProps {
    initialData?: Review | null;
    onSave: (data: Review) => Promise<void>;
    onCancel: () => void;
}

const REVIEW_SERVICE_STORAGE_KEY = "cms.review.service_options";

const normalizeOption = (value: string) => value.trim().replace(/\s+/g, " ");

const mergeUniqueOptions = (...groups: (string[] | undefined)[]) => {
    const seen = new Set<string>();
    const merged: string[] = [];

    groups.forEach((group) => {
        (group || []).forEach((raw) => {
            if (typeof raw !== "string") return;
            const normalized = normalizeOption(raw);
            if (!normalized || seen.has(normalized)) return;
            seen.add(normalized);
            merged.push(normalized);
        });
    });

    return merged;
};

const ReviewForm = ({ initialData, onSave, onCancel }: ReviewFormProps) => {
    const [loading, setLoading] = useState(false);
    const [uploading, setUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [serviceOptions, setServiceOptions] = useState<string[]>(
        mergeUniqueOptions([...SERVICES], initialData?.project ? [initialData.project] : [])
    );
    const [newServiceOption, setNewServiceOption] = useState("");
    const [formData, setFormData] = useState<Review>({
        name: initialData?.name || "",
        role: initialData?.role || "",
        company: initialData?.company || "",
        content: initialData?.content || "",
        rating: initialData?.rating || 5,
        image_url: initialData?.image_url || "",
        project: initialData?.project || "",
        status: initialData?.status || "live",
        id: initialData?.id,
    });

    const persistServiceOptions = (next: string[]) => {
        setServiceOptions(next);
        try {
            localStorage.setItem(REVIEW_SERVICE_STORAGE_KEY, JSON.stringify(next));
        } catch {
            // Non-blocking: form still works even if persistence is unavailable.
        }
    };

    useEffect(() => {
        const defaults = mergeUniqueOptions([...SERVICES], initialData?.project ? [initialData.project] : []);
        try {
            const raw = localStorage.getItem(REVIEW_SERVICE_STORAGE_KEY);
            if (!raw) {
                setServiceOptions(defaults);
                return;
            }
            const parsed = JSON.parse(raw);
            const fromStorage = Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : [];
            setServiceOptions(mergeUniqueOptions(defaults, fromStorage));
        } catch {
            setServiceOptions(defaults);
        }
    }, [initialData?.project]);

    useEffect(() => {
        const normalized = normalizeOption(formData.project || "");
        if (!normalized) return;
        setServiceOptions((prev) => {
            if (prev.includes(normalized)) return prev;
            const next = [...prev, normalized];
            try {
                localStorage.setItem(REVIEW_SERVICE_STORAGE_KEY, JSON.stringify(next));
            } catch {
                // Ignore persistence errors.
            }
            return next;
        });
    }, [formData.project]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    const handleRatingChange = (value: string) => {
        setFormData((prev) => ({ ...prev, rating: parseInt(value) }));
    };

    const handleStatusChange = (value: "draft" | "live") => {
        setFormData((prev) => ({ ...prev, status: value }));
    };

    const handleProjectChange = (value: string) => {
        setFormData((prev) => ({
            ...prev,
            project: value === "__none__" ? "" : value,
        }));
    };

    const handleAddServiceOption = () => {
        const normalized = normalizeOption(newServiceOption);
        if (!normalized) return;
        if (serviceOptions.includes(normalized)) {
            setFormData((prev) => ({ ...prev, project: normalized }));
            setNewServiceOption("");
            return;
        }

        const next = [...serviceOptions, normalized];
        persistServiceOptions(next);
        setFormData((prev) => ({ ...prev, project: normalized }));
        setNewServiceOption("");
    };

    const handleRemoveServiceOption = (option: string) => {
        const next = serviceOptions.filter((item) => item !== option);
        persistServiceOptions(next);
        if (formData.project === option) {
            setFormData((prev) => ({ ...prev, project: "" }));
        }
    };

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0) return;

        const file = e.target.files[0];
        setUploading(true);

        try {
            const token = getAdminToken();
            if (!token) {
                throw new Error("Session expired. Please login again.");
            }

            await ensureCmsBucket();
            const fileExt = file.name.split(".").pop() || "bin";
            const fileName = `reviews/${Date.now()}-${Math.random().toString(36).slice(2)}.${fileExt}`;
            const publicUrl = await uploadCmsFile(file, fileName);
            setFormData(prev => ({ ...prev, image_url: publicUrl }));
            toast.success("Image uploaded successfully");
        } catch (error) {
            console.error("Upload error:", error);
            toast.error("Failed to upload image");
        } finally {
            setUploading(false);
            if (fileInputRef.current) {
                fileInputRef.current.value = "";
            }
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            await onSave(formData);
        } catch (error) {
            console.error("Error saving review:", error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Card className="max-w-2xl mx-auto border-border/40 bg-card/50 backdrop-blur">
            <CardHeader>
                <CardTitle>{initialData ? "Edit Review" : "Add New Review"}</CardTitle>
            </CardHeader>
            <form onSubmit={handleSubmit}>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="name">Client Name *</Label>
                            <Input
                                id="name"
                                name="name"
                                value={formData.name}
                                onChange={handleChange}
                                required
                                placeholder="e.g. John Doe"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="role">Role/Title (Optional)</Label>
                            <Input
                                id="role"
                                name="role"
                                value={formData.role}
                                onChange={handleChange}
                                placeholder="e.g. CEO"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="company">Company (Optional)</Label>
                            <Input
                                id="company"
                                name="company"
                                value={formData.company}
                                onChange={handleChange}
                                placeholder="e.g. ACME Corp"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="project">Service / Project</Label>
                            <Select value={formData.project || "__none__"} onValueChange={handleProjectChange}>
                                <SelectTrigger id="project">
                                    <SelectValue placeholder="Select a service/project" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="__none__">No specific service</SelectItem>
                                    {serviceOptions.map((option) => (
                                        <SelectItem key={option} value={option}>
                                            {option}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <div className="flex gap-2">
                                <Input
                                    value={newServiceOption}
                                    onChange={(e) => setNewServiceOption(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === "Enter") {
                                            e.preventDefault();
                                            handleAddServiceOption();
                                        }
                                    }}
                                    placeholder="Add new service option"
                                />
                                <Button type="button" variant="outline" onClick={handleAddServiceOption}>
                                    Add
                                </Button>
                            </div>
                            {serviceOptions.length > 0 && (
                                <div className="flex flex-wrap gap-2">
                                    {serviceOptions.map((option) => (
                                        <div
                                            key={`service-chip-${option}`}
                                            className={`inline-flex items-center rounded-full border px-2 py-1 text-xs ${
                                                formData.project === option
                                                    ? "border-primary text-primary"
                                                    : "border-border text-muted-foreground"
                                            }`}
                                        >
                                            <button
                                                type="button"
                                                onClick={() => setFormData((prev) => ({ ...prev, project: option }))}
                                                className="px-1"
                                            >
                                                {option}
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => handleRemoveServiceOption(option)}
                                                className="ml-1 text-muted-foreground hover:text-destructive"
                                                aria-label={`Remove ${option}`}
                                            >
                                                <X className="w-3 h-3" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="rating">Rating</Label>
                            <Select value={formData.rating.toString()} onValueChange={handleRatingChange}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select rating" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="5">5 Stars</SelectItem>
                                    <SelectItem value="4">4 Stars</SelectItem>
                                    <SelectItem value="3">3 Stars</SelectItem>
                                    <SelectItem value="2">2 Stars</SelectItem>
                                    <SelectItem value="1">1 Star</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="status">Status</Label>
                            <Select value={formData.status} onValueChange={handleStatusChange}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select status" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="draft">Draft (Hidden)</SelectItem>
                                    <SelectItem value="live">Live (Visible)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="content">Review Content *</Label>
                        <Textarea
                            id="content"
                            name="content"
                            value={formData.content}
                            onChange={handleChange}
                            required
                            placeholder="Enter the review text..."
                            rows={4}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label>Client Image</Label>
                        <div className="flex items-center gap-4">
                            {formData.image_url && (
                                <div className="relative w-16 h-16 rounded-full overflow-hidden border border-border">
                                    <img src={formData.image_url} alt="Preview" className="w-full h-full object-cover" />
                                    <button
                                        type="button"
                                        onClick={() => setFormData(prev => ({ ...prev, image_url: "" }))}
                                        className="absolute inset-0 bg-black/50 opacity-0 hover:opacity-100 flex items-center justify-center text-white transition-opacity"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>
                            )}
                            <div className="flex-1">
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    onChange={handleFileSelect}
                                    accept="image/*"
                                    className="hidden"
                                />
                                <div className="flex gap-2">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() => fileInputRef.current?.click()}
                                        disabled={uploading}
                                        className="w-full"
                                    >
                                        {uploading ? (
                                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                        ) : (
                                            <Upload className="w-4 h-4 mr-2" />
                                        )}
                                        {formData.image_url ? "Change Image" : "Upload Image"}
                                    </Button>
                                    <Input
                                        placeholder="Or paste URL..."
                                        name="image_url"
                                        value={formData.image_url}
                                        onChange={handleChange}
                                        className="flex-1"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                </CardContent>
                <CardFooter className="flex justify-end gap-2">
                    <Button type="button" variant="outline" onClick={onCancel} disabled={loading || uploading}>
                        <X className="w-4 h-4 mr-2" />
                        Cancel
                    </Button>
                    <Button type="submit" disabled={loading || uploading} className="btn-primary">
                        {loading ? (
                            <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Saving...
                            </>
                        ) : (
                            <>
                                <Save className="w-4 h-4 mr-2" />
                                {initialData ? "Update Review" : "Upload Review"}
                            </>
                        )}
                    </Button>
                </CardFooter>
            </form>
        </Card>
    );
};

export default ReviewForm;
