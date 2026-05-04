import { ChangeEvent, FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  Clock3,
  Inbox,
  Loader2,
  Paperclip,
  RefreshCcw,
  Search,
  Send,
  User,
} from "lucide-react";
import { toast } from "sonner";
import { getAdminToken, getApiBaseUrl } from "@/components/admin/adminAuth";
import { uploadCmsFile } from "@/integrations/supabase/storage";

type ChatMessage = {
  id: string;
  employee_id: string;
  sender_type: "admin" | "employee";
  sender_label: string | null;
  message_text: string | null;
  attachment_url: string | null;
  attachment_name: string | null;
  attachment_mime: string | null;
  created_at: string;
  read_by_admin_at: string | null;
  read_by_employee_at: string | null;
};

type EmployeeSummary = {
  id: string;
  name: string;
  profession: string;
  email: string;
  profile_image_url?: string | null;
};

type Conversation = {
  employee: EmployeeSummary;
  latest_message: ChatMessage | null;
  unread_count: number;
};

const buildSafeFileName = (value: string) =>
  value
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-zA-Z0-9._-]/g, "")
    .slice(0, 120) || "file";

const getInitials = (name: string) =>
  name
    .split(" ")
    .map((part) => part.trim()[0] || "")
    .join("")
    .slice(0, 2)
    .toUpperCase();

const formatConversationTimestamp = (value: string | null | undefined) => {
  if (!value) return "No activity";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "No activity";
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHrs = Math.floor(diffMins / 60);
  if (diffHrs < 24) return `${diffHrs}h ago`;
  const diffDays = Math.floor(diffHrs / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString([], { month: "short", day: "numeric" });
};

const formatMessageTimestamp = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  const now = new Date();
  const isSameDay = now.toDateString() === date.toDateString();
  return isSameDay
    ? date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })
    : date.toLocaleDateString([], { month: "short", day: "numeric" }) + ", " +
      date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
};

const parseErrorMessage = async (response: Response, fallback: string) => {
  const contentType = response.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    const body = await response.json().catch(() => null);
    if (body?.message) return String(body.message);
  }
  const text = await response.text().catch(() => "");
  if (text) return text;
  return fallback;
};

const DateSeparator = ({ date }: { date: string }) => {
  const formattedDate = new Date(date).toLocaleDateString([], {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
  return (
    <div className="flex items-center gap-3 my-4">
      <div className="flex-1 h-px bg-border/50" />
      <span className="text-xs font-medium text-muted-foreground px-3 py-1 rounded-full bg-muted/50">
        {formattedDate}
      </span>
      <div className="flex-1 h-px bg-border/50" />
    </div>
  );
};

const EmployeeChatManager = () => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loadingConversations, setLoadingConversations] = useState(true);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [refreshTick, setRefreshTick] = useState(0);
  const [search, setSearch] = useState("");
  const [draftMessage, setDraftMessage] = useState("");
  const [attachment, setAttachment] = useState<{
    url: string;
    name: string;
    mime: string;
  } | null>(null);
  const [uploadingAttachment, setUploadingAttachment] = useState(false);
  const [sendingMessage, setSendingMessage] = useState(false);
  const attachmentInputRef = useRef<HTMLInputElement | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const apiBase = getApiBaseUrl();

  const selectedConversation = useMemo(
    () => conversations.find((item) => item.employee.id === selectedEmployeeId) ?? null,
    [conversations, selectedEmployeeId]
  );

  const filteredConversations = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return conversations;
    return conversations.filter((item) => {
      const target = `${item.employee.name} ${item.employee.profession} ${item.employee.email}`.toLowerCase();
      return target.includes(query);
    });
  }, [conversations, search]);

  const totalUnreadCount = useMemo(
    () => conversations.reduce((total, item) => total + Math.max(item.unread_count || 0, 0), 0),
    [conversations]
  );

  const fetchConversations = async (silent = false) => {
    const token = getAdminToken();
    if (!token) {
      toast.error("You are not logged in. Please login again.");
      setLoadingConversations(false);
      return;
    }

    if (!silent) setLoadingConversations(true);
    try {
      const response = await fetch(`${apiBase}/chat/conversations`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        throw new Error(await parseErrorMessage(response, "Failed to load conversations"));
      }

      const data = await response.json();
      const nextConversations = Array.isArray(data) ? (data as Conversation[]) : [];
      setConversations(nextConversations);

      if (!selectedEmployeeId && nextConversations.length > 0) {
        setSelectedEmployeeId(nextConversations[0].employee.id);
      }

      if (selectedEmployeeId) {
        const exists = nextConversations.some((item) => item.employee.id === selectedEmployeeId);
        if (!exists) {
          setSelectedEmployeeId(nextConversations[0]?.employee.id ?? "");
          setMessages([]);
        }
      }
    } catch (error: any) {
      toast.error(error?.message || "Failed to load chat conversations");
    } finally {
      if (!silent) setLoadingConversations(false);
    }
  };

  const fetchMessages = async (employeeId: string, silent = false) => {
    const token = getAdminToken();
    if (!token) {
      toast.error("You are not logged in. Please login again.");
      setLoadingMessages(false);
      return;
    }
    if (!employeeId) return;
    if (!silent) setLoadingMessages(true);
    try {
      const response = await fetch(`${apiBase}/chat/messages/${employeeId}?limit=400`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) {
        throw new Error(await parseErrorMessage(response, "Failed to load messages"));
      }
      const data = await response.json();
      const nextMessages = Array.isArray(data?.messages) ? (data.messages as ChatMessage[]) : [];
      setMessages(nextMessages);
    } catch (error: any) {
      toast.error(error?.message || "Failed to load messages");
    } finally {
      if (!silent) setLoadingMessages(false);
    }
  };

  useEffect(() => {
    void fetchConversations();
  }, [refreshTick]);

  useEffect(() => {
    if (!selectedEmployeeId) return;
    void fetchMessages(selectedEmployeeId);
  }, [selectedEmployeeId, refreshTick]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      void fetchConversations(true);
      if (selectedEmployeeId) {
        void fetchMessages(selectedEmployeeId, true);
      }
    }, 15000);
    return () => window.clearInterval(timer);
  }, [selectedEmployeeId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages]);

  const handleAttachmentUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || !selectedEmployeeId) return;
    const token = getAdminToken();
    if (!token) {
      toast.error("Session expired. Please login again.");
      return;
    }
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      toast.error("Please upload a file under 10MB");
      return;
    }
    setUploadingAttachment(true);
    try {
      const fileName = buildSafeFileName(file.name);
      const uploadPath = `chat/admin/${selectedEmployeeId}/${Date.now()}-${fileName}`;
      const url = await uploadCmsFile(file, uploadPath);
      setAttachment({ url, name: file.name, mime: file.type || "application/octet-stream" });
      toast.success("Attachment uploaded");
    } catch (error: any) {
      toast.error(error?.message || "Failed to upload attachment");
    } finally {
      setUploadingAttachment(false);
    }
  };

  const handleSend = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedEmployeeId) {
      toast.error("Select an employee conversation first");
      return;
    }
    const token = getAdminToken();
    if (!token) {
      toast.error("Session expired. Please login again.");
      return;
    }
    const messageText = draftMessage.trim();
    if (!messageText && !attachment?.url) {
      toast.error("Write a message or attach a file");
      return;
    }
    setSendingMessage(true);
    try {
      const response = await fetch(`${apiBase}/chat/messages/${selectedEmployeeId}`, {
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
        }),
      });
      if (!response.ok) {
        throw new Error(await parseErrorMessage(response, "Failed to send message"));
      }
      setDraftMessage("");
      setAttachment(null);
      await fetchMessages(selectedEmployeeId, true);
      await fetchConversations(true);
    } catch (error: any) {
      toast.error(error?.message || "Failed to send message");
    } finally {
      setSendingMessage(false);
    }
  };

  const groupedMessages = useMemo(() => {
    const groups: { date: string; msgs: ChatMessage[] }[] = [];
    messages.forEach((msg) => {
      const msgDate = new Date(msg.created_at).toDateString();
      if (groups.length === 0 || groups[groups.length - 1].date !== msgDate) {
        groups.push({ date: msgDate, msgs: [msg] });
      } else {
        groups[groups.length - 1].msgs.push(msg);
      }
    });
    return groups;
  }, [messages]);

  return (
    // Outer: fixed height, no overflow — messenger-style, nothing spills out
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        maxHeight: "calc(100dvh - 9rem)",
        overflow: "hidden",
        minHeight: 0,
      }}
    >
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "340px minmax(0, 1fr)",
          gap: "1rem",
          flex: 1,
          minHeight: 0,
          overflow: "hidden",
          height: "100%",
        }}
      >

        {/* ── Inbox Sidebar ── */}
        <Card
          style={{
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
            height: "100%",
            minHeight: 0,
          }}
          className="rounded-2xl border-border/20 bg-card/95 backdrop-blur-sm shadow-sm"
        >
          {/* Header */}
          <div className="shrink-0 border-b border-border/10 px-5 py-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Inbox</p>
                <h3 className="mt-1 text-xl font-bold text-foreground">Messages</h3>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="rounded-full px-2.5 py-0.5">
                  {totalUnreadCount}
                </Badge>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 rounded-full hover:bg-accent"
                  onClick={() => setRefreshTick((prev) => prev + 1)}
                  aria-label="Refresh inbox"
                >
                  <RefreshCcw className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div className="relative mt-4">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="h-10 rounded-xl border-border/30 bg-background/80 pl-10 text-sm shadow-none focus-visible:ring-1"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search employees..."
              />
            </div>
          </div>

          {/* Scrollable conversation list — native div, no Radix ScrollArea */}
          <div style={{ flex: 1, minHeight: 0, overflowY: "auto", overflowX: "hidden" }}>
            <div className="space-y-1 p-3">
              {loadingConversations ? (
                <div className="flex items-center gap-3 rounded-xl bg-muted/30 px-4 py-4 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading conversations...
                </div>
              ) : filteredConversations.length === 0 ? (
                <div className="flex min-h-[260px] flex-col items-center justify-center rounded-xl border border-dashed border-border/40 bg-muted/20 px-6 text-center">
                  <User className="h-8 w-8 text-muted-foreground/60" />
                  <h4 className="mt-3 text-sm font-medium">No conversations</h4>
                  <p className="mt-1 text-xs text-muted-foreground">Start a new chat or adjust search.</p>
                </div>
              ) : (
                filteredConversations.map((conversation) => {
                  const isActive = conversation.employee.id === selectedEmployeeId;
                  const latest = conversation.latest_message;
                  const preview = latest?.message_text || (latest?.attachment_name ? `📎 ${latest.attachment_name}` : "No messages yet");

                  return (
                    <button
                      key={conversation.employee.id}
                      type="button"
                      onClick={() => setSelectedEmployeeId(conversation.employee.id)}
                      style={{ width: "100%", minWidth: 0, overflow: "hidden" }}
                      className={cn(
                        "rounded-xl p-3 text-left transition-all duration-200 block",
                        isActive ? "bg-primary/10 ring-1 ring-primary/30" : "hover:bg-accent/40"
                      )}
                    >
                      {/* flex row: avatar | text | badge */}
                      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", minWidth: 0, overflow: "hidden" }}>
                        {/* Avatar */}
                        <div className="h-10 w-10 shrink-0 rounded-full bg-primary/10 flex items-center justify-center text-sm font-semibold text-primary overflow-hidden">
                          {conversation.employee.profile_image_url ? (
                            <img src={conversation.employee.profile_image_url} alt="" className="h-full w-full object-cover" />
                          ) : (
                            getInitials(conversation.employee.name || "E")
                          )}
                        </div>

                        {/* Text block — must have minWidth:0 to allow truncation */}
                        <div style={{ flex: 1, minWidth: 0, overflow: "hidden" }}>
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "4px" }}>
                            <p
                              style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
                              className="text-sm font-medium text-foreground leading-tight"
                            >
                              {conversation.employee.name}
                            </p>
                            <span className="text-[11px] text-muted-foreground shrink-0 whitespace-nowrap">
                              {formatConversationTimestamp(latest?.created_at)}
                            </span>
                          </div>
                          <p
                            style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
                            className="mt-0.5 text-xs text-muted-foreground"
                          >
                            {preview}
                          </p>
                        </div>

                        {conversation.unread_count > 0 && (
                          <Badge className="ml-1 rounded-full px-1.5 py-0.5 text-[10px] shrink-0">
                            {conversation.unread_count}
                          </Badge>
                        )}
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </Card>

        {/* ── Chat Panel ── */}
        <Card
          style={{
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
            height: "100%",
            minHeight: 0,
          }}
          className="rounded-2xl border-border/20 bg-card/95 backdrop-blur-sm shadow-sm"
        >
          {!selectedEmployeeId ? (
            <div className="flex flex-1 flex-col items-center justify-center px-6 py-8 text-center">
              <Inbox className="h-12 w-12 text-muted-foreground/40" />
              <h3 className="mt-4 text-lg font-medium">Select a conversation</h3>
              <p className="mt-1 text-sm text-muted-foreground max-w-xs">Choose an employee from the left to view messages.</p>
            </div>
          ) : (
            <>
              {/* Chat Header */}
              <div className="shrink-0 border-b border-border/10 px-5 py-4 flex items-center gap-4">
                <div className="h-10 w-10 shrink-0 rounded-full bg-primary/10 flex items-center justify-center text-sm font-semibold text-primary overflow-hidden">
                  {selectedConversation?.employee.profile_image_url ? (
                    <img src={selectedConversation.employee.profile_image_url} alt="" className="h-full w-full object-cover" />
                  ) : (
                    getInitials(selectedConversation?.employee.name || "E")
                  )}
                </div>
                <div className="min-w-0 flex-1 overflow-hidden">
                  <p className="text-sm font-semibold truncate">{selectedConversation?.employee.name}</p>
                  <p className="text-xs text-muted-foreground truncate">{selectedConversation?.employee.profession}</p>
                </div>
                <div className="ml-auto flex items-center gap-2 shrink-0">
                  <Badge variant="outline" className="rounded-full text-xs px-2.5 py-0.5">
                    {messages.length} messages
                  </Badge>
                </div>
              </div>

              {/* Messages — native scrollable div */}
              <div
                style={{ flex: 1, minHeight: 0, overflowY: "auto", overflowX: "hidden" }}
                className="px-5 py-4"
              >
                {loadingMessages ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  </div>
                ) : messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <Send className="h-8 w-8 text-muted-foreground/40" />
                    <p className="mt-3 text-sm font-medium">No messages yet</p>
                    <p className="text-xs text-muted-foreground mt-1">Start the conversation by sending a message.</p>
                  </div>
                ) : (
                  groupedMessages.map((group) => (
                    <div key={group.date}>
                      <DateSeparator date={group.date} />
                      {group.msgs.map((msg) => {
                        const isAdmin = msg.sender_type === "admin";
                        const showAvatar = !isAdmin;
                        return (
                          <div key={msg.id} className={cn("flex mb-2", isAdmin ? "justify-end" : "justify-start")}>
                            {showAvatar && (
                              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-semibold mr-2 self-end shrink-0">
                                {getInitials(selectedConversation?.employee.name || "E")}
                              </div>
                            )}
                            <div
                              className={cn(
                                "max-w-[80%] rounded-2xl px-4 py-2.5",
                                isAdmin
                                  ? "bg-primary text-primary-foreground rounded-br-md"
                                  : "bg-muted text-foreground rounded-bl-md"
                              )}
                            >
                              {msg.message_text && (
                                <p className="text-sm whitespace-pre-wrap break-words">{msg.message_text}</p>
                              )}
                              {msg.attachment_url && (
                                <a
                                  href={msg.attachment_url}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="mt-1.5 inline-flex items-center gap-1.5 rounded-lg bg-background/50 px-3 py-1.5 text-xs font-medium hover:bg-background/80 transition-colors"
                                >
                                  <Paperclip className="h-3 w-3" />
                                  <span className="truncate max-w-[150px]">{msg.attachment_name || "Attachment"}</span>
                                </a>
                              )}
                              <p className={cn("text-[10px] mt-1", isAdmin ? "text-primary-foreground/70" : "text-muted-foreground")}>
                                {formatMessageTimestamp(msg.created_at)}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ))
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Message Composer — pinned at bottom */}
              <div className="shrink-0 border-t border-border/10 p-4">
                {attachment && (
                  <div className="mb-3 flex items-center justify-between rounded-xl bg-muted/50 px-3 py-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <Paperclip className="h-4 w-4 text-muted-foreground shrink-0" />
                      <span className="text-sm truncate">{attachment.name}</span>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-auto px-2 py-1 text-xs"
                      onClick={() => setAttachment(null)}
                    >
                      Remove
                    </Button>
                  </div>
                )}
                <form onSubmit={handleSend} className="flex items-end gap-2">
                  <input ref={attachmentInputRef} type="file" className="hidden" onChange={handleAttachmentUpload} />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-10 w-10 rounded-xl shrink-0"
                    onClick={() => attachmentInputRef.current?.click()}
                    disabled={uploadingAttachment || sendingMessage}
                  >
                    {uploadingAttachment ? <Loader2 className="h-4 w-4 animate-spin" /> : <Paperclip className="h-4 w-4" />}
                  </Button>
                  <Textarea
                    value={draftMessage}
                    onChange={(e) => setDraftMessage(e.target.value)}
                    placeholder="Write a message..."
                    className="min-h-[44px] max-h-[120px] resize-none rounded-xl border-border/30 bg-background/80 py-2.5 px-4 text-sm shadow-none"
                    rows={1}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleSend(e as any);
                      }
                    }}
                  />
                  <Button
                    type="submit"
                    disabled={sendingMessage || uploadingAttachment}
                    size="icon"
                    className="h-10 w-10 rounded-xl shrink-0"
                  >
                    {sendingMessage ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  </Button>
                </form>
              </div>
            </>
          )}
        </Card>

      </div>
    </div>
  );
};

export default EmployeeChatManager;