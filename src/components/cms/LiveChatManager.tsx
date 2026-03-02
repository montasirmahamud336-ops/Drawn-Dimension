import { ChangeEvent, FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  MessageCircleMore,
  Search,
  CircleCheck,
  Archive,
  Trash2,
  RotateCcw,
  Loader2,
  Paperclip,
  Send,
  RefreshCcw,
  Plus,
} from "lucide-react";
import { toast } from "sonner";
import { getAdminToken, getApiBaseUrl } from "@/components/admin/adminAuth";

type LiveChatStatus = "open" | "contacted" | "closed" | "all";

interface LiveChatRequestItem {
  id: string;
  user_id: string | null;
  user_name: string | null;
  user_email: string;
  first_message: string;
  page_path: string | null;
  status: "open" | "contacted" | "closed";
  created_at: string;
}

interface LiveChatMessageItem {
  id: string;
  request_id: string;
  sender_type: "user" | "admin";
  sender_label: string | null;
  message_text: string | null;
  attachment_url: string | null;
  attachment_name: string | null;
  attachment_mime: string | null;
  attachment_size: number | null;
  created_at: string;
}

interface LiveChatMessagesResponse {
  request: LiveChatRequestItem;
  messages: LiveChatMessageItem[];
  ai_mode_active?: boolean;
}

interface LiveChatAttachment {
  url: string;
  name: string;
  mime: string;
  size: number;
}

interface CreateRequestFormState {
  userName: string;
  userEmail: string;
  firstMessage: string;
  pagePath: string;
}

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

const getStatusBadgeClass = (status: LiveChatRequestItem["status"]) => {
  if (status === "open") return "bg-blue-500/15 text-blue-600 border-blue-500/30";
  if (status === "contacted") return "bg-emerald-500/15 text-emerald-600 border-emerald-500/30";
  return "bg-amber-500/15 text-amber-600 border-amber-500/30";
};

const shortText = (value: string, maxLength = 120) => {
  const text = String(value ?? "").trim();
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength)}...`;
};

const normalizeSenderLabel = (value: unknown) => String(value ?? "").trim().toLowerCase();
const isAiSenderLabel = (value: unknown) => {
  const label = normalizeSenderLabel(value);
  return label.includes("nemo ai") || label.includes("ai assistant");
};

const extractExtension = (fileName: string) => {
  const ext = fileName.split(".").pop() || "";
  return ext.trim().toLowerCase();
};

const allowedAttachmentExtensions = new Set([
  "pdf",
  "xlsx",
  "xls",
  "docx",
  "jpg",
  "jpeg",
  "png",
  "webp",
  "gif",
]);

const isAllowedAttachment = (fileName: string) => {
  const ext = extractExtension(fileName);
  return allowedAttachmentExtensions.has(ext);
};

const initialCreateFormState: CreateRequestFormState = {
  userName: "",
  userEmail: "",
  firstMessage: "",
  pagePath: "/",
};

const LiveChatManager = () => {
  const [requests, setRequests] = useState<LiveChatRequestItem[]>([]);
  const [loadingRequests, setLoadingRequests] = useState(true);
  const [activeTab, setActiveTab] = useState<LiveChatStatus>("open");
  const [search, setSearch] = useState("");

  const [selectedRequestId, setSelectedRequestId] = useState("");
  const [messages, setMessages] = useState<LiveChatMessageItem[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);

  const [draftMessage, setDraftMessage] = useState("");
  const [sendingMessage, setSendingMessage] = useState(false);
  const [uploadingAttachment, setUploadingAttachment] = useState(false);
  const [attachment, setAttachment] = useState<LiveChatAttachment | null>(null);

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [createForm, setCreateForm] = useState<CreateRequestFormState>(initialCreateFormState);
  const [creatingRequest, setCreatingRequest] = useState(false);

  const [refreshTick, setRefreshTick] = useState(0);

  const attachmentInputRef = useRef<HTMLInputElement | null>(null);
  const messagesContainerRef = useRef<HTMLDivElement | null>(null);
  const lastMessageIdRef = useRef("");
  const apiBase = getApiBaseUrl();

  const ensureToken = () => {
    const token = getAdminToken();
    if (!token) {
      toast.error("Session expired. Please login again.");
      return "";
    }
    return token;
  };

  const fetchRequests = async (status: LiveChatStatus, silent = false) => {
    const token = ensureToken();
    if (!token) return;

    if (!silent) setLoadingRequests(true);
    try {
      const response = await fetch(`${apiBase}/live-chat/requests?status=${status}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const message = await readErrorMessage(response, "Failed to fetch live chat requests");
        throw new Error(message);
      }

      const data = await response.json();
      const nextRequests = Array.isArray(data) ? (data as LiveChatRequestItem[]) : [];
      setRequests(nextRequests);

      if (selectedRequestId) {
        const exists = nextRequests.some((item) => item.id === selectedRequestId);
        if (!exists) {
          setSelectedRequestId("");
          setMessages([]);
          setDraftMessage("");
          setAttachment(null);
        }
      }
    } catch (error: any) {
      console.error(error);
      if (!silent) {
        toast.error(error?.message || "Failed to load live chat requests");
      }
    } finally {
      if (!silent) setLoadingRequests(false);
    }
  };

  const fetchMessages = async (requestId: string, silent = false) => {
    if (!requestId) {
      setMessages([]);
      return;
    }

    const token = ensureToken();
    if (!token) return;

    if (!silent) setLoadingMessages(true);
    try {
      const response = await fetch(`${apiBase}/live-chat/requests/${requestId}/messages?limit=600`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const message = await readErrorMessage(response, "Failed to fetch live chat messages");
        throw new Error(message);
      }

      const payload = (await response.json()) as LiveChatMessagesResponse;
      setMessages(Array.isArray(payload?.messages) ? payload.messages : []);
      if (payload?.request) {
        setRequests((prev) => prev.map((item) => (item.id === payload.request.id ? payload.request : item)));
      }
    } catch (error: any) {
      console.error(error);
      if (!silent) {
        toast.error(error?.message || "Failed to load messages");
      }
    } finally {
      if (!silent) setLoadingMessages(false);
    }
  };

  useEffect(() => {
    void fetchRequests(activeTab);
  }, [activeTab, refreshTick]);

  useEffect(() => {
    if (!selectedRequestId) return;
    void fetchMessages(selectedRequestId);
  }, [selectedRequestId, refreshTick]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      void fetchRequests(activeTab, true);
      if (selectedRequestId) {
        void fetchMessages(selectedRequestId, true);
      }
    }, 7000);

    return () => window.clearInterval(timer);
  }, [activeTab, selectedRequestId]);

  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;

    const latestMessageId = messages[messages.length - 1]?.id ?? "";
    if (!latestMessageId) {
      lastMessageIdRef.current = "";
      return;
    }

    const hasNewMessage = latestMessageId !== lastMessageIdRef.current;
    const distanceFromBottom =
      container.scrollHeight - container.scrollTop - container.clientHeight;
    const isNearBottom = distanceFromBottom < 120;

    if (hasNewMessage || isNearBottom) {
      container.scrollTop = container.scrollHeight;
    }

    lastMessageIdRef.current = latestMessageId;
  }, [messages, selectedRequestId]);

  const updateStatus = async (id: string, status: "open" | "contacted" | "closed") => {
    const token = ensureToken();
    if (!token) return;

    try {
      const response = await fetch(`${apiBase}/live-chat/requests/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status }),
      });

      if (!response.ok) {
        const message = await readErrorMessage(response, "Failed to update request");
        throw new Error(message);
      }

      const updated = (await response.json()) as LiveChatRequestItem;
      setRequests((prev) => prev.map((item) => (item.id === id ? { ...item, ...updated } : item)));

      if (activeTab !== "all" && activeTab !== status) {
        void fetchRequests(activeTab, true);
      }

      toast.success(status === "contacted" ? "Live chat marked as contacted" : `Live chat marked as ${status}`);
    } catch (error: any) {
      console.error(error);
      toast.error(error?.message || "Failed to update live chat request");
    }
  };

  const deleteRequest = async (id: string) => {
    const token = ensureToken();
    if (!token) return;

    if (!confirm("Delete this live chat request permanently?")) return;

    try {
      const response = await fetch(`${apiBase}/live-chat/requests/${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const message = await readErrorMessage(response, "Failed to delete request");
        throw new Error(message);
      }

      setRequests((prev) => prev.filter((item) => item.id !== id));
      if (selectedRequestId === id) {
        setSelectedRequestId("");
        setMessages([]);
        setDraftMessage("");
        setAttachment(null);
      }

      toast.success("Live chat request deleted");
      void fetchRequests(activeTab, true);
    } catch (error: any) {
      console.error(error);
      toast.error(error?.message || "Failed to delete live chat request");
    }
  };

  const handleAttachmentUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    if (!selectedRequestId) {
      toast.error("Select a live chat first");
      return;
    }

    if (!isAllowedAttachment(file.name)) {
      toast.error("Only PDF, image, XLSX/XLS, and DOCX files are allowed.");
      return;
    }

    const maxSize = 15 * 1024 * 1024;
    if (file.size > maxSize) {
      toast.error("Please upload a file under 15MB.");
      return;
    }

    const token = ensureToken();
    if (!token) return;

    setUploadingAttachment(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("request_id", selectedRequestId);

      const response = await fetch(`${apiBase}/live-chat/admin/upload`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const message = await readErrorMessage(response, "Failed to upload attachment");
        throw new Error(message);
      }

      const payload = await response.json();
      setAttachment({
        url: String(payload?.publicUrl ?? ""),
        name: String(payload?.fileName ?? file.name),
        mime: String(payload?.mimeType ?? file.type ?? "application/octet-stream"),
        size: Number(payload?.size ?? file.size),
      });
      toast.success("Attachment uploaded");
    } catch (error: any) {
      console.error(error);
      toast.error(error?.message || "Failed to upload attachment");
    } finally {
      setUploadingAttachment(false);
    }
  };

  const handleSendMessage = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedRequestId) {
      toast.error("Select a live chat first");
      return;
    }

    const token = ensureToken();
    if (!token) return;

    const messageText = draftMessage.trim();
    if (!messageText && !attachment?.url) {
      toast.error("Write a message or attach a file");
      return;
    }

    setSendingMessage(true);
    try {
      const response = await fetch(`${apiBase}/live-chat/requests/${selectedRequestId}/messages`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          message_text: messageText || null,
          attachment_url: attachment?.url ?? null,
          attachment_name: attachment?.name ?? null,
          attachment_mime: attachment?.mime ?? null,
          attachment_size: attachment?.size ?? null,
        }),
      });

      if (!response.ok) {
        const message = await readErrorMessage(response, "Failed to send message");
        throw new Error(message);
      }

      setDraftMessage("");
      setAttachment(null);
      await fetchMessages(selectedRequestId, true);
      await fetchRequests(activeTab, true);
    } catch (error: any) {
      console.error(error);
      toast.error(error?.message || "Failed to send message");
    } finally {
      setSendingMessage(false);
    }
  };

  const handleCreateRequest = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const token = ensureToken();
    if (!token) return;

    const userName = createForm.userName.trim();
    const userEmail = createForm.userEmail.trim().toLowerCase();
    const firstMessage = createForm.firstMessage.trim();
    const pagePath = createForm.pagePath.trim() || "/";

    if (!userEmail || !firstMessage) {
      toast.error("Email and first message are required");
      return;
    }

    setCreatingRequest(true);
    try {
      const response = await fetch(`${apiBase}/live-chat/requests`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          userName,
          userEmail,
          firstMessage,
          pagePath,
          notify_admin: false,
        }),
      });

      if (!response.ok) {
        const message = await readErrorMessage(response, "Failed to create live chat request");
        throw new Error(message);
      }

      const created = (await response.json()) as LiveChatRequestItem;
      setShowCreateForm(false);
      setCreateForm(initialCreateFormState);

      if (activeTab !== "open" && activeTab !== "all") {
        setActiveTab("open");
      } else {
        await fetchRequests(activeTab, true);
      }

      toast.success("Live chat request added");
    } catch (error: any) {
      console.error(error);
      toast.error(error?.message || "Failed to add live chat request");
    } finally {
      setCreatingRequest(false);
    }
  };

  const filteredRequests = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return requests;

    return requests.filter((item) => {
      const haystack = [
        item.user_name ?? "",
        item.user_email,
        item.first_message,
        item.page_path ?? "",
        item.status,
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(query);
    });
  }, [requests, search]);

  const selectedRequest = useMemo(
    () => requests.find((item) => item.id === selectedRequestId) ?? null,
    [requests, selectedRequestId]
  );

  const aiModeActive = useMemo(() => {
    if (!selectedRequest) return true;
    return !messages.some((message) => message.sender_type === "admin" && !isAiSenderLabel(message.sender_label));
  }, [messages, selectedRequest]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Live Chat</h2>
          <p className="text-muted-foreground">Reply from CMS, and AI handles users until admin joins.</p>
        </div>

        <div className="flex items-center gap-2">
          <Button type="button" variant="outline" className="gap-2" onClick={() => setShowCreateForm((prev) => !prev)}>
            <Plus className="w-4 h-4" />
            Add Live Chat
          </Button>
          <Button type="button" variant="outline" className="gap-2" onClick={() => setRefreshTick((prev) => prev + 1)}>
            <RefreshCcw className="w-4 h-4" />
            Refresh
          </Button>
        </div>
      </div>

      {showCreateForm && (
        <Card className="glass-card border-border/60">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Add Live Chat Request</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreateRequest} className="space-y-3">
              <div className="grid sm:grid-cols-2 gap-3">
                <Input
                  value={createForm.userName}
                  onChange={(event) => setCreateForm((prev) => ({ ...prev, userName: event.target.value }))}
                  placeholder="Client name (optional)"
                />
                <Input
                  type="email"
                  value={createForm.userEmail}
                  onChange={(event) => setCreateForm((prev) => ({ ...prev, userEmail: event.target.value }))}
                  placeholder="Client email"
                  required
                />
              </div>

              <Input
                value={createForm.pagePath}
                onChange={(event) => setCreateForm((prev) => ({ ...prev, pagePath: event.target.value }))}
                placeholder="Page path (e.g. /contact)"
              />

              <Textarea
                rows={3}
                value={createForm.firstMessage}
                onChange={(event) => setCreateForm((prev) => ({ ...prev, firstMessage: event.target.value }))}
                placeholder="First message"
                required
              />

              <div className="flex items-center gap-2">
                <Button type="submit" disabled={creatingRequest}>
                  {creatingRequest ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
                  Create
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowCreateForm(false);
                    setCreateForm(initialCreateFormState);
                  }}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="flex flex-col lg:flex-row lg:items-center gap-4">
        <Tabs
          value={activeTab}
          onValueChange={(value) => setActiveTab(value as LiveChatStatus)}
          className="w-full lg:w-[560px]"
        >
          <TabsList>
            <TabsTrigger value="open" className="gap-2">
              <MessageCircleMore className="w-4 h-4" /> Open
            </TabsTrigger>
            <TabsTrigger value="contacted" className="gap-2">
              <CircleCheck className="w-4 h-4" /> Contacted
            </TabsTrigger>
            <TabsTrigger value="closed" className="gap-2">
              <Archive className="w-4 h-4" /> Closed
            </TabsTrigger>
            <TabsTrigger value="all" className="gap-2">
              All
            </TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="relative flex-1 lg:max-w-sm lg:ml-auto">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="pl-8"
            placeholder="Search live chats..."
          />
        </div>
      </div>

      <div className="grid lg:grid-cols-[360px_1fr] gap-4">
        <Card className="glass-card border-border/60 overflow-hidden">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Live Requests</CardTitle>
          </CardHeader>
          <CardContent className="pt-0 space-y-2 max-h-[72vh] overflow-y-auto">
            {loadingRequests ? (
              <div className="text-sm text-muted-foreground py-4">Loading live chats...</div>
            ) : filteredRequests.length === 0 ? (
              <div className="text-sm text-muted-foreground py-4">No live chat requests found.</div>
            ) : (
              filteredRequests.map((item) => {
                const isActive = item.id === selectedRequestId;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setSelectedRequestId(item.id);
                      setAttachment(null);
                    }}
                    className={`w-full text-left rounded-xl border px-3 py-3 transition-colors ${
                      isActive
                        ? "border-primary/40 bg-primary/10"
                        : "border-border/50 bg-background/40 hover:bg-background/60"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-medium truncate">{item.user_name || "Unknown user"}</p>
                      <Badge className={getStatusBadgeClass(item.status)}>{item.status}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground truncate mt-1">{item.user_email}</p>
                    <p className="text-[11px] text-muted-foreground mt-2">
                      {item.created_at ? new Date(item.created_at).toLocaleString() : "-"}
                    </p>
                  </button>
                );
              })
            )}
          </CardContent>
        </Card>

        <Card className="glass-card border-border/60 overflow-hidden">
          <CardHeader className="pb-3 border-b border-border/50">
            <CardTitle className="text-lg">
              {selectedRequest
                ? `${selectedRequest.user_name || "Unknown user"} (${selectedRequest.user_email})`
                : "Select a live chat"}
            </CardTitle>
            {selectedRequest && (
              <div className="flex flex-wrap items-center gap-2 pt-2">
                <Badge className={getStatusBadgeClass(selectedRequest.status)}>{selectedRequest.status}</Badge>
                <Badge variant="outline" className={aiModeActive ? "text-emerald-600 border-emerald-500/40" : ""}>
                  {aiModeActive ? "AI Active" : "Human Active"}
                </Badge>
                <span className="text-xs text-muted-foreground">Page: {selectedRequest.page_path || "/"}</span>
              </div>
            )}
          </CardHeader>

          <CardContent className="pt-4">
            {!selectedRequestId ? (
              <div className="text-sm text-muted-foreground py-10">Choose a live chat from the left panel.</div>
            ) : (
              <div className="space-y-4">
                {aiModeActive && selectedRequest?.status !== "closed" && (
                  <p className="text-xs text-emerald-700 dark:text-emerald-400">
                    AI assistant is currently handling this client. Send a reply to join as human support.
                  </p>
                )}

                <div className="flex flex-wrap items-center gap-2">
                  {selectedRequest?.status !== "contacted" && (
                    <Button size="sm" variant="outline" onClick={() => updateStatus(selectedRequestId, "contacted")}>
                      <CircleCheck className="w-4 h-4 mr-2" />
                      Done
                    </Button>
                  )}

                  {selectedRequest?.status !== "closed" ? (
                    <Button size="sm" variant="outline" onClick={() => updateStatus(selectedRequestId, "closed")}>
                      <Archive className="w-4 h-4 mr-2" />
                      Close
                    </Button>
                  ) : (
                    <Button size="sm" variant="outline" onClick={() => updateStatus(selectedRequestId, "open")}>
                      <RotateCcw className="w-4 h-4 mr-2" />
                      Re-open
                    </Button>
                  )}

                  <Button size="sm" variant="destructive" onClick={() => deleteRequest(selectedRequestId)}>
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete
                  </Button>
                </div>

                <div
                  ref={messagesContainerRef}
                  className="h-[50vh] overflow-y-auto rounded-xl border border-border/50 bg-background/40 p-3 space-y-3"
                >
                  {loadingMessages ? (
                    <div className="text-sm text-muted-foreground py-4">Loading messages...</div>
                  ) : messages.length === 0 ? (
                    <div className="text-sm text-muted-foreground py-4">No saved messages yet for this request.</div>
                  ) : (
                    messages.map((message) => {
                      const isClient = message.sender_type === "user";
                      const isAi = !isClient && isAiSenderLabel(message.sender_label);

                      return (
                        <div key={message.id} className={`flex ${isClient ? "justify-start" : "justify-end"}`}>
                          <div
                            className={`max-w-[80%] rounded-xl px-3 py-2 border ${
                              isClient
                                ? "bg-card/70 border-border/60"
                                : isAi
                                ? "bg-emerald-500/10 border-emerald-500/30"
                                : "bg-primary/15 border-primary/35"
                            }`}
                          >
                            {message.sender_label && (
                              <p className="text-[11px] text-muted-foreground mb-1">{message.sender_label}</p>
                            )}

                            {message.message_text && (
                              <p className="text-sm whitespace-pre-wrap break-words">{message.message_text}</p>
                            )}

                            {message.attachment_url && (
                              <a
                                href={message.attachment_url}
                                target="_blank"
                                rel="noreferrer"
                                className="text-xs text-primary hover:underline break-all inline-block mt-1"
                              >
                                {message.attachment_name || "Attachment"}
                              </a>
                            )}

                            <p className="text-[11px] text-muted-foreground mt-1">
                              {new Date(message.created_at).toLocaleString()}
                            </p>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                <form onSubmit={handleSendMessage} className="space-y-3">
                  <Textarea
                    rows={3}
                    value={draftMessage}
                    onChange={(event) => setDraftMessage(event.target.value)}
                    placeholder={
                      selectedRequest?.status === "closed"
                        ? "This chat is closed. Re-open to reply."
                        : "Type your reply..."
                    }
                    disabled={selectedRequest?.status === "closed"}
                  />

                  {attachment && (
                    <div className="text-xs text-muted-foreground">
                      Attached: <span className="font-medium">{attachment.name}</span>
                      <button type="button" className="ml-2 text-primary hover:underline" onClick={() => setAttachment(null)}>
                        Remove
                      </button>
                    </div>
                  )}

                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => attachmentInputRef.current?.click()}
                      disabled={uploadingAttachment || sendingMessage || selectedRequest?.status === "closed"}
                    >
                      {uploadingAttachment ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <Paperclip className="w-4 h-4 mr-2" />
                      )}
                      Attach File
                    </Button>
                    <input
                      ref={attachmentInputRef}
                      type="file"
                      className="hidden"
                      accept=".pdf,.xlsx,.xls,.docx,image/*"
                      onChange={handleAttachmentUpload}
                    />
                    <Button
                      type="submit"
                      disabled={sendingMessage || uploadingAttachment || selectedRequest?.status === "closed"}
                    >
                      {sendingMessage ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <Send className="w-4 h-4 mr-2" />
                      )}
                      Send
                    </Button>
                  </div>
                </form>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default LiveChatManager;
