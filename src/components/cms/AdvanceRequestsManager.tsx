import { useEffect, useState } from "react";
import { Check, HandCoins, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { getAdminToken, getApiBaseUrl } from "@/components/admin/adminAuth";
import { toast } from "sonner";

type Request = { id: string; employee_name: string; employee_email: string | null; amount: number; reason: string; status: "pending" | "approved" | "rejected"; requested_at: string; admin_note: string | null };
const money = (amount: number) => new Intl.NumberFormat("en-BD", { style: "currency", currency: "BDT" }).format(amount);
export default function AdvanceRequestsManager() {
  const [items, setItems] = useState<Request[]>([]); const [notes, setNotes] = useState<Record<string, string>>({}); const [busy, setBusy] = useState<string | null>(null);
  const load = async () => { const r = await fetch(`${getApiBaseUrl()}/advance-requests`, { headers: { Authorization: `Bearer ${getAdminToken()}` } }); if (r.ok) setItems(await r.json()); else toast.error("Could not load advance requests"); };
  useEffect(() => { void load(); }, []);
  const review = async (id: string, status: "approved" | "rejected") => { setBusy(id); try { const r = await fetch(`${getApiBaseUrl()}/advance-requests/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json", Authorization: `Bearer ${getAdminToken()}` }, body: JSON.stringify({ status, admin_note: notes[id] ?? "" }) }); if (!r.ok) throw new Error("Could not update request"); const updated = await r.json(); setItems((all) => all.map((item) => item.id === id ? updated : item)); toast.success(`Advance request ${status}`); } catch (e) { toast.error(e instanceof Error ? e.message : "Could not update request"); } finally { setBusy(null); } };
  const pending = items.filter((item) => item.status === "pending").length;
  return <div className="space-y-6"><div className="flex items-center justify-between"><div><p className="text-sm text-muted-foreground">Employee payment adjustment requests</p><h1 className="text-2xl font-bold">Advance Requests</h1></div><Badge variant="secondary">{pending} pending</Badge></div>{items.length === 0 ? <Card><CardContent className="p-8 text-muted-foreground">No advance requests yet.</CardContent></Card> : items.map((item) => <Card key={item.id}><CardHeader><div className="flex flex-wrap items-center justify-between gap-2"><CardTitle className="text-lg">{item.employee_name}</CardTitle><Badge className={item.status === "approved" ? "bg-emerald-600" : item.status === "rejected" ? "bg-rose-600" : "bg-amber-600"}>{item.status}</Badge></div><p className="text-sm text-muted-foreground">{item.employee_email || "No email"} · {new Date(item.requested_at).toLocaleString("en-BD")}</p></CardHeader><CardContent className="space-y-4"><p className="text-2xl font-semibold">{money(Number(item.amount))}</p><p className="rounded-lg bg-muted p-3 text-sm whitespace-pre-wrap">{item.reason}</p>{item.status === "pending" ? <><Textarea value={notes[item.id] ?? ""} onChange={(e) => setNotes((all) => ({ ...all, [item.id]: e.target.value }))} placeholder="Optional admin note" /><div className="flex gap-2"><Button onClick={() => review(item.id, "approved")} disabled={busy === item.id}><Check className="mr-2 h-4 w-4" />Approve</Button><Button variant="destructive" onClick={() => review(item.id, "rejected")} disabled={busy === item.id}><X className="mr-2 h-4 w-4" />Reject</Button></div></> : item.admin_note ? <p className="text-sm text-muted-foreground">Admin note: {item.admin_note}</p> : null}</CardContent></Card>)}</div>;
}
