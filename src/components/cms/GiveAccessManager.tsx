import { FormEvent, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Loader2, ShieldPlus, RefreshCcw } from "lucide-react";
import { toast } from "sonner";
import { getAdminToken, getApiBaseUrl, getAdminProfile, setAdminToken } from "@/components/admin/adminAuth";

type CmsAdminUser = {
  id: string;
  fullName: string;
  email: string;
  username: string;
  role: "owner" | "manager";
  isActive: boolean;
  createdAt: string;
};

const initialForm = {
  fullName: "",
  email: "",
  username: "",
  password: "",
};

const initialProfileForm = {
  fullName: "",
  email: "",
  username: "",
  currentPassword: "",
  newPassword: "",
};

type ProfileIdentity = {
  fullName: string;
  email: string;
  username: string;
};

const readErrorMessage = async (response: Response, fallback: string) => {
  const contentType = response.headers.get("content-type") || "";

  if (contentType.includes("application/json")) {
    const body = await response.json().catch(() => null);
    if (body?.message) return String(body.message);
    if (body?.detail) return String(body.detail);
  }

  const text = await response.text().catch(() => "");
  if (text) return text;
  return fallback;
};

const GiveAccessManager = () => {
  const [admins, setAdmins] = useState<CmsAdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [form, setForm] = useState(initialForm);
  const [profileForm, setProfileForm] = useState(initialProfileForm);
  const [profileSnapshot, setProfileSnapshot] = useState<ProfileIdentity>({
    fullName: "",
    email: "",
    username: "",
  });

  const apiBase = getApiBaseUrl();
  const isMainAdmin = Boolean(getAdminProfile()?.isMain);

  useEffect(() => {
    const profile = getAdminProfile();
    if (!profile) return;
    const nextIdentity = {
      fullName: profile.fullName || "",
      email: profile.email || "",
      username: profile.username || "",
    };
    setProfileSnapshot(nextIdentity);
    setProfileForm({
      ...nextIdentity,
      currentPassword: "",
      newPassword: "",
    });
  }, []);

  const ensureToken = () => {
    const token = getAdminToken();
    if (!token) {
      toast.error("Session expired. Please login again.");
      return "";
    }
    return token;
  };

  const loadAdmins = async (silent = false) => {
    const token = ensureToken();
    if (!token) return;

    if (!silent) setLoading(true);
    try {
      const response = await fetch(`${apiBase}/auth/admin-users`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const message = await readErrorMessage(response, "Failed to load access list");
        throw new Error(message);
      }

      const payload = await response.json();
      setAdmins(Array.isArray(payload) ? (payload as CmsAdminUser[]) : []);
    } catch (error: any) {
      toast.error(error?.message || "Failed to load access list");
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    if (!isMainAdmin) return;
    void loadAdmins();
  }, [isMainAdmin]);

  const handleCreate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!isMainAdmin) {
      toast.error("Only main account can grant CMS access.");
      return;
    }

    const token = ensureToken();
    if (!token) return;

    const fullName = form.fullName.trim();
    const email = form.email.trim().toLowerCase();
    const username = form.username.trim().toLowerCase();
    const password = form.password.trim();

    if (!fullName || !email || !username || !password) {
      toast.error("Full name, email, username and password are required.");
      return;
    }

    setCreating(true);
    try {
      const response = await fetch(`${apiBase}/auth/admin-users`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          fullName,
          email,
          username,
          password,
          role: "manager",
        }),
      });

      if (!response.ok) {
        const message = await readErrorMessage(response, "Failed to grant CMS access");
        throw new Error(message);
      }

      setForm(initialForm);
      toast.success("CMS access granted successfully");
      await loadAdmins(true);
    } catch (error: any) {
      toast.error(error?.message || "Failed to grant CMS access");
    } finally {
      setCreating(false);
    }
  };

  const handleProfileUpdate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const token = ensureToken();
    if (!token) return;

    const fullName = profileForm.fullName.trim();
    const email = profileForm.email.trim().toLowerCase();
    const username = profileForm.username.trim().toLowerCase();
    const currentPassword = profileForm.currentPassword.trim();
    const newPassword = profileForm.newPassword.trim();

    if (!fullName || !email || !username) {
      toast.error("Full name, email and username are required.");
      return;
    }

    if (newPassword && !currentPassword) {
      toast.error("Current password is required to set a new password.");
      return;
    }

    const hasIdentityChange =
      fullName !== profileSnapshot.fullName.trim() ||
      email !== profileSnapshot.email.trim().toLowerCase() ||
      username !== profileSnapshot.username.trim().toLowerCase();

    if (!hasIdentityChange && !newPassword) {
      setIsEditingProfile(false);
      setProfileForm((prev) => ({ ...prev, currentPassword: "", newPassword: "" }));
      toast.success("No new changes to save.");
      return;
    }

    setSavingProfile(true);
    try {
      const response = await fetch(`${apiBase}/auth/admin-me`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          fullName,
          email,
          username,
          currentPassword: currentPassword || undefined,
          newPassword: newPassword || undefined,
        }),
      });

      if (!response.ok) {
        const message = await readErrorMessage(response, "Failed to update profile");
        throw new Error(message);
      }

      const payload = await response.json();
      if (payload?.token) {
        setAdminToken(payload.token, payload.admin ?? null);
      }

      const updatedIdentity: ProfileIdentity = {
        fullName: String(payload?.admin?.fullName ?? fullName),
        email: String(payload?.admin?.email ?? email),
        username: String(payload?.admin?.username ?? username),
      };
      setProfileSnapshot(updatedIdentity);
      setProfileForm({
        ...updatedIdentity,
        currentPassword: "",
        newPassword: "",
      });
      setIsEditingProfile(false);
      toast.success("Your profile was updated.");
      await loadAdmins(true);
    } catch (error: any) {
      toast.error(error?.message || "Failed to update profile");
    } finally {
      setSavingProfile(false);
    }
  };

  const handleToggleProfileEdit = () => {
    if (savingProfile) return;

    if (isEditingProfile) {
      setProfileForm({
        ...profileSnapshot,
        currentPassword: "",
        newPassword: "",
      });
      setIsEditingProfile(false);
      return;
    }

    setIsEditingProfile(true);
  };

  if (!isMainAdmin) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Give Access</h2>
          <p className="text-muted-foreground">Create CMS login for new team members.</p>
        </div>
        <Card className="glass-card border-border/60">
          <CardHeader>
            <CardTitle className="text-lg">Access Restricted</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Only the main owner account can manage Give Access settings.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Give Access</h2>
          <p className="text-muted-foreground">Create CMS login for new team members.</p>
        </div>

        <Button type="button" variant="outline" className="gap-2" onClick={() => void loadAdmins()} disabled={!isMainAdmin}>
          <RefreshCcw className="w-4 h-4" />
          Refresh
        </Button>
      </div>

      <Card className="glass-card border-border/60">
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <CardTitle className="text-lg">
            My Account
            {profileSnapshot.fullName ? ` - ${profileSnapshot.fullName}` : ""}
          </CardTitle>
          <Button type="button" variant="outline" onClick={handleToggleProfileEdit} disabled={savingProfile}>
            {isEditingProfile ? "Cancel" : "Edit"}
          </Button>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleProfileUpdate} className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="profile-full-name">Full Name</Label>
                <Input
                  id="profile-full-name"
                  value={profileForm.fullName}
                  onChange={(event) => setProfileForm((prev) => ({ ...prev, fullName: event.target.value }))}
                  disabled={!isEditingProfile || savingProfile}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="profile-email">Email</Label>
                <Input
                  id="profile-email"
                  type="email"
                  value={profileForm.email}
                  onChange={(event) => setProfileForm((prev) => ({ ...prev, email: event.target.value }))}
                  disabled={!isEditingProfile || savingProfile}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="profile-username">Username</Label>
                <Input
                  id="profile-username"
                  value={profileForm.username}
                  onChange={(event) => setProfileForm((prev) => ({ ...prev, username: event.target.value }))}
                  disabled={!isEditingProfile || savingProfile}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="profile-current-password">Current Password (for password change)</Label>
                <PasswordInput
                  id="profile-current-password"
                  value={profileForm.currentPassword}
                  onChange={(event) => setProfileForm((prev) => ({ ...prev, currentPassword: event.target.value }))}
                  placeholder="Enter current password"
                  disabled={!isEditingProfile || savingProfile}
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="profile-new-password">New Password (optional)</Label>
                <PasswordInput
                  id="profile-new-password"
                  value={profileForm.newPassword}
                  onChange={(event) => setProfileForm((prev) => ({ ...prev, newPassword: event.target.value }))}
                  placeholder="Leave blank if you do not want to change password"
                  disabled={!isEditingProfile || savingProfile}
                />
              </div>
            </div>

            {isEditingProfile ? (
              <Button type="submit" disabled={savingProfile}>
                {savingProfile ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                Save My Info
              </Button>
            ) : null}
          </form>
        </CardContent>
      </Card>

      <Card className="glass-card border-border/60">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Add CMS User</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="give-access-full-name">Full Name</Label>
                <Input
                  id="give-access-full-name"
                  value={form.fullName}
                  onChange={(event) => setForm((prev) => ({ ...prev, fullName: event.target.value }))}
                  placeholder="Team member full name"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="give-access-email">Email</Label>
                <Input
                  id="give-access-email"
                  type="email"
                  value={form.email}
                  onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
                  placeholder="team@drawndimension.com"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="give-access-username">Username</Label>
                <Input
                  id="give-access-username"
                  value={form.username}
                  onChange={(event) => setForm((prev) => ({ ...prev, username: event.target.value }))}
                  placeholder="cms username"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="give-access-password">Password</Label>
                <PasswordInput
                  id="give-access-password"
                  value={form.password}
                  onChange={(event) => setForm((prev) => ({ ...prev, password: event.target.value }))}
                  placeholder="Minimum 6 characters"
                  required
                />
              </div>
            </div>

            <Button type="submit" disabled={creating} className="gap-2">
              {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldPlus className="w-4 h-4" />}
              Grant Access
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card className="glass-card border-border/60 overflow-hidden">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Current CMS Users</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Username</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    Loading access list...
                  </TableCell>
                </TableRow>
              ) : admins.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    No CMS users found.
                  </TableCell>
                </TableRow>
              ) : (
                admins.map((admin) => (
                  <TableRow key={admin.id}>
                    <TableCell className="font-medium">{admin.fullName}</TableCell>
                    <TableCell>{admin.email}</TableCell>
                    <TableCell>{admin.username}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{admin.role}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={admin.isActive ? "bg-emerald-500/15 text-emerald-600 border-emerald-500/30" : ""}>
                        {admin.isActive ? "active" : "inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell>{admin.createdAt ? new Date(admin.createdAt).toLocaleString() : "-"}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default GiveAccessManager;
