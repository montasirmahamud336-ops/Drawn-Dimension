import { FormEvent, useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { Archive, BriefcaseBusiness, Edit, Eye, Loader2, Plus, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { clearAdminToken, getAdminToken, getApiBaseUrl } from "@/components/admin/adminAuth";

type ProjectStatus = "pending" | "in-progress" | "completed";

export type TracerProject = {
  id: string;
  name: string;
  order_number: string | null;
  date: string;
  client_name: string;
  amount: number | string | null;
  status: ProjectStatus;
  description: string | null;
  created_at?: string;
  updated_at?: string;
};

type ProjectDraft = {
  name: string;
  order_number: string;
  date: string;
  client_name: string;
  amount: string;
  status: ProjectStatus;
  description: string;
};

type ProjectAssignment = {
  id: string;
  employee_name: string;
  employee_display_name?: string | null;
  work_title: string;
  work_details: string | null;
  created_at?: string;
  revision_due_at?: string | null;
  status: string;
  employee?: {
    name?: string | null;
    email?: string | null;
    profession?: string | null;
  } | null;
};

const STATUS_OPTIONS: Array<{ value: ProjectStatus; label: string }> = [
  { value: "pending", label: "Pending" },
  { value: "in-progress", label: "In Progress" },
  { value: "completed", label: "Completed" },
];

const todayInputValue = () => new Date().toISOString().slice(0, 10);

const createEmptyDraft = (): ProjectDraft => ({
  name: "",
  order_number: "",
  date: todayInputValue(),
  client_name: "",
  amount: "",
  status: "pending",
  description: "",
});

const handleAdminUnauthorized = () => {
  clearAdminToken();
  toast.error("Session expired. Please login again.");
  window.location.replace("/database/login?switch=1");
};

const readErrorMessage = async (response: Response, fallback: string) => {
  const contentType = response.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    const body = await response.json().catch(() => null);
    if (body?.message) return String(body.message);
  }

  const text = await response.text().catch(() => "");
  return text || fallback;
};

const parseAmount = (value: unknown): number | null => {
  const raw = String(value ?? "").trim().replace(/,/g, "");
  if (!raw) return null;
  const numeric = Number(raw);
  if (!Number.isFinite(numeric) || numeric < 0) return null;
  return numeric;
};

const formatAmount = (value: unknown) => {
  const amount = parseAmount(value);
  if (amount === null) return "-";
  return `BDT ${new Intl.NumberFormat("en-BD", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)}`;
};

const formatDate = (value: string | null | undefined) => {
  if (!value) return "-";
  const date = new Date(`${String(value).slice(0, 10)}T00:00:00`);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("en-BD", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

const formatDateTime = (value: string | null | undefined) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString();
};

const getStatusClass = (status: ProjectStatus | string) => {
  if (status === "completed") return "bg-emerald-500/15 text-emerald-600 border-emerald-500/30";
  if (status === "in-progress") return "bg-blue-500/15 text-blue-600 border-blue-500/30";
  return "bg-amber-500/15 text-amber-600 border-amber-500/30";
};

const statusLabel = (status: ProjectStatus | string) =>
  STATUS_OPTIONS.find((option) => option.value === status)?.label ?? "Pending";

const projectToDraft = (project: TracerProject): ProjectDraft => ({
  name: project.name ?? "",
  order_number: project.order_number ?? "",
  date: String(project.date ?? "").slice(0, 10) || todayInputValue(),
  client_name: project.client_name ?? "",
  amount: project.amount === null || project.amount === undefined ? "" : String(project.amount),
  status: project.status ?? "pending",
  description: project.description ?? "",
});

const ProjectsManager = () => {
  const [projects, setProjects] = useState<TracerProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<TracerProject | null>(null);
  const [draft, setDraft] = useState<ProjectDraft>(() => createEmptyDraft());
  const [saving, setSaving] = useState(false);
  const [assignmentProject, setAssignmentProject] = useState<TracerProject | null>(null);
  const [assignments, setAssignments] = useState<ProjectAssignment[]>([]);
  const [assignmentsLoading, setAssignmentsLoading] = useState(false);

  const apiBase = getApiBaseUrl();

  const fetchProjects = async () => {
    const token = getAdminToken();
    if (!token) {
      toast.error("Session expired. Please login again.");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${apiBase}/tracer-projects`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.status === 401) {
        handleAdminUnauthorized();
        return;
      }

      if (!response.ok) {
        throw new Error(await readErrorMessage(response, "Failed to load projects"));
      }

      const data = await response.json();
      setProjects(Array.isArray(data) ? data : []);
    } catch (error: any) {
      console.error(error);
      toast.error(error?.message || "Failed to load projects");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchProjects();
  }, []);

  const filteredProjects = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return projects;

    return projects.filter((project) => {
      const target = [
        project.name,
        project.order_number,
        project.client_name,
        project.amount,
        project.status,
        project.description,
      ].filter(Boolean).join(" ").toLowerCase();
      return target.includes(query);
    });
  }, [projects, search]);

  const openCreate = () => {
    setEditingProject(null);
    setDraft(createEmptyDraft());
    setIsFormOpen(true);
  };

  const openEdit = (project: TracerProject) => {
    setEditingProject(project);
    setDraft(projectToDraft(project));
    setIsFormOpen(true);
  };

  const saveProject = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!draft.name.trim() || !draft.client_name.trim() || !draft.date) {
      toast.error("Name, date, and client are required");
      return;
    }

    const amount = parseAmount(draft.amount);
    if (draft.amount.trim() && amount === null) {
      toast.error("Enter a valid amount");
      return;
    }

    const token = getAdminToken();
    if (!token) {
      toast.error("Session expired. Please login again.");
      return;
    }

    setSaving(true);
    try {
      const url = editingProject
        ? `${apiBase}/tracer-projects/${editingProject.id}`
        : `${apiBase}/tracer-projects`;
      const method = editingProject ? "PUT" : "POST";
      const payload = {
        name: draft.name.trim(),
        order_number: draft.order_number.trim() || null,
        date: draft.date,
        client_name: draft.client_name.trim(),
        amount,
        status: draft.status,
        description: draft.description.trim() || null,
      };

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (response.status === 401) {
        handleAdminUnauthorized();
        return;
      }

      if (!response.ok) {
        throw new Error(await readErrorMessage(response, "Failed to save project"));
      }

      toast.success(editingProject ? "Project updated" : "Project created");
      setIsFormOpen(false);
      await fetchProjects();
    } catch (error: any) {
      console.error(error);
      toast.error(error?.message || "Failed to save project");
    } finally {
      setSaving(false);
    }
  };

  const deleteProject = async (project: TracerProject) => {
    if (!confirm(`Delete project "${project.name}"? Linked assignments will keep their history but lose this project link.`)) {
      return;
    }

    const token = getAdminToken();
    if (!token) {
      toast.error("Session expired. Please login again.");
      return;
    }

    try {
      const response = await fetch(`${apiBase}/tracer-projects/${project.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.status === 401) {
        handleAdminUnauthorized();
        return;
      }

      if (!response.ok) {
        throw new Error(await readErrorMessage(response, "Failed to delete project"));
      }

      toast.success("Project deleted");
      await fetchProjects();
    } catch (error: any) {
      console.error(error);
      toast.error(error?.message || "Delete failed");
    }
  };

  const openAssignments = async (project: TracerProject) => {
    const token = getAdminToken();
    if (!token) {
      toast.error("Session expired. Please login again.");
      return;
    }

    setAssignmentProject(project);
    setAssignments([]);
    setAssignmentsLoading(true);

    try {
      const response = await fetch(`${apiBase}/tracer-projects/${project.id}/assignments`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.status === 401) {
        handleAdminUnauthorized();
        return;
      }

      if (!response.ok) {
        throw new Error(await readErrorMessage(response, "Failed to load assignments"));
      }

      const data = await response.json();
      setAssignments(Array.isArray(data) ? data : []);
    } catch (error: any) {
      console.error(error);
      toast.error(error?.message || "Failed to load assignments");
    } finally {
      setAssignmentsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Projects</h2>
          <p className="text-muted-foreground">Track client projects and connect them to employee assignments.</p>
        </div>
        <Button onClick={openCreate} className="gap-2">
          <Plus className="w-4 h-4" /> Add Project
        </Button>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="pl-8"
            placeholder="Search projects..."
          />
        </div>
      </div>

      <div className="rounded-xl border border-border/50 bg-card/50 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Order No.</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Client</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Project</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-10 text-muted-foreground">
                  Loading projects...
                </TableCell>
              </TableRow>
            ) : filteredProjects.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                  <Archive className="mx-auto mb-3 h-8 w-8 opacity-30" />
                  No projects found.
                </TableCell>
              </TableRow>
            ) : (
              filteredProjects.map((project) => (
                <TableRow key={project.id}>
                  <TableCell className="font-mono text-xs sm:text-sm">
                    {project.order_number || "-"}
                  </TableCell>
                  <TableCell>{formatDate(project.date)}</TableCell>
                  <TableCell className="font-medium">{project.client_name}</TableCell>
                  <TableCell>{formatAmount(project.amount)}</TableCell>
                  <TableCell>
                    <Badge className={getStatusClass(project.status)}>
                      {statusLabel(project.status)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="max-w-[260px]">
                      <p className="font-medium truncate">{project.name}</p>
                      {project.description ? (
                        <p className="text-xs text-muted-foreground line-clamp-1">{project.description}</p>
                      ) : null}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-2">
                      <Button size="sm" variant="outline" className="gap-2" onClick={() => void openAssignments(project)}>
                        <Eye className="h-4 w-4" />
                        Assignments
                      </Button>
                      <Button size="icon" variant="outline" onClick={() => openEdit(project)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button size="icon" variant="destructive" onClick={() => void deleteProject(project)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="sm:max-w-[680px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingProject ? "Edit Project" : "Add Project"}</DialogTitle>
          </DialogHeader>

          <form onSubmit={saveProject} className="space-y-5 mt-2">
            <div className="grid gap-2">
              <Label htmlFor="project-name">Name</Label>
              <Input
                id="project-name"
                value={draft.name}
                onChange={(event) => setDraft((prev) => ({ ...prev, name: event.target.value }))}
                placeholder="Website redesign"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="project-order">Order Number</Label>
                <Input
                  id="project-order"
                  value={draft.order_number}
                  onChange={(event) => setDraft((prev) => ({ ...prev, order_number: event.target.value }))}
                  placeholder="PRJ-001"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="project-date">Date</Label>
                <Input
                  id="project-date"
                  type="date"
                  value={draft.date}
                  onChange={(event) => setDraft((prev) => ({ ...prev, date: event.target.value }))}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="grid gap-2 md:col-span-1">
                <Label htmlFor="project-client">Client Name</Label>
                <Input
                  id="project-client"
                  value={draft.client_name}
                  onChange={(event) => setDraft((prev) => ({ ...prev, client_name: event.target.value }))}
                  placeholder="Client name"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="project-amount">Amount</Label>
                <Input
                  id="project-amount"
                  type="number"
                  min="0"
                  step="0.01"
                  inputMode="decimal"
                  value={draft.amount}
                  onChange={(event) => setDraft((prev) => ({ ...prev, amount: event.target.value }))}
                  placeholder="15000"
                />
              </div>
              <div className="grid gap-2">
                <Label>Status</Label>
                <Select
                  value={draft.status}
                  onValueChange={(value: ProjectStatus) => setDraft((prev) => ({ ...prev, status: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="project-description">Description</Label>
              <Textarea
                id="project-description"
                rows={4}
                value={draft.description}
                onChange={(event) => setDraft((prev) => ({ ...prev, description: event.target.value }))}
                placeholder="Optional project notes"
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsFormOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                {editingProject ? "Save Changes" : "Create Project"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(assignmentProject)} onOpenChange={(open) => !open && setAssignmentProject(null)}>
        <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BriefcaseBusiness className="h-5 w-5" />
              {assignmentProject?.name ?? "Project"} Assignments
            </DialogTitle>
          </DialogHeader>

          <div className="rounded-xl border border-border/50 bg-background/40 overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Work</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Details</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {assignmentsLoading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="py-10 text-center text-muted-foreground">
                      Loading assignments...
                    </TableCell>
                  </TableRow>
                ) : assignments.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="py-10 text-center text-muted-foreground">
                      No assignments linked to this project yet.
                    </TableCell>
                  </TableRow>
                ) : (
                  assignments.map((assignment) => (
                    <TableRow key={assignment.id}>
                      <TableCell>
                        <p className="font-medium">
                          {assignment.employee?.name || assignment.employee_display_name || assignment.employee_name}
                        </p>
                        {assignment.employee?.profession ? (
                          <p className="text-xs text-muted-foreground">{assignment.employee.profession}</p>
                        ) : null}
                      </TableCell>
                      <TableCell>
                        <p>{formatDateTime(assignment.created_at)}</p>
                        {assignment.revision_due_at ? (
                          <p className="text-xs text-muted-foreground">Revision: {formatDateTime(assignment.revision_due_at)}</p>
                        ) : null}
                      </TableCell>
                      <TableCell>{assignment.work_title}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{assignment.status}</Badge>
                      </TableCell>
                      <TableCell className="max-w-[280px]">
                        <p className="line-clamp-2 text-sm text-muted-foreground">
                          {assignment.work_details || "-"}
                        </p>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ProjectsManager;
