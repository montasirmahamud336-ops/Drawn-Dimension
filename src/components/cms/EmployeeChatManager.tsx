import { ChangeEvent, FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Paperclip, Send, Search, RefreshCcw } from "lucide-react";
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
    fetchConversations();
  }, [refreshTick]);

  useEffect(() => {
    if (!selectedEmployeeId) return;
    fetchMessages(selectedEmployeeId);
  }, [selectedEmployeeId, refreshTick]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      fetchConversations(true);
      if (selectedEmployeeId) {
        fetchMessages(selectedEmployeeId, true);
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
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Employee Chat</h2>
          <p className="text-muted-foreground">
            Private inbox conversations between admin and each employee.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          className="gap-2"
          onClick={() => setRefreshTick((prev) => prev + 1)}
        >
          <RefreshCcw className="w-4 h-4" /> Refresh
        </Button>
      </div>

      <div className="grid lg:grid-cols-[340px_1fr] gap-4">
        <Card className="glass-card border-border/60 overflow-hidden">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Inboxes</CardTitle>
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
              <Input
                className="pl-9"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search employees..."
              />
            </div>
          </CardHeader>
          <CardContent className="pt-0 space-y-2 max-h-[72vh] overflow-y-auto">
            {loadingConversations ? (
              <div className="text-sm text-muted-foreground py-4">Loading conversations...</div>
            ) : filteredConversations.length === 0 ? (
              <div className="text-sm text-muted-foreground py-4">No employee chats found.</div>
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
                    className={`w-full text-left rounded-xl border px-3 py-3 transition-colors ${isActive
                      ? "border-primary/40 bg-primary/10"
                      : "border-border/50 bg-background/40 hover:bg-background/60"
                      }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="h-10 w-10 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-xs font-semibold text-primary overflow-hidden">
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
                        <div className="flex items-center gap-2">
                          <p className="font-medium truncate">{conversation.employee.name}</p>
                          {conversation.unread_count > 0 && (
                            <span className="text-[11px] px-1.5 py-0.5 rounded-full bg-primary text-primary-foreground">
                              {conversation.unread_count}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground truncate">{conversation.employee.profession}</p>
                        <p className="text-xs text-muted-foreground/90 truncate mt-1">{preview}</p>
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </CardContent>
        </Card>

        <Card className="glass-card border-border/60 overflow-hidden">
          <CardHeader className="pb-3 border-b border-border/50">
            <CardTitle className="text-lg">
              {selectedConversation
                ? `${selectedConversation.employee.name} (${selectedConversation.employee.profession})`
                : "Select an employee chat"}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            {!selectedEmployeeId ? (
              <div className="text-sm text-muted-foreground py-10">Choose an inbox from the left panel.</div>
            ) : (
              <div className="space-y-4">
                <div className="h-[52vh] overflow-y-auto rounded-xl border border-border/50 bg-background/40 p-3 space-y-3">
                  {loadingMessages ? (
                    <div className="text-sm text-muted-foreground py-4">Loading messages...</div>
                  ) : messages.length === 0 ? (
                    <div className="text-sm text-muted-foreground py-4">No messages yet. Start the conversation.</div>
                  ) : (
                    messages.map((message) => {
                      const isAdmin = message.sender_type === "admin";
                      return (
                        <div
                          key={message.id}
                          className={`flex ${isAdmin ? "justify-end" : "justify-start"}`}
                        >
                          <div
                            className={`max-w-[75%] rounded-xl px-3 py-2 border ${isAdmin
                              ? "bg-primary/15 border-primary/35"
                              : "bg-card/70 border-border/60"
                              }`}
                          >
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
                  <div ref={messagesEndRef} />
                </div>

                <form onSubmit={handleSend} className="space-y-3">
                  <Textarea
                    id="cms-chat-composer"
                    rows={3}
                    value={draftMessage}
                    onChange={(event) => setDraftMessage(event.target.value)}
                    placeholder="Type a message..."
                  />

                  {attachment && (
                    <div className="text-xs text-muted-foreground">
                      Attached: <span className="font-medium">{attachment.name}</span>
                      <button
                        type="button"
                        className="ml-2 text-primary hover:underline"
                        onClick={() => setAttachment(null)}
                      >
                        Remove
                      </button>
                    </div>
                  )}

                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => attachmentInputRef.current?.click()}
                      disabled={uploadingAttachment || sendingMessage}
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
                      onChange={handleAttachmentUpload}
                    />
                    <Button type="submit" disabled={sendingMessage || uploadingAttachment}>
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

export default EmployeeChatManager;
