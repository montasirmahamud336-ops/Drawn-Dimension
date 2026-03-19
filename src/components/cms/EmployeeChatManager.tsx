import { ChangeEvent, FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { Clock3, Inbox, Loader2, Paperclip, RefreshCcw, Search, Send } from "lucide-react";
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
  const isSameDay = now.toDateString() === date.toDateString();
  return isSameDay
    ? date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })
    : date.toLocaleDateString([], { month: "short", day: "numeric" });
};

const formatMessageTimestamp = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
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
  const token = getAdminToken();

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

  const ensureToken = () => {
    if (!token) {
      toast.error("Session expired. Please login again.");
      return false;
    }
    return true;
  };

  const fetchConversations = async (silent = false) => {
    if (!ensureToken()) return;

    if (!silent) setLoadingConversations(true);
    try {
      const response = await fetch(`${apiBase}/chat/conversations`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
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
    if (!employeeId || !ensureToken()) return;

    if (!silent) setLoadingMessages(true);
    try {
      const response = await fetch(`${apiBase}/chat/messages/${employeeId}?limit=400`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
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
    if (!ensureToken()) return;

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

      setAttachment({
        url,
        name: file.name,
        mime: file.type || "application/octet-stream",
      });
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
    if (!ensureToken()) return;

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

  return (
    <div className="flex flex-col gap-4 lg:h-[calc(100dvh-11rem)]">
      <div className="grid flex-1 min-h-0 gap-4 lg:grid-cols-[320px_minmax(0,1fr)] xl:grid-cols-[360px_minmax(0,1fr)]">
        <Card className="overflow-hidden rounded-[28px] border-border/60 bg-[linear-gradient(165deg,hsl(var(--card)/0.98),hsl(var(--card)/0.86)_50%,hsl(var(--background)/0.82))] shadow-[0_24px_56px_-42px_rgba(15,23,42,0.42)] lg:flex lg:h-full lg:min-h-0 lg:flex-col">
          <div className="shrink-0 border-b border-border/60 px-5 py-5">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Inbox List</p>
                <h3 className="mt-2 text-2xl font-semibold tracking-tight text-foreground">Employee Threads</h3>
                <p className="mt-1 text-xs text-muted-foreground">
                  {totalUnreadCount} unread across {conversations.length} conversations
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="rounded-full border-primary/20 bg-primary/10 px-3 py-1 text-primary">
                  {filteredConversations.length}
                </Badge>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-10 w-10 rounded-full border-border/70 bg-background/80"
                  onClick={() => setRefreshTick((prev) => prev + 1)}
                  aria-label="Refresh inbox"
                >
                  <RefreshCcw className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="relative mt-4">
              <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="h-12 rounded-2xl border-border/60 bg-background/80 pl-11 shadow-none"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search employees..."
              />
            </div>
          </div>

          <ScrollArea data-lenis-prevent className="h-[420px] sm:h-[520px] lg:h-auto lg:min-h-0 lg:flex-1">
            <div className="space-y-3 p-4">
              {loadingConversations ? (
                <div className="flex items-center gap-2 rounded-2xl border border-border/60 bg-background/60 px-4 py-4 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading conversations...
                </div>
              ) : filteredConversations.length === 0 ? (
                <div className="flex min-h-[260px] flex-col items-center justify-center rounded-[24px] border border-dashed border-border/70 bg-background/55 px-6 text-center">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                    <Inbox className="h-6 w-6" />
                  </div>
                  <h4 className="mt-4 text-base font-semibold text-foreground">No chats found</h4>
                  <p className="mt-2 max-w-[16rem] text-sm leading-6 text-muted-foreground">
                    Try another search term or wait for a new employee message.
                  </p>
                </div>
              ) : (
                filteredConversations.map((conversation) => {
                  const isActive = conversation.employee.id === selectedEmployeeId;
                  const latest = conversation.latest_message;
                  const preview =
                    latest?.message_text ||
                    (latest?.attachment_name ? `Attachment: ${latest.attachment_name}` : "No messages yet");

                  return (
                    <button
                      key={conversation.employee.id}
                      type="button"
                      onClick={() => setSelectedEmployeeId(conversation.employee.id)}
                      className={cn(
                        "w-full rounded-[24px] border p-4 text-left transition-all duration-300",
                        isActive
                          ? "border-primary/35 bg-[linear-gradient(145deg,hsl(var(--primary)/0.12),hsl(var(--background)/0.96))] shadow-[0_20px_40px_-28px_rgba(239,68,68,0.55)]"
                          : "border-border/60 bg-background/72 hover:-translate-y-0.5 hover:border-primary/25 hover:bg-background/90 hover:shadow-[0_18px_38px_-30px_rgba(15,23,42,0.45)]"
                      )}
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-primary/20 bg-primary/10 text-sm font-semibold text-primary">
                          {conversation.employee.profile_image_url ? (
                            <img
                              src={conversation.employee.profile_image_url}
                              alt={conversation.employee.name}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            getInitials(conversation.employee.name || "E")
                          )}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="truncate text-[1rem] font-semibold text-foreground">
                                {conversation.employee.name}
                              </p>
                              <p className="mt-0.5 truncate text-xs font-medium text-muted-foreground">
                                {conversation.employee.profession}
                              </p>
                            </div>
                            <div className="shrink-0 text-right">
                              <p className="text-[11px] font-medium text-muted-foreground">
                                {formatConversationTimestamp(latest?.created_at)}
                              </p>
                              {conversation.unread_count > 0 ? (
                                <Badge className="mt-2 rounded-full px-2 py-0.5 text-[10px]">
                                  {conversation.unread_count} new
                                </Badge>
                              ) : null}
                            </div>
                          </div>

                          <p className="mt-3 line-clamp-2 text-sm leading-6 text-muted-foreground">
                            {preview}
                          </p>
                        </div>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </ScrollArea>
        </Card>

        <Card className="overflow-hidden rounded-[30px] border-border/60 bg-[linear-gradient(160deg,hsl(var(--card)/0.98),hsl(var(--card)/0.88)_52%,hsl(var(--background)/0.86))] shadow-[0_24px_60px_-40px_rgba(15,23,42,0.4)] lg:flex lg:h-full lg:min-h-0 lg:flex-col">
          <div className="shrink-0 border-b border-border/60 px-5 py-5 md:px-6">
            {selectedConversation ? (
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div className="flex min-w-0 items-center gap-4">
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-primary/20 bg-primary/10 text-base font-semibold text-primary shadow-[0_12px_24px_-18px_rgba(239,68,68,0.55)]">
                    {selectedConversation.employee.profile_image_url ? (
                      <img
                        src={selectedConversation.employee.profile_image_url}
                        alt={selectedConversation.employee.name}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      getInitials(selectedConversation.employee.name || "E")
                    )}
                  </div>

                  <div className="min-w-0">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                      Active Conversation
                    </p>
                    <h3 className="mt-1 truncate text-2xl font-semibold tracking-tight text-foreground">
                      {selectedConversation.employee.name}
                    </h3>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <Badge variant="outline" className="rounded-full border-border/70 bg-background/70 px-3 py-1 text-xs">
                        {selectedConversation.employee.profession}
                      </Badge>
                      <Badge variant="outline" className="rounded-full border-border/70 bg-background/70 px-3 py-1 text-xs">
                        {selectedConversation.employee.email}
                      </Badge>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline" className="rounded-full border-primary/20 bg-primary/10 px-3 py-1 text-primary">
                    {messages.length} messages
                  </Badge>
                  <Badge variant="outline" className="rounded-full border-border/70 bg-background/70 px-3 py-1 text-xs">
                    <Clock3 className="mr-1.5 h-3.5 w-3.5" />
                    Live sync
                  </Badge>
                </div>
              </div>
            ) : (
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                  Conversation View
                </p>
                <h3 className="mt-1 text-2xl font-semibold tracking-tight text-foreground">
                  Select an employee chat
                </h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  Pick a thread from the left to open the conversation panel.
                </p>
              </div>
            )}
          </div>

          {!selectedEmployeeId ? (
            <div className="flex min-h-[360px] flex-1 flex-col items-center justify-center px-6 py-8 text-center lg:min-h-0">
              <div className="flex h-16 w-16 items-center justify-center rounded-[22px] bg-primary/10 text-primary">
                <Inbox className="h-7 w-7" />
              </div>
              <h4 className="mt-5 text-xl font-semibold text-foreground">Choose a conversation</h4>
              <p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">
                Open any employee thread from the inbox list to review messages, attachments, and send a reply.
              </p>
            </div>
          ) : (
            <div className="flex flex-1 min-h-0 flex-col p-4 md:p-5">
              <div className="min-h-0 flex-1 rounded-[28px] border border-border/60 bg-[linear-gradient(180deg,hsl(var(--background)/0.84),hsl(var(--card)/0.74))] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.52)]">
                <ScrollArea data-lenis-prevent className="h-[320px] sm:h-[420px] lg:h-full lg:min-h-0 pr-2">
                  <div className={cn("flex min-h-full flex-col gap-3 p-1", messages.length > 0 && "justify-end")}>
                    {loadingMessages ? (
                      <div className="flex items-center gap-2 rounded-2xl border border-border/60 bg-background/70 px-4 py-4 text-sm text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Loading messages...
                      </div>
                    ) : messages.length === 0 ? (
                      <div className="flex min-h-[260px] flex-col items-center justify-center rounded-[22px] border border-dashed border-border/70 bg-background/55 px-6 text-center">
                        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                          <Send className="h-6 w-6" />
                        </div>
                        <h4 className="mt-4 text-base font-semibold text-foreground">No messages yet</h4>
                        <p className="mt-2 max-w-sm text-sm leading-6 text-muted-foreground">
                          Start the conversation with a quick reply or send a file attachment.
                        </p>
                      </div>
                    ) : (
                      messages.map((message) => {
                        const isAdmin = message.sender_type === "admin";

                        return (
                          <div key={message.id} className={cn("flex", isAdmin ? "justify-end" : "justify-start")}>
                            <div
                              className={cn(
                                "max-w-[85%] rounded-[24px] border px-4 py-3 shadow-sm",
                                isAdmin
                                  ? "rounded-br-md border-primary/30 bg-[linear-gradient(145deg,hsl(var(--primary)/0.18),hsl(var(--primary)/0.08))]"
                                  : "rounded-bl-md border-border/70 bg-background/88"
                              )}
                            >
                              <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em]">
                                <span className={isAdmin ? "text-primary" : "text-muted-foreground"}>
                                  {isAdmin ? "Admin" : message.sender_label || selectedConversation?.employee.name || "Employee"}
                                </span>
                              </div>

                              {message.message_text ? (
                                <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-foreground">
                                  {message.message_text}
                                </p>
                              ) : null}

                              {message.attachment_url ? (
                                <a
                                  href={message.attachment_url}
                                  target="_blank"
                                  rel="noreferrer"
                                  className={cn(
                                    "mt-3 inline-flex max-w-full items-center gap-2 rounded-2xl border px-3 py-2 text-xs font-medium transition-colors hover:opacity-90",
                                    isAdmin
                                      ? "border-primary/20 bg-background/50 text-foreground"
                                      : "border-primary/20 bg-primary/5 text-primary"
                                  )}
                                >
                                  <Paperclip className="h-3.5 w-3.5 shrink-0" />
                                  <span className="truncate">{message.attachment_name || "Attachment"}</span>
                                </a>
                              ) : null}

                              <p className="mt-3 text-[11px] text-muted-foreground">
                                {formatMessageTimestamp(message.created_at)}
                              </p>
                            </div>
                          </div>
                        );
                      })
                    )}
                    <div ref={messagesEndRef} />
                  </div>
                </ScrollArea>
              </div>

              <form
                onSubmit={handleSend}
                className="mt-4 shrink-0 rounded-[28px] border border-border/60 bg-[linear-gradient(180deg,hsl(var(--background)/0.95),hsl(var(--card)/0.86))] p-3 shadow-[0_18px_44px_-36px_rgba(15,23,42,0.45)]"
              >
                {attachment ? (
                  <div className="mb-3 flex flex-col gap-3 rounded-[20px] border border-border/60 bg-background/78 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                        Attached File
                      </p>
                      <p className="truncate text-sm font-medium text-foreground">{attachment.name}</p>
                    </div>
                    <Button type="button" variant="ghost" className="w-fit rounded-full px-3" onClick={() => setAttachment(null)}>
                      Remove
                    </Button>
                  </div>
                ) : null}

                <div className="flex items-end gap-3">
                  <input
                    ref={attachmentInputRef}
                    type="file"
                    className="hidden"
                    onChange={handleAttachmentUpload}
                  />

                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="h-12 w-12 shrink-0 rounded-2xl border-border/70 bg-background/80"
                    onClick={() => attachmentInputRef.current?.click()}
                    disabled={uploadingAttachment || sendingMessage}
                    aria-label="Attach file"
                  >
                    {uploadingAttachment ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Paperclip className="h-4 w-4" />
                    )}
                  </Button>

                  <div className="flex-1">
                    <Textarea
                      id="cms-chat-composer"
                      rows={1}
                      value={draftMessage}
                      onChange={(event) => setDraftMessage(event.target.value)}
                      placeholder="Write a reply..."
                      className="min-h-[56px] max-h-[140px] resize-none rounded-[22px] border-border/60 bg-background/84 px-4 py-4 shadow-none"
                    />
                    <p className="mt-2 px-1 text-xs text-muted-foreground">Attach one file up to 10MB.</p>
                  </div>

                  <Button
                    type="submit"
                    disabled={sendingMessage || uploadingAttachment}
                    className="h-12 shrink-0 rounded-2xl px-4 shadow-[0_18px_38px_-22px_rgba(239,68,68,0.75)] sm:px-5"
                  >
                    {sendingMessage ? (
                      <Loader2 className="h-4 w-4 animate-spin sm:mr-2" />
                    ) : (
                      <Send className="h-4 w-4 sm:mr-2" />
                    )}
                    <span className="hidden sm:inline">Send</span>
                  </Button>
                </div>
              </form>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};

export default EmployeeChatManager;
