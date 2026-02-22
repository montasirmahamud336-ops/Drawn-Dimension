import { useState, useEffect, type ChangeEvent } from "react";
import { useForm } from "react-hook-form";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { getAdminToken, getApiBaseUrl } from "@/components/admin/adminAuth";
import { toast } from "sonner";
import { ensureCmsBucket, uploadCmsFile } from "@/integrations/supabase/storage";
import { Loader2, Upload, Users, X } from "lucide-react";

interface TeamFormProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    member: any | null;
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

const TeamForm = ({ open, onOpenChange, member, onSuccess }: TeamFormProps) => {
    const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm();
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
        if (member) {
            setValue("name", member.name);
            setValue("role", member.role);
            setValue("bio", member.bio);
            setValue("linkedin_url", member.linkedin_url || "");
            setValue("twitter_url", member.twitter_url || "");
            setValue("facebook_url", member.facebook_url || "");
            setExistingMedia(normalizeMedia(member));
        } else {
            reset();
            setExistingMedia([]);
        }
        clearPendingMedia();
    }, [member, open, reset, setValue]);

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
                        const fileName = `team/${Date.now()}-${Math.random().toString(36).slice(2)}.${fileExt}`;
                        const publicUrl = await uploadCmsFile(item.file, fileName);
                        return { url: publicUrl, type: item.type };
                    })
                );
            }

            const finalMedia = [...existingMedia, ...uploadedMedia];
            if (!member && finalMedia.length === 0) {
                throw new Error("Please upload at least one image or video");
            }

            const payload = {
                name: data.name,
                role: data.role,
                bio: data.bio,
                image_url: finalMedia[0]?.url || null,
                media: finalMedia,
                linkedin_url: data.linkedin_url || null,
                twitter_url: data.twitter_url || null,
                facebook_url: data.facebook_url || null,
                status: member?.status || "live",
            };

            const url = member ? `${apiBase}/team/${member.id}` : `${apiBase}/team`;
            const method = member ? "PATCH" : "POST";

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
                let message = "Failed to save team member";
                if (contentType.includes("application/json")) {
                    const body = await res.json().catch(() => null);
                    message = body?.detail || body?.message || message;
                } else {
                    const text = await res.text().catch(() => "");
                    if (text) message = text;
                }
                throw new Error(message);
            }

            toast.success(member ? "Team member updated" : "Team member created");
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
                    <DialogTitle>{member ? "Edit Team Member" : "Add Team Member"}</DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 mt-4">
                    <div className="grid gap-2">
                        <Label htmlFor="team-media-upload">Profile Media (Images/Videos)</Label>
                        <div className="flex flex-wrap gap-3">
                            {existingMedia.map((media, index) => (
                                <div key={`existing-${index}`} className="relative w-24 h-24 rounded-full overflow-hidden border border-border">
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
                                <div key={media.id} className="relative w-24 h-24 rounded-full overflow-hidden border border-border">
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
                            {existingMedia.length === 0 && pendingMedia.length === 0 && (
                                <div className="w-24 h-24 rounded-full bg-muted flex items-center justify-center text-muted-foreground border border-border">
                                    <Users className="w-8 h-8 opacity-50" />
                                </div>
                            )}
                        </div>
                        <div>
                            <Label htmlFor="team-media-upload" className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 border border-input rounded-md hover:bg-accent hover:text-accent-foreground transition-colors">
                                <Upload className="w-4 h-4" />
                                Select Multiple Media
                            </Label>
                            <Input
                                id="team-media-upload"
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
                        <Label htmlFor="name">Full Name</Label>
                        <Input id="name" {...register("name", { required: true })} placeholder="John Doe" />
                        {errors.name && <span className="text-destructive text-sm">Name is required</span>}
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="role">Role / Position</Label>
                        <Input id="role" {...register("role", { required: true })} placeholder="Lead Designer" />
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="bio">Bio</Label>
                        <Textarea id="bio" {...register("bio")} placeholder="Short biography..." rows={3} />
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="linkedin_url">LinkedIn URL</Label>
                        <Input id="linkedin_url" {...register("linkedin_url")} placeholder="https://linkedin.com/in/username" />
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="twitter_url">Twitter URL</Label>
                        <Input id="twitter_url" {...register("twitter_url")} placeholder="https://twitter.com/username" />
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="facebook_url">Facebook URL</Label>
                        <Input id="facebook_url" {...register("facebook_url")} placeholder="https://facebook.com/username" />
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                        <Button type="submit" disabled={loading}>
                            {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                            {member ? "Save Changes" : "Add Member"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
};

export default TeamForm;
