import { ChangeEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  BarChart3,
  Camera,
  CheckCircle2,
  Clock,
  Download,
  FileText,
  HandCoins,
  ListTodo,
  Loader2,
  LogOut,
  MessageSquare,
  Paperclip,
  PieChart,
  Save,
  Send,
  Sparkles,
  TrendingUp,
  Wallet,
  X,
  ChevronRight,
  Upload,
  ArrowUpRight,
  Calendar,
  DollarSign,
  Briefcase,
  AlertCircle,
  Activity,
  Mail,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import PageTransition from "@/components/shared/PageTransition";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { getAdminToken, getApiBaseUrl } from "@/components/admin/adminAuth";
import { useToast } from "@/hooks/use-toast";
import {
  EMPLOYEE_DASHBOARD_PATH,
  setPreferredDashboardPath,
} from "@/components/shared/dashboardPath";

// ─── Interfaces ───────────────────────────────────────────────

interface EmployeeProfile {
  id: string;
  name: string;
  profession: string;
  email: string;
  mobile: string | null;
  profile_image_url: string | null;
}

interface EmployeeAssignment {
  id: string;
  employee_id: string;
  employee_name: string;
  employee_email: string;
  work_title: string;
  work_details: string | null;
  work_duration: string;
  countdown_end_at: string | null;
  revision_due_at: string | null;
  payment_amount: number | string | null;
  payment_status: "unpaid" | "paid";
  status: "assigned" | "done" | "draft";
  employee_submission_status: "pending" | "submitted";
  employee_submission_note: string | null;
  employee_submission_file_url: string | null;
  employee_submission_at: string | null;
  created_at?: string;
  updated_at?: string;
  completed_at?: string | null;
  paid_at?: string | null;
}

interface EmployeeChatMessage {
  id: string;
  employee_id: string;
  sender_type: "admin" | "employee";
  sender_label: string | null;
  message_text: string | null;
  attachment_url: string | null;
  attachment_name: string | null;
  attachment_mime: string | null;
  created_at: string;
}

interface AdvanceRequest {
  id: string;
  employee_id: string;
  employee_name: string;
  amount: number | string;
  reason: string;
  status: "pending" | "approved" | "rejected";
  requested_at: string;
  reviewed_at: string | null;
  reviewed_by: string | null;
  admin_note: string | null;
}

// ─── Types ────────────────────────────────────────────────────

type SubmissionDraft = {
  note: string;
  fileUrl: string;
};

type AssignmentView = "all" | "paid" | "unpaid" | "completed";

// ─── Constants ────────────────────────────────────────────────

const defaultSubmissionDraft: SubmissionDraft = {
  note: "",
  fileUrl: "",
};

const assignmentViewOptions: Array<{ key: AssignmentView; label: string }> = [
  { key: "all", label: "All" },
  { key: "paid", label: "Paid" },
  { key: "unpaid", label: "Unpaid" },
  { key: "completed", label: "Completed" },
];

const assignmentViewDetails: Record<
  AssignmentView,
  {
    eyebrow: string;
    title: string;
    description: string;
    emptyTitle: string;
  }
> = {
  all: {
    eyebrow: "Assignment Slide",
    title: "All Active Work",
    description:
      "Browse every non-draft assignment in one focused panel without stretching the dashboard page.",
    emptyTitle: "No assignments yet.",
  },
  paid: {
    eyebrow: "Payment Complete",
    title: "Paid Assignment List",
    description:
      "Every work item where payment status is already marked paid.",
    emptyTitle: "No paid assignments found yet.",
  },
  unpaid: {
    eyebrow: "Pending Settlement",
    title: "Unpaid Assignment List",
    description:
      "All assignments that still need payment follow-up, collected in one clean side panel.",
    emptyTitle: "No unpaid assignments right now.",
  },
  completed: {
    eyebrow: "Completed Work",
    title: "Completed Assignment List",
    description:
      "Works already marked done in CMS, including ones that may still be awaiting payment.",
    emptyTitle: "No completed assignments yet.",
  },
};

// ─── Utility Functions ────────────────────────────────────────

const parseApiError = async (response: Response, fallback: string) => {
  const contentType = response.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    const body = await response.json().catch(() => null);
    const message = body?.message || body?.detail || body?.error;
    if (message) return String(message);
  }
  const text = await response.text().catch(() => "");
  if (text) return text;
  return fallback;
};

const getErrorMessage = (error: unknown, fallback: string) => {
  if (error instanceof Error && error.message) return error.message;
  return fallback;
};

const formatTimeRemaining = (
  endAt: string | null | undefined,
  status: EmployeeAssignment["status"],
  nowMs: number
) => {
  if (status === "done") return "Done";
  if (!endAt) return "-";

  const targetMs = new Date(endAt).getTime();
  if (!Number.isFinite(targetMs)) return "-";

  const diffMs = targetMs - nowMs;
  if (diffMs <= 0) return "Expired";

  const totalSeconds = Math.floor(diffMs / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (days > 0) return `${days}d ${hours}h ${minutes}m`;
  if (hours > 0) return `${hours}h ${minutes}m ${seconds}s`;
  if (minutes > 0) return `${minutes}m ${seconds}s`;
  return `${seconds}s`;
};

const parsePaymentAmount = (value: unknown): number | null => {
  if (value === null || value === undefined) return null;
  const numeric = Number(String(value).replace(/,/g, "").trim());
  if (!Number.isFinite(numeric) || numeric < 0) return null;
  return numeric;
};

const formatPaymentAmount = (value: unknown) => {
  const amount = parsePaymentAmount(value);
  if (amount === null) return "BDT 0.00";
  const formatted = new Intl.NumberFormat("en-BD", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
  return `BDT ${formatted}`;
};

const getMonthlyIncomeReferenceDate = (assignment: EmployeeAssignment) => {
  const rawValue = assignment.created_at ?? null;
  if (!rawValue) return null;
  const parsedDate = new Date(rawValue);
  if (Number.isNaN(parsedDate.getTime())) return null;
  return parsedDate;
};

// ─── CSV Export Function ──────────────────────────────────────

const exportCompletedToCSV = (assignments: EmployeeAssignment[]) => {
  const completedWorks = assignments.filter((a) => a.status === "done");

  if (completedWorks.length === 0) {
    return { success: false, message: "No completed works to export" };
  }

  const headers = [
    "Work Title",
    "Duration",
    "Payment Amount (BDT)",
    "Payment Status",
    "Submission Status",
    "Submission Note",
    "Submission File URL",
    "Submitted At",
    "Completed At",
    "Created At",
  ];

  const rows = completedWorks.map((assignment) => [
    `"${(assignment.work_title || "").replace(/"/g, '""')}"`,
    `"${assignment.work_duration || ""}"`,
    parsePaymentAmount(assignment.payment_amount) ?? 0,
    `"${assignment.payment_status}"`,
    `"${assignment.employee_submission_status}"`,
    `"${(assignment.employee_submission_note || "").replace(/"/g, '""')}"`,
    `"${assignment.employee_submission_file_url || ""}"`,
    `"${assignment.employee_submission_at || ""}"`,
    `"${assignment.completed_at || ""}"`,
    `"${assignment.created_at || ""}"`,
  ]);

  const csvContent = [
    headers.join(","),
    ...rows.map((row) => row.join(",")),
  ].join("\n");

  const blob = new Blob(["\uFEFF" + csvContent], {
    type: "text/csv;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `completed-works-${new Date().toISOString().split("T")[0]}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);

  return { success: true, message: `${completedWorks.length} works exported successfully` };
};

// ─── Main Component ───────────────────────────────────────────

const EmployeeDashboard = () => {
  const { user, session, signOut, loading: authLoading } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();

  const previewEmployeeId = useMemo(
    () =>
      new URLSearchParams(location.search).get("preview_employee_id")?.trim() ?? "",
    [location.search]
  );
  const adminToken = useMemo(
    () => (previewEmployeeId ? getAdminToken() ?? "" : ""),
    [previewEmployeeId]
  );
  const isAdminPreview = Boolean(previewEmployeeId && adminToken);
  const showInboxFullView =
    !isAdminPreview && location.hash.toLowerCase() === "#inbox-full";

  // ─── State ──────────────────────────────────────────────────

  const [employee, setEmployee] = useState<EmployeeProfile | null>(null);
  const [assignments, setAssignments] = useState<EmployeeAssignment[]>([]);
  const [advanceRequests, setAdvanceRequests] = useState<AdvanceRequest[]>([]);
  const [advanceModalOpen, setAdvanceModalOpen] = useState(false);
  const [advanceAmount, setAdvanceAmount] = useState("");
  const [advanceReason, setAdvanceReason] = useState("");
  const [submittingAdvance, setSubmittingAdvance] = useState(false);
  const [loading, setLoading] = useState(true);
  const [nowTick, setNowTick] = useState(() => Date.now());
  const [profileDraft, setProfileDraft] = useState<{
    mobile: string;
    profile_image_url: string | null;
  }>({
    mobile: "",
    profile_image_url: null,
  });
  const [savingProfile, setSavingProfile] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [submissionDrafts, setSubmissionDrafts] = useState<
    Record<string, SubmissionDraft>
  >({});
  const [submittingAssignmentId, setSubmittingAssignmentId] = useState<
    string | null
  >(null);
  const [assignmentView, setAssignmentView] = useState<AssignmentView>("all");
  const [assignmentPanelOpen, setAssignmentPanelOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<EmployeeChatMessage[]>([]);
  const [loadingChat, setLoadingChat] = useState(false);
  const [chatDraft, setChatDraft] = useState("");
  const [chatAttachment, setChatAttachment] = useState<{
    url: string;
    name: string;
    mime: string;
  } | null>(null);
  const [uploadingChatAttachment, setUploadingChatAttachment] = useState(false);
  const [sendingChat, setSendingChat] = useState(false);
  const [expandedAssignmentId, setExpandedAssignmentId] = useState<string | null>(null);
  const [exportingCSV, setExportingCSV] = useState(false);
  const [avatarFullView, setAvatarFullView] = useState(false);

  const avatarInputRef = useRef<HTMLInputElement | null>(null);
  const chatAttachmentInputRef = useRef<HTMLInputElement | null>(null);
  const chatEndRef = useRef<HTMLDivElement | null>(null);

  // ─── Auth & Redirect Effects ────────────────────────────────

  useEffect(() => {
    if (isAdminPreview) return;
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [authLoading, isAdminPreview, user, navigate]);

  useEffect(() => {
    if (!isAdminPreview) {
      setPreferredDashboardPath(EMPLOYEE_DASHBOARD_PATH);
    }
  }, [isAdminPreview]);

  useEffect(() => {
    if (!previewEmployeeId || adminToken) return;
    navigate("/database/login", { replace: true });
  }, [adminToken, navigate, previewEmployeeId]);

  // ─── Timer ──────────────────────────────────────────────────

  useEffect(() => {
    const timer = window.setInterval(() => setNowTick(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  // ─── Data Loading ───────────────────────────────────────────

  const applyDashboardPayload = useCallback(
    (
      data: {
        employee?: EmployeeProfile | null;
        assignments?: EmployeeAssignment[];
        advance_requests?: AdvanceRequest[];
      } | null
    ) => {
      const nextEmployee = (data?.employee ?? null) as EmployeeProfile | null;
      const nextAssignments = Array.isArray(data?.assignments)
        ? (data.assignments as EmployeeAssignment[])
        : [];
      const nextAdvanceRequests = Array.isArray(data?.advance_requests)
        ? (data.advance_requests as AdvanceRequest[])
        : [];

      setEmployee(nextEmployee);
      setAssignments(nextAssignments);
      setAdvanceRequests(nextAdvanceRequests);
      setProfileDraft({
        mobile: nextEmployee?.mobile ?? "",
        profile_image_url: nextEmployee?.profile_image_url ?? null,
      });

      const initialSubmissionDrafts: Record<string, SubmissionDraft> = {};
      nextAssignments.forEach((assignment) => {
        const id = String(assignment?.id ?? "").trim();
        if (!id) return;
        initialSubmissionDrafts[id] = {
          note: assignment.employee_submission_note ?? "",
          fileUrl: assignment.employee_submission_file_url ?? "",
        };
      });
      setSubmissionDrafts(initialSubmissionDrafts);
    },
    []
  );

  const loadEmployeeDashboard = useCallback(async () => {
    try {
      setLoading(true);
      const apiBase = getApiBaseUrl();

      if (isAdminPreview) {
        const response = await fetch(
          `${apiBase}/employees/${encodeURIComponent(previewEmployeeId)}/dashboard-preview`,
          {
            headers: {
              Authorization: `Bearer ${adminToken}`,
            },
          }
        );

        if (!response.ok) {
          throw new Error(
            await parseApiError(response, "Failed to load employee preview")
          );
        }

        const data = await response.json();
        applyDashboardPayload(data);
        setChatMessages([]);
        return;
      }

      if (!session?.access_token) {
        setLoading(false);
        return;
      }

      const response = await fetch(`${apiBase}/employee/dashboard`, {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (!response.ok) {
        throw new Error(
          await parseApiError(response, "Failed to load employee dashboard")
        );
      }

      const data = await response.json();
      applyDashboardPayload(data);
    } catch (error: unknown) {
      console.error(error);
      setEmployee(null);
      setAssignments([]);
      setSubmissionDrafts({});
      toast({
        title: "Dashboard Error",
        description: getErrorMessage(error, "Failed to load employee dashboard"),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [
    adminToken,
    applyDashboardPayload,
    isAdminPreview,
    previewEmployeeId,
    session?.access_token,
    toast,
  ]);

  useEffect(() => {
    loadEmployeeDashboard();
  }, [loadEmployeeDashboard]);

  const loadEmployeeChat = useCallback(
    async (silent = false) => {
      if (isAdminPreview) {
        setChatMessages([]);
        return;
      }

      if (!session?.access_token) return;

      try {
        if (!silent) setLoadingChat(true);
        const apiBase = getApiBaseUrl();
        const response = await fetch(`${apiBase}/employee/chat?limit=400`, {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        });

        if (!response.ok) {
          throw new Error(await parseApiError(response, "Failed to load chat"));
        }

        const data = await response.json();
        const nextMessages = Array.isArray(data?.messages)
          ? (data.messages as EmployeeChatMessage[])
          : [];
        setChatMessages(nextMessages);
      } catch (error: unknown) {
        if (!silent) {
          toast({
            title: "Chat Error",
            description: getErrorMessage(error, "Could not load chat messages"),
            variant: "destructive",
          });
        }
      } finally {
        if (!silent) setLoadingChat(false);
      }
    },
    [isAdminPreview, session?.access_token, toast]
  );

  useEffect(() => {
    if (!showInboxFullView) return;
    loadEmployeeChat();
  }, [loadEmployeeChat, showInboxFullView]);

  useEffect(() => {
    if (!session?.access_token || !showInboxFullView || isAdminPreview) return;
    const timer = window.setInterval(() => {
      loadEmployeeChat(true);
    }, 15000);
    return () => window.clearInterval(timer);
  }, [isAdminPreview, loadEmployeeChat, session?.access_token, showInboxFullView]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [chatMessages]);

  useEffect(() => {
    if (!showInboxFullView) return;
    const id = window.requestAnimationFrame(() => {
      const section = document.getElementById("employee-inbox-section");
      section?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
    return () => window.cancelAnimationFrame(id);
  }, [showInboxFullView]);

  // ─── Computed Values ────────────────────────────────────────

  const activeAssignments = useMemo(
    () =>
      assignments.filter(
        (item) => item.status !== "done" && item.status !== "draft"
      ),
    [assignments]
  );

  const submittedAssignments = useMemo(
    () =>
      activeAssignments.filter(
        (item) => item.employee_submission_status === "submitted"
      ),
    [activeAssignments]
  );

  const doneAssignments = useMemo(
    () => assignments.filter((item) => item.status === "done"),
    [assignments]
  );

  const nonDraftAssignments = useMemo(
    () => assignments.filter((item) => item.status !== "draft"),
    [assignments]
  );

  const paidAssignments = useMemo(
    () => nonDraftAssignments.filter((item) => item.payment_status === "paid"),
    [nonDraftAssignments]
  );

  const unpaidAssignments = useMemo(
    () =>
      nonDraftAssignments.filter((item) => item.payment_status === "unpaid"),
    [nonDraftAssignments]
  );

  const assignmentsInView = useMemo(() => {
    if (assignmentView === "paid") return paidAssignments;
    if (assignmentView === "unpaid") return unpaidAssignments;
    if (assignmentView === "completed") return doneAssignments;
    return nonDraftAssignments;
  }, [assignmentView, doneAssignments, nonDraftAssignments, paidAssignments, unpaidAssignments]);

  const totalTrackedAssignments = nonDraftAssignments.length;

  const completionRate = useMemo(() => {
    if (totalTrackedAssignments === 0) return 0;
    return Math.round((doneAssignments.length / totalTrackedAssignments) * 100);
  }, [doneAssignments.length, totalTrackedAssignments]);

  const submittedRate = useMemo(() => {
    if (activeAssignments.length === 0) return 0;
    return Math.round(
      (submittedAssignments.length / activeAssignments.length) * 100
    );
  }, [activeAssignments.length, submittedAssignments.length]);

  const unpaidAmount = useMemo(() => {
    let total = 0;
    assignments.forEach((assignment) => {
      if (assignment.status === "draft" || assignment.payment_status !== "unpaid")
        return;
      const amount = parsePaymentAmount(assignment.payment_amount);
      if (amount !== null) total += amount;
    });
    return total;
  }, [assignments]);

  const { totalIncomeAmount, monthlyIncomeAmount, monthlyIncomeCount } =
    useMemo(() => {
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const nextMonthStart = new Date(now.getFullYear(), now.getMonth() + 1, 1);
      let totalIncome = 0;
      let monthlyIncome = 0;
      let monthlyCount = 0;

      doneAssignments.forEach((assignment) => {
        const amount = parsePaymentAmount(assignment.payment_amount);
        if (amount === null) return;

        totalIncome += amount;

        const incomeDate = getMonthlyIncomeReferenceDate(assignment);
        if (!incomeDate) return;

        if (incomeDate >= monthStart && incomeDate < nextMonthStart) {
          monthlyIncome += amount;
          monthlyCount += 1;
        }
      });

      return {
        totalIncomeAmount: totalIncome,
        monthlyIncomeAmount: monthlyIncome,
        monthlyIncomeCount: monthlyCount,
      };
    }, [doneAssignments]);

  const incomeMonthLabel = useMemo(
    () =>
      new Intl.DateTimeFormat("en-BD", {
        month: "long",
        year: "numeric",
      }).format(new Date()),
    []
  );

  const assignmentPreview = useMemo(
    () => activeAssignments.slice(0, 5),
    [activeAssignments]
  );

  const hasProfileChanges = useMemo(() => {
    if (!employee) return false;
    const currentMobile = profileDraft.mobile.trim();
    const savedMobile = String(employee.mobile ?? "").trim();
    const currentPhoto = profileDraft.profile_image_url ?? "";
    const savedPhoto = employee.profile_image_url ?? "";
    return currentMobile !== savedMobile || currentPhoto !== savedPhoto;
  }, [employee, profileDraft.mobile, profileDraft.profile_image_url]);

  // ─── Handlers ───────────────────────────────────────────────

  const handleAvatarUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    if (isAdminPreview) return;
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file || !employee || !session?.access_token) return;

    if (!file.type.startsWith("image/")) {
      toast({
        title: "Invalid file",
        description: "Please upload a valid image file.",
        variant: "destructive",
      });
      return;
    }

    const maxSize = 4 * 1024 * 1024;
    if (file.size > maxSize) {
      toast({
        title: "Image too large",
        description: "Please upload an image under 4MB.",
        variant: "destructive",
      });
      return;
    }

    setUploadingAvatar(true);
    try {
      const apiBase = getApiBaseUrl();
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch(`${apiBase}/employee/profile/upload`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
        body: formData,
      });

      if (!response.ok) {
        throw new Error(
          await parseApiError(response, "Failed to upload profile image")
        );
      }

      const payload = await response.json();
      const publicUrl = String(payload?.publicUrl ?? "").trim();
      if (!publicUrl) {
        throw new Error("Missing uploaded profile image URL");
      }

      setProfileDraft((prev) => ({ ...prev, profile_image_url: publicUrl }));
      toast({
        title: "Photo ready",
        description: "Click Save Profile to apply your new image.",
      });
    } catch (error: unknown) {
      toast({
        title: "Upload failed",
        description: getErrorMessage(error, "Could not upload profile image"),
        variant: "destructive",
      });
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleSaveProfile = async () => {
    if (isAdminPreview) return;
    if (!session?.access_token || !employee) return;

    setSavingProfile(true);
    try {
      const apiBase = getApiBaseUrl();
      const response = await fetch(`${apiBase}/employee/profile`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          mobile: profileDraft.mobile.trim() || null,
          profile_image_url: profileDraft.profile_image_url || null,
        }),
      });

      if (!response.ok) {
        throw new Error(await parseApiError(response, "Failed to save profile"));
      }

      const updated = (await response.json()) as Partial<EmployeeProfile>;
      setEmployee((prev) => {
        if (!prev) return prev;
        const mobileFromDraft = profileDraft.mobile.trim() || null;
        const profileImageFromDraft = profileDraft.profile_image_url ?? null;
        return {
          ...prev,
          ...updated,
          mobile: (updated.mobile ?? mobileFromDraft) as string | null,
          profile_image_url: (updated.profile_image_url ??
            profileImageFromDraft) as string | null,
        };
      });
      toast({ title: "Profile updated successfully" });
    } catch (error: unknown) {
      toast({
        title: "Save failed",
        description: getErrorMessage(error, "Could not update profile"),
        variant: "destructive",
      });
    } finally {
      setSavingProfile(false);
    }
  };

  const setSubmissionDraftValue = (
    assignmentId: string,
    patch: Partial<SubmissionDraft>
  ) => {
    setSubmissionDrafts((prev) => ({
      ...prev,
      [assignmentId]: {
        ...(prev[assignmentId] ?? defaultSubmissionDraft),
        ...patch,
      },
    }));
  };

  const openAssignmentPanel = useCallback((view: AssignmentView) => {
    setAssignmentView(view);
    setAssignmentPanelOpen(true);
  }, []);

  const handleAssignmentPanelChange = useCallback((open: boolean) => {
    setAssignmentPanelOpen(open);
    if (!open) {
      setAssignmentView("all");
    }
  }, []);

  const handleSubmitAssignment = async (assignmentId: string) => {
    if (isAdminPreview) return;
    if (!session?.access_token) return;

    const assignment = assignments.find((item) => item.id === assignmentId);
    if (
      !assignment ||
      assignment.status === "done" ||
      assignment.status === "draft"
    )
      return;

    const draft = submissionDrafts[assignmentId] ?? defaultSubmissionDraft;
    const note = draft.note.trim();
    const fileUrl = draft.fileUrl.trim();

    if (!note && !fileUrl) {
      toast({
        title: "Submission required",
        description: "Please add a note or delivery link before submitting.",
        variant: "destructive",
      });
      return;
    }

    if (fileUrl) {
      try {
        const parsed = new URL(fileUrl);
        if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
          throw new Error("Invalid protocol");
        }
      } catch {
        toast({
          title: "Invalid link",
          description: "Delivery link must be a valid http/https URL.",
          variant: "destructive",
        });
        return;
      }
    }

    setSubmittingAssignmentId(assignmentId);
    try {
      const apiBase = getApiBaseUrl();
      const response = await fetch(
        `${apiBase}/employee/work-assignments/${assignmentId}/submit`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            submission_note: note || null,
            submission_file_url: fileUrl || null,
          }),
        }
      );

      if (!response.ok) {
        throw new Error(
          await parseApiError(response, "Failed to submit assignment")
        );
      }

      toast({ title: "Work submitted successfully" });
      await loadEmployeeDashboard();
    } catch (error: unknown) {
      toast({
        title: "Submission failed",
        description: getErrorMessage(error, "Could not submit assignment"),
        variant: "destructive",
      });
    } finally {
      setSubmittingAssignmentId(null);
    }
  };

  const handleChatAttachmentUpload = async (
    event: ChangeEvent<HTMLInputElement>
  ) => {
    if (isAdminPreview) return;
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file || !employee || !session?.access_token) return;

    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      toast({
        title: "File too large",
        description: "Please upload a file under 10MB.",
        variant: "destructive",
      });
      return;
    }

    setUploadingChatAttachment(true);
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
        throw new Error(await parseApiError(response, "Could not upload file"));
      }

      const payload = await response.json();
      const publicUrl = String(payload?.publicUrl ?? "").trim();
      if (!publicUrl) {
        throw new Error("Missing uploaded attachment URL");
      }

      setChatAttachment({
        url: publicUrl,
        name: file.name,
        mime: file.type || "application/octet-stream",
      });
      toast({ title: "Attachment ready" });
    } catch (error: unknown) {
      toast({
        title: "Upload failed",
        description: getErrorMessage(error, "Could not upload file"),
        variant: "destructive",
      });
    } finally {
      setUploadingChatAttachment(false);
    }
  };

  const handleSendChat = async () => {
    if (isAdminPreview) return;
    if (!session?.access_token || !employee) return;

    const messageText = chatDraft.trim();
    if (!messageText && !chatAttachment?.url) {
      toast({
        title: "Message required",
        description: "Write a message or attach a file before sending.",
        variant: "destructive",
      });
      return;
    }

    setSendingChat(true);
    try {
      const apiBase = getApiBaseUrl();
      const response = await fetch(`${apiBase}/employee/chat/messages`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          message_text: messageText || null,
          attachment_url: chatAttachment?.url ?? null,
          attachment_name: chatAttachment?.name ?? null,
          attachment_mime: chatAttachment?.mime ?? null,
        }),
      });

      if (!response.ok) {
        throw new Error(
          await parseApiError(response, "Failed to send message")
        );
      }

      setChatDraft("");
      setChatAttachment(null);
      await loadEmployeeChat(true);
    } catch (error: unknown) {
      toast({
        title: "Send failed",
        description: getErrorMessage(error, "Could not send message"),
        variant: "destructive",
      });
    } finally {
      setSendingChat(false);
    }
  };

  const handleSignOut = async () => {
    if (isAdminPreview) {
      navigate("/database/employees");
      return;
    }
    await signOut();
    navigate("/");
  };

  const handleCreateAdvanceRequest = async () => {
    if (isAdminPreview) return;
    if (!session?.access_token || !employee) return;

    const amountNum = Number(advanceAmount);
    if (!amountNum || amountNum <= 0) {
      toast({
        title: "Invalid amount",
        description: "Please enter a valid advance payment amount.",
        variant: "destructive",
      });
      return;
    }

    const reasonText = advanceReason.trim();
    if (!reasonText) {
      toast({
        title: "Reason required",
        description: "Please write a short reason for your advance payment request.",
        variant: "destructive",
      });
      return;
    }

    setSubmittingAdvance(true);
    try {
      const apiBase = getApiBaseUrl();
      const response = await fetch(`${apiBase}/employee/advance-requests`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          amount: amountNum,
          reason: reasonText,
        }),
      });

      if (!response.ok) {
        throw new Error(
          await parseApiError(response, "Failed to submit advance request")
        );
      }

      toast({
        title: "Request Submitted",
        description: "Your advance payment request has been sent to admin.",
      });

      setAdvanceAmount("");
      setAdvanceReason("");
      setAdvanceModalOpen(false);
      await loadEmployeeDashboard();
    } catch (error: unknown) {
      toast({
        title: "Submission failed",
        description: getErrorMessage(error, "Could not submit advance request"),
        variant: "destructive",
      });
    } finally {
      setSubmittingAdvance(false);
    }
  };

  const handleExportCSV = () => {
    setExportingCSV(true);
    const result = exportCompletedToCSV(assignments);

    if (result.success) {
      toast({
        title: "Export Successful",
        description: result.message,
      });
    } else {
      toast({
        title: "Export Failed",
        description: result.message,
        variant: "destructive",
      });
    }

    setTimeout(() => setExportingCSV(false), 1000);
  };

  const initials = (employee?.name || employee?.email || "E")
    .trim()
    .slice(0, 1)
    .toUpperCase();

  // ─── Render Assignment List ─────────────────────────────────

  const renderAssignmentList = () => {
    if (loading) {
      return (
        <div className="py-16 text-center">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            className="w-10 h-10 mx-auto mb-4 rounded-full border-4 border-muted border-t-primary"
          />
          <p className="text-sm text-muted-foreground font-medium">
            Loading assignments...
          </p>
        </div>
      );
    }

    if (!employee) {
      return (
        <div className="py-16 text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-muted flex items-center justify-center">
            <AlertCircle className="w-8 h-8 text-muted-foreground" />
          </div>
          <p className="text-sm font-medium text-muted-foreground">
            No employee profile mapped yet
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Please contact your administrator
          </p>
        </div>
      );
    }

    if (assignmentsInView.length === 0) {
      return (
        <div className="py-16">
          <div className="max-w-md mx-auto text-center">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 200, damping: 20 }}
              className="w-20 h-20 mx-auto mb-6 rounded-3xl bg-muted flex items-center justify-center"
            >
              <ListTodo className="w-10 h-10 text-muted-foreground" />
            </motion.div>
            <h3 className="text-lg font-semibold text-foreground mb-2">
              {assignmentViewDetails[assignmentView].emptyTitle}
            </h3>
            {assignmentView !== "all" && (
              <Button
                variant="outline"
                className="mt-6 rounded-xl"
                onClick={() => setAssignmentView("all")}
              >
                Show All Assignments
              </Button>
            )}
          </div>
        </div>
      );
    }

    return (
      <div>
        {/* CSV Export Button - Only show in Completed view */}
        {assignmentView === "completed" && doneAssignments.length > 0 && (
          <div className="flex justify-end mb-2">
            <Button
              onClick={handleExportCSV}
              disabled={exportingCSV}
              variant="outline"
              size="sm"
              className="rounded-lg text-xs h-7"
            >
              {exportingCSV ? (
                <Loader2 className="w-3 h-3 mr-1.5 animate-spin" />
              ) : (
                <Download className="w-3 h-3 mr-1.5" />
              )}
              Export CSV
            </Button>
          </div>
        )}

        {/* Table */}
        <div className="rounded-lg border-[2.5px] border-border/70 dark:border-border bg-card overflow-hidden shadow-md">
          {/* Table Header */}
          <div className="hidden sm:grid grid-cols-[36px_minmax(0,2fr)_72px_110px_60px_80px] gap-1 px-3 py-2 text-[10px] uppercase tracking-wider text-foreground/70 dark:text-muted-foreground font-bold bg-muted/70 dark:bg-muted/40 border-b border-border">
            <span className="text-center">#</span>
            <span>Work Title</span>
            <span>Duration</span>
            <span className="text-right">Amount</span>
            <span className="text-center">Paid</span>
            <span className="text-right">Status</span>
          </div>

          {/* Table Body */}
          <div className="divide-y divide-border">
            {assignmentsInView.map((assignment, index) => {
              const isDone = assignment.status === "done";
              const isSubmitted = assignment.employee_submission_status === "submitted";
              const isExpanded = expandedAssignmentId === assignment.id;
              const hasExpandContent = !isDone || assignment.employee_submission_note || assignment.employee_submission_file_url;

              return (
                <div key={assignment.id}>
                  <div
                    className={`group grid sm:grid-cols-[36px_minmax(0,2fr)_72px_110px_60px_80px] grid-cols-1 gap-1 items-center px-3 py-2.5 text-xs transition-colors duration-150 ${hasExpandContent ? 'cursor-pointer' : ''} hover:bg-muted/60 dark:hover:bg-muted/30`}
                    onClick={() => hasExpandContent && setExpandedAssignmentId(isExpanded ? null : assignment.id)}
                  >
                    {/* Row Number */}
                    <span className="text-[10px] text-muted-foreground font-semibold text-center tabular-nums">
                      {index + 1}
                    </span>

                    {/* Title */}
                    <span className="font-semibold text-foreground truncate">
                      {assignment.work_title}
                    </span>

                    {/* Duration */}
                    <span className="text-[11px] font-medium text-muted-foreground dark:text-muted-foreground">
                      {assignment.work_duration}
                    </span>

                    {/* Amount */}
                    <span className="text-[11px] font-bold text-foreground text-right tabular-nums">
                      {formatPaymentAmount(assignment.payment_amount)}
                    </span>

                    {/* Payment Status */}
                    <div className="flex justify-center">
                      {assignment.payment_status === "paid" ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                      ) : (
                        <Clock className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                      )}
                    </div>

                    {/* Status */}
                    <span
                      className={`text-[11px] font-bold text-right ${isDone
                          ? "text-emerald-600 dark:text-emerald-400"
                          : isSubmitted
                            ? "text-violet-600 dark:text-violet-400"
                            : formatTimeRemaining(
                              assignment.countdown_end_at,
                              assignment.status,
                              nowTick
                            ) === "Expired"
                              ? "text-destructive"
                              : "text-primary"
                        }`}
                    >
                      {isDone
                        ? "Completed"
                        : isSubmitted
                          ? "Submitted"
                          : formatTimeRemaining(
                            assignment.countdown_end_at,
                            assignment.status,
                            nowTick
                          )}
                    </span>
                  </div>

                  {/* Expanded Content */}
                  <AnimatePresence>
                    {isExpanded && hasExpandContent && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.25, ease: "easeInOut" }}
                        className="overflow-hidden border-t border-border/50"
                      >
                        <div className="px-3 pb-3 pt-2 space-y-2 bg-muted/40 dark:bg-muted/20">
                          {/* Submission Info */}
                          {(assignment.employee_submission_note ||
                            assignment.employee_submission_file_url) && (
                              <div className="rounded-md bg-muted/40 p-2.5 text-[11px] space-y-1">
                                {assignment.employee_submission_note && (
                                  <p className="text-muted-foreground line-clamp-2">
                                    {assignment.employee_submission_note}
                                  </p>
                                )}
                                {assignment.employee_submission_file_url && (
                                  <a
                                    href={assignment.employee_submission_file_url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="inline-flex items-center gap-1 text-primary hover:underline break-all text-[11px]"
                                  >
                                    <Paperclip className="h-3 w-3" /> Attachment
                                  </a>
                                )}
                                {assignment.employee_submission_at && (
                                  <p className="text-[10px] text-muted-foreground">
                                    Submitted: {new Date(assignment.employee_submission_at).toLocaleString()}
                                  </p>
                                )}
                              </div>
                            )}

                          {/* Submission Form */}
                          {assignment.status !== "done" && !isAdminPreview && (
                            <div className="space-y-1.5">
                              <Textarea
                                rows={2}
                                value={submissionDrafts[assignment.id]?.note ?? ""}
                                onChange={(e) =>
                                  setSubmissionDraftValue(assignment.id, {
                                    note: e.target.value,
                                  })
                                }
                                placeholder="Add a short note..."
                                className="text-xs"
                              />
                              <Input
                                value={submissionDrafts[assignment.id]?.fileUrl ?? ""}
                                onChange={(e) =>
                                  setSubmissionDraftValue(assignment.id, {
                                    fileUrl: e.target.value,
                                  })
                                }
                                placeholder="Delivery link (optional)"
                                className="text-xs"
                              />
                              <Button
                                size="sm"
                                className="w-full rounded-lg text-xs h-8"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleSubmitAssignment(assignment.id);
                                }}
                                disabled={submittingAssignmentId === assignment.id}
                              >
                                {submittingAssignmentId === assignment.id ? (
                                  <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                                ) : (
                                  <Send className="w-3 h-3 mr-1" />
                                )}
                                Submit Work
                              </Button>
                            </div>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  // ─── Loading State ──────────────────────────────────────────

  if (authLoading && !isAdminPreview) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background gap-4">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          className="w-12 h-12 rounded-full border-4 border-muted border-t-primary"
        />
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="text-sm text-muted-foreground font-medium"
        >
          Loading your workspace...
        </motion.p>
      </div>
    );
  }

  // ─── Main Render ────────────────────────────────────────────

  return (
    <PageTransition>
      <div className="min-h-screen bg-background">
        <Navigation />

        <main className="pt-24 pb-16 px-4 sm:px-6 lg:px-8 max-w-[1440px] mx-auto">
          {/* ─── Welcome Banner ──────────────────────────────── */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative mb-8 overflow-hidden rounded-3xl bg-card border-[2.5px] border-border/70 dark:border-border p-6 md:p-8 shadow-md"
          >
            <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-primary/5 rounded-full -translate-y-1/2 translate-x-1/4" />

            <div className="relative flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
              <div className="flex items-start gap-5">
                <motion.div
                  initial={{ scale: 0, rotate: -180 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: "spring", stiffness: 200, damping: 20 }}
                  className="hidden sm:flex w-14 h-14 rounded-2xl bg-primary/10 items-center justify-center flex-shrink-0"
                >
                  <Sparkles className="w-7 h-7 text-primary" />
                </motion.div>
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <span className="px-3 py-1 text-[11px] font-bold uppercase tracking-wider bg-primary/10 text-primary rounded-full">
                      Employee Portal
                    </span>
                    {isAdminPreview && (
                      <span className="px-3 py-1 text-[11px] font-bold bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 rounded-full">
                        Admin Preview
                      </span>
                    )}
                  </div>
                  <h1 className="text-3xl md:text-4xl font-bold text-foreground mt-2 tracking-tight">
                    {employee ? `Welcome back, ${employee.name.split(" ")[0]}!` : "Welcome Back"}
                  </h1>
                  <p className="text-muted-foreground mt-2 text-sm md:text-base">
                    {employee
                      ? `${employee.profession} • ${employee.email}`
                      : "Your professional workspace"}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                {!isAdminPreview && employee && (
                  <button
                    onClick={() => setAdvanceModalOpen(true)}
                    className="group relative px-5 py-3 bg-amber-100/80 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800/60 rounded-2xl text-amber-900 dark:text-amber-300 font-semibold text-sm transition-all duration-200 ease-out hover:bg-amber-200/80 dark:hover:bg-amber-950/60 hover:scale-[1.03] active:scale-[0.98] shadow-sm"
                  >
                    <div className="flex items-center gap-2">
                      <HandCoins className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                      <span>Request Advance</span>
                      <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </button>
                )}
                <button
                  onClick={handleSignOut}
                  className="px-5 py-3 bg-card border border-border/80 dark:border-border rounded-2xl text-foreground font-semibold text-sm hover:bg-muted/80 transition-all duration-200 ease-out hover:scale-[1.03] active:scale-[0.98] shadow-sm"
                >
                  <div className="flex items-center gap-2">
                    <LogOut className="w-4 h-4" />
                    <span>{isAdminPreview ? "Back" : "Sign Out"}</span>
                  </div>
                </button>
              </div>
            </div>
          {/* ─── PDFForge Tools Suite Banner Card ─── */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.08 }}
            className="mb-8 p-5 bg-gradient-to-r from-red-600 via-rose-600 to-red-700 text-white rounded-2xl shadow-lg flex flex-col md:flex-row items-center justify-between gap-4 cursor-pointer hover:shadow-xl transition-all"
            onClick={() => window.open("http://localhost:8001/", "_blank")}
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center text-white shrink-0">
                <FileText className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-extrabold tracking-tight">PDFForge Tools Suite</h3>
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-white/20 border border-white/30 text-white">
                    30 Free / Month
                  </span>
                </div>
                <p className="text-xs text-red-100 mt-0.5">
                  Merge, Split, Compress, Convert, Edit & Scan PDFs directly with your DrawnDimension account.
                </p>
              </div>
            </div>
            <button
              type="button"
              className="px-5 py-2.5 rounded-xl bg-white text-red-600 font-bold text-xs shadow hover:bg-red-50 transition-colors shrink-0 flex items-center gap-1.5"
            >
              Open PDF Tools &rarr;
            </button>
          </motion.div>

          {/* ─── KPI Grid ─────────────────────────────────────── */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8"
          >
            {[
              {
                title: "Active Projects",
                value: activeAssignments.length,
                subtitle: `${submittedAssignments.length} submitted`,
                icon: Briefcase,
                color: "blue",
              },
              {
                title: "Completion Rate",
                value: `${completionRate}%`,
                subtitle: `${doneAssignments.length} completed`,
                icon: PieChart,
                color: "emerald",
              },
              {
                title: "Total Earnings",
                value: formatPaymentAmount(totalIncomeAmount),
                subtitle: "Lifetime income",
                icon: DollarSign,
                color: "violet",
              },
              {
                title: "Monthly Income",
                value: formatPaymentAmount(monthlyIncomeAmount),
                subtitle: `${monthlyIncomeCount} works in ${incomeMonthLabel}`,
                icon: TrendingUp,
                color: "rose",
              },
            ].map((kpi, idx) => {
              const Icon = kpi.icon;
              const colorMap: Record<string, { bg: string; icon: string; trend: string }> = {
                blue: {
                  bg: "bg-blue-100/80 dark:bg-blue-950/30",
                  icon: "text-blue-700 dark:text-blue-400",
                  trend: "text-emerald-700 dark:text-emerald-400 bg-emerald-100/80 dark:bg-emerald-950/30",
                },
                emerald: {
                  bg: "bg-emerald-100/80 dark:bg-emerald-950/30",
                  icon: "text-emerald-700 dark:text-emerald-400",
                  trend: "text-emerald-700 dark:text-emerald-400 bg-emerald-100/80 dark:bg-emerald-950/30",
                },
                violet: {
                  bg: "bg-violet-100/80 dark:bg-violet-950/30",
                  icon: "text-violet-700 dark:text-violet-400",
                  trend: "text-violet-700 dark:text-violet-400 bg-violet-100/80 dark:bg-violet-950/30",
                },
                rose: {
                  bg: "bg-rose-100/80 dark:bg-rose-950/30",
                  icon: "text-rose-700 dark:text-rose-400",
                  trend: "text-rose-700 dark:text-rose-400 bg-rose-100/80 dark:bg-rose-950/30",
                },
              };
              const colors = colorMap[kpi.color];

              return (
                <div
                  key={idx}
                  className="group relative bg-card border-[2.5px] border-border/70 dark:border-border rounded-xl p-4 transition-all duration-300 ease-out hover:-translate-y-1 hover:shadow-lg cursor-pointer overflow-hidden shadow-md"
                >
                  <div className="absolute top-0 right-0 w-20 h-20 opacity-[0.06] dark:opacity-[0.10] group-hover:opacity-[0.12] dark:group-hover:opacity-[0.16] transition-opacity pointer-events-none">
                    <Icon className="w-full h-full text-foreground" strokeWidth={1.5} />
                  </div>

                  <div className="relative">
                    <div className="flex items-center justify-between mb-3">
                      <div className={`w-9 h-9 rounded-lg ${colors.bg} flex items-center justify-center`}>
                        <Icon className={`w-4 h-4 ${colors.icon}`} />
                      </div>
                    </div>
                    <div>
                      <p className="text-lg font-bold text-foreground mb-0.5 tracking-tight">
                        {kpi.value}
                      </p>
                      <p className="text-xs font-medium text-muted-foreground">
                        {kpi.title}
                      </p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        {kpi.subtitle}
                      </p>
                    </div>
                  </div>

                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-b-xl" />
                </div>
              );
            })}
          </motion.div>

          {/* ─── Profile + Quick Actions Grid ────────────────── */}
          <div className="grid lg:grid-cols-3 gap-6 mb-8 items-stretch">
            {/* Profile Card */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.15 }}
              className="lg:col-span-1 flex flex-col"
            >
              <div className="bg-card border-[2.5px] border-border/70 dark:border-border rounded-3xl overflow-hidden h-full flex flex-col shadow-md">
                <div className="relative h-28 bg-gradient-to-br from-primary to-primary/80 flex-shrink-0" />

                <div className="relative px-6 pb-6 flex-1 flex flex-col">
                  <div className="relative -mt-14 mb-4 flex justify-center">
                    <div className="relative">
                      <div
                        className="w-28 h-28 rounded-full border-[5px] border-background bg-muted overflow-hidden flex items-center justify-center shadow-lg cursor-pointer hover:opacity-90 transition-opacity"
                        onClick={() => profileDraft.profile_image_url && setAvatarFullView(true)}
                      >
                        {profileDraft.profile_image_url ? (
                          <img
                            src={profileDraft.profile_image_url}
                            alt={employee?.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <span className="text-4xl font-bold text-muted-foreground">
                            {initials}
                          </span>
                        )}
                      </div>
                      <button
                        onClick={() => avatarInputRef.current?.click()}
                        disabled={isAdminPreview || uploadingAvatar}
                        className="absolute -bottom-1 -right-1 w-9 h-9 bg-primary text-primary-foreground rounded-full flex items-center justify-center hover:bg-primary/90 transition-all duration-200 ease-out hover:scale-110 active:scale-90 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed border-2 border-background"
                      >
                        {uploadingAvatar ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Camera className="w-4 h-4" />
                        )}
                      </button>
                      <input
                        ref={avatarInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleAvatarUpload}
                        className="hidden"
                      />
                    </div>
                  </div>

                  <div className="text-center mb-6">
                    <h3 className="text-xl font-bold text-foreground">
                      {employee?.name || "Not Set"}
                    </h3>
                    <div className="flex items-center justify-center gap-2 mt-1">
                      <Briefcase className="w-4 h-4 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">
                        {employee?.profession || "No profession"}
                      </p>
                    </div>
                    <div className="flex items-center justify-center gap-2 mt-1">
                      <Mail className="w-4 h-4 text-muted-foreground" />
                      <p className="text-xs text-muted-foreground">
                        {employee?.email || "No email"}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <label className="block text-[11px] font-bold text-muted-foreground mb-2 uppercase tracking-widest">
                        Mobile Number
                      </label>
                      <Input
                        value={profileDraft.mobile}
                        onChange={(e) =>
                          setProfileDraft((prev) => ({
                            ...prev,
                            mobile: e.target.value,
                          }))
                        }
                        placeholder="+880 1XXX-XXXXXX"
                        readOnly={isAdminPreview}
                        className="bg-muted rounded-xl h-11 text-sm"
                      />
                    </div>

                    {!isAdminPreview && (
                      <Button
                        onClick={handleSaveProfile}
                        disabled={savingProfile || !hasProfileChanges}
                        className="w-full rounded-xl h-11 font-semibold"
                      >
                        {savingProfile ? (
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                          <Save className="w-4 h-4 mr-2" />
                        )}
                        {savingProfile ? "Saving..." : "Update Profile"}
                      </Button>
                    )}
                  </div>

                  <div className="mt-auto pt-5 border-t border-border">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="text-center p-3 rounded-xl bg-muted">
                        <p className="text-xl font-bold text-foreground">
                          {activeAssignments.length}
                        </p>
                        <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mt-1">
                          Active
                        </p>
                      </div>
                      <div className="text-center p-3 rounded-xl bg-muted">
                        <p className="text-xl font-bold text-foreground">
                          {doneAssignments.length}
                        </p>
                        <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mt-1">
                          Done
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Quick Actions + Activity */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="lg:col-span-2 flex flex-col gap-4"
            >
              {/* Category Cards */}
              <div className="grid sm:grid-cols-3 gap-4">
                {[
                  {
                    label: "Paid",
                    count: paidAssignments.length,
                    icon: CheckCircle2,
                    watermarkIcon: Wallet,
                    view: "paid" as const,
                    color: "emerald",
                  },
                  {
                    label: "Unpaid",
                    count: unpaidAssignments.length,
                    icon: Clock,
                    watermarkIcon: AlertCircle,
                    view: "unpaid" as const,
                    color: "amber",
                  },
                  {
                    label: "Completed",
                    count: doneAssignments.length,
                    icon: CheckCircle2,
                    watermarkIcon: BarChart3,
                    view: "completed" as const,
                    color: "green",
                  },
                ].map((item) => {
                  const Icon = item.icon;
                  const WatermarkIcon = item.watermarkIcon;
                  const colorMap: Record<string, { bg: string; icon: string }> = {
                    emerald: {
                      bg: "bg-emerald-100/80 dark:bg-emerald-950/30",
                      icon: "text-emerald-700 dark:text-emerald-400",
                    },
                    amber: {
                      bg: "bg-amber-100/80 dark:bg-amber-950/30",
                      icon: "text-amber-700 dark:text-amber-400",
                    },
                    green: {
                      bg: "bg-green-100/80 dark:bg-green-950/30",
                      icon: "text-green-700 dark:text-green-400",
                    },
                  };
                  const colors = colorMap[item.color];

                  return (
                    <button
                      key={item.label}
                      onClick={() => openAssignmentPanel(item.view)}
                      className="group relative bg-card border-[2.5px] border-border/70 dark:border-border rounded-xl p-3 text-left transition-all duration-300 ease-out hover:-translate-y-1 hover:shadow-lg cursor-pointer overflow-hidden active:scale-[0.98] shadow-md"
                    >
                      <div className="absolute top-0 right-0 w-20 h-20 opacity-[0.06] dark:opacity-[0.10] group-hover:opacity-[0.12] dark:group-hover:opacity-[0.16] transition-opacity pointer-events-none">
                        <WatermarkIcon className="w-full h-full text-foreground" strokeWidth={1.5} />
                      </div>
                      <div className="relative">
                        <div className="flex items-center justify-between mb-2">
                          <div className={`w-8 h-8 rounded-lg ${colors.bg} flex items-center justify-center`}>
                            <Icon className={`w-4 h-4 ${colors.icon}`} />
                          </div>
                        </div>
                        <p className="text-xl font-bold text-foreground mb-0.5">{item.count}</p>
                        <p className="text-xs font-medium text-muted-foreground">{item.label} Works</p>
                        <div className="mt-2 flex items-center gap-1 text-[11px] font-semibold text-primary">
                          <span>View All</span>
                          <ChevronRight className="w-3 h-3" />
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Recent Activity */}
              <div className="bg-card border-[2.5px] border-border/70 dark:border-border rounded-xl p-4 flex-1 shadow-md">
                <div className="flex items-center justify-between mb-5">
                  <div>
                    <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                      <Activity className="w-5 h-5 text-primary" />
                      Recent Activity
                    </h3>
                    <p className="text-xs text-muted-foreground mt-1">
                      Your latest assignments and updates
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => openAssignmentPanel("all")}
                    className="text-xs font-semibold rounded-xl"
                  >
                    View All <ChevronRight className="w-3.5 h-3.5 ml-1" />
                  </Button>
                </div>

                {loading ? (
                  <div className="py-12 text-center">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto text-muted-foreground mb-3" />
                    <p className="text-sm text-muted-foreground">Loading activity...</p>
                  </div>
                ) : assignmentPreview.length === 0 ? (
                  <div className="py-12 text-center">
                    <Calendar className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                    <p className="text-sm font-medium text-muted-foreground">
                      No active assignments
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {assignmentPreview.map((assignment, idx) => {
                      const isSubmitted = assignment.employee_submission_status === "submitted";
                      const statusDot = isSubmitted ? "bg-violet-500" : "bg-blue-500";

                      return (
                        <motion.div
                          key={assignment.id}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: idx * 0.08 }}
                          className="flex items-center gap-4 p-3.5 rounded-xl hover:bg-muted transition-all duration-300 ease-out hover:translate-x-1 cursor-pointer group"
                          onClick={() => openAssignmentPanel("all")}
                        >
                          <div className={`w-3 h-3 rounded-full ${statusDot}`} />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-foreground truncate">
                              {assignment.work_title}
                            </p>
                            <div className="flex items-center gap-3 mt-1">
                              <span className="text-xs text-muted-foreground">
                                {formatTimeRemaining(assignment.countdown_end_at, assignment.status, nowTick)}
                              </span>
                              <span className="text-xs font-semibold text-foreground/70">
                                {formatPaymentAmount(assignment.payment_amount)}
                              </span>
                            </div>
                          </div>
                          <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0" />
                        </motion.div>
                      );
                    })}
                  </div>
                )}
              </div>
            </motion.div>
          </div>

          {/* ─── Assignment Panel (Slide-over Dialog) ─────────── */}
          <Dialog open={assignmentPanelOpen} onOpenChange={handleAssignmentPanelChange}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-card rounded-3xl p-0">
              <div className="sticky top-0 z-10 bg-card rounded-t-3xl px-6 py-5 border-b border-border">
                <DialogHeader>
                  <DialogTitle className="text-xl font-bold text-foreground">
                    {assignmentViewDetails[assignmentView].title}
                  </DialogTitle>
                  <DialogDescription className="text-sm text-muted-foreground mt-2">
                    {assignmentViewDetails[assignmentView].description}
                  </DialogDescription>
                </DialogHeader>

                <div className="flex items-center gap-2 mt-4">
                  {assignmentViewOptions.map((view) => (
                    <button
                      key={view.key}
                      onClick={() => setAssignmentView(view.key)}
                      className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all ${assignmentView === view.key
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground hover:bg-muted/80"
                        }`}
                    >
                      {view.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="px-6 py-5">
                {renderAssignmentList()}
              </div>
            </DialogContent>
          </Dialog>

          {/* ─── Avatar Full View Lightbox ─────────────────────── */}
          <AnimatePresence>
            {avatarFullView && profileDraft.profile_image_url && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center cursor-pointer"
                onClick={() => setAvatarFullView(false)}
              >
                <button
                  onClick={() => setAvatarFullView(false)}
                  className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
                <motion.img
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.8, opacity: 0 }}
                  transition={{ duration: 0.25, ease: "easeOut" }}
                  src={profileDraft.profile_image_url}
                  alt={employee?.name}
                  className="max-w-[90vw] max-h-[85vh] rounded-2xl object-contain shadow-2xl"
                  onClick={(e) => e.stopPropagation()}
                />
              </motion.div>
            )}
          </AnimatePresence>

          {/* ─── Advance Request Dialog ───────────────────────── */}
          <Dialog open={advanceModalOpen} onOpenChange={setAdvanceModalOpen}>
            <DialogContent className="max-w-md bg-card rounded-2xl p-0 overflow-hidden">
              <div className="px-5 pt-5 pb-3 border-b border-border">
                <DialogHeader className="space-y-0.5">
                  <DialogTitle className="text-base font-bold text-foreground flex items-center gap-2">
                    <HandCoins className="w-4 h-4 text-amber-500" />
                    Advance Payment Request
                  </DialogTitle>
                  <DialogDescription className="text-xs text-muted-foreground">
                    Submit your request for admin review
                  </DialogDescription>
                </DialogHeader>
              </div>

              <div className="p-5 space-y-4">
                <div>
                  <label className="block text-[11px] font-bold text-foreground mb-1.5 uppercase tracking-wider">
                    Amount (BDT)
                  </label>
                  <div className="relative flex items-center bg-muted rounded-lg border border-transparent focus-within:border-primary/50 focus-within:ring-0 focus-within:shadow-[0_0_5px_rgba(220,38,38,0.4),0_0_15px_rgba(220,38,38,0.2),0_0_30px_rgba(220,38,38,0.1)] transition-all overflow-hidden pr-1.5">
                    <span className="pl-3 pr-1.5 text-xs font-bold text-muted-foreground select-none pointer-events-none">
                      BDT
                    </span>
                    <input
                      type="number"
                      min="500"
                      step="500"
                      value={advanceAmount}
                      onChange={(e) => setAdvanceAmount(e.target.value)}
                      placeholder="Enter amount..."
                      className="w-full bg-transparent h-9 text-sm font-semibold text-foreground focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    />
                    <div className="flex flex-col flex-shrink-0">
                      <button
                        type="button"
                        onClick={() => {
                          const current = Number(advanceAmount) || 0;
                          setAdvanceAmount(String(current + 500));
                        }}
                        className="p-0.5 text-muted-foreground hover:text-foreground hover:bg-background/80 rounded transition-colors"
                        title="Increase"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m18 15-6-6-6 6" /></svg>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const current = Number(advanceAmount) || 0;
                          const next = Math.max(0, current - 500);
                          setAdvanceAmount(next > 0 ? String(next) : "");
                        }}
                        className="p-0.5 text-muted-foreground hover:text-foreground hover:bg-background/80 rounded transition-colors"
                        title="Decrease"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6" /></svg>
                      </button>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-foreground mb-1.5 uppercase tracking-wider">
                    Reason
                  </label>
                  <Textarea
                    rows={3}
                    value={advanceReason}
                    onChange={(e) => setAdvanceReason(e.target.value)}
                    placeholder="Explain why you need this advance..."
                    className="bg-muted rounded-lg resize-none text-xs !ring-0 !ring-offset-0 focus-visible:!ring-0 focus-visible:border-primary/50 focus-visible:shadow-[0_0_5px_rgba(220,38,38,0.4),0_0_15px_rgba(220,38,38,0.2),0_0_30px_rgba(220,38,38,0.1)]"
                  />
                </div>

                <Button
                  onClick={handleCreateAdvanceRequest}
                  disabled={submittingAdvance}
                  className="group w-full h-9 rounded-lg font-semibold text-sm bg-primary hover:bg-primary/90 text-primary-foreground transition-all duration-200 ease-out hover:shadow-[0_0_8px_rgba(220,38,38,0.4),0_0_20px_rgba(220,38,38,0.2)] active:scale-[0.97]"
                >
                  {submittingAdvance ? (
                    <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4 mr-1.5 transition-transform duration-300 ease-out group-hover:rotate-45" />
                  )}
                  {submittingAdvance ? "Submitting..." : "Submit Request"}
                </Button>

                {advanceRequests.length > 0 && (
                  <div className="pt-3 border-t border-border">
                    <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">
                      Request History ({advanceRequests.length})
                    </h4>
                    <div className="space-y-1.5 max-h-40 overflow-y-auto">
                      {advanceRequests.map((req) => (
                        <div
                          key={req.id}
                          className="p-2.5 rounded-lg bg-muted text-[11px] space-y-1"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-foreground text-xs">
                              {formatPaymentAmount(req.amount)}
                            </span>
                            <span
                              className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${req.status === "approved"
                                  ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                                  : req.status === "rejected"
                                    ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                                    : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                                }`}
                            >
                              {req.status.toUpperCase()}
                            </span>
                          </div>
                          <p className="text-muted-foreground">{req.reason}</p>
                          <p className="text-[10px] text-muted-foreground">
                            {new Date(req.requested_at).toLocaleDateString("en-BD")}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </DialogContent>
          </Dialog>

          {/* ─── Inbox Section ────────────────────────────────── */}
          {!isAdminPreview && showInboxFullView && (
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="mt-8"
              id="employee-inbox-section"
            >
              <div className="bg-card rounded-3xl overflow-hidden">
                <div className="p-5 border-b border-border flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                      <MessageSquare className="w-5 h-5 text-primary" />
                      Admin Inbox
                    </h3>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => navigate("/employee/dashboard")}
                    className="rounded-xl"
                  >
                    <X className="w-4 h-4 mr-1" /> Close
                  </Button>
                </div>

                <div className="p-5">
                  <div className="h-[400px] overflow-y-auto rounded-xl bg-muted p-4 space-y-3 mb-4">
                    {chatMessages.map((message) => {
                      const sentByEmployee = message.sender_type === "employee";
                      return (
                        <div
                          key={message.id}
                          className={`flex ${sentByEmployee ? "justify-end" : "justify-start"}`}
                        >
                          <div
                            className={`max-w-[75%] rounded-2xl px-4 py-3 ${sentByEmployee
                                ? "bg-primary text-primary-foreground rounded-br-md"
                                : "bg-card text-foreground rounded-bl-md"
                              }`}
                          >
                            {message.message_text && (
                              <p className="text-sm leading-relaxed">{message.message_text}</p>
                            )}
                            {message.attachment_url && (
                              <a
                                href={message.attachment_url}
                                target="_blank"
                                rel="noreferrer"
                                className="text-xs underline mt-2 inline-flex items-center gap-1"
                              >
                                <Paperclip className="w-3 h-3" />
                                {message.attachment_name || "Attachment"}
                              </a>
                            )}
                            <p className="text-[10px] mt-2 opacity-60">
                              {new Date(message.created_at).toLocaleString("en-BD", {
                                hour: "2-digit",
                                minute: "2-digit",
                                day: "numeric",
                                month: "short",
                              })}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                    <div ref={chatEndRef} />
                  </div>

                  <div className="space-y-3">
                    <Textarea
                      value={chatDraft}
                      onChange={(e) => setChatDraft(e.target.value)}
                      placeholder="Type your message here..."
                      className="bg-muted rounded-xl resize-none text-sm"
                      rows={2}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          handleSendChat();
                        }
                      }}
                    />
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => chatAttachmentInputRef.current?.click()}
                        disabled={uploadingChatAttachment}
                        className="rounded-xl"
                      >
                        <Upload className="w-4 h-4 mr-2" />
                        Attach File
                      </Button>
                      <input
                        ref={chatAttachmentInputRef}
                        type="file"
                        onChange={handleChatAttachmentUpload}
                        className="hidden"
                      />
                      {chatAttachment && (
                        <div className="flex items-center gap-2 px-3 py-1.5 bg-muted rounded-lg text-xs">
                          <Paperclip className="w-3 h-3" />
                          <span className="max-w-[150px] truncate">{chatAttachment.name}</span>
                          <button onClick={() => setChatAttachment(null)}>
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      )}
                      <Button
                        size="sm"
                        onClick={handleSendChat}
                        disabled={sendingChat || (!chatDraft.trim() && !chatAttachment)}
                        className="ml-auto rounded-xl"
                      >
                        <Send className="w-4 h-4 mr-2" />
                        Send
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </main>

        <Footer />
      </div>
    </PageTransition>
  );
};

export default EmployeeDashboard;