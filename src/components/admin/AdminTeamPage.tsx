import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "@/components/ui/use-toast";
import { getAdminToken, getApiBaseUrl } from "@/components/admin/adminAuth";

type TeamMember = {
  id: number;
  name: string;
  role: string;
  contact_info: string | null;
  description: string;
  image_url: string;
};

type PreviewFile = {
  file: File;
  url: string;
};

const AdminTeamPage = () => {
  const apiBase = getApiBaseUrl();
  const token = getAdminToken();
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);

  const [memberName, setMemberName] = useState("");
  const [memberRole, setMemberRole] = useState("");
  const [memberContact, setMemberContact] = useState("");
  const [memberDescription, setMemberDescription] = useState("");
  const [memberImage, setMemberImage] = useState<PreviewFile | null>(null);

  const [editMember, setEditMember] = useState<TeamMember | null>(null);
  const [editMemberImage, setEditMemberImage] = useState<PreviewFile | null>(null);

  const fetchTeam = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${apiBase}/team`);
      if (res.ok) {
        const data = await res.json();
        setTeam(Array.isArray(data) ? data : []);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTeam();
  }, []);

  const submitMember = async () => {
    if (!token || !memberImage) return;

    const form = new FormData();
    form.append("name", memberName);
    form.append("role", memberRole);
    form.append("contact_info", memberContact);
    form.append("description", memberDescription);
    form.append("image", memberImage.file);

    const res = await fetch(`${apiBase}/team`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: form
    });

    if (!res.ok) {
      toast({ title: "Failed", description: "Could not add member." });
      return;
    }

    toast({ title: "Member added", description: "Team updated." });
    setMemberName("");
    setMemberRole("");
    setMemberContact("");
    setMemberDescription("");
    if (memberImage) URL.revokeObjectURL(memberImage.url);
    setMemberImage(null);
    fetchTeam();
  };

  const deleteMember = async (id: number) => {
    if (!token) return;
    const res = await fetch(`${apiBase}/team/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` }
    });

    if (res.ok) {
      toast({ title: "Deleted", description: "Team member removed." });
      setTeam((prev) => prev.filter((m) => m.id !== id));
    }
  };

  const saveMemberEdits = async () => {
    if (!token || !editMember) return;

    const form = new FormData();
    form.append("name", editMember.name);
    form.append("role", editMember.role);
    form.append("contact_info", editMember.contact_info ?? "");
    form.append("description", editMember.description);
    if (editMemberImage) {
      form.append("image", editMemberImage.file);
    }

    await fetch(`${apiBase}/team/${editMember.id}`, {
      method: "PUT",
      headers: { Authorization: `Bearer ${token}` },
      body: form
    });

    toast({ title: "Updated", description: "Member updated." });
    if (editMemberImage) URL.revokeObjectURL(editMemberImage.url);
    setEditMemberImage(null);
    setEditMember(null);
    fetchTeam();
  };

  return (
    <div className="space-y-6">
      <div className="text-2xl font-bold">Team Management</div>
      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          {loading ? (
            <div className="grid md:grid-cols-2 gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-40 rounded-xl bg-muted/20" />
              ))}
            </div>
          ) : (
            <div className="grid md:grid-cols-2 gap-4">
              {team.map((m) => (
                <div key={m.id} className="glass-card p-4 border-border/50">
                  <div className="flex gap-3">
                    <img src={`${apiBase}${m.image_url}`} className="h-16 w-16 rounded-full object-cover" />
                    <div className="flex-1">
                      <div className="font-semibold">{m.name}</div>
                      <div className="text-sm text-muted-foreground">{m.role}</div>
                      {m.contact_info && <div className="text-xs text-muted-foreground">{m.contact_info}</div>}
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground mt-3 line-clamp-2">{m.description}</p>
                  <div className="mt-3 flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => setEditMember(m)}>Edit</Button>
                    <Button size="sm" variant="destructive" onClick={() => deleteMember(m.id)}>Delete</Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-3">
          <div className="space-y-2">
            <Label>Employee Image</Label>
            <Input
              type="file"
              accept="image/*"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                if (memberImage) URL.revokeObjectURL(memberImage.url);
                setMemberImage({ file, url: URL.createObjectURL(file) });
              }}
            />
            {memberImage && <img src={memberImage.url} className="h-20 w-20 rounded-full object-cover" />}
          </div>
          <div className="space-y-2">
            <Label>Name</Label>
            <Input value={memberName} onChange={(e) => setMemberName(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Role</Label>
            <Input value={memberRole} onChange={(e) => setMemberRole(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Contact Info</Label>
            <Input value={memberContact} onChange={(e) => setMemberContact(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea rows={3} value={memberDescription} onChange={(e) => setMemberDescription(e.target.value)} />
          </div>
          <Button onClick={submitMember}>Add Member</Button>
        </div>
      </div>

      <Dialog open={!!editMember} onOpenChange={(open) => !open && setEditMember(null)}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Edit Member</DialogTitle>
          </DialogHeader>
          {editMember && (
            <div className="space-y-3">
              <div className="space-y-2">
                <Label>Name</Label>
                <Input value={editMember.name} onChange={(e) => setEditMember({ ...editMember, name: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Role</Label>
                <Input value={editMember.role} onChange={(e) => setEditMember({ ...editMember, role: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Contact Info</Label>
                <Input value={editMember.contact_info ?? ""} onChange={(e) => setEditMember({ ...editMember, contact_info: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea rows={3} value={editMember.description} onChange={(e) => setEditMember({ ...editMember, description: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Update Image (optional)</Label>
                <Input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    if (editMemberImage) URL.revokeObjectURL(editMemberImage.url);
                    setEditMemberImage({ file, url: URL.createObjectURL(file) });
                  }}
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setEditMember(null)}>Cancel</Button>
                <Button onClick={saveMemberEdits}>Save Changes</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminTeamPage;
