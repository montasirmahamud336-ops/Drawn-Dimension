import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Send,
  Plus,
  Trash2,
  Copy,
  Check,
  Share2,
  Flame,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ArrowUp,
  RotateCcw,
  X,
  ExternalLink,
  MessageSquare,
  Volume2,
  ThumbsUp,
  ThumbsDown,
  LogOut,
  User,
  Loader2,
  Edit3,
  Sparkles,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { getApiBaseUrl } from "@/components/admin/adminAuth";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
  poweredBy?: string;
  timelineData?: {
    type: string;
    year: number;
    yearsAgo: number;
    calculatedAge?: number;
    mathRoast: string;
  } | null;
}

interface ChatSession {
  id: string;
  title: string;
  messages: ChatMessage[];
  updatedAt: number;
}

interface UserMemoryProfile {
  name?: string;
  age?: number;
  birthYear?: number;
  sscYear?: number;
  hscYear?: number;
  profession?: string;
  relationshipStatus?: string;
  weaknesses: string[];
  insultsReceived: number;
}

type RoastMode = "standard" | "unhinged" | "passive_aggressive";

const ROAST_MODES: {
  id: RoastMode;
  name: string;
  badge: string;
  tagline: string;
  icon: string;
  accent: string;
}[] = [
  {
    id: "standard",
    name: "Nemo 2.0 Savage",
    badge: "Nemo 2.0",
    tagline: "Authentic Bangladeshi friend wit, dynamic math & reality checks",
    icon: "⚡",
    accent: "text-amber-400 bg-amber-400/10 border-amber-400/20",
  },
  {
    id: "unhinged",
    name: "Nemo Unhinged 🔥",
    badge: "Extra Roast",
    tagline: "Zero filter, maximum emotional damage, pure destruction mode",
    icon: "🔥",
    accent: "text-red-400 bg-red-400/10 border-red-400/20",
  },
  {
    id: "passive_aggressive",
    name: "Tea Stall Philosopher",
    badge: "Sarcasm",
    tagline: "Subtle sarcasm, sweet poison & deep tea-stall analogies",
    icon: "🍵",
    accent: "text-emerald-400 bg-emerald-400/10 border-emerald-400/20",
  },
];

const googleClientId = (import.meta as any).env?.VITE_GOOGLE_CLIENT_ID as string | undefined;

let googleIdentityScriptPromise: Promise<void> | null = null;
const loadGoogleIdentityScript = () => {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("Google sign-in is only available in the browser."));
  }

  if (window.google?.accounts?.id) {
    return Promise.resolve();
  }

  if (googleIdentityScriptPromise) {
    return googleIdentityScriptPromise;
  }

  googleIdentityScriptPromise = new Promise<void>((resolve, reject) => {
    const existingScript = document.querySelector<HTMLScriptElement>(
      'script[src="https://accounts.google.com/gsi/client"]'
    );

    if (existingScript) {
      existingScript.addEventListener("load", () => resolve(), { once: true });
      existingScript.addEventListener(
        "error",
        () => reject(new Error("Failed to load Google sign-in.")),
        { once: true }
      );
      return;
    }

    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load Google sign-in."));
    document.head.appendChild(script);
  });

  return googleIdentityScriptPromise;
};

const getNemoApiUrl = (path: string) => {
  if (typeof window === "undefined") return path;
  const { hostname, protocol } = window.location;
  if (hostname === "localhost" || hostname === "127.0.0.1") {
    return `${protocol}//${hostname}:4000${path.startsWith("/") ? "" : "/"}${path}`;
  }
  const base = getApiBaseUrl();
  return `${base}${path.startsWith("/") ? "" : "/"}${path}`;
};

const createFreshSession = (): ChatSession => ({
  id: `session-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
  title: "New Roast Session",
  messages: [],
  updatedAt: Date.now(),
});

export const NemoChat = () => {
  const { user, session, loading: authLoading, signInWithGoogleIdToken, signOut } = useAuth();

  // On page load or refresh, always start on a fresh New Chat canvas (like ChatGPT/Claude)
  const [initialFreshSession] = useState<ChatSession>(() => createFreshSession());

  // Chat Sessions (like ChatGPT sidebar)
  const [sessions, setSessions] = useState<ChatSession[]>(() => {
    try {
      const saved = localStorage.getItem("dd_nemo_sessions");
      if (saved) {
        const parsed: ChatSession[] = JSON.parse(saved);
        const previousNonEmpty = Array.isArray(parsed)
          ? parsed.filter((s) => Array.isArray(s.messages) && s.messages.length > 0)
          : [];
        return [initialFreshSession, ...previousNonEmpty];
      }
    } catch {}
    return [initialFreshSession];
  });

  const [activeSessionId, setActiveSessionId] = useState<string>(() => initialFreshSession.id);

  const [inputMessage, setInputMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [speakingId, setSpeakingId] = useState<string | null>(null);
  const [reactions, setReactions] = useState<Record<string, "up" | "down">>({});

  // Model Mode State (ChatGPT 4o / Claude model picker style)
  const [roastMode, setRoastMode] = useState<RoastMode>("standard");
  const [showModelDropdown, setShowModelDropdown] = useState(false);
  const [isGoogleSigningIn, setIsGoogleSigningIn] = useState(false);
  const [googleScriptFailed, setGoogleScriptFailed] = useState(false);

  // User Memory Profile
  const [memoryProfile, setMemoryProfile] = useState<UserMemoryProfile>(() => {
    try {
      const saved = localStorage.getItem("dd_nemo_memory");
      if (saved) return JSON.parse(saved);
    } catch {}
    return { weaknesses: [], insultsReceived: 0 };
  });

  // Onboarding Modal State
  const [showOnboardingModal, setShowOnboardingModal] = useState(false);
  const [onboardingName, setOnboardingName] = useState("");
  const [onboardingAge, setOnboardingAge] = useState("");
  const [onboardingProfession, setOnboardingProfession] = useState("Student");
  const [onboardingRelationship, setOnboardingRelationship] = useState("Single");
  const [onboardingError, setOnboardingError] = useState<string | null>(null);
  const [isSavingOnboarding, setIsSavingOnboarding] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const googleBtnContainerRef = useRef<HTMLDivElement>(null);

  const activeSession = sessions.find((s) => s.id === activeSessionId) || sessions[0];
  const messages = activeSession?.messages || [];

  const getAuthToken = () => {
    return session?.access_token || localStorage.getItem("site_user_token") || "";
  };

  // Sync profile and sessions with PostgreSQL per authenticated user
  useEffect(() => {
    if (!user) return;
    const token = getAuthToken();
    const userIdParam = user.id ? `?userId=${encodeURIComponent(user.id)}` : "";

    let isMounted = true;
    const fetchUserData = async () => {
      try {
        const headers: Record<string, string> = {};
        if (token) headers.Authorization = `Bearer ${token}`;

        let profRes: Response;
        try {
          profRes = await fetch(getNemoApiUrl(`/api/nemo/profile${userIdParam}`), { headers });
          if (!profRes.ok && profRes.status === 404) throw new Error("404");
        } catch {
          profRes = await fetch(`/api/nemo/profile${userIdParam}`, { headers });
        }

        let sessRes: Response;
        try {
          sessRes = await fetch(getNemoApiUrl(`/api/nemo/sessions${userIdParam}`), { headers });
          if (!sessRes.ok && sessRes.status === 404) throw new Error("404");
        } catch {
          sessRes = await fetch(`/api/nemo/sessions${userIdParam}`, { headers });
        }

        if (profRes.ok && isMounted) {
          const profileData = await profRes.json();
          if (profileData.profile) {
            setMemoryProfile(profileData.profile);
            const defaultName =
              profileData.profile.name ||
              (user.user_metadata?.full_name as string) ||
              (user.email ? user.email.split("@")[0] : "");
            setOnboardingName(defaultName);
            if (profileData.profile.age) setOnboardingAge(String(profileData.profile.age));
            if (profileData.profile.profession) setOnboardingProfession(profileData.profile.profession);
            if (profileData.profile.relationshipStatus) setOnboardingRelationship(profileData.profile.relationshipStatus);
          }
          if (!profileData.isComplete) {
            setShowOnboardingModal(true);
          }
        } else if (isMounted) {
          // If no remote profile or incomplete, trigger onboarding
          if (!memoryProfile.age || !memoryProfile.profession) {
            setShowOnboardingModal(true);
          }
        }

        if (sessRes.ok && isMounted) {
          const sessData = await sessRes.json();
          if (Array.isArray(sessData.sessions)) {
            const serverNonEmpty = sessData.sessions.filter(
              (s: ChatSession) => Array.isArray(s.messages) && s.messages.length > 0
            );
            setSessions((prev) => {
              const currentActive = prev.find((s) => s.id === activeSessionId);
              if (currentActive) {
                return [
                  currentActive,
                  ...serverNonEmpty.filter((s: ChatSession) => s.id !== currentActive.id),
                ];
              }
              return [initialFreshSession, ...serverNonEmpty];
            });
            // Intentionally do NOT override activeSessionId so user stays on fresh New Chat
          }
        }
      } catch (err) {
        console.warn("Could not sync remote Nemo data:", err);
      }
    };

    fetchUserData();

    return () => {
      isMounted = false;
    };
  }, [user, session]);

  // Initialize Google Sign-In button on the gate screen
  useEffect(() => {
    if (user || authLoading || !googleClientId) return;

    let cancelled = false;

    loadGoogleIdentityScript()
      .then(() => {
        if (cancelled || !window.google?.accounts?.id || !googleBtnContainerRef.current) return;

        window.google.accounts.id.initialize({
          client_id: googleClientId,
          callback: async (response) => {
            const credential = String(response?.credential ?? "").trim();
            if (!credential) return;

            setIsGoogleSigningIn(true);
            try {
              await signInWithGoogleIdToken(credential);
            } catch (err) {
              console.error("Google sign in failed:", err);
            } finally {
              setIsGoogleSigningIn(false);
            }
          },
          auto_select: false,
          cancel_on_tap_outside: true,
        });

        googleBtnContainerRef.current.innerHTML = "";
        window.google.accounts.id.renderButton(googleBtnContainerRef.current, {
          type: "standard",
          theme: "outline",
          size: "large",
          text: "continue_with",
          shape: "pill",
          logo_alignment: "left",
          width: 320,
        });
      })
      .catch((err) => {
        console.warn("Failed to load Google identity:", err);
        if (!cancelled) setGoogleScriptFailed(true);
      });

    return () => {
      cancelled = true;
    };
  }, [user, authLoading, signInWithGoogleIdToken]);

  // Save sessions to localStorage
  useEffect(() => {
    try {
      const toSave = sessions.filter(
        (s) => (s.messages && s.messages.length > 0) || s.id === activeSessionId
      );
      localStorage.setItem("dd_nemo_sessions", JSON.stringify(toSave));
    } catch {}
  }, [sessions, activeSessionId]);

  // Save memory to localStorage
  useEffect(() => {
    try {
      localStorage.setItem("dd_nemo_memory", JSON.stringify(memoryProfile));
    } catch {}
  }, [memoryProfile]);

  // Keyboard shortcut Ctrl+K / Cmd+K for New Chat
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        handleCreateNewChat();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeSession]);

  // Auto-scroll on new message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  // Close model dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowModelDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Auto-resize textarea
  const handleTextareaInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputMessage(e.target.value);
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 180)}px`;
    }
  };

  const syncSessionToBackend = async (sessionToSync: ChatSession) => {
    const token = getAuthToken();
    if (!token) return;
    try {
      await fetch(getNemoApiUrl("/api/nemo/sessions"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          id: sessionToSync.id,
          title: sessionToSync.title,
          messages: sessionToSync.messages,
        }),
      });
    } catch {}
  };

  const handleCreateNewChat = () => {
    // If current session is already an empty canvas, just stay on it
    if (activeSession && activeSession.messages.length === 0) {
      if (window.innerWidth < 768) setSidebarOpen(false);
      return;
    }
    const newSession = createFreshSession();
    setSessions((prev) => [
      newSession,
      ...prev.filter((s) => s.messages && s.messages.length > 0),
    ]);
    setActiveSessionId(newSession.id);
    if (window.innerWidth < 768) setSidebarOpen(false);
  };

  const handleDeleteSession = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const token = getAuthToken();
    if (token) {
      try {
        await fetch(getNemoApiUrl(`/api/nemo/sessions/${encodeURIComponent(id)}`), {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        });
      } catch {}
    }

    const filtered = sessions.filter((s) => s.id !== id);
    const hasEmpty = filtered.some((s) => s.messages.length === 0);

    if (filtered.length === 0 || !hasEmpty) {
      const reset = createFreshSession();
      const updated = filtered.length > 0 ? [reset, ...filtered] : [reset];
      setSessions(updated);
      if (activeSessionId === id) {
        setActiveSessionId(reset.id);
      }
      return;
    }

    setSessions(filtered);
    if (activeSessionId === id) {
      const nextSession = filtered.find((s) => s.messages.length === 0) || filtered[0];
      setActiveSessionId(nextSession.id);
    }
  };

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleSpeak = (id: string, text: string) => {
    if (!("speechSynthesis" in window)) return;
    if (speakingId === id) {
      window.speechSynthesis.cancel();
      setSpeakingId(null);
      return;
    }

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.05;
    utterance.pitch = 1.0;
    utterance.onend = () => setSpeakingId(null);
    utterance.onerror = () => setSpeakingId(null);

    setSpeakingId(id);
    window.speechSynthesis.speak(utterance);
  };

  const handleReaction = (id: string, type: "up" | "down") => {
    setReactions((prev) => ({
      ...prev,
      [id]: prev[id] === type ? undefined! : type,
    }));
  };

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputMessage).trim();
    if (!text || isLoading) return;

    setInputMessage("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }

    const userMessage: ChatMessage = {
      id: `msg-${Date.now()}`,
      role: "user",
      content: text,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    const updatedMessages = [...messages, userMessage];
    const sessionTitle =
      messages.length === 0
        ? text.slice(0, 26) + (text.length > 26 ? "..." : "")
        : activeSession.title;

    const updatedSession: ChatSession = {
      ...activeSession,
      title: sessionTitle,
      messages: updatedMessages,
      updatedAt: Date.now(),
    };

    setSessions((prev) =>
      prev.map((s) => (s.id === activeSessionId ? updatedSession : s))
    );

    setIsLoading(true);

    try {
      const url = getNemoApiUrl("/api/nemo/chat");
      const token = getAuthToken();

      const userDisplayName =
        memoryProfile.name ||
        (user?.user_metadata?.full_name as string) ||
        (user?.email ? user.email.split("@")[0] : undefined);

      const payload = JSON.stringify({
        message: text,
        mode: roastMode,
        history: messages.map((m) => ({ role: m.role, content: m.content })),
        profile: {
          ...memoryProfile,
          userId: user?.id,
          name: userDisplayName,
        },
      });

      const requestHeaders: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (token) {
        requestHeaders.Authorization = `Bearer ${token}`;
      }

      let res: Response;
      try {
        res = await fetch(url, {
          method: "POST",
          headers: requestHeaders,
          body: payload,
        });
        if (!res.ok && res.status === 404) {
          throw new Error("Direct endpoint 404");
        }
      } catch {
        res = await fetch(`/api/nemo/chat`, {
          method: "POST",
          headers: requestHeaders,
          body: payload,
        });
      }

      if (!res.ok) {
        throw new Error(`Server status ${res.status}`);
      }

      const data = await res.json();

      const assistantMessage: ChatMessage = {
        id: `msg-reply-${Date.now()}`,
        role: "assistant",
        content: data.reply || "আরে ভাই, কিছু একটা সমস্যা হইছে, আবার ট্রাই করেন!",
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        poweredBy: data.poweredBy,
        timelineData: data.timelineData,
      };

      if (data.profile) {
        setMemoryProfile(data.profile);
      }

      const finalMessages = [...updatedMessages, assistantMessage];
      const finalSession: ChatSession = {
        ...updatedSession,
        messages: finalMessages,
        updatedAt: Date.now(),
      };

      setSessions((prev) =>
        prev.map((s) => (s.id === activeSessionId ? finalSession : s))
      );

      // Persist to database per user
      syncSessionToBackend(finalSession);
    } catch (err) {
      console.error("Chat error:", err);
      const errorMessage: ChatMessage = {
        id: `msg-err-${Date.now()}`,
        role: "assistant",
        content: "সার্ভারের সাথে যোগাযোগে সমস্যা হইছে। একটু পর আবার ট্রাই কর!",
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };
      setSessions((prev) =>
        prev.map((s) =>
          s.id === activeSessionId
            ? { ...s, messages: [...updatedMessages, errorMessage], updatedAt: Date.now() }
            : s
        )
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
    if ((e.metaKey || e.ctrlKey) && e.key === "k") {
      e.preventDefault();
      handleCreateNewChat();
    }
  };

  // Save Onboarding Profile
  const handleSaveOnboarding = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!onboardingName.trim()) {
      setOnboardingError("তোমার নাম লেখ!");
      return;
    }
    const ageNum = parseInt(onboardingAge, 10);
    if (!ageNum || isNaN(ageNum) || ageNum < 10 || ageNum > 100) {
      setOnboardingError("সঠিক বয়স দাও (১০ থেকে ১০০ এর মধ্যে)!");
      return;
    }
    if (!onboardingProfession) {
      setOnboardingError("পেশা বা প্রফেশন সিলেক্ট কর!");
      return;
    }

    setOnboardingError(null);
    setIsSavingOnboarding(true);

    const token = getAuthToken();
    const payload = JSON.stringify({
      userId: user?.id,
      name: onboardingName.trim(),
      age: ageNum,
      profession: onboardingProfession,
      relationshipStatus: onboardingRelationship,
    });
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (token) headers.Authorization = `Bearer ${token}`;

    try {
      let res: Response;
      try {
        res = await fetch(getNemoApiUrl("/api/nemo/profile"), {
          method: "POST",
          headers,
          body: payload,
        });
        if (!res.ok && res.status === 404) throw new Error("404");
      } catch {
        res = await fetch(`/api/nemo/profile`, {
          method: "POST",
          headers,
          body: payload,
        });
      }

      if (res.ok) {
        const data = await res.json();
        if (data.profile) {
          setMemoryProfile(data.profile);
        }
      } else {
        setMemoryProfile((prev) => ({
          ...prev,
          name: onboardingName.trim(),
          age: ageNum,
          profession: onboardingProfession,
          relationshipStatus: onboardingRelationship,
        }));
      }

      setShowOnboardingModal(false);

      // If current session is clean, trigger a personalized spicy opening greeting
      if (messages.length === 0) {
        const starterGreeting: ChatMessage = {
          id: `msg-starter-${Date.now()}`,
          role: "assistant",
          content: `আরে ${onboardingName.trim()}! ${ageNum} বছর বয়সে এসে ${onboardingProfession} সাজা হচ্ছে? নিজেকে খুব চালাক ভাবিস তাই না? বল, আজকে কী নিয়ে রোস্ট খাবি?`,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          poweredBy: "Nemo 2.0 Savage",
        };
        const updated = [starterGreeting];
        const newSess: ChatSession = {
          ...activeSession,
          messages: updated,
          title: `Roast with ${onboardingName.trim()}`,
          updatedAt: Date.now(),
        };
        setSessions((prev) =>
          prev.map((s) => (s.id === activeSessionId ? newSess : s))
        );
        syncSessionToBackend(newSess);
      }
    } catch {
      setMemoryProfile((prev) => ({
        ...prev,
        name: onboardingName.trim(),
        age: ageNum,
        profession: onboardingProfession,
        relationshipStatus: onboardingRelationship,
      }));
      setShowOnboardingModal(false);
    } finally {
      setIsSavingOnboarding(false);
    }
  };

  // Handle direct Google button click fallback
  const handleCustomGoogleClick = () => {
    if (window.google?.accounts?.id?.prompt) {
      window.google.accounts.id.prompt();
    } else {
      window.location.href = "/auth?redirect=/nemo";
    }
  };

  // Download Story Roast Card (1080x1350)
  const handleDownloadCard = (roast: ChatMessage) => {
    const canvas = document.createElement("canvas");
    canvas.width = 1080;
    canvas.height = 1350;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Background Gradient
    const bgGradient = ctx.createLinearGradient(0, 0, 1080, 1350);
    bgGradient.addColorStop(0, "#0e0e12");
    bgGradient.addColorStop(0.5, "#18181f");
    bgGradient.addColorStop(1, "#0a0a0d");
    ctx.fillStyle = bgGradient;
    ctx.fillRect(0, 0, 1080, 1350);

    // Neon Accent Border
    ctx.strokeStyle = "rgba(239, 68, 68, 0.4)";
    ctx.lineWidth = 5;
    ctx.strokeRect(36, 36, 1008, 1278);

    // Header Title
    ctx.fillStyle = "#ef4444";
    ctx.font = "bold 40px 'Plus Jakarta Sans', sans-serif";
    ctx.fillText("NEMO 2.0 • SAVAGE ROAST AI", 84, 120);

    ctx.fillStyle = "#71717a";
    ctx.font = "24px 'Plus Jakarta Sans', sans-serif";
    ctx.fillText("No filter. Zero mercy. Powered by Drawn Dimension.", 84, 160);

    // Divider Line
    ctx.strokeStyle = "rgba(255, 255, 255, 0.1)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(84, 195);
    ctx.lineTo(996, 195);
    ctx.stroke();

    // Big Quotation Mark
    ctx.fillStyle = "rgba(239, 68, 68, 0.15)";
    ctx.font = "bold 140px 'Plus Jakarta Sans', serif";
    ctx.fillText("“", 80, 310);

    // Roast Text (Auto Wrapped)
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 42px 'Plus Jakarta Sans', sans-serif";
    const words = roast.content.split(" ");
    let line = "";
    let y = 340;
    const maxWidth = 900;
    const lineHeight = 62;

    for (let n = 0; n < words.length; n++) {
      const testLine = line + words[n] + " ";
      const metrics = ctx.measureText(testLine);
      if (metrics.width > maxWidth && n > 0) {
        ctx.fillText(line, 84, y);
        line = words[n] + " ";
        y += lineHeight;
      } else {
        line = testLine;
      }
    }
    ctx.fillText(line, 84, y);

    // Timeline Math Card if available
    if (roast.timelineData) {
      y += 80;
      ctx.fillStyle = "rgba(239, 68, 68, 0.12)";
      ctx.fillRect(84, y - 40, 912, 90);
      ctx.strokeStyle = "rgba(239, 68, 68, 0.4)";
      ctx.strokeRect(84, y - 40, 912, 90);

      ctx.fillStyle = "#f87171";
      ctx.font = "bold 28px 'Plus Jakarta Sans', sans-serif";
      ctx.fillText(
        `⏱️ Timeline Math: ${roast.timelineData.year} (${roast.timelineData.yearsAgo} Years Wasted) • Age ~${roast.timelineData.calculatedAge || 30}`,
        110,
        y + 15
      );
    }

    // Watermark Footer Bar
    ctx.fillStyle = "rgba(255, 255, 255, 0.08)";
    ctx.fillRect(84, 1180, 912, 90);

    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 26px 'Plus Jakarta Sans', sans-serif";
    ctx.fillText("Get Roasted: drawndimension.com/nemo", 114, 1235);

    ctx.fillStyle = "#ef4444";
    ctx.font = "bold 24px 'Plus Jakarta Sans', sans-serif";
    ctx.fillText("Drawn Dimension", 760, 1235);

    const link = document.createElement("a");
    link.download = `nemo-roast-${Date.now()}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  };

  const currentModeInfo = ROAST_MODES.find((m) => m.id === roastMode) || ROAST_MODES[0];

  // ═════════════════════════════════════════════════════════════
  // 1. AUTH LOADING STATE
  // ═════════════════════════════════════════════════════════════
  if (authLoading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-[#09090b] text-white">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-red-600 to-amber-500 flex items-center justify-center shadow-lg shadow-red-500/20 animate-pulse">
            <Flame className="w-6 h-6 fill-white text-white" />
          </div>
          <span className="text-xs text-zinc-400 font-medium tracking-wide">Loading Nemo 2.0...</span>
        </div>
      </div>
    );
  }

  // ═════════════════════════════════════════════════════════════
  // 2. AUTHENTICATION GATE (LOGIN REQUIRED: CONTINUE WITH GOOGLE ONLY)
  // ═════════════════════════════════════════════════════════════
  if (!user) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-[#09090b] text-zinc-100 font-sans p-4 relative overflow-hidden select-none">
        {/* Subtle Atmospheric Ember Glows */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[520px] h-[520px] bg-red-600/10 rounded-full blur-[140px] pointer-events-none" />
        <div className="absolute bottom-1/4 left-1/2 -translate-x-1/2 w-[420px] h-[420px] bg-amber-500/10 rounded-full blur-[120px] pointer-events-none" />

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: "easeOut" }}
          className="relative z-10 w-full max-w-[420px] rounded-3xl border border-zinc-800 bg-[#121216]/95 p-8 md:p-10 shadow-2xl backdrop-blur-2xl text-center flex flex-col items-center"
        >
          {/* Logo Badge with Glowing Ambient Pulse */}
          <div className="relative mb-5">
            <div className="absolute -inset-2 rounded-3xl bg-gradient-to-tr from-red-600 via-rose-500 to-amber-500 opacity-60 blur-xl animate-pulse" />
            <div className="relative w-16 h-16 rounded-2xl bg-gradient-to-tr from-red-600 via-rose-600 to-amber-500 flex items-center justify-center text-white shadow-2xl shadow-red-500/50 border border-white/20">
              <Flame className="w-8 h-8 fill-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.5)]" />
            </div>
          </div>

          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-red-500/15 text-red-400 border border-red-500/30 mb-3 tracking-wide">
            <span>⚡ NEMO 2.0</span>
            <span>•</span>
            <span>SAVAGE ROAST AI</span>
          </div>

          <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
            Welcome to Nemo 2.0
          </h1>
          <p className="mt-2 text-xs md:text-sm text-zinc-400 leading-relaxed max-w-xs">
            Drawn Dimension's unfiltered Bangladeshi roast AI. Sign in with Google to get roasted personally.
          </p>

          {/* Single Login Option: Continue with Google */}
          <div className="mt-8 w-full flex flex-col items-center">
            {isGoogleSigningIn ? (
              <div className="flex items-center justify-center gap-2.5 w-full max-w-[320px] py-3.5 rounded-full bg-zinc-800 text-white text-xs font-semibold border border-zinc-700 shadow-md">
                <Loader2 className="w-4 h-4 animate-spin text-red-400" />
                <span>Signing in with Google...</span>
              </div>
            ) : googleScriptFailed ? (
              <button
                onClick={handleCustomGoogleClick}
                className="w-full max-w-[320px] flex items-center justify-center gap-3 px-6 py-3 rounded-full bg-white hover:bg-zinc-100 text-zinc-900 font-semibold text-sm transition-all shadow-lg active:scale-[0.98]"
              >
                <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                </svg>
                <span>Continue with Google</span>
              </button>
            ) : (
              <div
                ref={googleBtnContainerRef}
                className="w-full flex justify-center min-h-[44px]"
              />
            )}
          </div>

          <p className="mt-6 text-[11px] text-zinc-500 leading-normal">
            By signing in, you agree to our{" "}
            <Link to="/terms-of-service" className="text-zinc-400 hover:text-white underline">
              Terms
            </Link>{" "}
            and{" "}
            <Link to="/privacy-policy" className="text-zinc-400 hover:text-white underline">
              Privacy Policy
            </Link>
            .
          </p>

          <Link
            to="/"
            className="mt-5 text-xs text-zinc-400 hover:text-white inline-flex items-center gap-1.5 transition-colors group"
          >
            <ChevronLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
            <span>Back to Drawn Dimension</span>
          </Link>
        </motion.div>
      </div>
    );
  }

  // ═════════════════════════════════════════════════════════════
  // 3. MAIN CHAT APPLICATION (AUTHENTICATED)
  // ═════════════════════════════════════════════════════════════
  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#0a0a0c] text-zinc-100 font-sans selection:bg-red-500/30 selection:text-white">
      {/* ─────────────────────────────────────────────────────────────
          SIDEBAR (CHATGPT / CLAUDE / GEMINI STYLE)
         ───────────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.aside
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 270, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: "easeInOut" }}
            className="relative z-30 flex h-full flex-col border-r border-zinc-800/80 bg-[#111114] shrink-0 select-none"
          >
            {/* Sidebar Top: Branding & New Chat */}
            <div className="p-3 border-b border-zinc-800/60">
              <div className="flex items-center justify-between mb-3 px-1">
                <Link to="/" className="flex items-center gap-2.5 group">
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-red-600 to-amber-500 flex items-center justify-center text-white shadow-lg shadow-red-500/20 group-hover:scale-105 transition-transform">
                    <Flame className="w-4 h-4 fill-white" />
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold tracking-tight text-white text-sm">NEMO</span>
                      <span className="text-[10px] px-1.5 py-0.2 rounded font-bold bg-red-500/20 text-red-400 border border-red-500/30">
                        2.0
                      </span>
                    </div>
                    <span className="text-[10px] text-zinc-400 block -mt-0.5">Drawn Dimension</span>
                  </div>
                </Link>

                <button
                  onClick={() => setSidebarOpen(false)}
                  className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors md:hidden"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* + New Roast Chat Button */}
              <button
                onClick={handleCreateNewChat}
                className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl border border-zinc-700/60 bg-zinc-900/80 hover:bg-zinc-800 text-sm font-medium text-white transition-all shadow-sm group hover:border-zinc-600"
              >
                <div className="flex items-center gap-2.5">
                  <Plus className="w-4 h-4 text-red-400 group-hover:rotate-90 transition-transform" />
                  <span>New Roast Chat</span>
                </div>
                <span className="text-[10px] text-zinc-400 bg-zinc-800 px-1.5 py-0.5 rounded border border-zinc-700/50">
                  Ctrl+K
                </span>
              </button>
            </div>

            {/* Chat Sessions History */}
            <div className="flex-1 overflow-y-auto px-2 py-3 space-y-1">
              <p className="px-3 text-[11px] font-semibold uppercase tracking-wider text-zinc-400 mb-2">
                Recent Roasts
              </p>
              {sessions.filter(
                (s) => (s.messages && s.messages.length > 0) || s.id === activeSessionId
              ).length === 0 ? (
                <div className="px-3 py-6 text-center text-zinc-600 text-xs italic">
                  No previous roasts yet
                </div>
              ) : (
                sessions
                  .filter(
                    (s) => (s.messages && s.messages.length > 0) || s.id === activeSessionId
                  )
                  .map((session) => {
                    const isActive = session.id === activeSessionId;
                    const isBlank = session.messages.length === 0;
                    return (
                      <div
                        key={session.id}
                        onClick={() => {
                          setActiveSessionId(session.id);
                          if (window.innerWidth < 768) setSidebarOpen(false);
                        }}
                        className={`group relative flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium cursor-pointer transition-all ${
                          isActive
                            ? "bg-zinc-800 text-white shadow-sm border border-zinc-700/60"
                            : "text-zinc-400 hover:bg-zinc-800/60 hover:text-zinc-200"
                        }`}
                      >
                        <div className="flex items-center gap-2.5 truncate pr-6">
                          <MessageSquare className={`w-3.5 h-3.5 shrink-0 ${isActive ? "text-red-400" : "text-zinc-400"}`} />
                          <span className="truncate">
                            {isBlank ? "New Roast Chat" : session.title}
                          </span>
                        </div>

                        {session.messages.length > 0 && (
                          <button
                            onClick={(e) => handleDeleteSession(session.id, e)}
                            className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-500/20 hover:text-red-400 text-zinc-400 transition-all"
                            title="Delete chat"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    );
                  })
              )}
            </div>

            {/* Sidebar Bottom: User Profile Info & Sign Out */}
            <div className="p-3 border-t border-zinc-800/80 space-y-1.5 bg-[#0e0e11]">
              <div className="flex items-center justify-between px-3 py-2 rounded-xl text-xs bg-zinc-900/60 border border-zinc-800">
                <div className="flex items-center gap-2 truncate pr-2">
                  <div className="w-6 h-6 rounded-full bg-red-600/20 border border-red-500/30 flex items-center justify-center text-red-400 shrink-0">
                    <User className="w-3.5 h-3.5" />
                  </div>
                  <div className="truncate text-left">
                    <span className="block truncate text-zinc-200 font-medium text-[11.5px]">
                      {memoryProfile.name || (user.user_metadata?.full_name as string) || user.email || "User"}
                    </span>
                    {memoryProfile.profession && (
                      <span className="block text-[10px] text-zinc-400 truncate">
                        {memoryProfile.age ? `${memoryProfile.age}y • ` : ""}
                        {memoryProfile.profession}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => setShowOnboardingModal(true)}
                    className="p-1.5 rounded-lg text-zinc-400 hover:text-amber-400 hover:bg-zinc-800 transition-colors"
                    title="Edit Roast Profile"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => signOut()}
                    className="p-1.5 rounded-lg text-zinc-400 hover:text-red-400 hover:bg-zinc-800 transition-colors"
                    title="Sign Out"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <Link
                to="/"
                className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs text-zinc-400 hover:text-white hover:bg-zinc-800/70 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <ExternalLink className="w-3.5 h-3.5 text-zinc-400" />
                  <span>Back to Main Site</span>
                </div>
              </Link>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* ─────────────────────────────────────────────────────────────
          MAIN CANVAS
         ───────────────────────────────────────────────────────────── */}
      <main className="relative flex flex-1 flex-col h-full overflow-hidden bg-[#0a0a0c]">
        {/* Top Header Bar */}
        <header className="h-14 border-b border-zinc-800/60 px-4 flex items-center justify-between bg-[#0a0a0c]/80 backdrop-blur-md z-20 shrink-0">
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => setSidebarOpen((prev) => !prev)}
              className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
              title={sidebarOpen ? "Close sidebar" : "Open sidebar"}
            >
              {sidebarOpen ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            </button>

            {/* Model Selector Popover */}
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setShowModelDropdown((prev) => !prev)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-zinc-800 bg-zinc-900/60 hover:bg-zinc-800/80 text-xs font-semibold text-zinc-200 transition-all shadow-sm"
              >
                <span>{currentModeInfo.icon}</span>
                <span>{currentModeInfo.name}</span>
                <ChevronDown className="w-3.5 h-3.5 text-zinc-400 ml-0.5" />
              </button>

              <AnimatePresence>
                {showModelDropdown && (
                  <motion.div
                    initial={{ opacity: 0, y: 8, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 8, scale: 0.96 }}
                    className="absolute left-0 mt-2 w-72 rounded-2xl border border-zinc-700/80 bg-[#16161a] p-2 shadow-2xl z-50 backdrop-blur-xl"
                  >
                    <p className="px-2.5 py-1.5 text-[11px] font-bold uppercase tracking-wider text-zinc-400">
                      Select Roast Model
                    </p>
                    <div className="space-y-1">
                      {ROAST_MODES.map((mode) => {
                        const isSelected = mode.id === roastMode;
                        return (
                          <button
                            key={mode.id}
                            onClick={() => {
                              setRoastMode(mode.id);
                              setShowModelDropdown(false);
                            }}
                            className={`w-full flex items-start gap-2.5 p-2.5 rounded-xl text-left transition-all ${
                              isSelected
                                ? "bg-zinc-800/90 border border-zinc-700 text-white"
                                : "hover:bg-zinc-800/40 text-zinc-300"
                            }`}
                          >
                            <span className="text-xl mt-0.5">{mode.icon}</span>
                            <div className="flex-1">
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-bold text-white">{mode.name}</span>
                                <span
                                  className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${mode.accent}`}
                                >
                                  {mode.badge}
                                </span>
                              </div>
                              <p className="text-[11px] text-zinc-400 mt-0.5 leading-snug">
                                {mode.tagline}
                              </p>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Header Right Actions */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setShowOnboardingModal(true)}
              className="px-2.5 py-1.5 rounded-xl text-xs text-zinc-300 hover:text-white hover:bg-zinc-800 border border-zinc-800/80 transition-colors flex items-center gap-1.5"
              title="Edit Profile"
            >
              <Edit3 className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden sm:inline">Profile</span>
            </button>
            <button
              onClick={handleCreateNewChat}
              className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
              title="Reset / New Chat"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* Chat Message Scrollable Container */}
        <div className="flex-1 overflow-y-auto px-4 py-6 md:px-8">
          <div className="max-w-3xl mx-auto space-y-7">
            {/* Empty state canvas with highlighted flame & "Kire Bokachoda" */}
            {messages.length === 0 && (
              <div className="min-h-[50vh] flex flex-col items-center justify-center select-none text-center">
                <div className="relative mb-4">
                  {/* Glowing ambient background blur */}
                  <div className="absolute -inset-2 rounded-3xl bg-gradient-to-tr from-red-600 via-rose-500 to-amber-500 opacity-60 blur-xl animate-pulse" />

                  {/* Highlighted flame badge */}
                  <div className="relative w-16 h-16 rounded-2xl bg-gradient-to-tr from-red-600 via-rose-600 to-amber-500 flex items-center justify-center text-white shadow-2xl shadow-red-500/50 border border-white/20">
                    <Flame className="w-8 h-8 text-white fill-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.5)]" />
                  </div>
                </div>

                <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-white drop-shadow">
                  Kire Bokachoda
                </h2>
              </div>
            )}

            {/* ─────────────────────────────────────────────────────────
                MESSAGE STREAM
               ───────────────────────────────────────────────────────── */}
            {messages.map((message) => {
              const isUser = message.role === "user";
              return (
                <motion.div
                  key={message.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25 }}
                  className={`flex ${isUser ? "justify-end" : "justify-start"}`}
                >
                  {isUser ? (
                    // User Message Bubble
                    <div className="max-w-[85%] md:max-w-[75%] px-4 py-3 rounded-2xl rounded-tr-sm bg-zinc-800 text-white text-[14.5px] leading-relaxed shadow-sm">
                      {message.content}
                    </div>
                  ) : (
                    // Assistant Message
                    <div className="flex gap-3.5 max-w-[95%] md:max-w-[88%] w-full">
                      <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-red-600 to-amber-500 flex items-center justify-center text-white shrink-0 mt-0.5 shadow-md shadow-red-500/20">
                        <Flame className="w-4 h-4 fill-white" />
                      </div>

                      <div className="flex-1 space-y-2">
                        {/* Name and Powered By Tag */}
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-white">Nemo</span>
                          {message.poweredBy && (
                            <span className="text-[10px] text-zinc-400 px-1.5 py-0.2 rounded bg-zinc-800/80 border border-zinc-700/50">
                              {message.poweredBy}
                            </span>
                          )}
                        </div>

                        {/* Roast Content */}
                        <div className="text-[15px] leading-7 text-zinc-100 whitespace-pre-wrap font-sans">
                          {message.content}
                        </div>

                        {/* Timeline Math Badge if Year Detected */}
                        {message.timelineData && (
                          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-300 font-semibold">
                            <span>⏱️ Timeline Math:</span>
                            <span className="text-white">
                              {message.timelineData.year} ({message.timelineData.yearsAgo} Years Passed)
                            </span>
                            {message.timelineData.calculatedAge && (
                              <span className="text-amber-400 font-bold">
                                • Estimated Age ~{message.timelineData.calculatedAge}
                              </span>
                            )}
                          </div>
                        )}

                        {/* Message Action Bar */}
                        <div className="flex items-center gap-1 pt-1.5">
                          {/* Copy */}
                          <button
                            onClick={() => handleCopy(message.id, message.content)}
                            className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800/60 transition-colors"
                            title="Copy roast"
                          >
                            {copiedId === message.id ? (
                              <Check className="w-3.5 h-3.5 text-emerald-400" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>

                          {/* TTS / Speak */}
                          <button
                            onClick={() => handleSpeak(message.id, message.content)}
                            className={`p-1.5 rounded-lg transition-colors ${
                              speakingId === message.id
                                ? "text-red-400 bg-red-500/20"
                                : "text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800/60"
                            }`}
                            title="Read aloud"
                          >
                            <Volume2 className="w-3.5 h-3.5" />
                          </button>

                          {/* Thumbs Up */}
                          <button
                            onClick={() => handleReaction(message.id, "up")}
                            className={`p-1.5 rounded-lg transition-colors ${
                              reactions[message.id] === "up"
                                ? "text-emerald-400 bg-emerald-500/20"
                                : "text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800/60"
                            }`}
                            title="Funny burn"
                          >
                            <ThumbsUp className="w-3.5 h-3.5" />
                          </button>

                          {/* Thumbs Down */}
                          <button
                            onClick={() => handleReaction(message.id, "down")}
                            className={`p-1.5 rounded-lg transition-colors ${
                              reactions[message.id] === "down"
                                ? "text-red-400 bg-red-500/20"
                                : "text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800/60"
                            }`}
                            title="Too mild"
                          >
                            <ThumbsDown className="w-3.5 h-3.5" />
                          </button>

                          {/* Re-roast button */}
                          <button
                            onClick={() => handleSendMessage("আবার রোস্ট কর, আরো মারাত্মকভাবে!")}
                            className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800/60 transition-colors"
                            title="Re-roast / Burn more"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                          </button>

                          {/* Download Roast Card */}
                          <button
                            onClick={() => handleDownloadCard(message)}
                            className="flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-semibold text-zinc-400 hover:text-white hover:bg-zinc-800/80 transition-colors ml-1 border border-zinc-800"
                            title="Export Instagram/Facebook story card"
                          >
                            <Share2 className="w-3 h-3 text-red-400" />
                            <span>Download Card</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </motion.div>
              );
            })}

            {/* Assistant Typing / Thinking indicator */}
            {isLoading && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex gap-3.5 max-w-[88%]"
              >
                <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-red-600 to-amber-500 flex items-center justify-center text-white shrink-0 mt-0.5 animate-pulse">
                  <Flame className="w-4 h-4 fill-white" />
                </div>
                <div className="flex items-center gap-1.5 px-4 py-3 rounded-2xl bg-zinc-900 border border-zinc-800">
                  <span className="w-2 h-2 rounded-full bg-red-500 animate-bounce [animation-delay:-0.3s]" />
                  <span className="w-2 h-2 rounded-full bg-amber-500 animate-bounce [animation-delay:-0.15s]" />
                  <span className="w-2 h-2 rounded-full bg-rose-500 animate-bounce" />
                </div>
              </motion.div>
            )}

            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* ─────────────────────────────────────────────────────────────
            BOTTOM FLOATING INPUT DOCK (CHATGPT / CLAUDE STYLE)
           ───────────────────────────────────────────────────────────── */}
        <div className="p-4 bg-gradient-to-t from-[#0a0a0c] via-[#0a0a0c]/95 to-transparent shrink-0">
          <div className="max-w-3xl mx-auto">
            <div className="relative rounded-2xl border border-zinc-800 bg-[#16161a] p-3 shadow-2xl focus-within:border-zinc-700 transition-colors">
              <textarea
                ref={textareaRef}
                value={inputMessage}
                onChange={handleTextareaInput}
                onKeyDown={handleKeyDown}
                placeholder="Ask anything..."
                rows={1}
                className="w-full resize-none bg-transparent px-1 py-1 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none max-h-44 leading-relaxed font-sans"
              />

              <div className="flex items-center justify-between pt-2 border-t border-zinc-800/50 mt-1">
                {/* Mode status indicator */}
                <div className="flex items-center gap-1.5 text-[11px] font-semibold text-zinc-400">
                  <span className="text-amber-400">⚡</span>
                  <span className="text-zinc-300 font-medium">Nemo 2.0</span>
                </div>

                {/* Send Button */}
                <button
                  onClick={() => handleSendMessage()}
                  disabled={!inputMessage.trim() || isLoading}
                  className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                    inputMessage.trim() && !isLoading
                      ? "bg-white text-zinc-950 hover:bg-zinc-200 active:scale-95 shadow-md"
                      : "bg-zinc-800 text-zinc-600 cursor-not-allowed"
                  }`}
                  title="Send message"
                >
                  <ArrowUp className="w-4 h-4 stroke-[2.5]" />
                </button>
              </div>
            </div>

            <p className="mt-2 text-center text-[10.5px] text-zinc-400 select-none">
              Nemo has zero filter. Do not take personal offense. Built with ❤️ by{" "}
              <Link to="/" className="text-zinc-300 hover:text-white underline">
                Drawn Dimension
              </Link>
            </p>
          </div>
        </div>
      </main>

      {/* ─────────────────────────────────────────────────────────────
          FIRST-TIME USER PROFILE SETUP MODAL (ONBOARDING)
         ───────────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {showOnboardingModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.94, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94, y: 12 }}
              className="relative w-full max-w-md rounded-3xl border border-red-500/30 bg-[#141418] p-6 md:p-8 shadow-2xl shadow-red-500/10 text-left overflow-hidden"
            >
              {/* Corner Ambient Glow */}
              <div className="absolute top-0 right-0 w-36 h-36 bg-red-600/15 rounded-full blur-2xl pointer-events-none" />

              {/* Header */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-red-600 to-amber-500 flex items-center justify-center text-white shadow-lg shadow-red-500/30">
                    <Flame className="w-5 h-5 fill-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white tracking-tight">
                      আগে নিজের পরিচয় দে 😈
                    </h3>
                    <p className="text-[11px] text-zinc-400">
                      Nemo 2.0 Savage Profile Setup
                    </p>
                  </div>
                </div>

                {memoryProfile.name && memoryProfile.age && (
                  <button
                    onClick={() => setShowOnboardingModal(false)}
                    className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              <p className="text-xs text-zinc-300 mb-5 leading-relaxed">
                তোমাকে পার্সোনালি ধুয়ে দেওয়ার জন্য এই তথ্যগুলো লাগবে। মিথ্যা বলিস না, বাপের হোটেলের হিসাব বের হয়ে যাবে!
              </p>

              {onboardingError && (
                <div className="mb-4 px-3 py-2 rounded-xl bg-red-500/15 border border-red-500/30 text-xs text-red-400 font-medium">
                  {onboardingError}
                </div>
              )}

              <form onSubmit={handleSaveOnboarding} className="space-y-4">
                {/* Name */}
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                    তোমার নাম (Name)
                  </label>
                  <input
                    type="text"
                    required
                    value={onboardingName}
                    onChange={(e) => setOnboardingName(e.target.value)}
                    placeholder="যেমন: তানভীর বা নিহাল"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-900 border border-zinc-700/80 text-white text-xs placeholder-zinc-500 focus:outline-none focus:border-red-500/80 transition-colors"
                  />
                </div>

                {/* Age */}
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                    তোমার আসল বয়স (Age)
                  </label>
                  <input
                    type="number"
                    required
                    min={10}
                    max={100}
                    value={onboardingAge}
                    onChange={(e) => setOnboardingAge(e.target.value)}
                    placeholder="যেমন: 24"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-900 border border-zinc-700/80 text-white text-xs placeholder-zinc-500 focus:outline-none focus:border-red-500/80 transition-colors"
                  />
                </div>

                {/* Profession */}
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                    পেশা / প্রফেশন (Profession)
                  </label>
                  <select
                    value={onboardingProfession}
                    onChange={(e) => setOnboardingProfession(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-900 border border-zinc-700/80 text-white text-xs focus:outline-none focus:border-red-500/80 transition-colors"
                  >
                    <option value="Student">🎓 Student / ছাত্র (পড়ালেখা রেখে সোশ্যাল মিডিয়ায় আড্ডা)</option>
                    <option value="Job Holder">💼 Job Holder / চাকরিজীবী (৯টা-৫টা বসের ঝাড়ি খাওয়া)</option>
                    <option value="Freelancer">💻 Freelancer / ফ্রিল্যান্সার (রাতের পেঁচা, ক্লায়েন্টের রিভিশন)</option>
                    <option value="Unemployed">🛋️ Unemployed / বেকার (বাপের হোটেলে ফ্রি মিল)</option>
                    <option value="Entrepreneur">🚀 Entrepreneur / ব্যবসায়ী (স্টার্টআপ খুলে লস গোনা)</option>
                    <option value="Other">🤷 Other / অন্যান্য (কিছু একটা করি আরকি)</option>
                  </select>
                </div>

                {/* Relationship Status */}
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                    সম্পর্কের অবস্থা (Relationship Status)
                  </label>
                  <select
                    value={onboardingRelationship}
                    onChange={(e) => setOnboardingRelationship(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-900 border border-zinc-700/80 text-white text-xs focus:outline-none focus:border-red-500/80 transition-colors"
                  >
                    <option value="Single">💔 Single / চিরকুমার (ক্রাশ আমাকে ভাইয়া ডাকে)</option>
                    <option value="In a Relationship">💑 In a Relationship (প্রতিদিন প্যারা খাচ্ছি)</option>
                    <option value="Complicated">🌀 It's Complicated (নিজের লাইফেরই ঠিক নাই)</option>
                    <option value="Broken-hearted">💔 ছ্যাঁকা খাওয়া দেবদাস</option>
                  </select>
                </div>

                {/* Submit button */}
                <button
                  type="submit"
                  disabled={isSavingOnboarding}
                  className="w-full mt-2 py-3.5 rounded-xl font-bold bg-gradient-to-r from-red-600 via-rose-600 to-amber-500 hover:from-red-500 hover:to-amber-400 text-white shadow-xl shadow-red-500/30 transition-all flex items-center justify-center gap-2 active:scale-[0.98] disabled:opacity-50"
                >
                  {isSavingOnboarding ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-white" />
                      <span>Saving Profile...</span>
                    </>
                  ) : (
                    <>
                      <span>Save & Get Roasted</span>
                      <Flame className="w-4 h-4 fill-white" />
                    </>
                  )}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default NemoChat;
