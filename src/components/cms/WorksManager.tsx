import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Search, Edit, Trash2, RotateCcw, MonitorPlay } from "lucide-react";
import { getAdminToken, getApiBaseUrl } from "@/components/admin/adminAuth";
import { toast } from "sonner";
import WorkForm from "./WorkForm";

const WorksManager = () => {
    const [projects, setProjects] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState("live");
    const [search, setSearch] = useState("");
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingProject, setEditingProject] = useState<any | null>(null);

    const apiBase = getApiBaseUrl();
    const token = getAdminToken();

    const fetchProjects = async () => {
        setLoading(true);
        try {
            // Fetch all and filter client side or fetch by status?
            // API supports ?status=... but let's just fetch filtered by tab to be efficient
            const res = await fetch(`${apiBase}/projects?status=${activeTab}`);
            if (res.ok) {
                const data = await res.json();
                setProjects(data);
            }
        } catch (error) {
            console.error("Failed to fetch projects", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchProjects();
    }, [activeTab]);

    const handleDelete = async (id: string, isHardDelete: boolean) => {
        if (!confirm(isHardDelete ? "Are you sure you want to PERMANENTLY delete this?" : "Move this work to Drafts?")) return;

        try {
            let res;
            if (isHardDelete) {
                // DELETE /api/projects/:id
                res = await fetch(`${apiBase}/projects/${id}`, {
                    method: "DELETE",
                    headers: { Authorization: `Bearer ${token}` }
                });
            } else {
                // PATCH status to draft
                res = await fetch(`${apiBase}/projects/${id}`, {
                    method: "PATCH",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${token}`
                    },
                    body: JSON.stringify({ status: "draft" })
                });
            }

            if (res.ok) {
                toast.success(isHardDelete ? "Work deleted permanently" : "Work moved to Drafts");
                fetchProjects();
            } else {
                throw new Error("Failed to delete");
            }
        } catch (error) {
            toast.error("Operation failed");
        }
    };

    const handleRestore = async (id: string) => {
        try {
            const res = await fetch(`${apiBase}/projects/${id}`, {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({ status: "live" })
            });

            if (res.ok) {
                toast.success("Work restored to Live");
                fetchProjects();
            }
        } catch (error) {
            toast.error("Restore failed");
        }
    };

    const filteredProjects = projects.filter(p =>
        p.title.toLowerCase().includes(search.toLowerCase()) ||
        p.category?.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Live Works</h2>
                    <p className="text-muted-foreground">Manage your portfolio projects.</p>
                </div>
                <Button onClick={() => { setEditingProject(null); setIsFormOpen(true); }} className="gap-2">
                    <Plus className="w-4 h-4" /> Upload Work
                </Button>
            </div>

            <div className="flex items-center gap-4">
                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-[400px]">
                    <TabsList>
                        <TabsTrigger value="live" className="gap-2"><MonitorPlay className="w-4 h-4" /> Live Works</TabsTrigger>
                        <TabsTrigger value="draft" className="gap-2"><RotateCcw className="w-4 h-4" /> Drafts</TabsTrigger>
                    </TabsList>
                </Tabs>
                <div className="relative flex-1 max-w-sm ml-auto">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search projects..."
                        className="pl-8"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
            </div>

            {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[1, 2, 3, 4, 5, 6].map(i => <div key={i} className="h-96 bg-muted/20 animate-pulse rounded-2xl" />)}
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredProjects.map((project) => (
                        <div
                            key={project.id}
                            className="group relative"
                        >
                            <div className="glass-card overflow-hidden h-full flex flex-col transition-all duration-300 hover:shadow-glow/50 border-border/50 bg-secondary/20">
                                <div className="relative overflow-hidden aspect-video">
                                    {project.image_url ? (
                                        <img
                                            src={project.image_url}
                                            alt={project.title}
                                            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                                        />
                                    ) : (
                                        <div className="flex items-center justify-center h-full bg-muted/30 text-muted-foreground">
                                            No Image
                                        </div>
                                    )}
                                    <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/40 to-transparent opacity-60 group-hover:opacity-100 transition-opacity duration-300" />

                                    {/* Action Buttons Overlay */}
                                    <div className="absolute inset-0 flex items-center justify-center gap-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-20">
                                        <Button size="sm" variant="secondary" className="shadow-lg hover:scale-105 transition-transform" onClick={() => { setEditingProject(project); setIsFormOpen(true); }}>
                                            <Edit className="w-4 h-4 mr-2" /> Edit
                                        </Button>

                                        {activeTab === 'draft' ? (
                                            <>
                                                <Button size="icon" className="bg-green-600 hover:bg-green-700 shadow-lg hover:scale-105 transition-transform" onClick={() => handleRestore(project.id)}>
                                                    <RotateCcw className="w-4 h-4" />
                                                </Button>
                                                <Button size="icon" variant="destructive" className="shadow-lg hover:scale-105 transition-transform" onClick={() => handleDelete(project.id, true)}>
                                                    <Trash2 className="w-4 h-4" />
                                                </Button>
                                            </>
                                        ) : (
                                            <Button size="sm" variant="destructive" className="shadow-lg hover:scale-105 transition-transform" onClick={() => handleDelete(project.id, false)}>
                                                <Trash2 className="w-4 h-4 mr-2" /> {activeTab === "live" ? "Draft" : "Delete"}
                                            </Button>
                                        )}
                                    </div>

                                    {/* Badge */}
                                    <div className="absolute top-4 left-4 z-10">
                                        <span className="text-xs px-3 py-1 rounded-full bg-primary/90 text-primary-foreground shadow-glow backdrop-blur-md">
                                            {project.category || "Uncategorized"}
                                        </span>
                                    </div>

                                    {/* Status Badge for Drafts */}
                                    {project.status === 'draft' && (
                                        <div className="absolute top-4 right-4 z-10">
                                            <span className="text-xs px-3 py-1 rounded-full bg-yellow-500/90 text-black font-medium shadow-glow backdrop-blur-md">
                                                Draft
                                            </span>
                                        </div>
                                    )}
                                </div>

                                <div className="p-6 flex-grow flex flex-col justify-between relative z-10">
                                    <div>
                                        <h3 className="text-xl font-bold text-foreground mb-2 group-hover:text-primary transition-colors">
                                            {project.title}
                                        </h3>
                                        <p className="text-sm text-muted-foreground line-clamp-3 mb-4 leading-relaxed">
                                            {project.description}
                                        </p>
                                    </div>

                                    {project.client && (
                                        <div className="mt-auto pt-4 border-t border-border/50">
                                            <p className="text-xs font-bold tracking-wider text-primary uppercase flex items-center gap-2">
                                                <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                                                CLIENT: <span className="text-foreground/80 font-normal normal-case">{project.client}</span>
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                    {filteredProjects.length === 0 && (
                        <div className="col-span-full flex flex-col items-center justify-center py-20 text-muted-foreground bg-muted/5 rounded-3xl border border-dashed border-border/50">
                            <MonitorPlay className="w-12 h-12 mb-4 opacity-20" />
                            <p className="text-lg font-medium">No works found in {activeTab}.</p>
                            <p className="text-sm opacity-60">Upload a new work to get started.</p>
                        </div>
                    )}
                </div>
            )}

            <WorkForm
                open={isFormOpen}
                onOpenChange={setIsFormOpen}
                project={editingProject}
                onSuccess={() => fetchProjects()}
            />
        </div>
    );
};

export default WorksManager;
