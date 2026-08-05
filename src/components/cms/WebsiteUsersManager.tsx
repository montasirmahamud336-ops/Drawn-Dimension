import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Search,
  Download,
  Users,
  UserCheck,
  UserX,
  Calendar,
  Clock,
  Building,
  Phone,
  Briefcase,
  Mail,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Info,
} from "lucide-react";
import { toast } from "sonner";
import { clearAdminToken, getAdminToken, getApiBaseUrl } from "@/components/admin/adminAuth";
import { resolveCmsMediaUrl } from "@/components/shared/mediaUrl";

export type WebsiteUser = {
  id: string;
  email: string;
  full_name: string;
  is_active: boolean;
  created_at: string;
  last_login_at: string | null;
  avatar_url: string | null;
  company: string | null;
  phone: string | null;
  job_role: string | null;
  bio: string | null;
};

type UserStatusFilter = "all" | "active" | "inactive";

const readErrorMessage = async (response: Response, fallback: string) => {
  const contentType = response.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    const body = await response.json().catch(() => null);
    if (body?.message) return String(body.message);
  }
  const text = await response.text().catch(() => "");
  if (text) return text;
  return fallback;
};

const handleAdminUnauthorized = () => {
  clearAdminToken();
  toast.error("Session expired. Please login again.");
  window.location.replace("/database/login?switch=1");
};

const formatDate = (isoString: string | null | undefined) => {
  if (!isoString) return "Never";
  try {
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return "Invalid date";
    return new Intl.DateTimeFormat("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  } catch {
    return "Invalid date";
  }
};

const getInitials = (name: string, email: string) => {
  const text = (name && name !== email ? name : email).trim();
  const parts = text.split(/\s+/);
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }
  return text.slice(0, 2).toUpperCase();
};

const escapeCsvCell = (value: string | null | undefined) => {
  const str = String(value ?? "").trim();
  if (!str) return '""';
  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return `"${str}"`;
};

const WebsiteUsersManager = () => {
  const [users, setUsers] = useState<WebsiteUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<UserStatusFilter>("all");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [selectedUser, setSelectedUser] = useState<WebsiteUser | null>(null);

  const apiBase = getApiBaseUrl();

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search.trim());
      setPage(1);
    }, 350);
    return () => clearTimeout(timer);
  }, [search]);

  const fetchUsers = useCallback(async () => {
    const token = getAdminToken();
    if (!token) {
      toast.error("Session expired. Please login again.");
      return;
    }

    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: "20",
        status: statusFilter,
      });

      if (debouncedSearch) {
        params.set("search", debouncedSearch);
      }

      const response = await fetch(`${apiBase}/website-users?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.status === 401) {
        handleAdminUnauthorized();
        return;
      }

      if (!response.ok) {
        const message = await readErrorMessage(response, "Failed to fetch website users");
        throw new Error(message);
      }

      const data = await response.json();
      setUsers(Array.isArray(data.users) ? data.users : []);
      setTotalCount(Number(data.totalCount) || 0);
      setTotalPages(Number(data.totalPages) || 1);
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "Failed to load website users";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, [apiBase, page, debouncedSearch, statusFilter]);

  useEffect(() => {
    void fetchUsers();
  }, [fetchUsers]);

  // Safe CSV Export containing ONLY: name, email, signup date, last login, active status
  const handleExportCsv = async () => {
    const token = getAdminToken();
    if (!token) {
      toast.error("Session expired. Please login again.");
      return;
    }

    setExporting(true);
    try {
      const params = new URLSearchParams({
        status: statusFilter,
      });
      if (debouncedSearch) {
        params.set("search", debouncedSearch);
      }

      const response = await fetch(`${apiBase}/website-users/export?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.status === 401) {
        handleAdminUnauthorized();
        return;
      }

      if (!response.ok) {
        const message = await readErrorMessage(response, "Failed to export users");
        throw new Error(message);
      }

      const data = await response.json();
      const exportList: WebsiteUser[] = Array.isArray(data.users) ? data.users : [];

      if (exportList.length === 0) {
        toast.info("No user records available to export");
        return;
      }

      // Safe CSV header and rows matching strictly requested fields: name, email, signup date, last login, active status
      const headers = ["Name", "Email", "Signup Date", "Last Login", "Active Status"];
      const csvRows = [headers.join(",")];

      for (const u of exportList) {
        const row = [
          escapeCsvCell(u.full_name || u.email),
          escapeCsvCell(u.email),
          escapeCsvCell(formatDate(u.created_at)),
          escapeCsvCell(formatDate(u.last_login_at)),
          escapeCsvCell(u.is_active ? "Active" : "Inactive"),
        ];
        csvRows.push(row.join(","));
      }

      const csvContent = csvRows.join("\r\n");
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      const timestamp = new Date().toISOString().slice(0, 10);
      link.href = url;
      link.setAttribute("download", `website_users_${timestamp}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success(`Successfully exported ${exportList.length} website users to CSV`);
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "Failed to export website users";
      toast.error(msg);
    } finally {
      setExporting(false);
    }
  };

  const activeCount = useMemo(() => {
    return users.filter((u) => u.is_active).length;
  }, [users]);

  return (
    <div className="space-y-6 pb-12">
      {/* Header section */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">Website Users</h1>
            <Badge variant="outline" className="text-xs font-semibold">
              {totalCount} Total
            </Badge>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage and view registered website client accounts created via Email/Password or Google Sign-In.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => void fetchUsers()}
            disabled={loading}
            className="h-9 gap-1.5"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </Button>

          <Button
            variant="default"
            size="sm"
            onClick={() => void handleExportCsv()}
            disabled={exporting || loading}
            className="h-9 gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90"
          >
            <Download className="h-4 w-4" />
            <span>{exporting ? "Exporting..." : "Export CSV"}</span>
          </Button>
        </div>
      </div>

      {/* Filters and search bar */}
      <div className="flex flex-col gap-4 rounded-xl border border-border/60 bg-card/60 p-4 backdrop-blur-sm sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by name, email, company, job role..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-background/80"
          />
        </div>

        <Tabs
          value={statusFilter}
          onValueChange={(val) => {
            setStatusFilter(val as UserStatusFilter);
            setPage(1);
          }}
          className="w-full sm:w-auto"
        >
          <TabsList className="grid w-full grid-cols-3 sm:w-auto">
            <TabsTrigger value="all" className="text-xs sm:text-sm">
              All Users
            </TabsTrigger>
            <TabsTrigger value="active" className="text-xs sm:text-sm">
              Active
            </TabsTrigger>
            <TabsTrigger value="inactive" className="text-xs sm:text-sm">
              Inactive
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Main Table / Card Content */}
      <div className="rounded-xl border border-border/60 bg-card/70 shadow-sm backdrop-blur-md overflow-hidden">
        {loading ? (
          <div className="p-6 space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-4 w-1/4" />
                  <Skeleton className="h-3 w-1/3" />
                </div>
                <Skeleton className="h-6 w-16 rounded-full" />
              </div>
            ))}
          </div>
        ) : users.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted/50 text-muted-foreground mb-4">
              <Users className="h-8 w-8" />
            </div>
            <h3 className="text-lg font-semibold text-foreground">No website users found</h3>
            <p className="mt-1 text-sm text-muted-foreground max-w-sm">
              {debouncedSearch
                ? `No accounts matched your search for "${debouncedSearch}".`
                : "No registered website user accounts found in the database."}
            </p>
            {debouncedSearch && (
              <Button variant="outline" size="sm" onClick={() => setSearch("")} className="mt-4">
                Clear search filter
              </Button>
            )}
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40 hover:bg-muted/40">
                    <TableHead className="w-[280px]">User Profile</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Account Created</TableHead>
                    <TableHead>Last Login</TableHead>
                    <TableHead className="w-[110px] text-center">Status</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => (
                    <TableRow
                      key={user.id}
                      className="cursor-pointer transition-colors hover:bg-muted/50"
                      onClick={() => setSelectedUser(user)}
                    >
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-10 w-10 border border-border/50">
                            <AvatarImage src={resolveCmsMediaUrl(user.avatar_url)} alt={user.full_name} />
                            <AvatarFallback className="bg-primary/10 text-primary font-medium text-xs">
                              {getInitials(user.full_name, user.email)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex flex-col min-w-0">
                            <span className="truncate text-sm font-semibold text-foreground">
                              {user.full_name || user.email}
                            </span>
                            {user.job_role && (
                              <span className="truncate text-xs text-muted-foreground">{user.job_role}</span>
                            )}
                          </div>
                        </div>
                      </TableCell>

                      <TableCell className="text-sm text-muted-foreground">
                        <span className="font-mono text-xs">{user.email}</span>
                      </TableCell>

                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                        {formatDate(user.created_at)}
                      </TableCell>

                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                        {user.last_login_at ? (
                          formatDate(user.last_login_at)
                        ) : (
                          <span className="italic text-muted-foreground/60">Never</span>
                        )}
                      </TableCell>

                      <TableCell className="text-center">
                        {user.is_active ? (
                          <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20 font-medium text-xs">
                            Active
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="text-muted-foreground font-medium text-xs">
                            Inactive
                          </Badge>
                        )}
                      </TableCell>

                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" className="h-8 text-xs font-medium text-primary hover:text-primary">
                          View Detail
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Mobile Card List View */}
            <div className="md:hidden divide-y divide-border/60">
              {users.map((user) => (
                <div
                  key={user.id}
                  onClick={() => setSelectedUser(user)}
                  className="p-4 space-y-3 cursor-pointer hover:bg-muted/40 transition-colors"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <Avatar className="h-10 w-10 border border-border/50">
                        <AvatarImage src={resolveCmsMediaUrl(user.avatar_url)} alt={user.full_name} />
                        <AvatarFallback className="bg-primary/10 text-primary font-medium text-xs">
                          {getInitials(user.full_name, user.email)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-foreground truncate">
                          {user.full_name || user.email}
                        </p>
                        <p className="text-xs text-muted-foreground truncate font-mono">{user.email}</p>
                      </div>
                    </div>
                    {user.is_active ? (
                      <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 text-xs">
                        Active
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="text-xs">
                        Inactive
                      </Badge>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground pt-1 border-t border-border/30">
                    <div>
                      <span className="block text-[10px] uppercase font-semibold text-muted-foreground/70">Created</span>
                      <span>{formatDate(user.created_at)}</span>
                    </div>
                    <div>
                      <span className="block text-[10px] uppercase font-semibold text-muted-foreground/70">Last Login</span>
                      <span>{formatDate(user.last_login_at)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination Controls */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 border-t border-border/60 bg-muted/20">
              <p className="text-xs text-muted-foreground text-center sm:text-left">
                Showing <span className="font-semibold text-foreground">{users.length > 0 ? (page - 1) * 20 + 1 : 0}</span> to{" "}
                <span className="font-semibold text-foreground">{Math.min(page * 20, totalCount)}</span> of{" "}
                <span className="font-semibold text-foreground">{totalCount}</span> registered users
              </p>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1 || loading}
                  className="h-8 gap-1 text-xs"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                  <span>Previous</span>
                </Button>

                <div className="text-xs font-semibold px-2">
                  Page {page} of {totalPages}
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages || loading}
                  className="h-8 gap-1 text-xs"
                >
                  <span>Next</span>
                  <ChevronRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* User Profile Detail Dialog */}
      <Dialog open={Boolean(selectedUser)} onOpenChange={(open) => !open && setSelectedUser(null)}>
        <DialogContent className="max-w-xl rounded-2xl border border-border/80 bg-background/95 p-6 shadow-2xl backdrop-blur-xl">
          {selectedUser && (
            <>
              <DialogHeader>
                <DialogTitle className="text-xl font-bold">Website User Profile</DialogTitle>
                <DialogDescription>
                  Complete profile detail registered on the Drawn Dimension platform.
                </DialogDescription>
              </DialogHeader>

              <div className="mt-4 space-y-6">
                {/* User Header */}
                <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 p-4 rounded-xl border border-border/60 bg-muted/30">
                  <Avatar className="h-20 w-20 border-2 border-primary/20 shadow-md">
                    <AvatarImage src={resolveCmsMediaUrl(selectedUser.avatar_url)} alt={selectedUser.full_name} />
                    <AvatarFallback className="bg-primary/10 text-primary text-xl font-bold">
                      {getInitials(selectedUser.full_name, selectedUser.email)}
                    </AvatarFallback>
                  </Avatar>

                  <div className="flex-1 text-center sm:text-left space-y-1 min-w-0">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <h3 className="text-lg font-bold text-foreground truncate">
                        {selectedUser.full_name || selectedUser.email}
                      </h3>
                      {selectedUser.is_active ? (
                        <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 self-center sm:self-auto">
                          Active Account
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="self-center sm:self-auto">
                          Inactive Account
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm font-mono text-muted-foreground flex items-center justify-center sm:justify-start gap-1.5">
                      <Mail className="h-3.5 w-3.5 text-muted-foreground/70" />
                      <span>{selectedUser.email}</span>
                    </p>
                    {selectedUser.job_role && (
                      <p className="text-xs font-medium text-primary flex items-center justify-center sm:justify-start gap-1.5 pt-0.5">
                        <Briefcase className="h-3.5 w-3.5" />
                        <span>{selectedUser.job_role}</span>
                      </p>
                    )}
                  </div>
                </div>

                {/* Grid details */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1 p-3 rounded-lg border border-border/40 bg-card/50">
                    <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                      <Calendar className="h-3.5 w-3.5 text-primary" />
                      Signup Date & Time
                    </span>
                    <p className="text-sm font-medium text-foreground">{formatDate(selectedUser.created_at)}</p>
                  </div>

                  <div className="space-y-1 p-3 rounded-lg border border-border/40 bg-card/50">
                    <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5 text-primary" />
                      Last Login
                    </span>
                    <p className="text-sm font-medium text-foreground">{formatDate(selectedUser.last_login_at)}</p>
                  </div>

                  <div className="space-y-1 p-3 rounded-lg border border-border/40 bg-card/50">
                    <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                      <Building className="h-3.5 w-3.5 text-primary" />
                      Company
                    </span>
                    <p className="text-sm font-medium text-foreground">
                      {selectedUser.company || <span className="text-muted-foreground/60 italic">Not specified</span>}
                    </p>
                  </div>

                  <div className="space-y-1 p-3 rounded-lg border border-border/40 bg-card/50">
                    <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                      <Phone className="h-3.5 w-3.5 text-primary" />
                      Phone Number
                    </span>
                    <p className="text-sm font-medium text-foreground">
                      {selectedUser.phone || <span className="text-muted-foreground/60 italic">Not specified</span>}
                    </p>
                  </div>

                  <div className="space-y-1 p-3 rounded-lg border border-border/40 bg-card/50 sm:col-span-2">
                    <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                      <Briefcase className="h-3.5 w-3.5 text-primary" />
                      Job Role
                    </span>
                    <p className="text-sm font-medium text-foreground">
                      {selectedUser.job_role || <span className="text-muted-foreground/60 italic">Not specified</span>}
                    </p>
                  </div>

                  <div className="space-y-1 p-3 rounded-lg border border-border/40 bg-card/50 sm:col-span-2">
                    <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                      <Info className="h-3.5 w-3.5 text-primary" />
                      Bio
                    </span>
                    <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
                      {selectedUser.bio || <span className="text-muted-foreground/60 italic">No bio available</span>}
                    </p>
                  </div>
                </div>

                <div className="pt-2 flex justify-end">
                  <Button variant="outline" onClick={() => setSelectedUser(null)}>
                    Close
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default WebsiteUsersManager;
