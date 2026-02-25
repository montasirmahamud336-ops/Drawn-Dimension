import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { CheckCircle2, Clock3, Loader2, LogOut } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import PageTransition from "@/components/shared/PageTransition";
import PremiumBackground from "@/components/shared/PremiumBackground";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getApiBaseUrl } from "@/components/admin/adminAuth";

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
  countdown_end_at: string | null;
  revision_due_at: string | null;
  payment_amount: number | string | null;
  payment_status: "unpaid" | "paid";
  status: "assigned" | "done" | "draft";
  created_at?: string;
}

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

const EmployeeDashboard = () => {
  const { user, session, signOut, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [employee, setEmployee] = useState<EmployeeProfile | null>(null);
  const [assignments, setAssignments] = useState<EmployeeAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [nowTick, setNowTick] = useState(() => Date.now());

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [authLoading, user, navigate]);

  useEffect(() => {
    const timer = window.setInterval(() => setNowTick(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const loadEmployeeDashboard = async () => {
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
          throw new Error("Failed to load employee dashboard");
        }

        const data = await response.json();
        setEmployee(data?.employee ?? null);
        setAssignments(Array.isArray(data?.assignments) ? data.assignments : []);
      } catch (error) {
        console.error(error);
        setEmployee(null);
        setAssignments([]);
      } finally {
        setLoading(false);
      }
    };

    loadEmployeeDashboard();
  }, [session?.access_token]);

  const activeAssignments = useMemo(
    () => assignments.filter((item) => item.status === "assigned"),
    [assignments]
  );

  const doneAssignments = useMemo(
    () => assignments.filter((item) => item.status === "done"),
    [assignments]
  );

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
          <div className="container-narrow space-y-6">
            <motion.section
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-3xl border border-primary/20 bg-card/70 p-6 md:p-8"
            >
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
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

            <section className="grid md:grid-cols-2 gap-4">
              <Card className="glass-card border-border/60">
                <CardContent className="p-5">
                  <div className="w-10 h-10 rounded-xl bg-blue-500/20 text-blue-500 flex items-center justify-center mb-4">
                    <Clock3 className="w-5 h-5" />
                  </div>
                  <p className="text-2xl font-bold">{activeAssignments.length}</p>
                  <p className="text-sm text-muted-foreground">Active Assignments</p>
                </CardContent>
              </Card>

              <Card className="glass-card border-border/60">
                <CardContent className="p-5">
                  <div className="w-10 h-10 rounded-xl bg-green-500/20 text-green-500 flex items-center justify-center mb-4">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <p className="text-2xl font-bold">{doneAssignments.length}</p>
                  <p className="text-sm text-muted-foreground">Completed</p>
                </CardContent>
              </Card>
            </section>

            <Card className="glass-card border-border/60 overflow-hidden">
              <CardHeader>
                <CardTitle>Assigned Work Details</CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="py-10 text-center text-muted-foreground">Loading assignments...</div>
                ) : !employee ? (
                  <div className="py-10 text-center text-muted-foreground">
                    Your login email is not mapped to any employee yet. Please contact admin.
                  </div>
                ) : assignments.length === 0 ? (
                  <div className="py-10 text-center text-muted-foreground">No assignments yet.</div>
                ) : (
                  <div className="space-y-3">
                    {assignments.map((assignment) => (
                      <div key={assignment.id} className={`rounded-xl border p-4 ${assignment.status === "done" ? "border-green-500/30 bg-green-500/10" : "border-border/70 bg-card/60"}`}>
                        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                          <div>
                            <h3 className="font-semibold text-lg">{assignment.work_title}</h3>
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
                            <Badge className={assignment.status === "done" ? "bg-green-500/15 text-green-500" : "bg-blue-500/15 text-blue-500"}>
                              {assignment.status}
                            </Badge>
                            <p className="text-sm mt-2 text-muted-foreground">Time Remaining</p>
                            <p className="font-semibold">{formatTimeRemaining(assignment.countdown_end_at, assignment.status, nowTick)}</p>
                          </div>
                        </div>
                      </div>
                    ))}
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
