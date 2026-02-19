import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Search, Edit, Trash2, RotateCcw, Users, UserMinus } from "lucide-react";
import { getAdminToken, getApiBaseUrl } from "@/components/admin/adminAuth";
import { toast } from "sonner";
import TeamForm from "./TeamForm";

const TeamManager = () => {
    const [members, setMembers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState("live");
    const [search, setSearch] = useState("");
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingMember, setEditingMember] = useState<any | null>(null);

    const apiBase = getApiBaseUrl();
    const token = getAdminToken();

    const fetchMembers = async () => {
        setLoading(true);
        try {
            const res = await fetch(`${apiBase}/team?status=${activeTab}`);
            if (res.ok) {
                const data = await res.json();
                setMembers(data);
            }
        } catch (error) {
            console.error("Failed to fetch team", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchMembers();
    }, [activeTab]);

    const handleDelete = async (id: string, isHardDelete: boolean) => {
        if (!confirm(isHardDelete ? "Permanently remove this member?" : "Move to Drafts?")) return;

        try {
            let res;
            if (isHardDelete) {
                res = await fetch(`${apiBase}/team/${id}`, {
                    method: "DELETE",
                    headers: { Authorization: `Bearer ${token}` }
                });
            } else {
                res = await fetch(`${apiBase}/team/${id}`, {
                    method: "PATCH",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${token}`
                    },
                    body: JSON.stringify({ status: "draft" })
                });
            }

            if (res.ok) {
                toast.success(isHardDelete ? "Member removed" : "Member moved to Drafts");
                fetchMembers();
            } else {
                throw new Error("Failed to delete");
            }
        } catch (error) {
            toast.error("Operation failed");
        }
    };

    const handleRestore = async (id: string) => {
        try {
            const res = await fetch(`${apiBase}/team/${id}`, {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({ status: "live" })
            });

            if (res.ok) {
                toast.success("Member restored to Live");
                fetchMembers();
            }
        } catch (error) {
            toast.error("Restore failed");
        }
    };

    const filteredMembers = members.filter(m =>
        m.name.toLowerCase().includes(search.toLowerCase()) ||
        m.role.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Team Members</h2>
                    <p className="text-muted-foreground">Manage your team profiles.</p>
                </div>
                <Button onClick={() => { setEditingMember(null); setIsFormOpen(true); }} className="gap-2 bg-orange-600 hover:bg-orange-700">
                    <Plus className="w-4 h-4" /> Add Member
                </Button>
            </div>

            <div className="flex items-center gap-4">
                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-[400px]">
                    <TabsList>
                        <TabsTrigger value="live" className="gap-2"><Users className="w-4 h-4" /> Live Team</TabsTrigger>
                        <TabsTrigger value="draft" className="gap-2"><UserMinus className="w-4 h-4" /> Drafts</TabsTrigger>
                    </TabsList>
                </Tabs>
                <div className="relative flex-1 max-w-sm ml-auto">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search members..."
                        className="pl-8"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
            </div>

            {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {[1, 2, 3].map(i => <div key={i} className="h-64 bg-muted/20 animate-pulse rounded-xl" />)}
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {filteredMembers.map((member) => (
                        <Card key={member.id} className="overflow-hidden group border-border/40 bg-card/50 hover:shadow-lg transition-all duration-300">
                            <div className="aspect-[4/3] relative overflow-hidden bg-muted">
                                {member.image_url ? (
                                    <img src={member.image_url} alt={member.name} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                                ) : (
                                    <div className="flex items-center justify-center h-full text-muted-foreground bg-secondary/50">
                                        <Users className="w-12 h-12 opacity-20" />
                                    </div>
                                )}
                                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                    <Button size="icon" variant="secondary" onClick={() => { setEditingMember(member); setIsFormOpen(true); }}>
                                        <Edit className="w-4 h-4" />
                                    </Button>
                                    {activeTab === 'draft' ? (
                                        <>
                                            <Button size="icon" variant="default" className="bg-green-600 hover:bg-green-700" onClick={() => handleRestore(member.id)}>
                                                <RotateCcw className="w-4 h-4" />
                                            </Button>
                                            <Button size="icon" variant="destructive" onClick={() => handleDelete(member.id, true)}>
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        </>
                                    ) : (
                                        <Button size="icon" variant="destructive" onClick={() => handleDelete(member.id, false)}>
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                    )}
                                </div>
                            </div>
                            <CardContent className="p-4 text-center">
                                <h3 className="font-semibold truncate text-lg">{member.name}</h3>
                                <p className="text-sm font-medium text-primary mb-1">{member.role}</p>
                                <p className="text-xs text-muted-foreground line-clamp-2">{member.bio}</p>
                                {member.status === 'draft' && <span className="text-xs bg-yellow-500/10 text-yellow-500 px-2 py-0.5 rounded mt-2 inline-block">Draft</span>}
                            </CardContent>
                        </Card>
                    ))}
                    {filteredMembers.length === 0 && (
                        <div className="col-span-full text-center py-12 text-muted-foreground">
                            No members found in {activeTab}.
                        </div>
                    )}
                </div>
            )}

            <TeamForm
                open={isFormOpen}
                onOpenChange={setIsFormOpen}
                member={editingMember}
                onSuccess={() => fetchMembers()}
            />
        </div>
    );
};

export default TeamManager;
