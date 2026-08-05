import { ChangeEvent, useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  BriefcaseBusiness,
  Camera,
  CheckCircle2,
  Clock3,
  DollarSign,
  FileText,
  Loader2,
  LogOut,
  PencilLine,
  Save,
  Sparkles,
  X,
  Clock,
  Activity,
  Briefcase,
  ChevronRight,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import PageTransition from "@/components/shared/PageTransition";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { getApiBaseUrl } from "@/components/admin/adminAuth";
import { CLIENT_DASHBOARD_PATH, setPreferredDashboardPath } from "@/components/shared/dashboardPath";
import { resolveCmsMediaUrl } from "@/components/shared/mediaUrl";

interface Quote {
  id: string;
  title: string;
  description: string | null;
  amount: number;
  currency: string;
  status: string;
  due_date: string | null;
  created_at: string;
}

interface Profile {
  full_name: string | null;
  email: string | null;
  company: string | null;
  avatar_url: string | null;
  bio: string | null;
  job_role: string | null;
}

interface ProfileDraft {
  full_name: string;
  email: string;
  company: string;
  avatar_url: string | null;
  bio: string;
  job_role: string;
}

interface EmployeeProfile {
  id: string;
  name: string;
  profession: string;
  email: string;
  mobile: string | null;
}

interface EmployeeAssignment {
  id: string;
  employee_id: string;
  employee_name: string;
  employee_email: string;
  work_title: string;
  work_details: string | null;
  work_duration: string;
  revision_due_at: string | null;
  status: "assigned" | "done" | "draft";
  created_at?: string;
}

const createEmptyProfile = (email?: string | null): ProfileDraft => ({
  full_name: "",
  email: email ?? "",
  company: "",
  avatar_url: null,
  bio: "",
  job_role: "",
});

const mapProfileToDraft = (profile: Profile | null, fallbackEmail?: string | null): ProfileDraft => ({
  full_name: profile?.full_name ?? "",
  email: profile?.email ?? fallbackEmail ?? "",
  company: profile?.company ?? "",
  avatar_url: profile?.avatar_url ?? null,
  bio: profile?.bio ?? "",
  job_role: profile?.job_role ?? "",
});

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

const Dashboard = () => {
  const { user, session, signOut, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [profileDraft, setProfileDraft] = useState<ProfileDraft>(createEmptyProfile());
  const [savedProfile, setSavedProfile] = useState<ProfileDraft>(createEmptyProfile());
  const [employeeProfile, setEmployeeProfile] = useState<EmployeeProfile | null>(null);
  const [employeeAssignments, setEmployeeAssignments] = useState<EmployeeAssignment[]>([]);
  const [loadingEmployeeData, setLoadingEmployeeData] = useState(false);
  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [avatarFullView, setAvatarFullView] = useState(false);

  const avatarInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user) {
      setPreferredDashboardPath(CLIENT_DASHBOARD_PATH);
    }
  }, [user]);

  const loadData = useCallback(async () => {
    if (!user || !session?.access_token) return;

    setLoading(true);
    setLoadingEmployeeData(true);
    const apiBase = getApiBaseUrl();

    const [profileResult, quotesResult, employeeDashboard] = await Promise.allSettled([
      fetch(`${apiBase}/me/profile`, {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      }).then(async (response) => {
        if (!response.ok) {
          throw new Error(await parseApiError(response, "Failed to load profile"));
        }
        return (await response.json()) as Profile | null;
      }),
      fetch(`${apiBase}/me/quotes`, {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      }).then(async (response) => {
        if (!response.ok) {
          throw new Error(await parseApiError(response, "Failed to load quotes"));
        }
        return (await response.json()) as Quote[];
      }),
      fetch(`${apiBase}/employee/dashboard`, {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      })
        .then(async (response) => {
          if (!response.ok) return null;
          return response.json();
        })
        .catch(() => null),
    ]);

    if (profileResult.status === "rejected") {
      toast({
        title: "Profile load warning",
        description: profileResult.reason instanceof Error ? profileResult.reason.message : "Failed to load profile",
        variant: "destructive",
      });
    }

    const mappedProfile = mapProfileToDraft(
      profileResult.status === "fulfilled" ? profileResult.value : null,
      user.email
    );
    setProfileDraft(mappedProfile);
    setSavedProfile(mappedProfile);

    const isProfileEmpty =
      !mappedProfile.full_name.trim() &&
      !mappedProfile.job_role.trim() &&
      !mappedProfile.bio.trim() &&
      !mappedProfile.avatar_url;

    if (isProfileEmpty) {
      setIsEditingProfile(true);
    }

    if (quotesResult.status === "fulfilled") {
      setQuotes(quotesResult.value);
    } else {
      toast({
        title: "Quotes load error",
        description: quotesResult.reason instanceof Error ? quotesResult.reason.message : "Failed to load quotes",
        variant: "destructive",
      });
    }

    if (employeeDashboard.status === "fulfilled" && employeeDashboard.value) {
      setEmployeeProfile(employeeDashboard.value.employee ?? null);
      setEmployeeAssignments(employeeDashboard.value.assignments ?? []);
    } else {
      setEmployeeProfile(null);
      setEmployeeAssignments([]);
    }

    setLoading(false);
    setLoadingEmployeeData(false);
  }, [user, session, toast]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const handleProfileSave = async () => {
    if (!session?.access_token) return;

    setSavingProfile(true);
    try {
      const apiBase = getApiBaseUrl();
      const response = await fetch(`${apiBase}/me/profile`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          full_name: profileDraft.full_name,
          email: profileDraft.email,
          company: profileDraft.company,
          avatar_url: profileDraft.avatar_url,
          bio: profileDraft.bio,
          job_role: profileDraft.job_role,
        }),
      });

      if (!response.ok) {
        throw new Error(await parseApiError(response, "Failed to update profile"));
      }

      const updated = (await response.json()) as Profile;
      const mapped = mapProfileToDraft(updated, user?.email);
      setProfileDraft(mapped);
      setSavedProfile(mapped);
      setIsEditingProfile(false);

      toast({
        title: "Profile saved",
        description: "Your details have been updated successfully.",
      });
    } catch (error: unknown) {
      toast({
        title: "Save error",
        description: error instanceof Error ? error.message : "Failed to save profile",
        variant: "destructive",
      });
    } finally {
      setSavingProfile(false);
    }
  };

  const handleAvatarUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !session?.access_token) return;

    setUploadingAvatar(true);
    try {
      const apiBase = getApiBaseUrl();
      const ensureRes = await fetch(`${apiBase}/storage/ensure`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (!ensureRes.ok) {
        throw new Error(await parseApiError(ensureRes, "Failed to initialize avatar storage"));
      }

      const formData = new FormData();
      formData.append("file", file);

      const uploadRes = await fetch(`${apiBase}/storage/upload`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
        body: formData,
      });

      if (!uploadRes.ok) {
        throw new Error(await parseApiError(uploadRes, "Failed to upload photo"));
      }

      const payload = (await uploadRes.json()) as { url?: string };
      if (!payload.url) {
        throw new Error("Upload response did not return a valid file URL");
      }

      setProfileDraft((prev) => ({ ...prev, avatar_url: payload.url ?? null }));
      toast({
        title: "Photo ready",
        description: "Click Save Profile to apply your new photo.",
      });
    } catch (error: unknown) {
      toast({
        title: "Photo upload failed",
        description: error instanceof Error ? error.message : "Photo upload failed",
        variant: "destructive",
      });
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleRemovePhoto = async () => {
    if (!isEditingProfile) return;
    setProfileDraft((prev) => ({ ...prev, avatar_url: null }));
  };

  const handleStartEditing = () => {
    setIsEditingProfile(true);
  };

  const handleAvatarPickerOpen = () => {
    setIsEditingProfile(true);
    avatarInputRef.current?.click();
  };

  const handleCancelEditing = () => {
    setProfileDraft(savedProfile);
    setIsEditingProfile(false);
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  const handlePayQuote = (_quote: Quote) => {
    toast({
      title: "Payment integration coming soon",
      description: "Stripe checkout will be connected here shortly.",
    });
  };

  const stats = useMemo(() => {
    const pending = quotes.filter((q) => q.status === "pending");
    const paid = quotes.filter((q) => q.status === "paid");

    const outstanding = pending.reduce((sum, q) => sum + q.amount, 0);
    const paidAmount = paid.reduce((sum, q) => sum + q.amount, 0);

    return {
      total: quotes.length,
      pendingCount: pending.length,
      paidCount: paid.length,
      outstanding,
      paidAmount,
    };
  }, [quotes]);

  const profileCompleteness = useMemo(() => {
    const fields = [
      profileDraft.full_name.trim(),
      profileDraft.job_role.trim(),
      profileDraft.bio.trim(),
      profileDraft.avatar_url ?? "",
    ];

    const completed = fields.filter((field) => Boolean(field)).length;
    return Math.round((completed / fields.length) * 100);
  }, [profileDraft]);

  const hasProfileChanges = useMemo(() => {
    const normalize = (value: string) => value.trim();

    return (
      normalize(profileDraft.full_name) !== normalize(savedProfile.full_name) ||
      normalize(profileDraft.email) !== normalize(savedProfile.email) ||
      normalize(profileDraft.company) !== normalize(savedProfile.company) ||
      normalize(profileDraft.bio) !== normalize(savedProfile.bio) ||
      normalize(profileDraft.job_role) !== normalize(savedProfile.job_role) ||
      (profileDraft.avatar_url ?? "") !== (savedProfile.avatar_url ?? "")
    );
  }, [profileDraft, savedProfile]);

  const formatCurrency = (amount: number, currency: string) => {
    try {
      return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: currency || "USD",
        maximumFractionDigits: 0,
      }).format(amount);
    } catch {
      return `$${amount.toLocaleString()}`;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "paid":
        return "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border-0";
      case "pending":
        return "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 border-0";
      case "overdue":
        return "bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400 border-0";
      default:
        return "bg-muted text-muted-foreground border-0";
    }
  };

  const initials = (profileDraft.full_name || profileDraft.email || "U").trim().slice(0, 1).toUpperCase();

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

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
                      Client Workspace
                    </span>
                    <span className="px-3 py-1 text-[11px] font-bold bg-emerald-100/80 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 rounded-full">
                      {profileCompleteness}% Profile Complete
                    </span>
                  </div>
                  <h1 className="text-3xl md:text-4xl font-bold text-foreground mt-2 tracking-tight">
                    Welcome back, {profileDraft.full_name.split(" ")[0] || "there"}!
                  </h1>
                  <p className="text-muted-foreground mt-2 text-sm md:text-base">
                    Manage your quotes, keep your profile polished, and track your active engineering projects.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={handleSignOut}
                  className="px-5 py-3 bg-card border border-border/80 dark:border-border rounded-2xl text-foreground font-semibold text-sm hover:bg-muted/80 transition-all duration-200 ease-out hover:scale-[1.03] active:scale-[0.98] shadow-sm"
                >
                  <div className="flex items-center gap-2">
                    <LogOut className="w-4 h-4" />
                    <span>Sign Out</span>
                  </div>
                </button>
              </div>
            </div>
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
                title: "Total Quotes",
                value: stats.total,
                subtitle: `${stats.pendingCount} pending review`,
                icon: FileText,
                color: "blue",
              },
              {
                title: "Pending Quotes",
                value: stats.pendingCount,
                subtitle: "Awaiting response",
                icon: Clock3,
                color: "amber",
              },
              {
                title: "Paid Quotes",
                value: stats.paidCount,
                subtitle: `${formatCurrency(stats.paidAmount, "USD")} completed`,
                icon: CheckCircle2,
                color: "emerald",
              },
              {
                title: "Outstanding",
                value: formatCurrency(stats.outstanding, "USD"),
                subtitle: "Pending payment",
                icon: DollarSign,
                color: "rose",
              },
            ].map((kpi, idx) => {
              const Icon = kpi.icon;
              const colorMap: Record<string, { bg: string; icon: string }> = {
                blue: {
                  bg: "bg-blue-100/80 dark:bg-blue-950/30",
                  icon: "text-blue-700 dark:text-blue-400",
                },
                amber: {
                  bg: "bg-amber-100/80 dark:bg-amber-950/30",
                  icon: "text-amber-700 dark:text-amber-400",
                },
                emerald: {
                  bg: "bg-emerald-100/80 dark:bg-emerald-950/30",
                  icon: "text-emerald-700 dark:text-emerald-400",
                },
                rose: {
                  bg: "bg-rose-100/80 dark:bg-rose-950/30",
                  icon: "text-rose-700 dark:text-rose-400",
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

          {/* ─── Profile + Quotes Section ────────────────────── */}
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
                        onClick={() => profileDraft.avatar_url && setAvatarFullView(true)}
                      >
                        {profileDraft.avatar_url ? (
                          <img
                            src={resolveCmsMediaUrl(profileDraft.avatar_url)}
                            alt="Profile"
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <span className="text-4xl font-bold text-muted-foreground">
                            {initials}
                          </span>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={handleAvatarPickerOpen}
                        disabled={uploadingAvatar || savingProfile}
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
                      {profileDraft.full_name || "Set Your Name"}
                    </h3>
                    <div className="flex items-center justify-center gap-2 mt-1">
                      <Briefcase className="w-4 h-4 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">
                        {profileDraft.job_role || "Add current role"}
                      </p>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {profileDraft.email || user?.email}
                    </p>
                  </div>

                  {/* Profile Form */}
                  <div className="space-y-3 flex-1">
                    <div>
                      <label className="block text-[11px] font-bold text-foreground mb-1 uppercase tracking-wider">
                        Full Name
                      </label>
                      <input
                        type="text"
                        value={profileDraft.full_name}
                        onChange={(e) => setProfileDraft((prev) => ({ ...prev, full_name: e.target.value }))}
                        placeholder="Your full name"
                        readOnly={!isEditingProfile}
                        className={`w-full bg-muted rounded-lg px-3 py-2 text-xs text-foreground focus:outline-none transition-all ${
                          isEditingProfile
                            ? "!ring-0 !ring-offset-0 focus-visible:!ring-0 focus-visible:border-primary/50 focus-visible:shadow-[0_0_5px_rgba(220,38,38,0.4),0_0_15px_rgba(220,38,38,0.2),0_0_30px_rgba(220,38,38,0.1)]"
                            : "opacity-85 cursor-default"
                        }`}
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-foreground mb-1 uppercase tracking-wider">
                        Current Role
                      </label>
                      <input
                        type="text"
                        value={profileDraft.job_role}
                        onChange={(e) => setProfileDraft((prev) => ({ ...prev, job_role: e.target.value }))}
                        placeholder="Product Designer, Engineer..."
                        readOnly={!isEditingProfile}
                        className={`w-full bg-muted rounded-lg px-3 py-2 text-xs text-foreground focus:outline-none transition-all ${
                          isEditingProfile
                            ? "!ring-0 !ring-offset-0 focus-visible:!ring-0 focus-visible:border-primary/50 focus-visible:shadow-[0_0_5px_rgba(220,38,38,0.4),0_0_15px_rgba(220,38,38,0.2),0_0_30px_rgba(220,38,38,0.1)]"
                            : "opacity-85 cursor-default"
                        }`}
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-foreground mb-1 uppercase tracking-wider">
                        Bio
                      </label>
                      <textarea
                        rows={3}
                        value={profileDraft.bio}
                        onChange={(e) => setProfileDraft((prev) => ({ ...prev, bio: e.target.value }))}
                        placeholder="Write a short bio..."
                        readOnly={!isEditingProfile}
                        className={`w-full bg-muted rounded-lg px-3 py-2 text-xs text-foreground resize-none focus:outline-none transition-all ${
                          isEditingProfile
                            ? "!ring-0 !ring-offset-0 focus-visible:!ring-0 focus-visible:border-primary/50 focus-visible:shadow-[0_0_5px_rgba(220,38,38,0.4),0_0_15px_rgba(220,38,38,0.2),0_0_30px_rgba(220,38,38,0.1)]"
                            : "opacity-85 cursor-default"
                        }`}
                      />
                    </div>
                  </div>

                  {/* Profile Action Buttons */}
                  <div className="mt-4 flex flex-wrap gap-2 pt-3 border-t border-border">
                    {isEditingProfile ? (
                      <>
                        <Button
                          size="sm"
                          className="flex-1 rounded-lg text-xs h-9 font-semibold bg-primary hover:bg-primary/90 text-primary-foreground transition-all duration-200 ease-out hover:shadow-[0_0_8px_rgba(220,38,38,0.4),0_0_20px_rgba(220,38,38,0.2)] active:scale-[0.97]"
                          onClick={handleProfileSave}
                          disabled={savingProfile || uploadingAvatar || !hasProfileChanges}
                        >
                          {savingProfile ? (
                            <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                          ) : (
                            <Save className="w-3.5 h-3.5 mr-1.5" />
                          )}
                          Save Profile
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="rounded-lg text-xs h-9"
                          onClick={handleCancelEditing}
                          disabled={savingProfile || uploadingAvatar}
                        >
                          <X className="w-3.5 h-3.5 mr-1" />
                          Cancel
                        </Button>
                      </>
                    ) : (
                      <Button
                        size="sm"
                        className="w-full rounded-lg text-xs h-9 font-semibold"
                        onClick={handleStartEditing}
                      >
                        <PencilLine className="w-3.5 h-3.5 mr-1.5" />
                        Edit Profile
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Main Content Column */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="lg:col-span-2 flex flex-col gap-6"
            >
              {/* Employee Assigned Work (if present) */}
              {employeeProfile && (
                <div className="bg-card border-[2.5px] border-border/70 dark:border-border rounded-xl p-4 shadow-md">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                        <BriefcaseBusiness className="w-4 h-4 text-primary" />
                        Assigned Tasks
                      </h3>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {employeeProfile.name} ({employeeProfile.profession})
                      </p>
                    </div>
                    <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border-0 text-[10px]">
                      {employeeAssignments.filter((item) => item.status !== "draft").length} Tasks
                    </Badge>
                  </div>

                  {loadingEmployeeData ? (
                    <div className="py-6 text-center">
                      <Loader2 className="w-5 h-5 animate-spin mx-auto text-muted-foreground mb-2" />
                      <p className="text-xs text-muted-foreground">Loading tasks...</p>
                    </div>
                  ) : employeeAssignments.length === 0 ? (
                    <p className="text-xs text-muted-foreground py-4 text-center">No assigned work yet.</p>
                  ) : (
                    <div className="rounded-lg border border-border overflow-hidden">
                      <div className="divide-y divide-border">
                        {employeeAssignments.map((assignment, idx) => (
                          <div key={assignment.id} className="p-3 text-xs flex items-center justify-between gap-3 hover:bg-muted/30 transition-colors">
                            <div className="min-w-0">
                              <span className="font-semibold text-foreground block truncate">{assignment.work_title}</span>
                              <span className="text-[11px] text-muted-foreground block">Duration: {assignment.work_duration}</span>
                            </div>
                            <Badge className={assignment.status === "done" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border-0" : "bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400 border-0"}>
                              {assignment.status === "done" ? "Done" : "Assigned"}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Quotes Section */}
              <div className="bg-card border-[2.5px] border-border/70 dark:border-border rounded-xl p-4 flex-1 shadow-md">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                      <Activity className="w-4 h-4 text-primary" />
                      Your Quotes
                    </h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Track quote status and payment readiness
                    </p>
                  </div>
                  <Badge className="bg-primary/10 text-primary border-0 text-[10px] font-bold">
                    Paid Total: {formatCurrency(stats.paidAmount, "USD")}
                  </Badge>
                </div>

                {loading ? (
                  <div className="py-12 text-center">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto text-muted-foreground mb-3" />
                    <p className="text-xs text-muted-foreground">Loading quotes...</p>
                  </div>
                ) : quotes.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-primary/10 flex items-center justify-center">
                      <FileText className="w-6 h-6 text-primary" />
                    </div>
                    <h4 className="text-sm font-bold text-foreground mb-1">No quotes yet</h4>
                    <p className="text-xs text-muted-foreground mb-4 max-w-sm mx-auto">
                      When your first quote is created, it will appear here with status and payment options.
                    </p>
                    <Button size="sm" className="rounded-lg text-xs h-8" onClick={() => navigate("/start-project")}>
                      Request a Quote
                    </Button>
                  </div>
                ) : (
                  <div className="rounded-lg border border-border overflow-hidden">
                    {/* Header */}
                    <div className="hidden sm:grid grid-cols-[36px_minmax(0,2fr)_90px_100px_90px] gap-1 px-3 py-2 text-[10px] uppercase tracking-wider text-foreground/70 dark:text-muted-foreground font-bold bg-muted/70 dark:bg-muted/40 border-b border-border">
                      <span className="text-center">#</span>
                      <span>Title</span>
                      <span>Created</span>
                      <span className="text-right">Amount</span>
                      <span className="text-center">Status</span>
                    </div>

                    {/* Body */}
                    <div className="divide-y divide-border">
                      {quotes.map((quote, idx) => (
                        <div
                          key={quote.id}
                          className="grid sm:grid-cols-[36px_minmax(0,2fr)_90px_100px_90px] grid-cols-1 gap-1 items-center px-3 py-2.5 text-xs transition-colors duration-150 hover:bg-muted/60 dark:hover:bg-muted/30"
                        >
                          <span className="text-[10px] text-muted-foreground font-semibold text-center tabular-nums">
                            {idx + 1}
                          </span>
                          <span className="font-semibold text-foreground truncate">
                            {quote.title}
                          </span>
                          <span className="text-[11px] text-muted-foreground">
                            {new Date(quote.created_at).toLocaleDateString()}
                          </span>
                          <span className="text-[11px] font-bold text-foreground text-right tabular-nums">
                            {formatCurrency(quote.amount, quote.currency || "USD")}
                          </span>
                          <div className="flex justify-center">
                            <Badge className={`text-[9px] px-1.5 py-0.5 leading-tight ${getStatusColor(quote.status || "draft")}`}>
                              {quote.status || "Draft"}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        </main>

        {/* ─── Avatar Lightbox ───────────────────────────── */}
        {avatarFullView && profileDraft.avatar_url && (
          <div
            className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center cursor-pointer"
            onClick={() => setAvatarFullView(false)}
          >
            <button
              onClick={() => setAvatarFullView(false)}
              className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            <img
              src={resolveCmsMediaUrl(profileDraft.avatar_url)}
              alt="Profile"
              className="max-w-[90vw] max-h-[85vh] rounded-2xl object-contain shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        )}

        <Footer />
      </div>
    </PageTransition>
  );
};

export default Dashboard;
