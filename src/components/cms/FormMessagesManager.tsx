import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Mail, Search, Eye, Archive, Trash2, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { getAdminToken, getApiBaseUrl } from "@/components/admin/adminAuth";

type MessageStatus = "unread" | "read" | "archived" | "all";

interface FormMessageItem {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  service: string;
  details: string;
  source_page: string | null;
  status: "unread" | "read" | "archived";
  created_at: string;
}

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

const getStatusBadgeClass = (status: FormMessageItem["status"]) => {
  if (status === "unread") return "bg-blue-500/15 text-blue-600 border-blue-500/30";
  if (status === "read") return "bg-emerald-500/15 text-emerald-600 border-emerald-500/30";
  return "bg-amber-500/15 text-amber-600 border-amber-500/30";
};

const shortText = (value: string, maxLength = 130) => {
  const text = String(value ?? "").trim();
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength)}...`;
};

const FormMessagesManager = () => {
  const [messages, setMessages] = useState<FormMessageItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<MessageStatus>("unread");
  const [search, setSearch] = useState("");
  const apiBase = getApiBaseUrl();

  const fetchMessages = async (status: MessageStatus) => {
    const token = getAdminToken();
    if (!token) {
      toast.error("Session expired. Please login again.");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${apiBase}/form-messages?status=${status}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const message = await readErrorMessage(response, "Failed to fetch form messages");
        throw new Error(message);
      }

      const data = await response.json();
      setMessages(Array.isArray(data) ? data : []);
    } catch (error: any) {
      console.error(error);
      toast.error(error?.message || "Failed to load form messages");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMessages(activeTab);
  }, [activeTab]);

  const updateStatus = async (id: string, status: "unread" | "read" | "archived") => {
    const token = getAdminToken();
    if (!token) {
      toast.error("Session expired. Please login again.");
      return;
    }

    try {
      const response = await fetch(`${apiBase}/form-messages/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status }),
      });

      if (!response.ok) {
        const message = await readErrorMessage(response, "Failed to update message");
        throw new Error(message);
      }

      toast.success(`Message marked as ${status}`);
      fetchMessages(activeTab);
    } catch (error: any) {
      console.error(error);
      toast.error(error?.message || "Failed to update message");
    }
  };

  const deleteMessage = async (id: string) => {
    const token = getAdminToken();
    if (!token) {
      toast.error("Session expired. Please login again.");
      return;
    }

    if (!confirm("Delete this form message permanently?")) return;

    try {
      const response = await fetch(`${apiBase}/form-messages/${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const message = await readErrorMessage(response, "Failed to delete message");
        throw new Error(message);
      }

      toast.success("Message deleted");
      fetchMessages(activeTab);
    } catch (error: any) {
      console.error(error);
      toast.error(error?.message || "Failed to delete message");
    }
  };

  const filteredMessages = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return messages;

    return messages.filter((item) => {
      const haystack = [
        item.first_name,
        item.last_name,
        item.email,
        item.phone ?? "",
        item.service,
        item.details,
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(query);
    });
  }, [messages, search]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Form Massage</h2>
          <p className="text-muted-foreground">Messages submitted from the website contact form.</p>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <Tabs
          value={activeTab}
          onValueChange={(value) => setActiveTab(value as MessageStatus)}
          className="w-[560px]"
        >
          <TabsList>
            <TabsTrigger value="unread" className="gap-2">
              <Mail className="w-4 h-4" /> Unread
            </TabsTrigger>
            <TabsTrigger value="read" className="gap-2">
              <Eye className="w-4 h-4" /> Read
            </TabsTrigger>
            <TabsTrigger value="archived" className="gap-2">
              <Archive className="w-4 h-4" /> Archived
            </TabsTrigger>
            <TabsTrigger value="all" className="gap-2">
              All
            </TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="relative flex-1 max-w-sm ml-auto">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="pl-8"
            placeholder="Search messages..."
          />
        </div>
      </div>

      <div className="rounded-xl border border-border/50 bg-card/50 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Sender</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead>Service</TableHead>
              <TableHead>Details</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Submitted</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-10 text-muted-foreground">
                  Loading form messages...
                </TableCell>
              </TableRow>
            ) : filteredMessages.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-10 text-muted-foreground">
                  No form messages found.
                </TableCell>
              </TableRow>
            ) : (
              filteredMessages.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">
                    {item.first_name} {item.last_name}
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <p className="text-sm">{item.email}</p>
                      <p className="text-xs text-muted-foreground">{item.phone || "-"}</p>
                    </div>
                  </TableCell>
                  <TableCell>{item.service}</TableCell>
                  <TableCell className="max-w-[340px]">
                    <p title={item.details}>{shortText(item.details)}</p>
                  </TableCell>
                  <TableCell>
                    <Badge className={getStatusBadgeClass(item.status)}>{item.status}</Badge>
                  </TableCell>
                  <TableCell>
                    {item.created_at ? new Date(item.created_at).toLocaleString() : "-"}
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-2">
                      {item.status !== "read" && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => updateStatus(item.id, "read")}
                        >
                          Mark Read
                        </Button>
                      )}
                      {item.status !== "archived" ? (
                        <Button
                          size="icon"
                          variant="outline"
                          onClick={() => updateStatus(item.id, "archived")}
                        >
                          <Archive className="w-4 h-4" />
                        </Button>
                      ) : (
                        <Button
                          size="icon"
                          variant="outline"
                          onClick={() => updateStatus(item.id, "unread")}
                        >
                          <RotateCcw className="w-4 h-4" />
                        </Button>
                      )}
                      <Button
                        size="icon"
                        variant="destructive"
                        onClick={() => deleteMessage(item.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default FormMessagesManager;

