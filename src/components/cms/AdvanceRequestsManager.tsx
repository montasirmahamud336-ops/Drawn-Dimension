import { useEffect, useState } from "react";
import { Check, HandCoins, RotateCcw, X, Trash2, Eye, Bell, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { getAdminToken, getApiBaseUrl } from "@/components/admin/adminAuth";
import { toast } from "sonner";

type Request = {
  id: string;
  employee_name: string;
  employee_email: string | null;
  amount: number;
  reason: string;
  status: "pending" | "approved" | "rejected" | "repaid" | "settled";
  requested_at: string;
  admin_note: string | null;
};

const money = (amount: number) =>
  new Intl.NumberFormat("en-BD", { style: "currency", currency: "BDT" }).format(amount);

export default function AdvanceRequestsManager() {
  const [items, setItems] = useState<Request[]>([]);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<Request | null>(null);

  const load = async () => {
    try {
      const r = await fetch(`${getApiBaseUrl()}/advance-requests`, {
        headers: { Authorization: `Bearer ${getAdminToken()}` },
      });
      if (r.ok) {
        const data = await r.json();
        setItems(data);
        const initialNotes: Record<string, string> = {};
        data.forEach((item: Request) => {
          if (item.admin_note) initialNotes[item.id] = item.admin_note;
        });
        setNotes(initialNotes);
      } else {
        toast.error("Could not load advance requests");
      }
    } catch {
      toast.error("Network error while loading advance requests");
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const review = async (id: string, status: "approved" | "rejected" | "repaid" | "pending" | "paid") => {
    setBusy(id);
    try {
      const r = await fetch(`${getApiBaseUrl()}/advance-requests/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getAdminToken()}`,
        },
        body: JSON.stringify({ status, admin_note: notes[id] ?? "" }),
      });
      if (!r.ok) {
        const errData = await r.json().catch(() => null);
        throw new Error(errData?.message || `Server error (${r.status})`);
      }
      const updated: Request = await r.json();
      setItems((all) => all.map((item) => (item.id === id ? updated : item)));
      if (selectedItem?.id === id) {
        setSelectedItem(updated);
      }
      
      const statusLabel = 
        status === "approved" ? "approved" :
        status === "rejected" ? "rejected" :
        status === "repaid" || status === "paid" ? "marked as Repaid" : status;

      toast.success(`Advance request ${statusLabel}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not update request");
    } finally {
      setBusy(null);
    }
  };

  const deleteRequest = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!window.confirm("Are you sure you want to delete this advance request notification?")) return;
    
    setBusy(id);
    try {
      const r = await fetch(`${getApiBaseUrl()}/advance-requests/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${getAdminToken()}` },
      });
      if (!r.ok) throw new Error("Failed to delete notification");
      setItems((all) => all.filter((item) => item.id !== id));
      if (selectedItem?.id === id) setSelectedItem(null);
      toast.success("Advance request notification deleted");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not delete notification");
    } finally {
      setBusy(null);
    }
  };

  const pendingCount = items.filter((item) => item.status === "pending").length;

  const getStatusBadge = (status: Request["status"]) => {
    switch (status) {
      case "approved":
        return <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30 text-[11px] font-semibold">Approved</Badge>;
      case "repaid":
      case "settled":
      case "paid":
        return <Badge variant="outline" className="bg-teal-500/10 text-teal-600 border-teal-500/30 text-[11px] font-semibold">Repaid</Badge>;
      case "rejected":
        return <Badge variant="outline" className="bg-rose-500/10 text-rose-600 border-rose-500/30 text-[11px] font-semibold">Rejected</Badge>;
      default:
        return <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/30 text-[11px] font-semibold">Pending</Badge>;
    }
  };

  return (
    <div className="space-y-5 max-w-5xl mx-auto">
      {/* Top Header */}
      <div className="flex items-center justify-between border-b pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
            <Bell className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight">Advance Requests & Notifications</h1>
            <p className="text-xs text-muted-foreground">Click any notification item to view full request details and manage status</p>
          </div>
        </div>
        <Badge variant="secondary" className="px-3 py-1 text-xs font-semibold">
          {pendingCount} Pending
        </Badge>
      </div>

      {/* Notification List */}
      {items.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="p-8 text-center text-xs text-muted-foreground">
            No advance request notifications found.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {items.map((item) => (
            <div
              key={item.id}
              onClick={() => setSelectedItem(item)}
              className="group relative flex items-center justify-between p-3.5 rounded-xl border bg-card hover:bg-accent/40 transition-all cursor-pointer shadow-sm hover:shadow"
            >
              <div className="flex items-center gap-3.5 min-w-0">
                <div className="h-9 w-9 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold text-sm shrink-0">
                  <HandCoins className="w-4 h-4" />
                </div>
                <div className="min-w-0 space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm truncate text-foreground">{item.employee_name}</span>
                    {getStatusBadge(item.status)}
                  </div>
                  <p className="text-xs text-muted-foreground truncate max-w-md">
                    {item.reason}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-4 shrink-0 pl-3">
                <div className="text-right">
                  <span className="font-bold text-sm text-foreground block">{money(Number(item.amount))}</span>
                  <span className="text-[10px] text-muted-foreground">
                    {new Date(item.requested_at).toLocaleDateString("en-BD", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>

                <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                  {item.status === "pending" && (
                    <Button
                      size="sm"
                      onClick={() => review(item.id, "approved")}
                      disabled={busy === item.id}
                      className="h-8 px-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs"
                    >
                      <Check className="w-3.5 h-3.5 mr-1" />
                      Approve
                    </Button>
                  )}

                  {item.status === "approved" && (
                    <Button
                      size="sm"
                      onClick={() => review(item.id, "repaid")}
                      disabled={busy === item.id}
                      className="h-8 px-2.5 bg-teal-600 hover:bg-teal-700 text-white text-xs font-medium"
                    >
                      <RotateCcw className="w-3.5 h-3.5 mr-1" />
                      Mark as Repaid
                    </Button>
                  )}

                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => setSelectedItem(item)}
                    className="h-8 w-8 text-muted-foreground hover:text-foreground"
                    title="View Details"
                  >
                    <Eye className="w-4 h-4" />
                  </Button>

                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={(e) => deleteRequest(item.id, e)}
                    disabled={busy === item.id}
                    className="h-8 w-8 text-muted-foreground hover:text-rose-600 dark:hover:text-rose-400"
                    title="Delete Notification"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Detail Dialog Modal */}
      <Dialog open={!!selectedItem} onOpenChange={(open) => !open && setSelectedItem(null)}>
        {selectedItem && (
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <div className="flex items-center justify-between pr-4">
                <DialogTitle className="text-lg font-bold flex items-center gap-2">
                  <HandCoins className="w-5 h-5 text-emerald-500" />
                  {selectedItem.employee_name}
                </DialogTitle>
                {getStatusBadge(selectedItem.status)}
              </div>
              <DialogDescription className="text-xs text-muted-foreground pt-1">
                {selectedItem.employee_email || "No email"} · Requested on {new Date(selectedItem.requested_at).toLocaleString("en-BD")}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2">
              <div className="flex items-baseline justify-between border-b pb-3">
                <div>
                  <span className="text-xs text-muted-foreground block">Requested Amount</span>
                  <span className="text-2xl font-extrabold text-foreground">{money(Number(selectedItem.amount))}</span>
                </div>
                {selectedItem.status === "repaid" && (
                  <span className="text-xs text-teal-600 dark:text-teal-400 font-semibold bg-teal-50 dark:bg-teal-950/40 px-2.5 py-1 rounded-md">
                    Amount restored to employee salary
                  </span>
                )}
              </div>

              <div>
                <span className="text-xs font-semibold text-muted-foreground block mb-1">Reason:</span>
                <div className="rounded-lg bg-muted/60 p-3 text-xs whitespace-pre-wrap text-foreground">
                  {selectedItem.reason}
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground block">
                  Admin Note (e.g. Payment receipt or Repayment details)
                </label>
                <Textarea
                  value={notes[selectedItem.id] ?? ""}
                  onChange={(e) => setNotes((all) => ({ ...all, [selectedItem.id]: e.target.value }))}
                  placeholder="Add administrative note..."
                  className="text-xs min-h-[70px]"
                />
              </div>

              {/* Modal Action Buttons */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t">
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => deleteRequest(selectedItem.id)}
                  disabled={busy === selectedItem.id}
                  className="text-xs"
                >
                  <Trash2 className="w-3.5 h-3.5 mr-1" />
                  Delete Request
                </Button>

                <div className="flex items-center gap-2">
                  {selectedItem.status === "pending" && (
                    <>
                      <Button
                        size="sm"
                        onClick={() => review(selectedItem.id, "approved")}
                        disabled={busy === selectedItem.id}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs"
                      >
                        <Check className="w-3.5 h-3.5 mr-1" />
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => review(selectedItem.id, "rejected")}
                        disabled={busy === selectedItem.id}
                        className="text-xs text-rose-600 border-rose-200"
                      >
                        <X className="w-3.5 h-3.5 mr-1" />
                        Reject
                      </Button>
                    </>
                  )}

                  {selectedItem.status === "approved" && (
                    <>
                      <Button
                        size="sm"
                        onClick={() => review(selectedItem.id, "repaid")}
                        disabled={busy === selectedItem.id}
                        className="bg-teal-600 hover:bg-teal-700 text-white text-xs"
                      >
                        <RotateCcw className="w-3.5 h-3.5 mr-1" />
                        Mark as Repaid
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => review(selectedItem.id, "rejected")}
                        disabled={busy === selectedItem.id}
                        className="text-xs text-rose-600 border-rose-200"
                      >
                        <X className="w-3.5 h-3.5 mr-1" />
                        Reject
                      </Button>
                    </>
                  )}

                  {(selectedItem.status === "repaid" || selectedItem.status === "settled") && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => review(selectedItem.id, "approved")}
                      disabled={busy === selectedItem.id}
                      className="text-xs"
                    >
                      <RotateCcw className="w-3.5 h-3.5 mr-1" />
                      Revert to Approved
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
}
