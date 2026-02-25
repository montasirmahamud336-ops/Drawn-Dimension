import { useEffect, useMemo, useRef, useState } from "react";
import { MessageCircle, X, Send, Loader2 } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { getApiBaseUrl } from "@/components/admin/adminAuth";
import ReactMarkdown from "react-markdown";

interface Message {
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

const ChatWidget = () => {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [employeeMessages, setEmployeeMessages] = useState<EmployeeChatMessage[]>([]);
  const [employeeDraft, setEmployeeDraft] = useState("");
  const [employeeLoading, setEmployeeLoading] = useState(false);
  const [employeeSending, setEmployeeSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, session } = useAuth();
  const { toast } = useToast();
  const pathname = location.pathname.toLowerCase();
  const isCmsRoute =
    (pathname.startsWith("/cms") || pathname.startsWith("/database")) && pathname !== "/database/login";
  const isEmployeeDashboardRoute = pathname.startsWith("/employee/dashboard");
  const isMessageShortcutOnlyRoute = isCmsRoute;

  const canSend = input.trim().length > 0 && !isLoading;
  const placeholder = useMemo(() => (isLoading ? "Thinking..." : "Type your message..."), [isLoading]);

  const makeId = () => {
    try {
      return crypto.randomUUID();
    } catch {
      return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    }
  };

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading, employeeMessages, employeeLoading, open, isEmployeeDashboardRoute]);

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
    loadEmployeeMessages();
  }, [isEmployeeDashboardRoute, open, session?.access_token]);

  useEffect(() => {
    if (!isEmployeeDashboardRoute || !open || !session?.access_token) return;
    const timer = window.setInterval(() => {
      loadEmployeeMessages(true);
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
                      sendEmployeeMessage();
                    }
                  }}
                  className="flex-1 bg-secondary/60 border border-border/60 rounded-xl px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/60"
                  placeholder="Write a message to admin..."
                />
                <button
                  onClick={sendEmployeeMessage}
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

  const sendMessage = async () => {
    if (!canSend) return;

    setIsLoading(true);
    const userMessage = input.trim();
    setInput("");

    const tempId = makeId();
    const newUserMsg: Message = {
      id: tempId,
      role: "user",
      content: userMessage,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, newUserMsg]);

    try {
      const chatBase = ((import.meta as any).env?.VITE_CHAT_API_BASE_URL as string | undefined)
        ?.trim()
        .replace(/\/$/, "");
      const chatUrl = chatBase ? `${chatBase}/api/chat` : "/api/chat";

      const response = await fetch(chatUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userMessage,
          history: [...messages, newUserMsg].slice(-10).map((m) => ({
            role: m.role,
            content: m.content,
          })),
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`AI API error ${response.status}: ${errorText}`);
      }

      const data = await response.json();
      const aiResponse = data?.reply || "I couldn't generate a response right now.";
      const aiMsg: Message = {
        id: makeId(),
        role: "assistant",
        content: aiResponse,
        created_at: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, aiMsg]);
    } catch (error) {
      console.error("Chat error:", error);
      let message =
        (error as { message?: string })?.message ||
        (typeof error === "string" ? error : "Failed to send message. Please try again.");

      toast({
        title: "Error",
        description: message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="fixed bottom-6 right-6 z-[9999]">
        <button
          onClick={() =>
            toast({ title: "Please sign in to chat", description: "Create an account to start chatting with us." })
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
        <div className="w-[320px] sm:w-[380px] h-[520px] glass-panel shadow-2xl border border-border/60 flex flex-col overflow-hidden mb-4">
          <div className="p-4 border-b border-border/60 flex items-center justify-between bg-background/70">
            <div>
              <p className="text-sm text-muted-foreground">AI Support</p>
              <h4 className="text-lg font-semibold text-foreground">NEMO</h4>
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
            {messages.length === 0 && !isLoading ? (
              <div className="max-w-[85%] px-4 py-3 rounded-2xl text-sm leading-relaxed bg-secondary/70 text-foreground">
                Hi, I&apos;m NEMO. I can help with services, pricing, or project ideas. How can I help?
              </div>
            ) : (
              messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`max-w-[85%] px-4 py-3 rounded-2xl text-sm leading-relaxed ${
                    msg.role === "user"
                      ? "ml-auto bg-primary text-primary-foreground"
                      : "bg-secondary/70 text-foreground"
                  }`}
                >
                  {msg.role === "assistant" ? <ReactMarkdown>{msg.content}</ReactMarkdown> : msg.content}
                </div>
              ))
            )}
            {isLoading && (
              <div className="max-w-[85%] px-4 py-3 rounded-2xl bg-secondary/70 text-foreground">
                <Loader2 className="w-4 h-4 animate-spin" />
              </div>
            )}
          </div>

          <div className="p-4 border-t border-border/60 bg-background/70">
            <div className="flex items-center gap-2">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendMessage()}
                className="flex-1 bg-secondary/60 border border-border/60 rounded-xl px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/60"
                placeholder={placeholder}
              />
              <button
                onClick={sendMessage}
                className="w-10 h-10 rounded-xl bg-primary text-primary-foreground flex items-center justify-center disabled:opacity-50"
                disabled={!canSend}
                type="button"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
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
