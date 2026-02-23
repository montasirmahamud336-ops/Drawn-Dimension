import { useEffect, useMemo, useRef, useState } from "react";
import { MessageCircle, X, Send, Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import ReactMarkdown from "react-markdown";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  created_at: string;
}

const ChatWidget = () => {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();
  const { toast } = useToast();

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
  }, [messages, isLoading]);

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
