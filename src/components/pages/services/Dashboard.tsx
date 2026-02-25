import { ChangeEvent, useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
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
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import PageTransition from "@/components/shared/PageTransition";
import PremiumBackground from "@/components/shared/PremiumBackground";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { getApiBaseUrl } from "@/components/admin/adminAuth";

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

  const avatarInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user, session?.access_token]);

  const mapProfileToDraft = (profile: Profile | null, fallbackEmail?: string | null): ProfileDraft => ({
    full_name: profile?.full_name ?? "",
    email: profile?.email ?? fallbackEmail ?? "",
    company: profile?.company ?? "",
    avatar_url: profile?.avatar_url ?? null,
    bio: profile?.bio ?? "",
    job_role: profile?.job_role ?? "",
  });

  const loadData = async () => {
    if (!user) return;

    setLoading(true);
    setLoadingEmployeeData(true);

    const employeeDashboardPromise = session?.access_token
      ? fetch(`${getApiBaseUrl()}/employee/dashboard`, {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        })
          .then(async (response) => {
            if (!response.ok) return null;
            return response.json();
          })
          .catch(() => null)
      : Promise.resolve(null);

    const [profileResult, quotesResult, employeeDashboard] = await Promise.all([
      supabase
        .from("profiles")
        .select("full_name, email, company, avatar_url, bio, job_role")
        .eq("user_id", user.id)
        .maybeSingle(),
      supabase
        .from("quotes")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false }),
      employeeDashboardPromise,
    ]);

    if (profileResult.error) {
      toast({
        title: "Profile load warning",
        description: profileResult.error.message,
        variant: "destructive",
      });
    }

    const mappedProfile = mapProfileToDraft(profileResult.data as Profile | null, user.email);
    setProfileDraft(mappedProfile);
    setSavedProfile(mappedProfile);

    const isProfileEmpty =
      !mappedProfile.full_name.trim() &&
      !mappedProfile.job_role.trim() &&
      !mappedProfile.bio.trim() &&
      !mappedProfile.avatar_url;
    setIsEditingProfile(isProfileEmpty);

    if (quotesResult.error) {
      toast({
        title: "Quotes load warning",
        description: quotesResult.error.message,
        variant: "destructive",
      });
    } else {
      setQuotes((quotesResult.data ?? []) as Quote[]);
    }

    const employeeData = (employeeDashboard ?? {}) as {
      employee?: EmployeeProfile | null;
      assignments?: EmployeeAssignment[];
    };
    setEmployeeProfile(employeeData.employee ?? null);
    setEmployeeAssignments(Array.isArray(employeeData.assignments) ? employeeData.assignments : []);

    setLoadingEmployeeData(false);
    setLoading(false);
  };

  const persistProfile = async (nextDraft: ProfileDraft, successMessage?: string) => {
    if (!user) return false;

    const payload = {
      user_id: user.id,
      email: nextDraft.email?.trim() || user.email || null,
      full_name: nextDraft.full_name.trim() || null,
      company: nextDraft.company.trim() || null,
      avatar_url: nextDraft.avatar_url,
      bio: nextDraft.bio.trim() || null,
      job_role: nextDraft.job_role.trim() || null,
    };

    const { data, error } = await supabase
      .from("profiles")
      .upsert(payload, { onConflict: "user_id" })
      .select("full_name, email, company, avatar_url, bio, job_role")
      .single();

    if (error) {
      toast({
        title: "Profile update failed",
        description: error.message,
        variant: "destructive",
      });
      return false;
    }

    if (data) {
      const mappedProfile = mapProfileToDraft(data as Profile, user.email);
      setProfileDraft(mappedProfile);
      setSavedProfile(mappedProfile);
    }

    if (successMessage) {
      toast({ title: successMessage });
    }

    return true;
  };

  const handleProfileSave = async () => {
    setSavingProfile(true);
    const saved = await persistProfile(profileDraft, "Profile updated successfully");
    setSavingProfile(false);
    if (saved) {
      setIsEditingProfile(false);
    }
  };

  const handleAvatarUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file || !user || !isEditingProfile) return;

    if (!file.type.startsWith("image/")) {
      toast({
        title: "Invalid file",
        description: "Please upload an image file.",
        variant: "destructive",
      });
      return;
    }

    const maxSize = 4 * 1024 * 1024;
    if (file.size > maxSize) {
      toast({
        title: "File too large",
        description: "Please upload an image under 4MB.",
        variant: "destructive",
      });
      return;
    }

    setUploadingAvatar(true);

    const fileExt = file.name.split(".").pop() || "jpg";
    const filePath = `profiles/${user.id}/avatar-${Date.now()}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from("cms-uploads")
      .upload(filePath, file, { upsert: true });

    if (uploadError) {
      toast({
        title: "Photo upload failed",
        description: uploadError.message,
        variant: "destructive",
      });
      setUploadingAvatar(false);
      return;
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from("cms-uploads").getPublicUrl(filePath);

    const nextDraft = { ...profileDraft, avatar_url: publicUrl };
    setProfileDraft(nextDraft);
    toast({
      title: "Photo ready",
      description: "Click Save Profile to apply your new photo.",
    });

    setUploadingAvatar(false);
  };

  const handleRemovePhoto = async () => {
    if (!isEditingProfile) return;
    setProfileDraft((prev) => ({ ...prev, avatar_url: null }));
  };

  const handleStartEditing = () => {
    setIsEditingProfile(true);
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
        return "bg-green-500/15 text-green-300 border-green-500/30";
      case "pending":
        return "bg-amber-500/15 text-amber-300 border-amber-500/30";
      case "overdue":
        return "bg-red-500/15 text-red-300 border-red-500/30";
      default:
        return "bg-muted/30 text-muted-foreground border-border";
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
      <PremiumBackground>
        <Navigation />

        <main className="pt-28 pb-20 px-4">
          <div className="container-narrow">
            <motion.section
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="relative overflow-hidden rounded-3xl border border-primary/20 bg-[radial-gradient(circle_at_top_right,hsl(var(--primary)/0.18),transparent_58%),linear-gradient(145deg,hsl(var(--card)/0.95),hsl(var(--card)/0.78))] p-6 md:p-8 mb-8"
            >
              <div className="absolute -right-16 -top-20 h-44 w-44 rounded-full bg-primary/15 blur-3xl" />
              <div className="absolute -left-20 -bottom-20 h-52 w-52 rounded-full bg-primary/10 blur-3xl" />

              <div className="relative z-10 flex flex-col lg:flex-row lg:items-end lg:justify-between gap-5">
                <div>
                  <p className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.24em] text-primary/80 mb-3">
                    <Sparkles className="w-3.5 h-3.5" />
                    Client Workspace
                  </p>
                  <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-2">
                    Welcome back, {profileDraft.full_name || "there"}
                  </h1>
                  <p className="text-muted-foreground max-w-2xl">
                    Manage your quotes, keep your profile polished, and showcase who you are in one place.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <Badge className="border-primary/30 bg-primary/15 text-primary px-3 py-1.5 rounded-full">
                    {profileCompleteness}% profile complete
                  </Badge>
                  <Button variant="outline" onClick={handleSignOut}>
                    <LogOut className="w-4 h-4 mr-2" />
                    Sign Out
                  </Button>
                </div>
              </div>
            </motion.section>

            <div className="grid xl:grid-cols-12 gap-6">
              <motion.aside
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 }}
                className="xl:col-span-4 space-y-6"
              >
                <Card className="glass-card border-border/60 overflow-hidden">
                  <div className="h-1.5 w-full bg-gradient-to-r from-primary/80 via-red-400/70 to-primary/80" />
                  <CardContent className="p-6">
                    <div className="flex gap-4">
                      <div className="relative">
                        <div className="h-24 w-24 rounded-2xl border border-border/70 bg-secondary/50 overflow-hidden flex items-center justify-center text-2xl font-semibold text-foreground">
                          {profileDraft.avatar_url ? (
                            <img
                              src={profileDraft.avatar_url}
                              alt="Profile"
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            initials
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => avatarInputRef.current?.click()}
                          className="absolute -bottom-2 -right-2 h-9 w-9 rounded-xl border border-primary/30 bg-primary/15 text-primary flex items-center justify-center hover:bg-primary/25 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                          aria-label="Upload profile photo"
                          disabled={!isEditingProfile || uploadingAvatar || savingProfile}
                        >
                          {uploadingAvatar ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
                        </button>
                        <input
                          ref={avatarInputRef}
                          type="file"
                          accept="image/*"
                          onChange={handleAvatarUpload}
                          className="hidden"
                          disabled={!isEditingProfile}
                        />
                      </div>

                      <div className="min-w-0">
                        <h2 className="text-xl font-semibold text-foreground truncate">
                          {profileDraft.full_name || "Set your name"}
                        </h2>
                        <p className="text-sm text-muted-foreground mt-1 truncate">
                          {profileDraft.job_role || "Add your current role"}
                        </p>
                        <p className="text-xs text-muted-foreground/90 mt-2 break-all">{profileDraft.email || user?.email}</p>
                      </div>
                    </div>

                    <div className="mt-6 space-y-4">
                      <div>
                        <label htmlFor="profile-fullname" className="text-sm font-medium text-foreground">Full Name</label>
                        <input
                          id="profile-fullname"
                          type="text"
                          value={profileDraft.full_name}
                          onChange={(event) => setProfileDraft((prev) => ({ ...prev, full_name: event.target.value }))}
                          className={`mt-2 w-full rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 ${!isEditingProfile ? "opacity-85 cursor-default" : ""}`}
                          placeholder="Your full name"
                          readOnly={!isEditingProfile}
                        />
                      </div>

                      <div>
                        <label htmlFor="profile-role" className="text-sm font-medium text-foreground inline-flex items-center gap-2">
                          <BriefcaseBusiness className="w-4 h-4 text-primary" />
                          Current Role
                        </label>
                        <input
                          id="profile-role"
                          type="text"
                          value={profileDraft.job_role}
                          onChange={(event) => setProfileDraft((prev) => ({ ...prev, job_role: event.target.value }))}
                          className={`mt-2 w-full rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 ${!isEditingProfile ? "opacity-85 cursor-default" : ""}`}
                          placeholder="Product Designer, Mechanical Engineer, etc."
                          readOnly={!isEditingProfile}
                        />
                      </div>

                      <div>
                        <label htmlFor="profile-bio" className="text-sm font-medium text-foreground">Bio</label>
                        <textarea
                          id="profile-bio"
                          rows={4}
                          value={profileDraft.bio}
                          onChange={(event) => setProfileDraft((prev) => ({ ...prev, bio: event.target.value }))}
                          className={`mt-2 w-full rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 resize-none ${!isEditingProfile ? "opacity-85 cursor-default" : ""}`}
                          placeholder="Write a short professional bio about yourself"
                          readOnly={!isEditingProfile}
                        />
                      </div>
                    </div>

                    <div className="mt-6 flex flex-wrap gap-3">
                      {isEditingProfile ? (
                        <>
                          <Button onClick={handleProfileSave} disabled={savingProfile || uploadingAvatar || !hasProfileChanges}>
                            {savingProfile ? (
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            ) : (
                              <Save className="w-4 h-4 mr-2" />
                            )}
                            Save Profile
                          </Button>

                          <Button
                            type="button"
                            variant="outline"
                            onClick={handleCancelEditing}
                            disabled={savingProfile || uploadingAvatar}
                          >
                            <X className="w-4 h-4 mr-2" />
                            Cancel
                          </Button>

                          <Button
                            type="button"
                            variant="outline"
                            onClick={handleRemovePhoto}
                            disabled={!profileDraft.avatar_url || savingProfile || uploadingAvatar}
                          >
                            Remove Photo
                          </Button>
                        </>
                      ) : (
                        <Button type="button" onClick={handleStartEditing}>
                          <PencilLine className="w-4 h-4 mr-2" />
                          Edit Profile
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>

                <Card className="glass-card border-primary/20">
                  <CardContent className="p-5">
                    <h3 className="font-semibold text-foreground mb-2">Profile Tips</h3>
                    <p className="text-sm text-muted-foreground">
                      Add your photo, role, and bio so your dashboard feels personal and ready for future team collaboration features.
                    </p>
                  </CardContent>
                </Card>
              </motion.aside>

              <section className="xl:col-span-8 space-y-6">
                {employeeProfile && (
                  <motion.div
                    initial={{ opacity: 0, y: 18 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.08 }}
                  >
                    <Card className="glass-card border-green-500/30 overflow-hidden">
                      <CardHeader className="border-b border-border/50 bg-green-500/5">
                        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
                          <div>
                            <CardTitle className="text-2xl">Employee Work Dashboard</CardTitle>
                            <p className="text-sm text-muted-foreground mt-1">
                              {employeeProfile.name} ({employeeProfile.profession})
                            </p>
                          </div>
                          <Badge className="border-green-500/25 bg-green-500/10 text-green-400">
                            {employeeAssignments.filter((item) => item.status !== "draft").length} tasks
                          </Badge>
                        </div>
                      </CardHeader>

                      <CardContent className="p-6">
                        {loadingEmployeeData ? (
                          <div className="space-y-4">
                            {[1, 2].map((item) => (
                              <Skeleton key={item} className="h-20 w-full rounded-xl" />
                            ))}
                          </div>
                        ) : employeeAssignments.length === 0 ? (
                          <p className="text-sm text-muted-foreground">No assigned work yet.</p>
                        ) : (
                          <div className="space-y-3">
                            {employeeAssignments.map((assignment) => (
                              <div
                                key={assignment.id}
                                className={`rounded-xl border px-4 py-3 ${
                                  assignment.status === "done"
                                    ? "border-green-500/40 bg-green-500/10"
                                    : "border-border/70 bg-card/60"
                                }`}
                              >
                                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                                  <h4 className="font-semibold text-foreground">{assignment.work_title}</h4>
                                  <Badge className={assignment.status === "done" ? "bg-green-500/15 text-green-400" : "bg-blue-500/15 text-blue-400"}>
                                    {assignment.status === "done" ? "Done" : "Assigned"}
                                  </Badge>
                                </div>
                                <p className="text-sm text-muted-foreground mt-1">Duration: {assignment.work_duration}</p>
                                {assignment.revision_due_at && (
                                  <p className="text-xs text-muted-foreground mt-1">
                                    Revision: {new Date(assignment.revision_due_at).toLocaleString()}
                                  </p>
                                )}
                                {assignment.work_details && (
                                  <p className="text-sm text-muted-foreground mt-2">{assignment.work_details}</p>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </motion.div>
                )}

                <motion.div
                  initial={{ opacity: 0, y: 18 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4"
                >
                  <Card className="glass-card border-border/60 hover:border-primary/35 transition-colors">
                    <CardContent className="p-5">
                      <div className="w-10 h-10 rounded-xl bg-primary/15 text-primary flex items-center justify-center mb-4">
                        <FileText className="w-5 h-5" />
                      </div>
                      <p className="text-2xl font-bold text-foreground">{stats.total}</p>
                      <p className="text-sm text-muted-foreground">Total Quotes</p>
                    </CardContent>
                  </Card>

                  <Card className="glass-card border-border/60 hover:border-primary/35 transition-colors">
                    <CardContent className="p-5">
                      <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center mb-4">
                        <Clock3 className="w-5 h-5" />
                      </div>
                      <p className="text-2xl font-bold text-foreground">{stats.pendingCount}</p>
                      <p className="text-sm text-muted-foreground">Pending</p>
                    </CardContent>
                  </Card>

                  <Card className="glass-card border-border/60 hover:border-primary/35 transition-colors">
                    <CardContent className="p-5">
                      <div className="w-10 h-10 rounded-xl bg-green-500/20 text-green-400 flex items-center justify-center mb-4">
                        <CheckCircle2 className="w-5 h-5" />
                      </div>
                      <p className="text-2xl font-bold text-foreground">{stats.paidCount}</p>
                      <p className="text-sm text-muted-foreground">Paid</p>
                    </CardContent>
                  </Card>

                  <Card className="glass-card border-border/60 hover:border-primary/35 transition-colors">
                    <CardContent className="p-5">
                      <div className="w-10 h-10 rounded-xl bg-red-500/20 text-red-400 flex items-center justify-center mb-4">
                        <DollarSign className="w-5 h-5" />
                      </div>
                      <p className="text-2xl font-bold text-foreground">{formatCurrency(stats.outstanding, "USD")}</p>
                      <p className="text-sm text-muted-foreground">Outstanding</p>
                    </CardContent>
                  </Card>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.15 }}
                >
                  <Card className="glass-card border-border/60 overflow-hidden">
                    <CardHeader className="border-b border-border/50 bg-background/40">
                      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
                        <div>
                          <CardTitle className="text-2xl">Your Quotes</CardTitle>
                          <p className="text-sm text-muted-foreground mt-1">
                            Track quote status and payment readiness in one place.
                          </p>
                        </div>
                        <Badge className="border-primary/25 bg-primary/10 text-primary">
                          Paid Total: {formatCurrency(stats.paidAmount, "USD")}
                        </Badge>
                      </div>
                    </CardHeader>

                    <CardContent className="p-6">
                      {loading ? (
                        <div className="space-y-4">
                          {[1, 2, 3].map((i) => (
                            <Skeleton key={i} className="h-24 w-full rounded-xl" />
                          ))}
                        </div>
                      ) : quotes.length === 0 ? (
                        <div className="text-center py-16">
                          <div className="w-16 h-16 mx-auto mb-5 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                            <FileText className="w-8 h-8 text-primary/80" />
                          </div>
                          <h3 className="text-xl font-semibold text-foreground mb-2">No quotes yet</h3>
                          <p className="text-muted-foreground mb-5 max-w-md mx-auto">
                            When your first quote is created, it will appear here with status, due date, and payment actions.
                          </p>
                          <Button onClick={() => navigate("/contact")}>Request a Quote</Button>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {quotes.map((quote) => (
                            <div
                              key={quote.id}
                              className="rounded-2xl border border-border/70 bg-card/60 px-5 py-4 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4"
                            >
                              <div className="min-w-0 flex-1">
                                <div className="flex flex-wrap items-center gap-3 mb-2">
                                  <h4 className="font-semibold text-foreground text-lg truncate">{quote.title}</h4>
                                  <Badge className={getStatusColor(quote.status || "draft")}>
                                    {quote.status || "Draft"}
                                  </Badge>
                                </div>

                                {quote.description && (
                                  <p className="text-sm text-muted-foreground mb-2 line-clamp-2">{quote.description}</p>
                                )}

                                <p className="text-xs text-muted-foreground">
                                  Created: {new Date(quote.created_at).toLocaleDateString()}
                                  {quote.due_date ? ` | Due: ${new Date(quote.due_date).toLocaleDateString()}` : ""}
                                </p>
                              </div>

                              <div className="flex flex-wrap items-center gap-3 lg:justify-end">
                                <p className="text-2xl font-bold text-foreground">
                                  {formatCurrency(quote.amount, quote.currency || "USD")}
                                </p>
                                {quote.status === "pending" && (
                                  <Button onClick={() => handlePayQuote(quote)}>Pay Now</Button>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              </section>
            </div>
          </div>
        </main>

        <Footer />
      </PremiumBackground>
    </PageTransition>
  );
};

export default Dashboard;
