import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Search, Users, Archive, Edit, Trash2, RotateCcw, Copy, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { getAdminToken, getApiBaseUrl } from "@/components/admin/adminAuth";
import EmployeeForm, { EmployeeItem } from "./EmployeeForm";

const readErrorMessage = async (response: Response, fallback: string) => {
  const contentType = response.headers.get("content-type") || "";

  if (contentType.includes("application/json")) {
    const body = await response.json().catch(() => null);
    if (body?.message) {
      const message = String(body.message);
      if (message.includes("public.employees") || message.includes("Could not find the table")) {
        return "Employees table missing in database. Please run Supabase migration first.";
      }
      return message;
    }
  }

  const text = await response.text().catch(() => "");
  if (text) return text;
  return fallback;
};

const buildEmployeeDashboardLink = (email: string) => {
  const origin = window.location.origin.replace(/\/$/, "");
  const params = new URLSearchParams({
    email,
    next: "/employee/dashboard",
  });
  return `${origin}/auth?${params.toString()}`;
};

const EmployeesManager = () => {
  const [employees, setEmployees] = useState<EmployeeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"live" | "draft">("live");
  const [search, setSearch] = useState("");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<EmployeeItem | null>(null);

  const apiBase = getApiBaseUrl();

  const fetchEmployees = async () => {
    const token = getAdminToken();
    if (!token) {
      toast.error("Session expired. Please login again.");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${apiBase}/employees?status=${activeTab}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const message = await readErrorMessage(response, "Failed to fetch employees");
        throw new Error(message);
      }

      const data = await response.json();
      setEmployees(Array.isArray(data) ? data : []);
    } catch (error: any) {
      console.error(error);
      toast.error(error?.message || "Failed to load employees");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployees();
  }, [activeTab]);

  const handleDelete = async (employee: EmployeeItem, hardDelete: boolean) => {
    const token = getAdminToken();
    if (!token) {
      toast.error("Session expired. Please login again.");
      return;
    }

    const confirmMessage = hardDelete
      ? "Permanently delete this employee?"
      : "Move this employee to Drafts?";

    if (!confirm(confirmMessage)) return;

    try {
      const response = await fetch(`${apiBase}/employees/${employee.id}`, {
        method: hardDelete ? "DELETE" : "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: hardDelete ? undefined : JSON.stringify({ status: "draft" }),
      });

      if (!response.ok) {
        const message = await readErrorMessage(response, "Operation failed");
        throw new Error(message);
      }

      toast.success(hardDelete ? "Employee deleted" : "Employee moved to drafts");
      fetchEmployees();
    } catch (error: any) {
      console.error(error);
      toast.error(error?.message || "Operation failed");
    }
  };

  const handleRestore = async (employeeId: string) => {
    const token = getAdminToken();
    if (!token) {
      toast.error("Session expired. Please login again.");
      return;
    }

    try {
      const response = await fetch(`${apiBase}/employees/${employeeId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: "live" }),
      });

      if (!response.ok) {
        const message = await readErrorMessage(response, "Failed to restore");
        throw new Error(message);
      }

      toast.success("Employee restored to live");
      fetchEmployees();
    } catch (error: any) {
      console.error(error);
      toast.error(error?.message || "Restore failed");
    }
  };

  const handleCopyDashboardLink = async (employeeEmail: string) => {
    const link = buildEmployeeDashboardLink(employeeEmail);

    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(link);
      } else {
        const input = document.createElement("input");
        input.value = link;
        document.body.appendChild(input);
        input.select();
        document.execCommand("copy");
        document.body.removeChild(input);
      }

      toast.success("Dashboard link copied");
    } catch (error) {
      toast.error("Failed to copy link");
    }
  };

  const filteredEmployees = employees.filter((employee) => {
    const target = `${employee.name} ${employee.profession} ${employee.email} ${employee.mobile ?? ""}`.toLowerCase();
    return target.includes(search.toLowerCase());
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Employee</h2>
          <p className="text-muted-foreground">Manage employee profiles.</p>
        </div>
        <Button
          onClick={() => {
            setEditingEmployee(null);
            setIsFormOpen(true);
          }}
          className="gap-2"
        >
          <Plus className="w-4 h-4" /> Add Employee
        </Button>
      </div>

      <div className="flex items-center gap-4">
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as "live" | "draft")} className="w-[360px]">
          <TabsList>
            <TabsTrigger value="live" className="gap-2"><Users className="w-4 h-4" /> Live</TabsTrigger>
            <TabsTrigger value="draft" className="gap-2"><Archive className="w-4 h-4" /> Drafts</TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="relative flex-1 max-w-sm ml-auto">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="pl-8"
            placeholder="Search employee..."
          />
        </div>
      </div>

      <div className="rounded-xl border border-border/50 bg-card/50 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Profession</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Mobile</TableHead>
              <TableHead>Dashboard Link</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-10 text-muted-foreground">
                  Loading employees...
                </TableCell>
              </TableRow>
            ) : filteredEmployees.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-10 text-muted-foreground">
                  No employees found in {activeTab}.
                </TableCell>
              </TableRow>
            ) : (
              filteredEmployees.map((employee) => (
                <TableRow key={employee.id}>
                  <TableCell className="font-medium">{employee.name}</TableCell>
                  <TableCell>{employee.profession}</TableCell>
                  <TableCell>{employee.email}</TableCell>
                  <TableCell>{employee.mobile || "-"}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <a
                        href={buildEmployeeDashboardLink(employee.email)}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs text-primary hover:underline truncate max-w-[230px]"
                        title={buildEmployeeDashboardLink(employee.email)}
                      >
                        {buildEmployeeDashboardLink(employee.email)}
                      </a>
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8"
                        onClick={() => window.open(buildEmployeeDashboardLink(employee.email), "_blank", "noopener,noreferrer")}
                        title="Open dashboard link"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </Button>
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8"
                        onClick={() => handleCopyDashboardLink(employee.email)}
                        title="Copy dashboard link"
                      >
                        <Copy className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-2">
                      <Button
                        size="icon"
                        variant="outline"
                        onClick={() => {
                          setEditingEmployee(employee);
                          setIsFormOpen(true);
                        }}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>

                      {activeTab === "draft" ? (
                        <>
                          <Button
                            size="icon"
                            className="bg-green-600 hover:bg-green-700"
                            onClick={() => handleRestore(employee.id)}
                          >
                            <RotateCcw className="w-4 h-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="destructive"
                            onClick={() => handleDelete(employee, true)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </>
                      ) : (
                        <Button
                          size="icon"
                          variant="destructive"
                          onClick={() => handleDelete(employee, false)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <EmployeeForm
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        employee={editingEmployee}
        onSuccess={() => {
          fetchEmployees();
        }}
      />
    </div>
  );
};

export default EmployeesManager;
