import { ChangeEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { BarChart3, Camera, CheckCircle2, Clock3, ListTodo, Loader2, LogOut, Paperclip, Save, Send, Sparkles, Wallet } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import PageTransition from "@/components/shared/PageTransition";
import PremiumBackground from "@/components/shared/PremiumBackground";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { getApiBaseUrl } from "@/components/admin/adminAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

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

type SubmissionDraft = {
  note: string;
  fileUrl: string;
};

type AssignmentView = "all" | "active" | "submitted" | "completed";

const defaultSubmissionDraft: SubmissionDraft = {
  note: "",
  fileUrl: "",
};

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

const formatTimeRemaining = (endAt: string | null | undefined, status: EmployeeAssignment["status"], nowMs: number) => {
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

const buildSafeFileName = (value: string) =>
  value
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-zA-Z0-9._-]/g, "")
    .slice(0, 120) || "file";

const truncateText = (value: string | null | undefined, max = 140) => {
  const text = String(value ?? "").trim();
  if (!text) return "-";
  if (text.length <= max) return text;
  return `${text.slice(0, max - 1)}...`;
};

const EmployeeDashboard = () => {
  const { user, session, signOut, loading: authLoading } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const showInboxFullView = location.hash.toLowerCase() === "#inbox-full";

  const [employee, setEmployee] = useState<EmployeeProfile | null>(null);
  const [assignments, setAssignments] = useState<EmployeeAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [nowTick, setNowTick] = useState(() => Date.now());
  const [profileDraft, setProfileDraft] = useState<{ mobile: string; profile_image_url: string | null }>({
    mobile: "",
    profile_image_url: null,
  });
  const [savingProfile, setSavingProfile] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [submissionDrafts, setSubmissionDrafts] = useState<Record<string, SubmissionDraft>>({});
  const [submittingAssignmentId, setSubmittingAssignmentId] = useState<string | null>(null);
  const [assignmentView, setAssignmentView] = useState<AssignmentView>("all");
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
  const avatarInputRef = useRef<HTMLInputElement | null>(null);
  const chatAttachmentInputRef = useRef<HTMLInputElement | null>(null);
  const chatEndRef = useRef<HTMLDivElement | null>(null);
  const completedFocusRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [authLoading, user, navigate]);

  useEffect(() => {
    const timer = window.setInterval(() => setNowTick(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const loadEmployeeDashboard = useCallback(async () => {
    if (!session?.access_token) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const apiBase = getApiBaseUrl();
      const response = await fetch(`${apiBase}/employee/dashboard`, {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (!response.ok) {
        throw new Error(await parseApiError(response, "Failed to load employee dashboard"));
      }

      const data = await response.json();
      const nextEmployee = (data?.employee ?? null) as EmployeeProfile | null;
      const nextAssignments = Array.isArray(data?.assignments) ? (data.assignments as EmployeeAssignment[]) : [];

      setEmployee(nextEmployee);
      setAssignments(nextAssignments);
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
    } catch (error: any) {
      console.error(error);
      setEmployee(null);
      setAssignments([]);
      setSubmissionDrafts({});
      toast({
        title: "Employee dashboard error",
        description: error?.message || "Failed to load employee dashboard",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [session?.access_token, toast]);

  useEffect(() => {
    loadEmployeeDashboard();
  }, [loadEmployeeDashboard]);

  const loadEmployeeChat = useCallback(
    async (silent = false) => {
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
        const nextMessages = Array.isArray(data?.messages) ? (data.messages as EmployeeChatMessage[]) : [];
        setChatMessages(nextMessages);
      } catch (error: any) {
        if (!silent) {
          toast({
            title: "Chat load failed",
            description: error?.message || "Could not load chat messages",
            variant: "destructive",
          });
        }
      } finally {
        if (!silent) setLoadingChat(false);
      }
    },
    [session?.access_token, toast]
  );

  useEffect(() => {
    if (!showInboxFullView) return;
    loadEmployeeChat();
  }, [loadEmployeeChat, showInboxFullView]);

  useEffect(() => {
    if (!session?.access_token || !showInboxFullView) return;
    const timer = window.setInterval(() => {
      loadEmployeeChat(true);
    }, 15000);
    return () => window.clearInterval(timer);
  }, [loadEmployeeChat, session?.access_token, showInboxFullView]);

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

  useEffect(() => {
    if (assignmentView !== "completed") return;
    const id = window.requestAnimationFrame(() => {
      completedFocusRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    });
    return () => window.cancelAnimationFrame(id);
  }, [assignmentView]);

  const activeAssignments = useMemo(
    () => assignments.filter((item) => item.status !== "done" && item.status !== "draft"),
    [assignments]
  );

  const submittedAssignments = useMemo(
    () =>
      activeAssignments.filter((item) => item.employee_submission_status === "submitted"),
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

  const assignmentsInView = useMemo(() => {
    if (assignmentView === "active") return activeAssignments;
    if (assignmentView === "submitted") return submittedAssignments;
    if (assignmentView === "completed") return doneAssignments;
    return nonDraftAssignments;
  }, [assignmentView, activeAssignments, submittedAssignments, doneAssignments, nonDraftAssignments]);

  const latestCompletedAssignment = useMemo(() => {
    if (doneAssignments.length === 0) return null;
    return [...doneAssignments].sort((a, b) => {
      const aTime = new Date(a.employee_submission_at ?? a.created_at ?? 0).getTime();
      const bTime = new Date(b.employee_submission_at ?? b.created_at ?? 0).getTime();
      return bTime - aTime;
    })[0];
  }, [doneAssignments]);

  const totalTrackedAssignments = nonDraftAssignments.length;

  const completionRate = useMemo(() => {
    if (totalTrackedAssignments === 0) return 0;
    return Math.round((doneAssignments.length / totalTrackedAssignments) * 100);
  }, [doneAssignments.length, totalTrackedAssignments]);

  const submittedRate = useMemo(() => {
    if (activeAssignments.length === 0) return 0;
    return Math.round((submittedAssignments.length / activeAssignments.length) * 100);
  }, [activeAssignments.length, submittedAssignments.length]);

  const unpaidAmount = useMemo(() => {
    let total = 0;
    assignments.forEach((assignment) => {
      if (assignment.status === "draft" || assignment.payment_status !== "unpaid") return;
      const amount = parsePaymentAmount(assignment.payment_amount);
      if (amount !== null) total += amount;
    });
    return total;
  }, [assignments]);

  const hasProfileChanges = useMemo(() => {
    if (!employee) return false;
    const currentMobile = profileDraft.mobile.trim();
    const savedMobile = String(employee.mobile ?? "").trim();
    const currentPhoto = profileDraft.profile_image_url ?? "";
    const savedPhoto = employee.profile_image_url ?? "";
    return currentMobile !== savedMobile || currentPhoto !== savedPhoto;
  }, [employee, profileDraft.mobile, profileDraft.profile_image_url]);

  const handleAvatarUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file || !employee) return;

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
      const fileExt = file.name.split(".").pop() || "jpg";
      const filePath = `employees/${employee.id}/profile-${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("cms-uploads")
        .upload(filePath, file, { upsert: true });

      if (uploadError) {
        throw new Error(uploadError.message);
      }

      const {
        data: { publicUrl },
      } = supabase.storage.from("cms-uploads").getPublicUrl(filePath);

      setProfileDraft((prev) => ({ ...prev, profile_image_url: publicUrl }));
      toast({
        title: "Photo ready",
        description: "Click Save Profile to apply your new image.",
      });
    } catch (error: any) {
      toast({
        title: "Upload failed",
        description: error?.message || "Could not upload profile image",
        variant: "destructive",
      });
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleSaveProfile = async () => {
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
          profile_image_url: (updated.profile_image_url ?? profileImageFromDraft) as string | null,
        };
      });
      toast({ title: "Profile updated" });
    } catch (error: any) {
      toast({
        title: "Save failed",
        description: error?.message || "Could not update profile",
        variant: "destructive",
      });
    } finally {
      setSavingProfile(false);
    }
  };

  const setSubmissionDraftValue = (assignmentId: string, patch: Partial<SubmissionDraft>) => {
    setSubmissionDrafts((prev) => ({
      ...prev,
      [assignmentId]: {
        ...(prev[assignmentId] ?? defaultSubmissionDraft),
        ...patch,
      },
    }));
  };

  const handleSubmitAssignment = async (assignmentId: string) => {
    if (!session?.access_token) return;

    const assignment = assignments.find((item) => item.id === assignmentId);
    if (!assignment || assignment.status === "done" || assignment.status === "draft") return;

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
      const response = await fetch(`${apiBase}/employee/work-assignments/${assignmentId}/submit`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          submission_note: note || null,
          submission_file_url: fileUrl || null,
        }),
      });

      if (!response.ok) {
        throw new Error(await parseApiError(response, "Failed to submit assignment"));
      }

      toast({ title: "Work submitted successfully" });
      await loadEmployeeDashboard();
    } catch (error: any) {
      toast({
        title: "Submission failed",
        description: error?.message || "Could not submit assignment",
        variant: "destructive",
      });
    } finally {
      setSubmittingAssignmentId(null);
    }
  };

  const handleChatAttachmentUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file || !employee) return;

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
      const safeName = buildSafeFileName(file.name);
      const filePath = `employees/${employee.id}/chat/${Date.now()}-${safeName}`;
      const { error: uploadError } = await supabase.storage
        .from("cms-uploads")
        .upload(filePath, file, { upsert: true });

      if (uploadError) {
        throw new Error(uploadError.message);
      }

      const {
        data: { publicUrl },
      } = supabase.storage.from("cms-uploads").getPublicUrl(filePath);

      setChatAttachment({
        url: publicUrl,
        name: file.name,
        mime: file.type || "application/octet-stream",
      });
      toast({ title: "Attachment ready" });
    } catch (error: any) {
      toast({
        title: "Upload failed",
        description: error?.message || "Could not upload file",
        variant: "destructive",
      });
    } finally {
      setUploadingChatAttachment(false);
    }
  };

  const handleSendChat = async () => {
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
        throw new Error(await parseApiError(response, "Failed to send message"));
      }

      setChatDraft("");
      setChatAttachment(null);
      await loadEmployeeChat(true);
    } catch (error: any) {
      toast({
        title: "Send failed",
        description: error?.message || "Could not send message",
        variant: "destructive",
      });
    } finally {
      setSendingChat(false);
    }
  };

  const initials = (employee?.name || employee?.email || "E").trim().slice(0, 1).toUpperCase();

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <PageTransition>
      <PremiumBackground>
        <Navigation />

        <main className="pt-28 pb-20 px-4">
          <div className="container-narrow space-y-6 relative">
            <div className="pointer-events-none absolute -top-16 -left-24 h-56 w-56 rounded-full bg-primary/15 blur-3xl" />
            <div className="pointer-events-none absolute top-[22rem] -right-20 h-60 w-60 rounded-full bg-blue-500/10 blur-3xl" />
            <motion.section
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              className="relative overflow-hidden rounded-3xl border border-primary/20 bg-gradient-to-br from-card/95 via-card/80 to-primary/10 p-6 md:p-8 shadow-[0_30px_110px_-55px_rgba(239,68,68,0.8)] backdrop-blur"
            >
              <div className="pointer-events-none absolute inset-x-10 -top-10 h-24 rounded-full bg-primary/20 blur-2xl" />
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                  <span className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-[11px] uppercase tracking-[0.16em] text-primary/90">
                    <Sparkles className="h-3 w-3" />
                    Work Intelligence Panel
                  </span>
                  <h1 className="text-3xl md:text-4xl font-bold">Employee Dashboard</h1>
                  <p className="text-muted-foreground mt-2">
                    {employee
                      ? `${employee.name} (${employee.profession})`
                      : "No employee profile is linked with this login."}
                  </p>
                </div>
                <Button variant="outline" onClick={handleSignOut}>
                  <LogOut className="w-4 h-4 mr-2" /> Sign Out
                </Button>
              </div>
            </motion.section>

            <section className="grid lg:grid-cols-3 gap-4">
              <Card className="glass-card border-border/60 lg:col-span-1 overflow-hidden">
                <CardHeader className="border-b border-border/40 bg-gradient-to-r from-card/80 to-primary/5">
                  <CardTitle className="text-xl">My Profile</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {!employee ? (
                    <p className="text-sm text-muted-foreground">No profile linked yet.</p>
                  ) : (
                    <>
                      <div className="flex items-center gap-4">
                        <div className="relative">
                          <div className="h-20 w-20 rounded-2xl border border-border/70 bg-secondary/50 overflow-hidden flex items-center justify-center text-xl font-semibold">
                            {profileDraft.profile_image_url ? (
                              <img
                                src={profileDraft.profile_image_url}
                                alt={employee.name}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              initials
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={() => avatarInputRef.current?.click()}
                            className="absolute -bottom-2 -right-2 h-8 w-8 rounded-xl border border-primary/30 bg-primary/15 text-primary flex items-center justify-center hover:bg-primary/25 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                            disabled={uploadingAvatar || savingProfile}
                            aria-label="Upload profile image"
                          >
                            {uploadingAvatar ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Camera className="w-3.5 h-3.5" />}
                          </button>
                          <input
                            ref={avatarInputRef}
                            type="file"
                            accept="image/*"
                            onChange={handleAvatarUpload}
                            className="hidden"
                          />
                        </div>
                        <div>
                          <p className="font-semibold">{employee.name}</p>
                          <p className="text-sm text-muted-foreground">{employee.profession}</p>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-medium">Mobile</label>
                        <Input
                          value={profileDraft.mobile}
                          onChange={(event) =>
                            setProfileDraft((prev) => ({ ...prev, mobile: event.target.value }))
                          }
                          placeholder="+880..."
                        />
                      </div>

                      <div className="flex gap-2">
                        <Button
                          onClick={handleSaveProfile}
                          disabled={savingProfile || uploadingAvatar || !hasProfileChanges}
                        >
                          {savingProfile ? (
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          ) : (
                            <Save className="w-4 h-4 mr-2" />
                          )}
                          Save
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() =>
                            setProfileDraft({
                              mobile: employee.mobile ?? "",
                              profile_image_url: employee.profile_image_url ?? null,
                            })
                          }
                          disabled={savingProfile || uploadingAvatar || !hasProfileChanges}
                        >
                          Reset
                        </Button>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>

              <div className="lg:col-span-2 grid md:grid-cols-3 gap-4">
                {([
                  {
                    key: "active" as const,
                    label: "Active",
                    count: activeAssignments.length,
                    note: "Running assignments",
                    icon: Clock3,
                    iconClass: "bg-blue-500/20 text-blue-400",
                    progressClass: "bg-blue-400/90",
                    selectedClass: "border-blue-400/40 bg-blue-500/10 shadow-[0_18px_60px_-40px_rgba(59,130,246,0.85)]",
                  },
                  {
                    key: "submitted" as const,
                    label: "Submitted",
                    count: submittedAssignments.length,
                    note: "Awaiting completion",
                    icon: Send,
                    iconClass: "bg-violet-500/20 text-violet-400",
                    progressClass: "bg-violet-400/90",
                    selectedClass: "border-violet-400/40 bg-violet-500/10 shadow-[0_18px_60px_-40px_rgba(139,92,246,0.85)]",
                  },
                  {
                    key: "completed" as const,
                    label: "Completed",
                    count: doneAssignments.length,
                    note: "Delivered successfully",
                    icon: CheckCircle2,
                    iconClass: "bg-green-500/20 text-green-400",
                    progressClass: "bg-green-400/90",
                    selectedClass: "border-green-400/40 bg-green-500/10 shadow-[0_18px_60px_-40px_rgba(34,197,94,0.85)]",
                  },
                ]).map((metric) => {
                  const Icon = metric.icon;
                  const isSelected = assignmentView === metric.key;
                  const denominator =
                    metric.key === "submitted"
                      ? Math.max(activeAssignments.length, 1)
                      : Math.max(totalTrackedAssignments, 1);
                  const progress = metric.count === 0 ? 0 : Math.max(14, Math.round((metric.count / denominator) * 100));
                  return (
                    <button
                      key={metric.key}
                      type="button"
                      onClick={() => setAssignmentView(metric.key)}
                      className="text-left"
                    >
                      <Card
                        className={`h-full border transition-all duration-300 ${
                          isSelected
                            ? metric.selectedClass
                            : "glass-card border-border/60 hover:border-primary/30 hover:bg-card/80 hover:shadow-[0_18px_48px_-36px_rgba(255,255,255,0.4)]"
                        }`}
                      >
                        <CardContent className="p-5">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-4 ${metric.iconClass}`}>
                            <Icon className="w-5 h-5" />
                          </div>
                          <p className="text-3xl font-bold leading-none">{metric.count}</p>
                          <p className="mt-2 text-sm text-muted-foreground">{metric.label}</p>
                          <p className="mt-1 text-xs text-muted-foreground/80">{metric.note}</p>
                          <p className="mt-3 text-[11px] uppercase tracking-[0.14em] text-muted-foreground/80">
                            {isSelected ? "Focused" : "Click to focus"}
                          </p>
                          <div className="mt-3 h-1.5 rounded-full bg-white/10 overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-300 ${metric.progressClass}`}
                              style={{ width: `${progress}%` }}
                            />
                          </div>
                        </CardContent>
                      </Card>
                    </button>
                  );
                })}
              </div>
            </section>

            <motion.section
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 }}
              className="grid md:grid-cols-3 gap-3"
            >
              <Card className="border border-emerald-400/25 bg-gradient-to-br from-emerald-500/20 via-emerald-500/10 to-transparent">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <p className="text-xs uppercase tracking-[0.14em] text-emerald-200/90">Completion Rate</p>
                    <BarChart3 className="w-4 h-4 text-emerald-300" />
                  </div>
                  <p className="mt-2 text-3xl font-semibold">{completionRate}%</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {doneAssignments.length} of {totalTrackedAssignments} assignments completed
                  </p>
                </CardContent>
              </Card>

              <Card className="border border-violet-400/25 bg-gradient-to-br from-violet-500/20 via-violet-500/10 to-transparent">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <p className="text-xs uppercase tracking-[0.14em] text-violet-200/90">Submission Momentum</p>
                    <ListTodo className="w-4 h-4 text-violet-300" />
                  </div>
                  <p className="mt-2 text-3xl font-semibold">{submittedRate}%</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {submittedAssignments.length} submitted from {activeAssignments.length} active works
                  </p>
                </CardContent>
              </Card>

              <Card className="border border-amber-400/25 bg-gradient-to-br from-amber-500/20 via-amber-500/10 to-transparent">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <p className="text-xs uppercase tracking-[0.14em] text-amber-200/90">Unpaid Pipeline</p>
                    <Wallet className="w-4 h-4 text-amber-300" />
                  </div>
                  <p className="mt-2 text-2xl font-semibold">{formatPaymentAmount(unpaidAmount)}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Pending settlement across unpaid assignments
                  </p>
                </CardContent>
              </Card>
            </motion.section>

            {assignmentView === "completed" && (
              <motion.section
                ref={completedFocusRef}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-2xl border border-green-400/30 bg-gradient-to-r from-green-500/15 via-emerald-500/10 to-green-500/5 p-4 md:p-5"
              >
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.16em] text-green-300/90">Completed Focus</p>
                    <h3 className="text-lg font-semibold mt-1">Latest completed work details</h3>
                  </div>
                  <Badge className="bg-green-500/20 text-green-200 border border-green-300/30 hover:bg-green-500/25">
                    {doneAssignments.length} Completed
                  </Badge>
                </div>

                {latestCompletedAssignment ? (
                  <div className="mt-4 rounded-xl border border-green-300/30 bg-black/20 p-4">
                    <div className="grid gap-3 md:grid-cols-[1.2fr_2fr_auto_auto] md:items-start">
                      <div>
                        <p className="text-[11px] uppercase tracking-[0.16em] text-green-200/70">Work</p>
                        <p className="font-semibold mt-1">{latestCompletedAssignment.work_title}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Duration: {latestCompletedAssignment.work_duration}
                        </p>
                      </div>

                      <div>
                        <p className="text-[11px] uppercase tracking-[0.16em] text-green-200/70">Details</p>
                        <p className="text-sm text-muted-foreground mt-1">
                          {truncateText(latestCompletedAssignment.work_details, 220)}
                        </p>
                      </div>

                      <div>
                        <p className="text-[11px] uppercase tracking-[0.16em] text-green-200/70">Payment</p>
                        <p className="text-sm font-medium mt-1">
                          {formatPaymentAmount(latestCompletedAssignment.payment_amount)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {latestCompletedAssignment.payment_status}
                        </p>
                      </div>

                      <div>
                        <p className="text-[11px] uppercase tracking-[0.16em] text-green-200/70">Submitted</p>
                        <p className="text-sm mt-1">
                          {latestCompletedAssignment.employee_submission_at
                            ? new Date(latestCompletedAssignment.employee_submission_at).toLocaleString()
                            : "-"}
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground mt-4">No completed work found yet.</p>
                )}
              </motion.section>
            )}

            <Card className="glass-card border-border/60 overflow-hidden">
              <CardHeader className="border-b border-border/40 bg-gradient-to-r from-card/70 via-card/40 to-primary/5">
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                  <div>
                    <CardTitle>Assigned Work Details</CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">
                      {assignmentView === "all"
                        ? "Overview of all active and completed work."
                        : assignmentView === "active"
                          ? "Only in-progress assignments are shown."
                          : assignmentView === "submitted"
                            ? "Only submitted assignments awaiting completion are shown."
                          : "Completed assignments with delivery history are shown."}
                    </p>
                    <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground/80 mt-2">
                      Showing {assignmentsInView.length} assignment{assignmentsInView.length === 1 ? "" : "s"}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {([
                      { key: "all" as const, label: "All" },
                      { key: "active" as const, label: "Active" },
                      { key: "submitted" as const, label: "Submitted" },
                      { key: "completed" as const, label: "Completed" },
                    ]).map((view) => {
                      const isActiveView = assignmentView === view.key;
                      return (
                        <button
                          key={view.key}
                          type="button"
                          onClick={() => setAssignmentView(view.key)}
                          className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                            isActiveView
                              ? "border-primary/60 bg-primary/20 text-primary"
                              : "border-border/60 bg-background/40 text-muted-foreground hover:border-primary/35 hover:text-foreground"
                          }`}
                        >
                          {view.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-6">
                {loading ? (
                  <div className="py-10 text-center text-muted-foreground">Loading assignments...</div>
                ) : !employee ? (
                  <div className="py-10 text-center text-muted-foreground">
                    Your login email is not mapped to any employee yet. Please contact admin.
                  </div>
                ) : assignmentsInView.length === 0 ? (
                  <div className="py-8">
                    <div className="mx-auto max-w-xl rounded-2xl border border-dashed border-border/50 bg-background/35 px-6 py-10 text-center">
                      <div className="mx-auto mb-3 w-fit rounded-xl border border-border/60 bg-card/70 p-3">
                        <ListTodo className="w-5 h-5 text-muted-foreground" />
                      </div>
                      <p className="text-base font-medium">
                        {assignmentView === "completed"
                          ? "No completed assignments yet."
                          : assignmentView === "submitted"
                            ? "No submitted assignments yet."
                            : assignmentView === "active"
                              ? "No active assignments right now."
                              : "No assignments yet."}
                      </p>
                      <p className="text-sm text-muted-foreground mt-1">
                        Try switching the filter to explore other work buckets.
                      </p>
                      {assignmentView !== "all" && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="mt-4"
                          onClick={() => setAssignmentView("all")}
                        >
                          View All Assignments
                        </Button>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {assignmentsInView.map((assignment) => (
                      <motion.div
                        key={assignment.id}
                        whileHover={{ y: -2 }}
                        transition={{ duration: 0.2 }}
                        className={`group relative overflow-hidden rounded-xl border p-4 ${assignment.status === "done"
                          ? "border-green-500/30 bg-gradient-to-br from-green-500/12 via-green-500/8 to-transparent"
                          : assignment.employee_submission_status === "submitted"
                            ? "border-violet-500/30 bg-gradient-to-br from-violet-500/12 via-violet-500/8 to-transparent"
                            : "border-border/70 bg-gradient-to-br from-card/80 to-card/40"
                          }`}
                      >
                        <div
                          className={`pointer-events-none absolute left-0 top-0 h-full w-1 ${
                            assignment.status === "done"
                              ? "bg-green-400/80"
                              : assignment.employee_submission_status === "submitted"
                                ? "bg-violet-400/80"
                                : "bg-blue-400/80"
                          }`}
                        />
                        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                          <div>
                            <h3 className="font-semibold text-lg tracking-tight">{assignment.work_title}</h3>
                            <p className="text-sm text-muted-foreground mt-1">Duration: {assignment.work_duration}</p>
                            <p className="text-sm text-muted-foreground mt-1">
                              Payment: {formatPaymentAmount(assignment.payment_amount)} ({assignment.payment_status})
                            </p>
                            {assignment.revision_due_at && (
                              <p className="text-xs text-muted-foreground mt-1">
                                Revision: {new Date(assignment.revision_due_at).toLocaleString()}
                              </p>
                            )}
                            {assignment.work_details && (
                              <p className="text-sm text-muted-foreground mt-2">{assignment.work_details}</p>
                            )}
                          </div>
                          <div className="text-right">
                            <Badge
                              className={assignment.status === "done"
                                ? "bg-green-500/15 text-green-500"
                                : assignment.employee_submission_status === "submitted"
                                  ? "bg-violet-500/15 text-violet-500"
                                  : "bg-blue-500/15 text-blue-500"
                              }
                            >
                              {assignment.status === "done"
                                ? "done"
                                : assignment.employee_submission_status === "submitted"
                                  ? "submitted"
                                  : "assigned"}
                            </Badge>
                            <p className="text-sm mt-2 text-muted-foreground">Time Remaining</p>
                            <p className="font-semibold">{formatTimeRemaining(assignment.countdown_end_at, assignment.status, nowTick)}</p>
                          </div>
                        </div>

                        {(assignment.employee_submission_note || assignment.employee_submission_file_url) && (
                          <div className="mt-3 rounded-lg border border-border/50 bg-background/40 p-3 space-y-2">
                            {assignment.employee_submission_note && (
                              <p className="text-sm text-muted-foreground">{assignment.employee_submission_note}</p>
                            )}
                            {assignment.employee_submission_file_url && (
                              <a
                                href={assignment.employee_submission_file_url}
                                target="_blank"
                                rel="noreferrer"
                                className="text-xs text-primary hover:underline break-all"
                              >
                                {assignment.employee_submission_file_url}
                              </a>
                            )}
                            {assignment.employee_submission_at && (
                              <p className="text-[11px] text-muted-foreground">
                                Submitted at {new Date(assignment.employee_submission_at).toLocaleString()}
                              </p>
                            )}
                          </div>
                        )}

                        {assignment.status !== "done" && (
                          <div className="mt-4 space-y-3 border-t border-border/50 pt-3">
                            <div className="grid gap-2">
                              <label className="text-sm font-medium">Submission Note</label>
                              <Textarea
                                rows={3}
                                value={submissionDrafts[assignment.id]?.note ?? ""}
                                onChange={(event) =>
                                  setSubmissionDraftValue(assignment.id, { note: event.target.value })
                                }
                                placeholder="Add what you completed, files included, and important notes..."
                              />
                            </div>

                            <div className="grid gap-2">
                              <label className="text-sm font-medium">Delivery Link (optional)</label>
                              <Input
                                value={submissionDrafts[assignment.id]?.fileUrl ?? ""}
                                onChange={(event) =>
                                  setSubmissionDraftValue(assignment.id, { fileUrl: event.target.value })
                                }
                                placeholder="https://drive.google.com/..."
                              />
                            </div>

                            <Button
                              onClick={() => handleSubmitAssignment(assignment.id)}
                              disabled={submittingAssignmentId === assignment.id}
                            >
                              {submittingAssignmentId === assignment.id ? (
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              ) : (
                                <Send className="w-4 h-4 mr-2" />
                              )}
                              Submit Work
                            </Button>
                          </div>
                        )}
                      </motion.div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card
              id="employee-inbox-section"
              className={`${showInboxFullView ? "block" : "hidden"} glass-card border-border/60 overflow-hidden scroll-mt-32`}
            >
              <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0">
                <CardTitle>Inbox With Admin</CardTitle>
                <Button type="button" variant="outline" size="sm" onClick={() => navigate("/employee/dashboard")}>
                  Close Full View
                </Button>
              </CardHeader>
              <CardContent>
                {!employee ? (
                  <div className="py-6 text-sm text-muted-foreground">
                    Chat will be available after your account is linked with an employee profile.
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="h-[340px] overflow-y-auto rounded-xl border border-border/60 bg-background/35 p-3 space-y-3">
                      {loadingChat ? (
                        <div className="text-sm text-muted-foreground py-4">Loading chat...</div>
                      ) : chatMessages.length === 0 ? (
                        <div className="text-sm text-muted-foreground py-4">
                          No messages yet. Start a conversation with admin.
                        </div>
                      ) : (
                        chatMessages.map((message) => {
                          const sentByEmployee = message.sender_type === "employee";
                          return (
                            <div
                              key={message.id}
                              className={`flex ${sentByEmployee ? "justify-end" : "justify-start"}`}
                            >
                              <div
                                className={`max-w-[78%] rounded-xl border px-3 py-2 ${
                                  sentByEmployee
                                    ? "border-primary/35 bg-primary/15"
                                    : "border-border/60 bg-card/70"
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
                                    className="text-xs text-primary hover:underline inline-block mt-1 break-all"
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
                      <div ref={chatEndRef} />
                    </div>

                    <div className="space-y-3">
                      <Textarea
                        id="employee-chat-composer"
                        rows={3}
                        value={chatDraft}
                        onChange={(event) => setChatDraft(event.target.value)}
                        placeholder="Write a message to admin..."
                      />

                      {chatAttachment && (
                        <div className="text-xs text-muted-foreground">
                          Attached: <span className="font-medium">{chatAttachment.name}</span>
                          <button
                            type="button"
                            className="ml-2 text-primary hover:underline"
                            onClick={() => setChatAttachment(null)}
                          >
                            Remove
                          </button>
                        </div>
                      )}

                      <div className="flex flex-wrap items-center gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => chatAttachmentInputRef.current?.click()}
                          disabled={uploadingChatAttachment || sendingChat}
                        >
                          {uploadingChatAttachment ? (
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          ) : (
                            <Paperclip className="w-4 h-4 mr-2" />
                          )}
                          Attach File
                        </Button>
                        <input
                          ref={chatAttachmentInputRef}
                          type="file"
                          onChange={handleChatAttachmentUpload}
                          className="hidden"
                        />
                        <Button
                          type="button"
                          onClick={handleSendChat}
                          disabled={sendingChat || uploadingChatAttachment}
                        >
                          {sendingChat ? (
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          ) : (
                            <Send className="w-4 h-4 mr-2" />
                          )}
                          Send
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </main>

        <Footer />
      </PremiumBackground>
    </PageTransition>
  );
};

export default EmployeeDashboard;
