import { ChangeEvent, useEffect, useMemo, useRef, useState } from "react";
import { MessageCircle, X, Send, Loader2, Paperclip } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { getApiBaseUrl } from "@/components/admin/adminAuth";

interface EmployeeChatMessage {
  id: string;
  sender_type: "admin" | "employee";
  message_text: string | null;
  attachment_url: string | null;
  attachment_name: string | null;
  created_at: string;
}

interface LiveChatRequestSummary {
  id: string;
  status: "open" | "contacted" | "closed";
  user_name: string | null;
  user_email: string;
  page_path: string | null;
  created_at: string;
}

interface LiveChatMessage {
  id: string;
  request_id: string;
  sender_type: "admin" | "user";
  sender_label: string | null;
  message_text: string | null;
  attachment_url: string | null;
  attachment_name: string | null;
  attachment_mime: string | null;
  created_at: string;
}

interface LiveChatAttachment {
  url: string;
  name: string;
  mime: string;
  size: number;
}

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

const ChatWidget = () => {
  const [open, setOpen] = useState(false);

  const [employeeMessages, setEmployeeMessages] = useState<EmployeeChatMessage[]>([]);
  const [employeeDraft, setEmployeeDraft] = useState("");
  const [employeeLoading, setEmployeeLoading] = useState(false);
  const [employeeSending, setEmployeeSending] = useState(false);

  const [liveRequest, setLiveRequest] = useState<LiveChatRequestSummary | null>(null);
  const [liveMessages, setLiveMessages] = useState<LiveChatMessage[]>([]);
  const [liveDraft, setLiveDraft] = useState("");
  const [liveLoading, setLiveLoading] = useState(false);
  const [liveSending, setLiveSending] = useState(false);
  const [liveUploading, setLiveUploading] = useState(false);
  const [liveAttachment, setLiveAttachment] = useState<LiveChatAttachment | null>(null);
  const [liveAiModeActive, setLiveAiModeActive] = useState(true);

  const scrollRef = useRef<HTMLDivElement>(null);
  const liveAttachmentInputRef = useRef<HTMLInputElement>(null);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, session } = useAuth();
  const { toast } = useToast();
  const pathname = location.pathname.toLowerCase();

  const isCmsRoute =
    (pathname.startsWith("/cms") || pathname.startsWith("/database")) && pathname !== "/database/login";
  const isEmployeeDashboardRoute = pathname.startsWith("/employee/dashboard");
  const isMessageShortcutOnlyRoute = isCmsRoute;
  const canSendLiveMessage =
    (liveDraft.trim().length > 0 || Boolean(liveAttachment)) && !liveSending && !liveUploading;

  useEffect(() => {
    const handleOpenLiveChat = () => {
      setOpen(true);
    };

    window.addEventListener("open-live-chat", handleOpenLiveChat);
    return () => window.removeEventListener("open-live-chat", handleOpenLiveChat);
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [open, employeeMessages, employeeLoading, liveMessages, liveLoading, liveSending]);

  const parseApiError = async (response: Response, fallback: string) => {
    const contentType = response.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      const body = await response.json().catch(() => null);
      const message = body?.message || body?.detail || body?.error;
      if (message) return String(message);
    }
    const text = await response.text().catch(() => "");
    return text || fallback;
  };

  const loadEmployeeMessages = async (silent = false) => {
    if (!session?.access_token) return;
    if (!silent) setEmployeeLoading(true);

    try {
      const apiBase = getApiBaseUrl();
      const response = await fetch(`${apiBase}/employee/chat?limit=300`, {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (!response.ok) {
        throw new Error(await parseApiError(response, "Failed to load messages"));
      }

      const data = await response.json();
      setEmployeeMessages(Array.isArray(data?.messages) ? (data.messages as EmployeeChatMessage[]) : []);
    } catch (error: any) {
      if (!silent) {
        toast({
          title: "Inbox error",
          description: error?.message || "Could not load admin inbox",
          variant: "destructive",
        });
      }
    } finally {
      if (!silent) setEmployeeLoading(false);
    }
  };

  useEffect(() => {
    if (!isEmployeeDashboardRoute || !open) return;
    void loadEmployeeMessages();
  }, [isEmployeeDashboardRoute, open, session?.access_token]);

  useEffect(() => {
    if (!isEmployeeDashboardRoute || !open || !session?.access_token) return;
    const timer = window.setInterval(() => {
      void loadEmployeeMessages(true);
    }, 15000);
    return () => window.clearInterval(timer);
  }, [isEmployeeDashboardRoute, open, session?.access_token]);

  const sendEmployeeMessage = async () => {
    if (!session?.access_token || employeeSending) return;
    const text = employeeDraft.trim();
    if (!text) return;

    setEmployeeSending(true);
    try {
      const apiBase = getApiBaseUrl();
      const response = await fetch(`${apiBase}/employee/chat/messages`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          message_text: text,
        }),
      });

      if (!response.ok) {
        throw new Error(await parseApiError(response, "Failed to send message"));
      }

      setEmployeeDraft("");
      await loadEmployeeMessages(true);
    } catch (error: any) {
      toast({
        title: "Send failed",
        description: error?.message || "Could not send message",
        variant: "destructive",
      });
    } finally {
      setEmployeeSending(false);
    }
  };

  const loadLiveConversation = async (silent = false) => {
    if (!session?.access_token) return;
    if (!silent) setLiveLoading(true);

    try {
      const apiBase = getApiBaseUrl();
      const response = await fetch(`${apiBase}/live-chat/me/request?limit=600`, {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (!response.ok) {
        throw new Error(await parseApiError(response, "Failed to load live chat"));
      }

      const data = await response.json();
      setLiveRequest(data?.request ?? null);
      setLiveMessages(Array.isArray(data?.messages) ? (data.messages as LiveChatMessage[]) : []);
      setLiveAiModeActive(data?.ai_mode_active !== false);
    } catch (error: any) {
      if (!silent) {
        toast({
          title: "Live chat error",
          description: error?.message || "Could not load live chat conversation",
          variant: "destructive",
        });
      }
    } finally {
      if (!silent) setLiveLoading(false);
    }
  };

  useEffect(() => {
    if (!open || !user || !session?.access_token || isEmployeeDashboardRoute || isMessageShortcutOnlyRoute) return;
    void loadLiveConversation();
  }, [open, user?.id, session?.access_token, isEmployeeDashboardRoute, isMessageShortcutOnlyRoute]);

  useEffect(() => {
    if (!open || !user || !session?.access_token || isEmployeeDashboardRoute || isMessageShortcutOnlyRoute) return;

    const timer = window.setInterval(() => {
      void loadLiveConversation(true);
    }, 7000);
    return () => window.clearInterval(timer);
  }, [open, user?.id, session?.access_token, isEmployeeDashboardRoute, isMessageShortcutOnlyRoute]);

  const handleLiveAttachmentUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || !session?.access_token) return;

    if (!isAllowedAttachment(file.name)) {
      toast({
        title: "Unsupported file",
        description: "Only PDF, image, XLSX/XLS, and DOCX files are allowed.",
        variant: "destructive",
      });
      return;
    }

    const maxSize = 15 * 1024 * 1024;
    if (file.size > maxSize) {
      toast({
        title: "File too large",
        description: "Please upload a file under 15MB.",
        variant: "destructive",
      });
      return;
    }

    setLiveUploading(true);
    try {
      const apiBase = getApiBaseUrl();
      const formData = new FormData();
      formData.append("file", file);
      if (liveRequest?.id) {
        formData.append("request_id", liveRequest.id);
      }

      const response = await fetch(`${apiBase}/live-chat/me/upload`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
        body: formData,
      });

      if (!response.ok) {
        throw new Error(await parseApiError(response, "Failed to upload attachment"));
      }

      const payload = await response.json();
      setLiveAttachment({
        url: String(payload?.publicUrl ?? ""),
        name: String(payload?.fileName ?? file.name),
        mime: String(payload?.mimeType ?? file.type ?? "application/octet-stream"),
        size: Number(payload?.size ?? file.size),
      });
      toast({ title: "Attachment uploaded" });
    } catch (error: any) {
      toast({
        title: "Upload failed",
        description: error?.message || "Could not upload attachment",
        variant: "destructive",
      });
    } finally {
      setLiveUploading(false);
    }
  };

  const sendLiveMessage = async () => {
    if (!session?.access_token || !canSendLiveMessage) return;

    const messageText = liveDraft.trim();
    setLiveSending(true);
    try {
      const apiBase = getApiBaseUrl();
      const response = await fetch(`${apiBase}/live-chat/me/messages`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          request_id: liveRequest?.id ?? null,
          user_name: String(
            user?.user_metadata?.full_name ??
            user?.user_metadata?.name ??
            user?.email ??
            "Client"
          ),
          page_path: window.location.pathname,
          message_text: messageText || null,
          attachment_url: liveAttachment?.url ?? null,
          attachment_name: liveAttachment?.name ?? null,
          attachment_mime: liveAttachment?.mime ?? null,
          attachment_size: liveAttachment?.size ?? null,
        }),
      });

      if (!response.ok) {
        throw new Error(await parseApiError(response, "Failed to send live chat message"));
      }

      const payload = await response.json();
      setLiveDraft("");
      setLiveAttachment(null);

      if (payload?.request) {
        setLiveRequest(payload.request as LiveChatRequestSummary);
      }
      if (typeof payload?.ai_mode_active === "boolean") {
        setLiveAiModeActive(payload.ai_mode_active);
      }

      await loadLiveConversation(true);
    } catch (error: any) {
      toast({
        title: "Send failed",
        description: error?.message || "Could not send message",
        variant: "destructive",
      });
    } finally {
      setLiveSending(false);
    }
  };

  const focusElementById = (id: string) => {
    const element = document.getElementById(id);
    if (!element) return false;
    element.scrollIntoView({ behavior: "smooth", block: "start" });
    if ("focus" in element && typeof element.focus === "function") {
      element.focus();
    }
    return true;
  };

  const handleMessageShortcutClick = () => {
    if (pathname === "/cms/chat" || pathname === "/database/chat") {
      focusElementById("cms-chat-composer");
      return;
    }

    if (pathname.startsWith("/database")) {
      navigate("/database/chat");
      return;
    }

    navigate("/cms/chat");
  };

  const requestStatusLabel = useMemo(() => {
    if (!liveRequest) return "No active ticket";
    if (liveRequest.status === "open") return "Open";
    if (liveRequest.status === "contacted") return "Contacted";
    return "Closed";
  }, [liveRequest]);

  if (isEmployeeDashboardRoute) {
    if (!user || !session?.access_token) {
      return (
        <div className="fixed bottom-6 right-6 z-[9999]">
          <button
            onClick={() =>
              toast({
                title: "Please sign in",
                description: "Login required to open employee inbox.",
              })
            }
            className="h-12 rounded-full bg-primary text-primary-foreground shadow-glow-lg px-4 pr-5 flex items-center gap-2 hover:scale-105 transition-transform"
            aria-label="Open messages"
            type="button"
          >
            <MessageCircle className="w-5 h-5" />
            <span className="text-sm font-semibold">Message</span>
          </button>
        </div>
      );
    }

    return (
      <div className="fixed bottom-6 right-6 z-[9999]">
        {open && (
          <div className="w-[320px] sm:w-[380px] h-[520px] glass-panel shadow-2xl border border-border/60 flex flex-col overflow-hidden mb-4">
            <div className="p-4 border-b border-border/60 flex items-center justify-between bg-background/70">
              <div>
                <p className="text-sm text-muted-foreground">Private Chat</p>
                <h4 className="text-lg font-semibold text-foreground">Inbox With Admin</h4>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setOpen(false);
                    navigate("/employee/dashboard#inbox-full");
                  }}
                  className="px-3 py-1.5 rounded-lg border border-border/60 text-xs font-medium hover:bg-secondary/60 transition-colors"
                  type="button"
                >
                  Full View
                </button>
                <button
                  onClick={() => setOpen(false)}
                  className="p-2 rounded-lg hover:bg-secondary/60 transition-colors"
                  aria-label="Close chat"
                  type="button"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
              {employeeLoading && employeeMessages.length === 0 ? (
                <div className="max-w-[85%] px-4 py-3 rounded-2xl text-sm bg-secondary/70 text-foreground">
                  Loading...
                </div>
              ) : employeeMessages.length === 0 ? (
                <div className="max-w-[85%] px-4 py-3 rounded-2xl text-sm bg-secondary/70 text-foreground">
                  Start a conversation with admin.
                </div>
              ) : (
                employeeMessages.map((message) => {
                  const isEmployeeMessage = message.sender_type === "employee";
                  return (
                    <div
                      key={message.id}
                      className={`max-w-[85%] px-4 py-3 rounded-2xl text-sm leading-relaxed ${
                        isEmployeeMessage
                          ? "ml-auto bg-primary text-primary-foreground"
                          : "bg-secondary/70 text-foreground"
                      }`}
                    >
                      {message.message_text && <p>{message.message_text}</p>}
                      {message.attachment_url && (
                        <a
                          href={message.attachment_url}
                          target="_blank"
                          rel="noreferrer"
                          className={`inline-block mt-2 text-xs underline ${
                            isEmployeeMessage ? "text-primary-foreground" : "text-primary"
                          }`}
                        >
                          {message.attachment_name || "Attachment"}
                        </a>
                      )}
                      <p
                        className={`text-[11px] mt-1 ${
                          isEmployeeMessage ? "text-primary-foreground/70" : "text-muted-foreground"
                        }`}
                      >
                        {new Date(message.created_at).toLocaleString()}
                      </p>
                    </div>
                  );
                })
              )}
            </div>

            <div className="p-4 border-t border-border/60 bg-background/70">
              <div className="flex items-center gap-2">
                <input
                  value={employeeDraft}
                  onChange={(event) => setEmployeeDraft(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && !event.shiftKey) {
                      event.preventDefault();
                      void sendEmployeeMessage();
                    }
                  }}
                  className="flex-1 bg-secondary/60 border border-border/60 rounded-xl px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/60"
                  placeholder="Write a message to admin..."
                />
                <button
                  onClick={() => void sendEmployeeMessage()}
                  className="w-10 h-10 rounded-xl bg-primary text-primary-foreground flex items-center justify-center disabled:opacity-50"
                  disabled={employeeSending || employeeDraft.trim().length === 0}
                  type="button"
                >
                  {employeeSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>
        )}

        <button
          onClick={() => setOpen((prev) => !prev)}
          className="h-12 rounded-full bg-primary text-primary-foreground shadow-glow-lg px-4 pr-5 flex items-center gap-2 hover:scale-105 transition-transform"
          aria-label="Open messages"
          type="button"
        >
          {open ? <X className="w-5 h-5" /> : <MessageCircle className="w-5 h-5" />}
          <span className="text-sm font-semibold">Message</span>
        </button>
      </div>
    );
  }

  if (isMessageShortcutOnlyRoute) {
    return (
      <div className="fixed bottom-6 right-6 z-[9999]">
        <button
          onClick={handleMessageShortcutClick}
          className="h-12 rounded-full bg-primary text-primary-foreground shadow-glow-lg px-4 pr-5 flex items-center gap-2 hover:scale-105 transition-transform"
          aria-label="Open messages"
          type="button"
        >
          <MessageCircle className="w-5 h-5" />
          <span className="text-sm font-semibold">Message</span>
        </button>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="fixed bottom-6 right-6 z-[9999]">
        <button
          onClick={() =>
            toast({ title: "Please sign in to chat", description: "Create an account to start live chat with us." })
          }
          className="w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-glow-lg flex items-center justify-center hover:scale-105 transition-transform"
          aria-label="Open chat"
          type="button"
        >
          <MessageCircle className="w-6 h-6" />
        </button>
      </div>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 z-[9999]">
      {open && (
        <div className="w-[320px] sm:w-[390px] h-[560px] glass-panel shadow-2xl border border-border/60 flex flex-col overflow-hidden mb-4">
          <div className="p-4 border-b border-border/60 flex items-center justify-between bg-background/70">
            <div>
              <p className="text-sm text-muted-foreground">Live Support</p>
              <h4 className="text-lg font-semibold text-foreground">DrawnDimension Team Chat</h4>
              <p className="text-[11px] text-muted-foreground mt-1">Status: {requestStatusLabel}</p>
              <p className="text-[11px] text-muted-foreground">
                Support: {liveAiModeActive ? "AI Assistant" : "Human Joined"}
              </p>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="p-2 rounded-lg hover:bg-secondary/60 transition-colors"
              aria-label="Close chat"
              type="button"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
            {liveLoading && liveMessages.length === 0 ? (
              <div className="max-w-[85%] px-4 py-3 rounded-2xl bg-secondary/70 text-foreground">
                <Loader2 className="w-4 h-4 animate-spin" />
              </div>
            ) : liveMessages.length === 0 ? (
              <div className="max-w-[90%] px-4 py-3 rounded-2xl text-sm leading-relaxed bg-secondary/70 text-foreground">
                I am NEMO AI assistant of DrawnDimension. Our team will reach you soon. Please tell us what service you are interested in
              </div>
            ) : (
              liveMessages.map((message) => {
                const isUserMessage = message.sender_type === "user";
                return (
                  <div
                    key={message.id}
                    className={`max-w-[88%] px-4 py-3 rounded-2xl text-sm leading-relaxed ${
                      isUserMessage
                        ? "ml-auto bg-primary text-primary-foreground"
                        : "bg-secondary/70 text-foreground"
                    }`}
                  >
                    {!isUserMessage && message.sender_label && (
                      <p className="text-[11px] text-muted-foreground mb-1">{message.sender_label}</p>
                    )}
                    {message.message_text && <p className="whitespace-pre-wrap break-words">{message.message_text}</p>}
                    {message.attachment_url && (
                      <a
                        href={message.attachment_url}
                        target="_blank"
                        rel="noreferrer"
                        className={`inline-block mt-2 text-xs underline break-all ${
                          isUserMessage ? "text-primary-foreground" : "text-primary"
                        }`}
                      >
                        {message.attachment_name || "Attachment"}
                      </a>
                    )}
                    <p className={`text-[11px] mt-1 ${isUserMessage ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                      {new Date(message.created_at).toLocaleString()}
                    </p>
                  </div>
                );
              })
            )}
          </div>

          <div className="p-4 border-t border-border/60 bg-background/70 space-y-3">
            {liveRequest?.status === "contacted" && (
              <p className="text-[11px] text-muted-foreground">
                This previous chat is marked as contacted. Sending a new message will open a fresh live chat request.
              </p>
            )}

            {liveAttachment && (
              <div className="text-xs text-muted-foreground">
                Attached: <span className="font-medium">{liveAttachment.name}</span>
                <button
                  type="button"
                  className="ml-2 text-primary hover:underline"
                  onClick={() => setLiveAttachment(null)}
                >
                  Remove
                </button>
              </div>
            )}

            <div className="flex items-center gap-2">
              <input
                value={liveDraft}
                onChange={(event) => setLiveDraft(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    void sendLiveMessage();
                  }
                }}
                className="flex-1 bg-secondary/60 border border-border/60 rounded-xl px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/60"
                placeholder={liveSending ? "Sending..." : "Write your message..."}
              />
              <button
                type="button"
                onClick={() => liveAttachmentInputRef.current?.click()}
                className="w-10 h-10 rounded-xl bg-secondary/70 text-foreground flex items-center justify-center disabled:opacity-50"
                disabled={liveUploading || liveSending}
                title="Attach file"
              >
                {liveUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Paperclip className="w-4 h-4" />}
              </button>
              <button
                onClick={() => void sendLiveMessage()}
                className="w-10 h-10 rounded-xl bg-primary text-primary-foreground flex items-center justify-center disabled:opacity-50"
                disabled={!canSendLiveMessage}
                type="button"
                title="Send message"
              >
                {liveSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </button>
            </div>
            <input
              ref={liveAttachmentInputRef}
              type="file"
              className="hidden"
              accept=".pdf,.xlsx,.xls,.docx,image/*"
              onChange={handleLiveAttachmentUpload}
            />
          </div>
        </div>
      )}

      <button
        onClick={() => setOpen((prev) => !prev)}
        className="w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-glow-lg flex items-center justify-center hover:scale-105 transition-transform"
        aria-label="Open chat"
        type="button"
      >
        {open ? <X className="w-6 h-6" /> : <MessageCircle className="w-6 h-6" />}
      </button>
    </div>
  );
};

export default ChatWidget;
