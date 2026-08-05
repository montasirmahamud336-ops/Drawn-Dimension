import { ChangeEvent, useEffect, useMemo, useRef, useState } from "react";
import { MessageCircle, X, Send, Loader2, Paperclip, Maximize2, Minimize2, Sparkles, Shield, User } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { getApiBaseUrl, getChatApiBaseUrl } from "@/components/admin/adminAuth";

interface AiMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  created_at: string;
}

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

type ChatPanelMode = "ai" | "live";

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
  const [isSidePanelExpanded, setIsSidePanelExpanded] = useState(false);
  const [panelMode, setPanelMode] = useState<ChatPanelMode>("ai");

  const [aiMessages, setAiMessages] = useState<AiMessage[]>([]);
  const [aiInput, setAiInput] = useState("");
  const [aiLoading, setAiLoading] = useState(false);

  const [employeeMessages, setEmployeeMessages] = useState<EmployeeChatMessage[]>([]);
  const [employeeDraft, setEmployeeDraft] = useState("");
  const [employeeLoading, setEmployeeLoading] = useState(false);
  const [employeeSending, setEmployeeSending] = useState(false);
  const [employeeUploading, setEmployeeUploading] = useState(false);
  const [employeeAttachment, setEmployeeAttachment] = useState<{
    url: string;
    name: string;
    mime: string;
    size: number;
  } | null>(null);

  const [liveRequest, setLiveRequest] = useState<LiveChatRequestSummary | null>(null);
  const [liveMessages, setLiveMessages] = useState<LiveChatMessage[]>([]);
  const [liveDraft, setLiveDraft] = useState("");
  const [liveLoading, setLiveLoading] = useState(false);
  const [liveSending, setLiveSending] = useState(false);
  const [liveUploading, setLiveUploading] = useState(false);
  const [liveAttachment, setLiveAttachment] = useState<LiveChatAttachment | null>(null);
  const [liveAiModeActive, setLiveAiModeActive] = useState(true);

  const scrollRef = useRef<HTMLDivElement>(null);
  const sideDrawerScrollRef = useRef<HTMLDivElement>(null);
  const shouldStickToBottomRef = useRef(true);
  const lastMessageKeyRef = useRef("");
  const liveAttachmentInputRef = useRef<HTMLInputElement>(null);
  const sideDrawerAttachmentInputRef = useRef<HTMLInputElement>(null);
  const employeeAttachmentInputRef = useRef<HTMLInputElement>(null);
  const sideDrawerEmployeeAttachmentInputRef = useRef<HTMLInputElement>(null);

  const location = useLocation();
  const navigate = useNavigate();
  const { user, session } = useAuth();
  const { toast } = useToast();
  const pathname = location.pathname.toLowerCase();

  const [cookieBannerActive, setCookieBannerActive] = useState(() => {
    return !localStorage.getItem("dd_cookie_consent_choice");
  });

  useEffect(() => {
    const handleVisibility = (e: Event) => {
      const customEvent = e as CustomEvent<{ open?: boolean }>;
      if (typeof customEvent.detail?.open === "boolean") {
        setCookieBannerActive(customEvent.detail.open);
      }
    };

    window.addEventListener("cookie-banner-visibility", handleVisibility);
    return () => window.removeEventListener("cookie-banner-visibility", handleVisibility);
  }, []);

  const bottomPositionClass = cookieBannerActive
    ? "bottom-44 sm:bottom-36"
    : "bottom-6";

  const isCmsRoute =
    (pathname.startsWith("/cms") || pathname.startsWith("/database")) && pathname !== "/database/login";
  const isEmployeeDashboardRoute = pathname.startsWith("/employee/dashboard");
  const isMessageShortcutOnlyRoute = isCmsRoute;

  const canSendAi = aiInput.trim().length > 0 && !aiLoading;
  const aiPlaceholder = useMemo(() => (aiLoading ? "Thinking..." : "Type your message..."), [aiLoading]);
  const canSendLiveMessage =
    (liveDraft.trim().length > 0 || Boolean(liveAttachment)) && !liveSending && !liveUploading;
  const canSendEmployeeMessage =
    (employeeDraft.trim().length > 0 || Boolean(employeeAttachment)) && !employeeSending && !employeeUploading;

  const isLivePanelOpen = (open || isSidePanelExpanded) && panelMode === "live";

  const getLastMessageKey = () => {
    if (isEmployeeDashboardRoute) {
      const last = employeeMessages[employeeMessages.length - 1];
      return `${employeeMessages.length}:${last?.id ?? ""}:${last?.created_at ?? ""}`;
    }

    if (panelMode === "live") {
      const last = liveMessages[liveMessages.length - 1];
      return `${liveMessages.length}:${last?.id ?? ""}:${last?.created_at ?? ""}`;
    }

    const last = aiMessages[aiMessages.length - 1];
    return `${aiMessages.length}:${last?.id ?? ""}:${last?.created_at ?? ""}`;
  };

  const isNearBottom = (element: HTMLDivElement, threshold = 72) =>
    element.scrollHeight - element.scrollTop - element.clientHeight <= threshold;

  const scrollToBottom = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
    if (sideDrawerScrollRef.current) {
      sideDrawerScrollRef.current.scrollTop = sideDrawerScrollRef.current.scrollHeight;
    }
  };

  const handleMessageScroll = () => {
    if (scrollRef.current) {
      shouldStickToBottomRef.current = isNearBottom(scrollRef.current);
    }
  };

  const handleSideDrawerScroll = () => {
    if (sideDrawerScrollRef.current) {
      shouldStickToBottomRef.current = isNearBottom(sideDrawerScrollRef.current);
    }
  };

  const makeId = () => {
    try {
      return crypto.randomUUID();
    } catch {
      return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    }
  };

  useEffect(() => {
    const handleOpenLiveChat = () => {
      if (isEmployeeDashboardRoute || isMessageShortcutOnlyRoute) return;
      if (!user || !session?.access_token) {
        toast({
          title: "Please sign in to chat",
          description: "Create an account to start live chat with us.",
        });
        return;
      }

      setPanelMode("live");
      setOpen(true);
    };

    window.addEventListener("open-live-chat", handleOpenLiveChat);
    return () => window.removeEventListener("open-live-chat", handleOpenLiveChat);
  }, [isEmployeeDashboardRoute, isMessageShortcutOnlyRoute, user, session?.access_token, toast]);

  useEffect(() => {
    if (!open && !isSidePanelExpanded) return;
    shouldStickToBottomRef.current = true;
    requestAnimationFrame(() => scrollToBottom());
  }, [open, isSidePanelExpanded, panelMode, isEmployeeDashboardRoute]);

  const messageKey = getLastMessageKey();
  useEffect(() => {
    if (!open && !isSidePanelExpanded) return;
    const hasNewMessage = messageKey !== lastMessageKeyRef.current;
    lastMessageKeyRef.current = messageKey;
    if (!hasNewMessage || !shouldStickToBottomRef.current) return;
    requestAnimationFrame(() => scrollToBottom());
  }, [open, isSidePanelExpanded, messageKey]);

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
    if (!isEmployeeDashboardRoute || (!open && !isSidePanelExpanded)) return;
    void loadEmployeeMessages();
  }, [isEmployeeDashboardRoute, open, isSidePanelExpanded, session?.access_token]);

  useEffect(() => {
    if (!isEmployeeDashboardRoute || (!open && !isSidePanelExpanded) || !session?.access_token) return;
    const timer = window.setInterval(() => {
      void loadEmployeeMessages(true);
    }, 15000);
    return () => window.clearInterval(timer);
  }, [isEmployeeDashboardRoute, open, isSidePanelExpanded, session?.access_token]);

  const handleEmployeeAttachmentUpload = async (event: ChangeEvent<HTMLInputElement>) => {
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

    setEmployeeUploading(true);
    try {
      const apiBase = getApiBaseUrl();
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch(`${apiBase}/employee/chat/upload`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
        body: formData,
      });

      if (!response.ok) {
        throw new Error(await parseApiError(response, "File upload failed"));
      }

      const data = await response.json();
      const publicUrl = data.publicUrl || data.url;
      if (!publicUrl) throw new Error("Upload URL missing");

      setEmployeeAttachment({
        url: publicUrl,
        name: data.fileName || data.name || file.name,
        mime: data.mimeType || data.mime || file.type || "application/octet-stream",
        size: Number(data.size || file.size),
      });

      toast({
        title: "File attached",
        description: "Your file is ready to send to admin.",
      });
    } catch (error: any) {
      toast({
        title: "Upload failed",
        description: error?.message || "Could not upload attachment",
        variant: "destructive",
      });
    } finally {
      setEmployeeUploading(false);
    }
  };

  const sendEmployeeMessage = async () => {
    if (!session?.access_token || employeeSending || employeeUploading) return;
    const text = employeeDraft.trim();
    const attachment = employeeAttachment;
    if (!text && !attachment) return;

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
          message_text: text || null,
          attachment_url: attachment?.url ?? null,
          attachment_name: attachment?.name ?? null,
        }),
      });

      if (!response.ok) {
        throw new Error(await parseApiError(response, "Failed to send message"));
      }

      setEmployeeDraft("");
      setEmployeeAttachment(null);
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
    if (
      !isLivePanelOpen ||
      !user ||
      !session?.access_token ||
      isEmployeeDashboardRoute ||
      isMessageShortcutOnlyRoute
    ) {
      return;
    }

    void loadLiveConversation();
  }, [isLivePanelOpen, user?.id, session?.access_token, isEmployeeDashboardRoute, isMessageShortcutOnlyRoute]);

  useEffect(() => {
    if (
      !isLivePanelOpen ||
      !user ||
      !session?.access_token ||
      isEmployeeDashboardRoute ||
      isMessageShortcutOnlyRoute
    ) {
      return;
    }

    const timer = window.setInterval(() => {
      void loadLiveConversation(true);
    }, 7000);
    return () => window.clearInterval(timer);
  }, [isLivePanelOpen, user?.id, session?.access_token, isEmployeeDashboardRoute, isMessageShortcutOnlyRoute]);

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
        throw new Error(await parseApiError(response, "File upload failed"));
      }

      const data = await response.json();
      if (!data?.url) throw new Error("Upload URL missing");

      setLiveAttachment({
        url: data.url,
        name: data.name || file.name,
        mime: data.mime || file.type || "application/octet-stream",
        size: Number(data.size || file.size),
      });

      toast({
        title: "File attached",
        description: "Your file is ready to send.",
      });
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
    const attachment = liveAttachment;

    setLiveSending(true);
    try {
      const chatApiBase = getChatApiBaseUrl();
      const bodyPayload: Record<string, any> = {
        message_text: messageText || null,
        page_path: pathname,
      };

      if (attachment) {
        bodyPayload.attachment_url = attachment.url;
        bodyPayload.attachment_name = attachment.name;
        bodyPayload.attachment_mime = attachment.mime;
      }

      const response = await fetch(`${chatApiBase}/messages`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(bodyPayload),
      });

      if (!response.ok) {
        throw new Error(await parseApiError(response, "Failed to send live message"));
      }

      setLiveDraft("");
      setLiveAttachment(null);
      await loadLiveConversation(true);
    } catch (error: any) {
      toast({
        title: "Send failed",
        description: error?.message || "Could not send live message",
        variant: "destructive",
      });
    } finally {
      setLiveSending(false);
    }
  };

  const sendAiMessage = async () => {
    const text = aiInput.trim();
    if (!text || aiLoading) return;

    const userMessage: AiMessage = {
      id: makeId(),
      role: "user",
      content: text,
      created_at: new Date().toISOString(),
    };

    setAiMessages((prev) => [...prev, userMessage]);
    setAiInput("");
    setAiLoading(true);

    try {
      const chatApiBase = getChatApiBaseUrl();
      const historyPayload = aiMessages.slice(-6).map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const response = await fetch(`${chatApiBase}/ai`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: text,
          history: historyPayload,
        }),
      });

      if (!response.ok) {
        throw new Error(await parseApiError(response, "AI response failed"));
      }

      const data = await response.json();
      const reply = data?.reply || "I received your message. How else can I assist?";

      const assistantMessage: AiMessage = {
        id: makeId(),
        role: "assistant",
        content: reply,
        created_at: new Date().toISOString(),
      };

      setAiMessages((prev) => [...prev, assistantMessage]);
    } catch (error: any) {
      toast({
        title: "AI Chat Error",
        description: error?.message || "Could not process AI request",
        variant: "destructive",
      });
    } finally {
      setAiLoading(false);
    }
  };

  const focusElementById = (elementId: string) => {
    if (typeof document === "undefined") return false;
    const element = document.getElementById(elementId);
    if (!element) return false;
    element.scrollIntoView({ behavior: "smooth", block: "center" });
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

  {/* Smooth Side Panel Drawer when Full View is expanded */}
  const renderSidePanelDrawer = () => {
    if (!isSidePanelExpanded) return null;

    return (
      <>
        {/* Dark Backdrop Overlay */}
        <div
          onClick={() => setIsSidePanelExpanded(false)}
          className="fixed inset-0 bg-black/60 backdrop-blur-md z-[99998] transition-opacity duration-300 animate-in fade-in cursor-pointer"
        />

        {/* Side Panel Container */}
        <div
          data-lenis-prevent
          className="fixed top-0 right-0 bottom-0 z-[99999] w-full sm:w-[500px] md:w-[560px] bg-card/98 dark:bg-card/95 border-l border-border/80 shadow-2xl backdrop-blur-2xl flex flex-col animate-in slide-in-from-right duration-300 cursor-auto"
        >
          {/* Drawer Header */}
          <div className="p-5 border-b border-border/70 bg-muted/30 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <img src="/images/logo.png" alt="DrawnDimension Logo" className="w-10 h-10 object-contain shrink-0" />
              <div>
                <h3 className="text-base font-bold text-foreground leading-tight">
                  {isEmployeeDashboardRoute
                    ? "Drawn Dimension"
                    : panelMode === "live"
                    ? "Drawn Dimension Live Support"
                    : "NEMO AI Assistant"}
                </h3>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-xs text-muted-foreground font-medium">
                    {isEmployeeDashboardRoute
                      ? "Direct Communication Channel"
                      : panelMode === "live"
                      ? requestStatusLabel
                      : "Always Online"}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setIsSidePanelExpanded(false);
                  setOpen(true);
                }}
                className="px-3 py-1.5 rounded-xl border border-border/70 bg-background/80 hover:bg-secondary text-xs font-semibold text-foreground transition-all flex items-center gap-1.5 shadow-sm cursor-pointer"
                title="Collapse to floating widget"
              >
                <Minimize2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Minimize</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsSidePanelExpanded(false);
                  setOpen(false);
                }}
                className="p-2 rounded-xl hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                aria-label="Close drawer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Drawer Body Conversation Area */}
          <div
            ref={sideDrawerScrollRef}
            onScroll={handleSideDrawerScroll}
            className="flex-1 min-h-0 overflow-y-auto p-6 space-y-4 bg-background/40 scroll-smooth custom-scrollbar overscroll-contain"
            style={{ WebkitOverflowScrolling: "touch" }}
          >
            {isEmployeeDashboardRoute ? (
              employeeLoading && employeeMessages.length === 0 ? (
                <div className="flex items-center justify-center h-40 text-muted-foreground">
                  <Loader2 className="w-6 h-6 animate-spin mr-2" /> Loading admin messages...
                </div>
              ) : employeeMessages.length === 0 ? (
                <div className="p-6 rounded-2xl border border-border/60 bg-muted/40 text-center text-sm text-muted-foreground">
                  No messages yet. Send a message to start direct conversation with admin.
                </div>
              ) : (
                employeeMessages.map((message) => {
                  const isEmployee = message.sender_type === "employee";
                  return (
                    <div
                      key={message.id}
                      className={`max-w-[85%] rounded-3xl p-4 text-sm leading-relaxed shadow-sm ${
                        isEmployee
                          ? "ml-auto bg-primary text-primary-foreground rounded-br-sm"
                          : "bg-card border border-border/60 text-foreground rounded-bl-sm"
                      }`}
                    >
                      {message.message_text && (
                        <p className="whitespace-pre-wrap break-words">{message.message_text}</p>
                      )}
                      {message.attachment_url && (
                        <a
                          href={message.attachment_url}
                          target="_blank"
                          rel="noreferrer"
                          className={`inline-flex items-center gap-1.5 mt-2 text-xs underline font-medium ${
                            isEmployee ? "text-primary-foreground" : "text-primary"
                          }`}
                        >
                          <Paperclip className="w-3.5 h-3.5" />
                          {message.attachment_name || "Attachment"}
                        </a>
                      )}
                      <p
                        className={`text-[10px] mt-2 ${
                          isEmployee ? "text-primary-foreground/75" : "text-muted-foreground"
                        }`}
                      >
                        {new Date(message.created_at).toLocaleString()}
                      </p>
                    </div>
                  );
                })
              )
            ) : panelMode === "live" ? (
              liveLoading && liveMessages.length === 0 ? (
                <div className="flex items-center justify-center h-40 text-muted-foreground">
                  <Loader2 className="w-6 h-6 animate-spin mr-2" /> Loading support conversation...
                </div>
              ) : liveMessages.length === 0 ? (
                <div className="p-6 rounded-2xl border border-border/60 bg-muted/40 text-center text-sm text-muted-foreground">
                  Start live chat with our engineering team here.
                </div>
              ) : (
                liveMessages.map((message) => {
                  const isUserMessage = message.sender_type === "user";
                  return (
                    <div
                      key={message.id}
                      className={`max-w-[85%] rounded-3xl p-4 text-sm leading-relaxed shadow-sm ${
                        isUserMessage
                          ? "ml-auto bg-primary text-primary-foreground rounded-br-sm"
                          : "bg-card border border-border/60 text-foreground rounded-bl-sm"
                      }`}
                    >
                      {!isUserMessage && message.sender_label && (
                        <p className="text-[11px] font-bold text-muted-foreground mb-1">
                          {message.sender_label}
                        </p>
                      )}
                      {message.message_text && (
                        <p className="whitespace-pre-wrap break-words">{message.message_text}</p>
                      )}
                      {message.attachment_url && (
                        <a
                          href={message.attachment_url}
                          target="_blank"
                          rel="noreferrer"
                          className={`inline-flex items-center gap-1.5 mt-2 text-xs underline font-medium ${
                            isUserMessage ? "text-primary-foreground" : "text-primary"
                          }`}
                        >
                          <Paperclip className="w-3.5 h-3.5" />
                          {message.attachment_name || "Attachment"}
                        </a>
                      )}
                      <p
                        className={`text-[10px] mt-2 ${
                          isUserMessage ? "text-primary-foreground/75" : "text-muted-foreground"
                        }`}
                      >
                        {new Date(message.created_at).toLocaleString()}
                      </p>
                    </div>
                  );
                })
              )
            ) : (
              /* AI Chat Feed */
              aiMessages.length === 0 && !aiLoading ? (
                <div className="p-6 rounded-2xl border border-border/60 bg-muted/40 text-center text-sm text-muted-foreground">
                  Hi, I&apos;m NEMO. How can I assist you with services or project ideas today?
                </div>
              ) : (
                aiMessages.map((message) => (
                  <div
                    key={message.id}
                    className={`max-w-[85%] rounded-3xl p-4 text-sm leading-relaxed shadow-sm ${
                      message.role === "user"
                        ? "ml-auto bg-primary text-primary-foreground rounded-br-sm"
                        : "bg-card border border-border/60 text-foreground rounded-bl-sm"
                    }`}
                  >
                    {message.role === "assistant" ? (
                      <ReactMarkdown>{message.content}</ReactMarkdown>
                    ) : (
                      <p className="whitespace-pre-wrap break-words">{message.content}</p>
                    )}
                  </div>
                ))
              )
            )}

            {(aiLoading || (panelMode === "live" && liveSending) || (isEmployeeDashboardRoute && employeeSending)) && (
              <div className="max-w-[85%] p-4 rounded-3xl bg-card border border-border/60 text-foreground flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-primary" />
                <span className="text-xs font-medium text-muted-foreground">Processing message...</span>
              </div>
            )}
          </div>

          {/* Drawer Composer Footer */}
          <div className="p-5 border-t border-border/70 bg-card">
            {isEmployeeDashboardRoute && employeeAttachment && (
              <div className="mb-3 text-xs text-muted-foreground flex items-center justify-between p-2 rounded-xl bg-muted">
                <span>Attached: <strong className="text-foreground">{employeeAttachment.name}</strong></span>
                <button
                  type="button"
                  onClick={() => setEmployeeAttachment(null)}
                  className="text-primary hover:underline text-xs cursor-pointer"
                >
                  Remove
                </button>
              </div>
            )}

            {panelMode === "live" && liveAttachment && (
              <div className="mb-3 text-xs text-muted-foreground flex items-center justify-between p-2 rounded-xl bg-muted">
                <span>Attached: <strong className="text-foreground">{liveAttachment.name}</strong></span>
                <button
                  type="button"
                  onClick={() => setLiveAttachment(null)}
                  className="text-primary hover:underline text-xs cursor-pointer"
                >
                  Remove
                </button>
              </div>
            )}

            <div className="flex items-center gap-3">
              <input
                value={
                  isEmployeeDashboardRoute
                    ? employeeDraft
                    : panelMode === "live"
                    ? liveDraft
                    : aiInput
                }
                onChange={(e) => {
                  if (isEmployeeDashboardRoute) setEmployeeDraft(e.target.value);
                  else if (panelMode === "live") setLiveDraft(e.target.value);
                  else setAiInput(e.target.value);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    if (isEmployeeDashboardRoute) void sendEmployeeMessage();
                    else if (panelMode === "live") void sendLiveMessage();
                    else void sendAiMessage();
                  }
                }}
                placeholder={
                  isEmployeeDashboardRoute
                    ? "Write a message to admin..."
                    : panelMode === "live"
                    ? "Write message to support..."
                    : aiPlaceholder
                }
                className="flex-1 bg-muted/50 border border-border/70 rounded-2xl px-4 py-3 text-sm text-foreground outline-none focus:border-primary/60 focus:bg-background transition-all cursor-text"
              />

              {isEmployeeDashboardRoute && (
                <button
                  type="button"
                  onClick={() => sideDrawerEmployeeAttachmentInputRef.current?.click()}
                  disabled={employeeUploading || employeeSending}
                  className="w-12 h-12 rounded-2xl bg-muted border border-border/70 text-foreground flex items-center justify-center hover:bg-secondary transition-all disabled:opacity-50 cursor-pointer"
                  title="Attach File"
                >
                  {employeeUploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Paperclip className="w-5 h-5" />}
                </button>
              )}

              {!isEmployeeDashboardRoute && panelMode === "live" && (
                <button
                  type="button"
                  onClick={() => sideDrawerAttachmentInputRef.current?.click()}
                  disabled={liveUploading || liveSending}
                  className="w-12 h-12 rounded-2xl bg-muted border border-border/70 text-foreground flex items-center justify-center hover:bg-secondary transition-all disabled:opacity-50 cursor-pointer"
                  title="Attach File"
                >
                  {liveUploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Paperclip className="w-5 h-5" />}
                </button>
              )}

              <button
                type="button"
                onClick={() => {
                  if (isEmployeeDashboardRoute) void sendEmployeeMessage();
                  else if (panelMode === "live") void sendLiveMessage();
                  else void sendAiMessage();
                }}
                disabled={
                  isEmployeeDashboardRoute
                    ? !canSendEmployeeMessage
                    : panelMode === "live"
                    ? !canSendLiveMessage
                    : !canSendAi
                }
                className="w-12 h-12 rounded-2xl bg-primary text-primary-foreground flex items-center justify-center shadow-md hover:bg-primary/90 transition-all disabled:opacity-50 cursor-pointer"
              >
                {employeeSending || liveSending || aiLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Send className="w-5 h-5" />
                )}
              </button>
            </div>

            <input
              ref={sideDrawerAttachmentInputRef}
              type="file"
              className="hidden"
              accept=".pdf,.xlsx,.xls,.docx,image/*"
              onChange={handleLiveAttachmentUpload}
            />
            <input
              ref={sideDrawerEmployeeAttachmentInputRef}
              type="file"
              className="hidden"
              accept=".pdf,.xlsx,.xls,.docx,image/*"
              onChange={handleEmployeeAttachmentUpload}
            />
          </div>
        </div>
      </>
    );
  };

  if (isEmployeeDashboardRoute) {
    if (!user || !session?.access_token) {
      return (
        <div className={`fixed ${bottomPositionClass} right-6 z-[9999] transition-all duration-300 ease-out`}>
          <button
            onClick={() =>
              toast({
                title: "Please sign in",
                description: "Login required to open employee inbox.",
              })
            }
            className="h-12 rounded-full bg-primary text-primary-foreground shadow-glow-lg px-4 pr-5 flex items-center gap-2 hover:scale-105 transition-transform cursor-pointer"
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
      <>
        {renderSidePanelDrawer()}
        <div className={`fixed ${bottomPositionClass} right-6 z-[9999] transition-all duration-300 ease-out`}>
          {open && !isSidePanelExpanded && (
            <div
              data-lenis-prevent
              className="w-[320px] sm:w-[380px] h-[520px] glass-panel shadow-2xl border border-border/60 flex flex-col overflow-hidden min-h-0 mb-4 cursor-auto"
            >
              <div className="p-4 border-b border-border/60 flex items-center justify-between bg-background/70">
                <div className="flex items-center gap-3">
                  <img src="/images/logo.png" alt="DrawnDimension Logo" className="w-9 h-9 object-contain shrink-0" />
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">Inbox With Admin</p>
                    <h4 className="text-base font-bold text-foreground leading-tight">Drawn Dimension</h4>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setOpen(false);
                      setIsSidePanelExpanded(true);
                    }}
                    className="px-3 py-1.5 rounded-lg border border-border/60 text-xs font-medium hover:bg-secondary/60 transition-colors flex items-center gap-1.5 cursor-pointer"
                    type="button"
                  >
                    <Maximize2 className="w-3.5 h-3.5" />
                    Full View
                  </button>
                  <button
                    onClick={() => setOpen(false)}
                    className="p-2 rounded-lg hover:bg-secondary/60 transition-colors cursor-pointer"
                    aria-label="Close chat"
                    type="button"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <div
                ref={scrollRef}
                onScroll={handleMessageScroll}
                className="flex-1 min-h-0 overflow-y-scroll overscroll-contain touch-pan-y p-4 space-y-3 scroll-smooth custom-scrollbar"
                style={{ WebkitOverflowScrolling: "touch" }}
              >
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
                        className={`max-w-[85%] px-4 py-3 rounded-2xl text-sm leading-relaxed ${isEmployeeMessage
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
                            className={`inline-block mt-2 text-xs underline ${isEmployeeMessage ? "text-primary-foreground" : "text-primary"
                              }`}
                          >
                            {message.attachment_name || "Attachment"}
                          </a>
                        )}
                        <p
                          className={`text-[11px] mt-1 ${isEmployeeMessage ? "text-primary-foreground/70" : "text-muted-foreground"
                            }`}
                        >
                          {new Date(message.created_at).toLocaleString()}
                        </p>
                      </div>
                    );
                  })
                )}
              </div>

              <div className="p-4 border-t border-border/60 bg-background/70 space-y-2">
                {employeeAttachment && (
                  <div className="text-xs text-muted-foreground flex items-center justify-between">
                    <span>Attached: <strong className="text-foreground">{employeeAttachment.name}</strong></span>
                    <button
                      type="button"
                      onClick={() => setEmployeeAttachment(null)}
                      className="text-primary hover:underline text-xs cursor-pointer"
                    >
                      Remove
                    </button>
                  </div>
                )}
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
                    className="flex-1 bg-secondary/60 border border-border/60 rounded-xl px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/60 cursor-text"
                    placeholder="Write a message to admin..."
                  />
                  <button
                    type="button"
                    onClick={() => employeeAttachmentInputRef.current?.click()}
                    disabled={employeeUploading || employeeSending}
                    className="w-10 h-10 rounded-xl bg-secondary/70 text-foreground flex items-center justify-center disabled:opacity-50 cursor-pointer"
                    title="Attach file"
                  >
                    {employeeUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Paperclip className="w-4 h-4" />}
                  </button>
                  <button
                    onClick={() => void sendEmployeeMessage()}
                    className="w-10 h-10 rounded-xl bg-primary text-primary-foreground flex items-center justify-center disabled:opacity-50 cursor-pointer"
                    disabled={!canSendEmployeeMessage}
                    type="button"
                  >
                    {employeeSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  </button>
                </div>
                <input
                  ref={employeeAttachmentInputRef}
                  type="file"
                  className="hidden"
                  accept=".pdf,.xlsx,.xls,.docx,image/*"
                  onChange={handleEmployeeAttachmentUpload}
                />
              </div>
            </div>
          )}

          <button
            onClick={() => {
              if (isSidePanelExpanded) {
                setIsSidePanelExpanded(false);
                setOpen(false);
                return;
              }
              setOpen((prev) => !prev);
            }}
            className="h-12 rounded-full bg-primary text-primary-foreground shadow-glow-lg px-4 pr-5 flex items-center gap-2 hover:scale-105 transition-transform cursor-pointer"
            aria-label="Open messages"
            type="button"
          >
            {open || isSidePanelExpanded ? <X className="w-5 h-5" /> : <MessageCircle className="w-5 h-5" />}
            <span className="text-sm font-semibold">Message</span>
          </button>
        </div>
      </>
    );
  }

  if (isMessageShortcutOnlyRoute) {
    return (
      <div className="fixed bottom-6 right-6 z-[9999]">
        <button
          onClick={handleMessageShortcutClick}
          className="h-12 rounded-full bg-primary text-primary-foreground shadow-glow-lg px-4 pr-5 flex items-center gap-2 hover:scale-105 transition-transform cursor-pointer"
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
      <div className={`fixed ${bottomPositionClass} right-6 z-[9999] transition-all duration-300 ease-out`}>
        <button
          onClick={() =>
            toast({ title: "Please sign in to chat", description: "Create an account to start chatting with us." })
          }
          className="w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-glow-lg flex items-center justify-center hover:scale-105 transition-transform cursor-pointer"
          aria-label="Open chat"
          type="button"
        >
          <MessageCircle className="w-6 h-6" />
        </button>
      </div>
    );
  }

  return (
    <>
      {renderSidePanelDrawer()}
      <div className={`fixed ${bottomPositionClass} right-6 z-[9999] transition-all duration-300 ease-out`}>
        {open && !isSidePanelExpanded && panelMode === "ai" && (
          <div
            data-lenis-prevent
            className="w-[320px] sm:w-[390px] h-[560px] glass-panel shadow-2xl border border-border/60 flex flex-col overflow-hidden min-h-0 mb-4 cursor-auto"
          >
            <div className="p-4 border-b border-border/60 flex items-start justify-between bg-background/70 gap-3">
              <div>
                <p className="text-sm text-muted-foreground">AI Support</p>
                <h4 className="text-lg font-semibold text-foreground">NEMO</h4>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setOpen(false);
                    setIsSidePanelExpanded(true);
                  }}
                  className="p-1.5 rounded-lg border border-border/60 text-xs font-medium hover:bg-secondary/60 transition-colors cursor-pointer"
                  title="Full View"
                >
                  <Maximize2 className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setPanelMode("live");
                    setOpen(true);
                  }}
                  className="px-3 py-1.5 rounded-lg border border-border/60 text-xs font-medium hover:bg-secondary/60 transition-colors cursor-pointer"
                >
                  Live Chat
                </button>
                <button
                  onClick={() => setOpen(false)}
                  className="p-2 rounded-lg hover:bg-secondary/60 transition-colors cursor-pointer"
                  aria-label="Close chat"
                  type="button"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div
              ref={scrollRef}
              onScroll={handleMessageScroll}
              className="flex-1 min-h-0 overflow-y-scroll overscroll-contain touch-pan-y p-4 space-y-4 scroll-smooth custom-scrollbar"
              style={{ WebkitOverflowScrolling: "touch" }}
            >
              {aiMessages.length === 0 && !aiLoading ? (
                <div className="max-w-[85%] px-4 py-3 rounded-2xl text-sm leading-relaxed bg-secondary/70 text-foreground">
                  Hi, I&apos;m NEMO. I can help with services, pricing, or project ideas. How can I help?
                </div>
              ) : (
                aiMessages.map((message) => (
                  <div
                    key={message.id}
                    className={`max-w-[85%] px-4 py-3 rounded-2xl text-sm leading-relaxed ${message.role === "user"
                        ? "ml-auto bg-primary text-primary-foreground"
                        : "bg-secondary/70 text-foreground"
                      }`}
                  >
                    {message.role === "assistant" ? (
                      <ReactMarkdown>{message.content}</ReactMarkdown>
                    ) : (
                      <p className="whitespace-pre-wrap break-words">{message.content}</p>
                    )}
                  </div>
                ))
              )}
              {aiLoading && (
                <div className="max-w-[85%] px-4 py-3 rounded-2xl bg-secondary/70 text-foreground">
                  <Loader2 className="w-4 h-4 animate-spin" />
                </div>
              )}
            </div>

            <div className="p-4 border-t border-border/60 bg-background/70">
              <div className="flex items-center gap-2">
                <input
                  value={aiInput}
                  onChange={(event) => setAiInput(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && !event.shiftKey) {
                      event.preventDefault();
                      void sendAiMessage();
                    }
                  }}
                  className="flex-1 bg-secondary/60 border border-border/60 rounded-xl px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/60 cursor-text"
                  placeholder={aiPlaceholder}
                />
                <button
                  onClick={() => void sendAiMessage()}
                  className="w-10 h-10 rounded-xl bg-primary text-primary-foreground flex items-center justify-center disabled:opacity-50 cursor-pointer"
                  disabled={!canSendAi}
                  type="button"
                  title="Send message"
                >
                  {aiLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>
        )}

        {isLivePanelOpen && !isSidePanelExpanded && (
          <div
            data-lenis-prevent
            className="w-[320px] sm:w-[390px] h-[560px] glass-panel shadow-2xl border border-border/60 flex flex-col overflow-hidden min-h-0 mb-4 cursor-auto"
          >
            <div className="p-4 border-b border-border/60 flex items-start justify-between bg-background/70 gap-3">
              <div>
                <p className="text-sm text-muted-foreground">Live Support</p>
                <h4 className="text-lg font-semibold text-foreground">DrawnDimension Team Chat</h4>
                <p className="text-[11px] text-muted-foreground mt-1">Status: {requestStatusLabel}</p>
                <p className="text-[11px] text-muted-foreground">
                  {liveAiModeActive ? "Support queue active" : "Human support joined"}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setOpen(false);
                    setIsSidePanelExpanded(true);
                  }}
                  className="p-1.5 rounded-lg border border-border/60 text-xs font-medium hover:bg-secondary/60 transition-colors cursor-pointer"
                  title="Full View"
                >
                  <Maximize2 className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setPanelMode("ai");
                    setOpen(true);
                  }}
                  className="px-3 py-1.5 rounded-lg border border-border/60 text-xs font-medium hover:bg-secondary/60 transition-colors cursor-pointer"
                >
                  AI Assistant
                </button>
                <button
                  onClick={() => setOpen(false)}
                  className="p-2 rounded-lg hover:bg-secondary/60 transition-colors cursor-pointer"
                  aria-label="Close chat"
                  type="button"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div
              ref={scrollRef}
              onScroll={handleMessageScroll}
              className="flex-1 min-h-0 overflow-y-scroll overscroll-contain touch-pan-y p-4 space-y-4 scroll-smooth custom-scrollbar"
              style={{ WebkitOverflowScrolling: "touch" }}
            >
              {liveLoading && liveMessages.length === 0 ? (
                <div className="max-w-[85%] px-4 py-3 rounded-2xl bg-secondary/70 text-foreground">
                  <Loader2 className="w-4 h-4 animate-spin" />
                </div>
              ) : liveMessages.length === 0 ? (
                <div className="max-w-[90%] px-4 py-3 rounded-2xl text-sm leading-relaxed bg-secondary/70 text-foreground">
                  Start live chat here. Share your requirement and our support team will contact you shortly.
                </div>
              ) : (
                liveMessages.map((message) => {
                  const isUserMessage = message.sender_type === "user";
                  return (
                    <div
                      key={message.id}
                      className={`max-w-[88%] px-4 py-3 rounded-2xl text-sm leading-relaxed ${isUserMessage
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
                          className={`inline-block mt-2 text-xs underline break-all ${isUserMessage ? "text-primary-foreground" : "text-primary"
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
                <div className="text-xs text-muted-foreground flex items-center justify-between">
                  <span>Attached: <strong className="text-foreground">{liveAttachment.name}</strong></span>
                  <button
                    type="button"
                    className="text-primary hover:underline text-xs cursor-pointer"
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
                  className="flex-1 bg-secondary/60 border border-border/60 rounded-xl px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/60 cursor-text"
                  placeholder={liveSending ? "Sending..." : "Write your message..."}
                />
                <button
                  type="button"
                  onClick={() => liveAttachmentInputRef.current?.click()}
                  className="w-10 h-10 rounded-xl bg-secondary/70 text-foreground flex items-center justify-center disabled:opacity-50 cursor-pointer"
                  disabled={liveUploading || liveSending}
                  title="Attach file"
                >
                  {liveUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Paperclip className="w-4 h-4" />}
                </button>
                <button
                  onClick={() => void sendLiveMessage()}
                  className="w-10 h-10 rounded-xl bg-primary text-primary-foreground flex items-center justify-center disabled:opacity-50 cursor-pointer"
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
          onClick={() => {
            if (isSidePanelExpanded) {
              setIsSidePanelExpanded(false);
              setOpen(false);
              return;
            }
            if (open) {
              setOpen(false);
              return;
            }
            setPanelMode("ai");
            setOpen(true);
          }}
          className="w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-glow-lg flex items-center justify-center hover:scale-105 transition-transform cursor-pointer"
          aria-label="Open chat"
          type="button"
        >
          {open || isSidePanelExpanded ? <X className="w-6 h-6" /> : <MessageCircle className="w-6 h-6" />}
        </button>
      </div>
    </>
  );
};

export default ChatWidget;
