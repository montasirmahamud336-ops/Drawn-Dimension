import { useState, useEffect, type ChangeEvent } from "react";
import { useForm } from "react-hook-form";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getAdminToken, getApiBaseUrl } from "@/components/admin/adminAuth";
import { toast } from "sonner";
import { ensureCmsBucket, uploadCmsFile } from "@/integrations/supabase/storage";
import { Loader2, Upload, Users, X } from "lucide-react";

interface TeamFormProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    member: TeamMemberSnapshot | null;
    memberType: "leadership" | "employee";
    onSuccess: () => void;
}

type MediaItem = {
    url: string;
    type: "image" | "video";
};

type TeamMemberSnapshot = {
    id?: string;
    name?: string;
    role?: string;
    bio?: string | null;
    image_url?: string | null;
    media?: Array<{ url?: string; type?: string }> | null;
    linkedin_url?: string | null;
    twitter_url?: string | null;
    facebook_url?: string | null;
    status?: string;
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

const normalizeMedia = (item: TeamMemberSnapshot | null | undefined): MediaItem[] => {
    if (Array.isArray(item?.media) && item.media.length > 0) {
        return item.media
            .filter((m): m is { url: string; type?: string } => typeof m?.url === "string" && m.url.length > 0)
            .map((m) => ({
                url: m.url,
                type: m.type === "video" ? "video" : "image",
            }));
    }
    if (item?.image_url) {
        return [{ url: item.image_url, type: detectMediaType(item.image_url) }];
    }
    return [];
};

const TEAM_ROLE_STORAGE_KEY_PREFIX = "cms.team.role_options";

const DEFAULT_LEADERSHIP_ROLE_OPTIONS = [
    "Chief Executive Officer",
    "Chief Operating Officer",
    "Project Manager",
    "Lead Designer",
    "Lead Engineer",
];

const DEFAULT_EMPLOYEE_ROLE_OPTIONS = [
    "Mechanical Engineer",
    "Chemical Engineer",
    "Electrical Engineer",
    "CAD Operator",
    "Graphic Designer",
];

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

const TeamForm = ({ open, onOpenChange, member, memberType, onSuccess }: TeamFormProps) => {
    const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm();
    const [loading, setLoading] = useState(false);
    const [existingMedia, setExistingMedia] = useState<MediaItem[]>([]);
    const [pendingMedia, setPendingMedia] = useState<PendingMedia[]>([]);
    const [roleOptions, setRoleOptions] = useState<string[]>([]);
    const [newRoleOption, setNewRoleOption] = useState("");
    const isEmployeeMode = memberType === "employee";
    const roleValue = (watch("role") as string | undefined) || "";
    const roleStorageKey = `${TEAM_ROLE_STORAGE_KEY_PREFIX}.${isEmployeeMode ? "employee" : "leadership"}`;

    const persistRoleOptions = (next: string[]) => {
        setRoleOptions(next);
        try {
            localStorage.setItem(roleStorageKey, JSON.stringify(next));
        } catch {
            // Ignore persistence issues and keep form functional.
        }
    };

    const clearPendingMedia = () => {
        setPendingMedia((prev) => {
            prev.forEach((m) => URL.revokeObjectURL(m.url));
            return [];
        });
    };

    useEffect(() => {
        if (!open) return;
        if (member) {
            setValue("name", member.name || "");
            setValue("role", member.role || "");
            setValue("bio", member.bio || "");
            setValue("linkedin_url", member.linkedin_url || "");
            setValue("twitter_url", member.twitter_url || "");
            setValue("facebook_url", member.facebook_url || "");
            setExistingMedia(normalizeMedia(member));
        } else {
            reset();
            setExistingMedia([]);
        }
        clearPendingMedia();
    }, [member, open, reset, setValue, memberType]);

    useEffect(() => {
        if (!open) return;
        const defaults = isEmployeeMode ? DEFAULT_EMPLOYEE_ROLE_OPTIONS : DEFAULT_LEADERSHIP_ROLE_OPTIONS;
        let stored: string[] = [];
        try {
            const raw = localStorage.getItem(roleStorageKey);
            if (raw) {
                const parsed = JSON.parse(raw);
                stored = Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : [];
            }
        } catch {
            stored = [];
        }
        const currentRole = typeof member?.role === "string" ? member.role : "";
        const combined = mergeUniqueOptions(defaults, stored, currentRole ? [currentRole] : []);
        setRoleOptions(combined);
        setNewRoleOption("");
    }, [open, member?.role, isEmployeeMode, roleStorageKey]);

    useEffect(() => {
        const normalized = normalizeOption(roleValue);
        if (!normalized) return;

        setRoleOptions((prev) => {
            if (prev.includes(normalized)) return prev;
            const next = [...prev, normalized];
            try {
                localStorage.setItem(roleStorageKey, JSON.stringify(next));
            } catch {
                // Non-blocking.
            }
            return next;
        });
    }, [roleStorageKey, roleValue]);

    useEffect(() => {
        return () => {
            clearPendingMedia();
        };
    }, []);

    const handleMediaChange = (e: ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        if (files.length === 0) return;
        const selectedFiles = isEmployeeMode ? files.slice(0, 1) : files;
        const next: PendingMedia[] = selectedFiles.map((file) => ({
            id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
            file,
            url: URL.createObjectURL(file),
            type: file.type.startsWith("video/") ? "video" : "image",
        }));

        if (isEmployeeMode) {
            setExistingMedia((prev) => {
                prev.forEach((item) => {
                    if (item.url.startsWith("blob:")) URL.revokeObjectURL(item.url);
                });
                return [];
            });
            setPendingMedia((prev) => {
                prev.forEach((item) => URL.revokeObjectURL(item.url));
                return next;
            });
        } else {
            setPendingMedia((prev) => [...prev, ...next]);
        }
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

    const handleRoleChange = (value: string) => {
        setValue("role", value, { shouldDirty: true, shouldValidate: true });
    };

    const handleAddRoleOption = () => {
        const normalized = normalizeOption(newRoleOption);
        if (!normalized) return;
        if (roleOptions.includes(normalized)) {
            handleRoleChange(normalized);
            setNewRoleOption("");
            return;
        }

        const next = [...roleOptions, normalized];
        persistRoleOptions(next);
        handleRoleChange(normalized);
        setNewRoleOption("");
    };

    const handleRemoveRoleOption = (option: string) => {
        const next = roleOptions.filter((item) => item !== option);
        persistRoleOptions(next);
        if (roleValue === option) {
            setValue("role", "", { shouldDirty: true, shouldValidate: true });
        }
    };

    const onSubmit = async (data: Record<string, unknown>) => {
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

            const finalMedia = isEmployeeMode
                ? [...existingMedia, ...uploadedMedia].slice(0, 1)
                : [...existingMedia, ...uploadedMedia];
            if (!member && finalMedia.length === 0) {
                throw new Error(isEmployeeMode ? "Please upload an employee image" : "Please upload at least one image or video");
            }

            const name = typeof data.name === "string" ? data.name : "";
            const role = typeof data.role === "string" ? data.role : "";
            const bio = typeof data.bio === "string" ? data.bio : "";
            const linkedinUrl = typeof data.linkedin_url === "string" ? data.linkedin_url : "";
            const twitterUrl = typeof data.twitter_url === "string" ? data.twitter_url : "";
            const facebookUrl = typeof data.facebook_url === "string" ? data.facebook_url : "";

            const payload = {
                name,
                role,
                bio: isEmployeeMode ? null : (bio || null),
                image_url: finalMedia[0]?.url || null,
                media: finalMedia,
                linkedin_url: isEmployeeMode ? null : (linkedinUrl || null),
                twitter_url: isEmployeeMode ? null : (twitterUrl || null),
                facebook_url: isEmployeeMode ? null : (facebookUrl || null),
                member_type: memberType,
                status: member?.status || "live",
            };

            const memberId = member?.id;
            const url = member && memberId ? `${apiBase}/team/${memberId}` : `${apiBase}/team`;
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

            toast.success(member ? (isEmployeeMode ? "Employee updated" : "Team member updated") : (isEmployeeMode ? "Employee created" : "Team member created"));
            clearPendingMedia();
            onSuccess();
            onOpenChange(false);
        } catch (error: unknown) {
            toast.error(error instanceof Error ? error.message : "Something went wrong");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>{member ? (isEmployeeMode ? "Edit Employee" : "Edit Team Member") : (isEmployeeMode ? "Add Employee" : "Add Team Member")}</DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 mt-4">
                    <div className="grid gap-2">
                        <Label htmlFor="team-media-upload">{isEmployeeMode ? "Employee Image" : "Profile Media (Images/Videos)"}</Label>
                        <div className="flex flex-wrap gap-3">
                            {existingMedia.map((media, index) => (
                                <div key={`existing-${index}`} className={`relative w-24 h-24 ${isEmployeeMode ? "rounded-xl" : "rounded-full"} overflow-hidden border border-border`}>
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
                                <div key={media.id} className={`relative w-24 h-24 ${isEmployeeMode ? "rounded-xl" : "rounded-full"} overflow-hidden border border-border`}>
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
                                <div className={`w-24 h-24 ${isEmployeeMode ? "rounded-xl" : "rounded-full"} bg-muted flex items-center justify-center text-muted-foreground border border-border`}>
                                    <Users className="w-8 h-8 opacity-50" />
                                </div>
                            )}
                        </div>
                        <div>
                            <Label htmlFor="team-media-upload" className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 border border-input rounded-md hover:bg-accent hover:text-accent-foreground transition-colors">
                                <Upload className="w-4 h-4" />
                                {isEmployeeMode ? "Select Image" : "Select Multiple Media"}
                            </Label>
                            <Input
                                id="team-media-upload"
                                type="file"
                                accept={isEmployeeMode ? "image/*" : "image/*,video/*"}
                                multiple={!isEmployeeMode}
                                className="hidden"
                                onChange={handleMediaChange}
                            />
                            <p className="text-xs text-muted-foreground mt-2">
                                {isEmployeeMode
                                    ? "Add one square-style employee image."
                                    : "Add multiple images/videos and remove any before saving."}
                            </p>
                        </div>
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="name">Full Name</Label>
                        <Input id="name" {...register("name", { required: true })} placeholder="John Doe" />
                        {errors.name && <span className="text-destructive text-sm">Name is required</span>}
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="role">{isEmployeeMode ? "Profession" : "Role / Position"}</Label>
                        <input type="hidden" {...register("role", { required: true })} />
                        <Select
                            value={roleValue || undefined}
                            onValueChange={handleRoleChange}
                        >
                            <SelectTrigger id="role">
                                <SelectValue placeholder={isEmployeeMode ? "Select profession" : "Select role / position"} />
                            </SelectTrigger>
                            <SelectContent>
                                {roleOptions.map((option) => (
                                    <SelectItem key={option} value={option}>
                                        {option}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <div className="flex gap-2">
                            <Input
                                value={newRoleOption}
                                onChange={(e) => setNewRoleOption(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === "Enter") {
                                        e.preventDefault();
                                        handleAddRoleOption();
                                    }
                                }}
                                placeholder={isEmployeeMode ? "Add new profession option" : "Add new role option"}
                            />
                            <Button type="button" variant="outline" onClick={handleAddRoleOption}>
                                Add
                            </Button>
                        </div>
                        {roleOptions.length > 0 && (
                            <div className="flex flex-wrap gap-2">
                                {roleOptions.map((option) => (
                                    <div
                                        key={`role-chip-${option}`}
                                        className={`inline-flex items-center rounded-full border px-2 py-1 text-xs ${
                                            roleValue === option
                                                ? "border-primary text-primary"
                                                : "border-border text-muted-foreground"
                                        }`}
                                    >
                                        <button
                                            type="button"
                                            onClick={() => handleRoleChange(option)}
                                            className="px-1"
                                        >
                                            {option}
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => handleRemoveRoleOption(option)}
                                            className="ml-1 text-muted-foreground hover:text-destructive"
                                            aria-label={`Remove ${option}`}
                                        >
                                            <X className="w-3 h-3" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                        {errors.role && <span className="text-destructive text-sm">Role is required</span>}
                    </div>

                    {!isEmployeeMode && (
                        <>
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
                        </>
                    )}

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                        <Button type="submit" disabled={loading}>
                            {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                            {member ? "Save Changes" : (isEmployeeMode ? "Add Employee" : "Add Member")}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
};

export default TeamForm;
