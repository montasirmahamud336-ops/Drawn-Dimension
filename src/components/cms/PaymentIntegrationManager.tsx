import { useEffect, useState } from "react";
import {
  CreditCard,
  CheckCircle2,
  AlertTriangle,
  Lock,
  Eye,
  EyeOff,
  Copy,
  Check,
  Save,
  Loader2,
  Activity,
  ShieldCheck,
  ExternalLink,
  RotateCcw,
  Zap,
  Globe,
  Radio,
  Server,
  DollarSign,
  KeyRound,
  Sliders,
  HelpCircle,
  ArrowUpRight,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getAdminToken, getApiBaseUrl } from "@/components/admin/adminAuth";

interface PaymentGatewayConfig {
  publishableKey: string;
  secretKey: string;
  webhookSecret: string;
  isActive: boolean;
  mode: "test" | "live";
  currency: string;
  isUsingEnvFallback?: boolean;
  updatedAt?: string | null;
}

interface TestConnectionResult {
  success: boolean;
  latencyMs?: number;
  isLive?: boolean;
  accountId?: string;
  businessName?: string;
  defaultCurrency?: string;
  chargesEnabled?: boolean;
  payoutsEnabled?: boolean;
  availableBalances?: string[];
  message?: string;
}

const CURRENCY_OPTIONS = [
  { code: "usd", label: "USD ($) - US Dollar", symbol: "$" },
  { code: "eur", label: "EUR (€) - Euro", symbol: "€" },
  { code: "gbp", label: "GBP (£) - British Pound", symbol: "£" },
  { code: "cad", label: "CAD ($) - Canadian Dollar", symbol: "$" },
  { code: "aud", label: "AUD ($) - Australian Dollar", symbol: "$" },
  { code: "bdt", label: "BDT (৳) - Bangladeshi Taka", symbol: "৳" },
  { code: "sgd", label: "SGD ($) - Singapore Dollar", symbol: "$" },
  { code: "aed", label: "AED (د.إ) - UAE Dirham", symbol: "د.إ" },
];

export default function PaymentIntegrationManager() {
  const apiBase = getApiBaseUrl();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [showSecretKey, setShowSecretKey] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("credentials");

  // Form State
  const [publishableKey, setPublishableKey] = useState("");
  const [secretKey, setSecretKey] = useState("");
  const [webhookSecret, setWebhookSecret] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [mode, setMode] = useState<"test" | "live">("test");
  const [currency, setCurrency] = useState("usd");

  // Initial reference for dirty tracking
  const [initialConfig, setInitialConfig] = useState<PaymentGatewayConfig | null>(null);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [isUsingEnvFallback, setIsUsingEnvFallback] = useState(false);

  // Test Connection Diagnostics
  const [testResult, setTestResult] = useState<TestConnectionResult | null>(null);

  // Fetch current payment gateway configuration
  const loadConfig = async () => {
    const token = getAdminToken();
    if (!token) return;

    setLoading(true);
    try {
      const res = await fetch(`${apiBase}/api/payment-settings`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        throw new Error("Failed to load payment gateway settings");
      }

      const data = (await res.json()) as PaymentGatewayConfig;
      setPublishableKey(data.publishableKey || "");
      setSecretKey(data.secretKey || "");
      setWebhookSecret(data.webhookSecret || "");
      setIsActive(data.isActive !== undefined ? data.isActive : true);
      setMode(data.mode || "test");
      setCurrency(data.currency || "usd");
      setUpdatedAt(data.updatedAt || null);
      setIsUsingEnvFallback(Boolean(data.isUsingEnvFallback));

      setInitialConfig({
        publishableKey: data.publishableKey || "",
        secretKey: data.secretKey || "",
        webhookSecret: data.webhookSecret || "",
        isActive: data.isActive !== undefined ? data.isActive : true,
        mode: data.mode || "test",
        currency: data.currency || "usd",
      });
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message || "Could not fetch payment gateway settings");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadConfig();
  }, []);

  const isDirty =
    initialConfig !== null &&
    (publishableKey !== initialConfig.publishableKey ||
      secretKey !== initialConfig.secretKey ||
      webhookSecret !== initialConfig.webhookSecret ||
      isActive !== initialConfig.isActive ||
      mode !== initialConfig.mode ||
      currency !== initialConfig.currency);

  const handleReset = () => {
    if (!initialConfig) return;
    setPublishableKey(initialConfig.publishableKey);
    setSecretKey(initialConfig.secretKey);
    setWebhookSecret(initialConfig.webhookSecret);
    setIsActive(initialConfig.isActive);
    setMode(initialConfig.mode);
    setCurrency(initialConfig.currency);
    toast.info("Reverted all unsaved changes");
  };

  const copyToClipboard = (text: string, fieldId: string) => {
    if (!text) return;
    void navigator.clipboard.writeText(text);
    setCopiedField(fieldId);
    toast.success("Copied to clipboard");
    setTimeout(() => setCopiedField(null), 2000);
  };

  // Test Connection
  const handleTestConnection = async () => {
    const token = getAdminToken();
    if (!token) {
      toast.error("Session expired. Please log in again.");
      return;
    }

    setTesting(true);
    setTestResult(null);
    try {
      const res = await fetch(`${apiBase}/api/payment-settings/test-connection`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          secretKey: secretKey.trim(),
          publishableKey: publishableKey.trim(),
        }),
      });

      const data = (await res.json()) as TestConnectionResult;

      if (!res.ok || !data.success) {
        throw new Error(data.message || "Failed to establish test connection with Stripe");
      }

      setTestResult(data);
      toast.success("Stripe Connection Verified!", {
        description: `Connected to ${data.businessName} (${data.accountId}) in ${data.latencyMs}ms.`,
      });
    } catch (err: any) {
      console.error(err);
      setTestResult({
        success: false,
        message: err?.message || "Connection failed. Please verify your Stripe API keys.",
      });
      toast.error("Stripe Connection Test Failed", {
        description: err?.message || "Invalid or restricted API key.",
      });
    } finally {
      setTesting(false);
    }
  };

  // Save Settings
  const handleSave = async () => {
    const token = getAdminToken();
    if (!token) {
      toast.error("Session expired. Please log in again.");
      return;
    }

    // Format validation
    if (publishableKey.trim() && !publishableKey.startsWith("pk_test_") && !publishableKey.startsWith("pk_live_")) {
      toast.error("Invalid Publishable Key", {
        description: "Stripe Publishable Key must start with 'pk_test_' or 'pk_live_'.",
      });
      return;
    }

    if (secretKey.trim() && !secretKey.startsWith("sk_test_") && !secretKey.startsWith("sk_live_")) {
      toast.error("Invalid Secret Key", {
        description: "Stripe Secret Key must start with 'sk_test_' or 'sk_live_'.",
      });
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(`${apiBase}/api/payment-settings`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          publishableKey: publishableKey.trim(),
          secretKey: secretKey.trim(),
          webhookSecret: webhookSecret.trim(),
          isActive,
          mode,
          currency,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => null);
        throw new Error(errorData?.message || "Failed to save payment gateway credentials");
      }

      const data = await res.json();
      setUpdatedAt(data.updatedAt || new Date().toISOString());
      setIsUsingEnvFallback(false);
      setInitialConfig({
        publishableKey: publishableKey.trim(),
        secretKey: secretKey.trim(),
        webhookSecret: webhookSecret.trim(),
        isActive,
        mode,
        currency,
      });

      toast.success("Payment Gateway Settings Saved!", {
        description: "Customer checkouts on /payment are now routed to your active credentials.",
      });
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message || "Could not save payment gateway settings");
    } finally {
      setSaving(false);
    }
  };

  const webhookUrl = `${apiBase}/api/payments/webhook`;

  const isPkValid = publishableKey.startsWith("pk_test_") || publishableKey.startsWith("pk_live_");
  const isSkValid = secretKey.startsWith("sk_test_") || secretKey.startsWith("sk_live_");

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center space-y-3">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm font-semibold text-foreground">Loading Payment Gateway Settings...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-16 max-w-5xl mx-auto">
      {/* ================= 1. CLEAN EXECUTIVE ACTION HEADER ================= */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between p-4 sm:p-5 rounded-2xl border border-border/60 bg-card/80 backdrop-blur-xl shadow-xs">
        <div className="flex items-center gap-3.5">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary shrink-0 shadow-inner">
            <CreditCard className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-lg font-bold tracking-tight text-foreground">
                Payment Integration
              </h1>

              {isActive ? (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/25 px-2.5 py-0.5 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Active
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-500/10 border border-rose-500/25 px-2.5 py-0.5 text-[11px] font-bold text-rose-600 dark:text-rose-400">
                  Disabled
                </span>
              )}

              {mode === "live" ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/20 border border-emerald-500/40 px-2.5 py-0.5 text-[11px] font-extrabold text-emerald-500">
                  <ShieldCheck className="h-3.5 w-3.5" /> Live Production
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-full bg-blue-500/15 border border-blue-500/30 px-2.5 py-0.5 text-[11px] font-bold text-blue-500">
                  Test Sandbox
                </span>
              )}

              {isDirty && (
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 border border-amber-500/30 px-2.5 py-0.5 text-[11px] font-bold text-amber-600 dark:text-amber-400">
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
                  Unsaved Changes
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Configure dynamic Stripe API keys, environment switching, and payment currencies.
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 self-end sm:self-center">
          <Button
            variant="outline"
            size="sm"
            onClick={handleReset}
            disabled={!isDirty || saving}
            className="h-9 rounded-xl px-3.5 text-xs font-semibold cursor-pointer"
          >
            <RotateCcw className="mr-1.5 h-3.5 w-3.5 text-muted-foreground" />
            Revert
          </Button>

          <Button
            size="sm"
            onClick={handleSave}
            disabled={!isDirty || saving}
            className={`h-9 rounded-xl px-4 text-xs font-bold text-primary-foreground shadow-sm transition-all cursor-pointer ${
              isDirty
                ? "bg-primary hover:opacity-95 ring-2 ring-primary/25 shadow-primary/25 shadow-md"
                : "bg-primary/80"
            }`}
          >
            {saving ? (
              <>
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="mr-1.5 h-3.5 w-3.5" />
                Save Changes
              </>
            )}
          </Button>
        </div>
      </div>

      {/* ================= 2. UNIFIED QUICK STATUS & ENVIRONMENT BAR ================= */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 rounded-2xl border border-border/60 bg-card/60 backdrop-blur-md">
        {/* Metric 1: Payment Checkout Switch */}
        <div className="flex items-center justify-between p-3 rounded-xl bg-background/60 border border-border/50">
          <div className="space-y-0.5">
            <span className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">Checkout Status</span>
            <p className="text-xs font-bold text-foreground">
              {isActive ? "Accepting Payments" : "Checkout Paused"}
            </p>
          </div>
          <Switch checked={isActive} onCheckedChange={setIsActive} aria-label="Toggle payments" />
        </div>

        {/* Metric 2: Environment Mode Selector */}
        <div className="flex items-center justify-between p-3 rounded-xl bg-background/60 border border-border/50">
          <div className="space-y-0.5">
            <span className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">Environment</span>
            <p className="text-xs font-bold text-foreground">
              {mode === "live" ? "Live Account" : "Test Sandbox"}
            </p>
          </div>
          <div className="flex items-center rounded-lg border border-border/60 p-0.5 bg-muted/60 text-xs font-bold">
            <button
              type="button"
              onClick={() => setMode("test")}
              className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                mode === "test" ? "bg-background text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Test
            </button>
            <button
              type="button"
              onClick={() => setMode("live")}
              className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                mode === "live" ? "bg-emerald-600 text-white shadow-xs" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Live
            </button>
          </div>
        </div>

        {/* Metric 3: Live Test Quick-Action */}
        <div className="flex items-center justify-between p-3 rounded-xl bg-background/60 border border-border/50">
          <div className="space-y-0.5">
            <span className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">Stripe Health</span>
            <p className="text-xs font-bold text-foreground truncate max-w-[140px]">
              {testResult?.success ? (
                <span className="text-emerald-500 font-mono">OK ({testResult.latencyMs}ms)</span>
              ) : testResult ? (
                <span className="text-rose-500">Failed</span>
              ) : (
                "Ready to Test"
              )}
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleTestConnection}
            disabled={testing || !secretKey}
            className="h-7.5 rounded-lg px-2.5 text-[11px] font-bold border-primary/30 hover:bg-primary/10 hover:text-primary cursor-pointer"
          >
            {testing ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <>
                <Activity className="h-3 w-3 mr-1 text-primary" />
                Test API
              </>
            )}
          </Button>
        </div>
      </div>

      {/* ================= 3. STRUCTURED ORGANIZED TABS ================= */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-3 h-11 rounded-xl p-1 bg-card/80 border border-border/60">
          <TabsTrigger value="credentials" className="rounded-lg text-xs font-bold gap-2 cursor-pointer">
            <KeyRound className="h-3.5 w-3.5" />
            <span>API Credentials & Keys</span>
          </TabsTrigger>
          <TabsTrigger value="preferences" className="rounded-lg text-xs font-bold gap-2 cursor-pointer">
            <Sliders className="h-3.5 w-3.5" />
            <span>Checkout & Currency</span>
          </TabsTrigger>
          <TabsTrigger value="diagnostics" className="rounded-lg text-xs font-bold gap-2 cursor-pointer">
            <Activity className="h-3.5 w-3.5" />
            <span>Health & Diagnostics</span>
          </TabsTrigger>
        </TabsList>

        {/* ----------------- TAB 1: API CREDENTIALS ----------------- */}
        <TabsContent value="credentials" className="space-y-4 pt-1">
          <div className="rounded-2xl border border-border/60 bg-card/80 p-5 sm:p-6 backdrop-blur-xl space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-border/50">
              <div>
                <h3 className="text-sm font-bold text-foreground">Stripe API Keys</h3>
                <p className="text-xs text-muted-foreground">
                  Paste credentials from your Stripe Dashboard to switch payments to your account.
                </p>
              </div>
              <a
                href="https://dashboard.stripe.com/apikeys"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 rounded-xl border border-border/60 bg-background/60 px-3 py-1.5 text-xs font-bold text-primary hover:border-primary/40 hover:bg-primary/5 transition-all"
              >
                <span>Stripe Dashboard</span>
                <ArrowUpRight className="h-3.5 w-3.5" />
              </a>
            </div>

            {/* Field 1: Publishable Key */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="publishableKey" className="text-xs font-bold text-foreground flex items-center gap-2">
                  Publishable Key
                  {isPkValid ? (
                    <span className="inline-flex items-center gap-1 rounded bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-bold text-emerald-500">
                      <Check className="h-3 w-3" /> Valid Format
                    </span>
                  ) : publishableKey ? (
                    <span className="rounded bg-rose-500/10 px-1.5 py-0.5 text-[10px] font-bold text-rose-500">
                      Needs pk_test_ or pk_live_
                    </span>
                  ) : null}
                </Label>
                <span className="text-[10px] font-mono text-muted-foreground">
                  Public Client Key • Used in browser
                </span>
              </div>
              <div className="relative">
                <Input
                  id="publishableKey"
                  value={publishableKey}
                  onChange={(e) => setPublishableKey(e.target.value)}
                  placeholder="pk_test_... or pk_live_..."
                  className="h-10 font-mono text-xs rounded-xl bg-background/70 pr-10 border-border/70 focus:border-primary"
                />
                <button
                  type="button"
                  onClick={() => copyToClipboard(publishableKey, "pk")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer p-1 rounded-lg hover:bg-muted"
                  title="Copy Key"
                >
                  {copiedField === "pk" ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Field 2: Secret Key */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="secretKey" className="text-xs font-bold text-foreground flex items-center gap-2">
                  Secret Key
                  <span className="rounded bg-rose-500/15 border border-rose-500/30 px-1.5 py-0.5 text-[9px] font-extrabold text-rose-600 dark:text-rose-400">
                    Confidential
                  </span>
                  {isSkValid ? (
                    <span className="inline-flex items-center gap-1 rounded bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-bold text-emerald-500">
                      <Check className="h-3 w-3" /> Valid Format
                    </span>
                  ) : secretKey ? (
                    <span className="rounded bg-rose-500/10 px-1.5 py-0.5 text-[10px] font-bold text-rose-500">
                      Needs sk_test_ or sk_live_
                    </span>
                  ) : null}
                </Label>
                <span className="text-[10px] font-mono text-muted-foreground">
                  Private Server Key • Kept on VPS
                </span>
              </div>
              <div className="relative">
                <Input
                  id="secretKey"
                  type={showSecretKey ? "text" : "password"}
                  value={secretKey}
                  onChange={(e) => setSecretKey(e.target.value)}
                  placeholder="sk_test_... or sk_live_..."
                  className="h-10 font-mono text-xs rounded-xl bg-background/70 pr-20 border-border/70 focus:border-primary"
                />
                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setShowSecretKey((prev) => !prev)}
                    className="text-muted-foreground hover:text-foreground cursor-pointer p-1.5 rounded-lg hover:bg-muted"
                    title={showSecretKey ? "Hide key" : "Show key"}
                  >
                    {showSecretKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(secretKey, "sk")}
                    className="text-muted-foreground hover:text-foreground cursor-pointer p-1.5 rounded-lg hover:bg-muted"
                    title="Copy key"
                  >
                    {copiedField === "sk" ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            </div>

            {/* Field 3: Webhook Secret */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="webhookSecret" className="text-xs font-bold text-foreground">
                  Webhook Signing Secret (Optional)
                </Label>
                <span className="text-[10px] font-mono text-muted-foreground">
                  Starts with whsec_
                </span>
              </div>
              <div className="relative">
                <Input
                  id="webhookSecret"
                  type="password"
                  value={webhookSecret}
                  onChange={(e) => setWebhookSecret(e.target.value)}
                  placeholder="whsec_..."
                  className="h-10 font-mono text-xs rounded-xl bg-background/70 pr-10 border-border/70 focus:border-primary"
                />
                <button
                  type="button"
                  onClick={() => copyToClipboard(webhookSecret, "whsec")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer p-1 rounded-lg hover:bg-muted"
                  title="Copy Webhook Secret"
                >
                  {copiedField === "whsec" ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
                </button>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* ----------------- TAB 2: CHECKOUT & CURRENCY ----------------- */}
        <TabsContent value="preferences" className="space-y-4 pt-1">
          <div className="rounded-2xl border border-border/60 bg-card/80 p-5 sm:p-6 backdrop-blur-xl space-y-5">
            <div className="pb-3 border-b border-border/50">
              <h3 className="text-sm font-bold text-foreground">Checkout Preferences</h3>
              <p className="text-xs text-muted-foreground">
                Set settlement currency and review enabled customer payment methods.
              </p>
            </div>

            {/* Currency Selector */}
            <div className="space-y-2">
              <Label htmlFor="currencySelect" className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <DollarSign className="h-4 w-4 text-primary" />
                Default Billing & Settlement Currency
              </Label>
              <Select value={currency} onValueChange={setCurrency}>
                <SelectTrigger id="currencySelect" className="h-10 rounded-xl border-border/70 bg-background/80 text-xs font-medium">
                  <SelectValue placeholder="Select settlement currency" />
                </SelectTrigger>
                <SelectContent className="rounded-xl border-border/80 bg-popover/95 backdrop-blur-xl">
                  {CURRENCY_OPTIONS.map((c) => (
                    <SelectItem key={c.code} value={c.code} className="text-xs font-medium">
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Accepted Methods Preview Grid */}
            <div className="space-y-2 pt-2">
              <Label className="text-xs font-bold text-foreground">
                Supported Customer Payment Channels
              </Label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div className="flex items-center gap-2 p-3 rounded-xl border border-border/60 bg-background/50">
                  <CreditCard className="h-4 w-4 text-primary" />
                  <div>
                    <p className="text-xs font-bold text-foreground">Visa & Cards</p>
                    <span className="text-[10px] text-emerald-500 font-bold">Enabled</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 p-3 rounded-xl border border-border/60 bg-background/50">
                  <CreditCard className="h-4 w-4 text-primary" />
                  <div>
                    <p className="text-xs font-bold text-foreground">Mastercard</p>
                    <span className="text-[10px] text-emerald-500 font-bold">Enabled</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 p-3 rounded-xl border border-border/60 bg-background/50">
                  <Sparkles className="h-4 w-4 text-primary" />
                  <div>
                    <p className="text-xs font-bold text-foreground">Apple Pay</p>
                    <span className="text-[10px] text-emerald-500 font-bold">Express Checkout</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 p-3 rounded-xl border border-border/60 bg-background/50">
                  <Sparkles className="h-4 w-4 text-primary" />
                  <div>
                    <p className="text-xs font-bold text-foreground">Google Pay</p>
                    <span className="text-[10px] text-emerald-500 font-bold">Express Checkout</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Direct Checkout Preview Link */}
            <div className="p-3.5 rounded-xl border border-primary/20 bg-primary/5 flex items-center justify-between">
              <div className="space-y-0.5">
                <p className="text-xs font-bold text-foreground">Preview Live Customer Checkout Page</p>
                <p className="text-[11px] text-muted-foreground">Test how clients view and pay invoices on your site.</p>
              </div>
              <Button variant="outline" size="sm" asChild className="h-8 rounded-lg text-xs font-bold">
                <a href="/payment?plan=Engineering%20Plan&price=$100" target="_blank" rel="noreferrer">
                  <span>Open Checkout</span>
                  <ExternalLink className="ml-1.5 h-3 w-3" />
                </a>
              </Button>
            </div>
          </div>
        </TabsContent>

        {/* ----------------- TAB 3: DIAGNOSTICS & WEBHOOKS ----------------- */}
        <TabsContent value="diagnostics" className="space-y-4 pt-1">
          {/* Diagnostics Results */}
          <div className="rounded-2xl border border-border/60 bg-card/80 p-5 sm:p-6 backdrop-blur-xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-border/50">
              <div>
                <h3 className="text-sm font-bold text-foreground">Stripe Connection Diagnostics</h3>
                <p className="text-xs text-muted-foreground">Real-time health check against Stripe API servers.</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleTestConnection}
                disabled={testing || !secretKey}
                className="h-8 rounded-lg text-xs font-bold border-primary/40 hover:bg-primary/10 hover:text-primary cursor-pointer"
              >
                {testing ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : <Activity className="h-3.5 w-3.5 mr-1.5 text-primary" />}
                Run Live Test
              </Button>
            </div>

            {testing ? (
              <div className="flex flex-col items-center justify-center py-10 text-center space-y-2">
                <Loader2 className="h-7 w-7 animate-spin text-primary" />
                <p className="text-xs font-bold text-foreground">Validating credentials with Stripe...</p>
                <p className="text-[11px] text-muted-foreground">Pinging /v1/balance and /v1/accounts endpoints</p>
              </div>
            ) : testResult?.success ? (
              <div className="space-y-3 pt-1">
                <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-700 dark:text-emerald-300 text-xs font-bold">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
                  <span>Stripe Authentication Verified ({testResult.latencyMs}ms Latency)</span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  <div className="p-3 rounded-xl border border-border/60 bg-background/50 space-y-0.5">
                    <span className="text-[10px] uppercase font-mono text-muted-foreground font-bold">Account ID</span>
                    <p className="font-mono font-bold text-xs text-foreground truncate">{testResult.accountId}</p>
                  </div>

                  <div className="p-3 rounded-xl border border-border/60 bg-background/50 space-y-0.5">
                    <span className="text-[10px] uppercase font-mono text-muted-foreground font-bold">Environment</span>
                    <p className="font-bold text-xs text-foreground">
                      {testResult.isLive ? (
                        <span className="text-emerald-500 font-bold">Live Production</span>
                      ) : (
                        <span className="text-blue-500 font-bold">Test Sandbox</span>
                      )}
                    </p>
                  </div>

                  <div className="p-3 rounded-xl border border-border/60 bg-background/50 space-y-0.5">
                    <span className="text-[10px] uppercase font-mono text-muted-foreground font-bold">Merchant Name</span>
                    <p className="font-bold text-xs text-foreground truncate">{testResult.businessName || "Stripe Merchant"}</p>
                  </div>

                  <div className="p-3 rounded-xl border border-border/60 bg-background/50 space-y-0.5">
                    <span className="text-[10px] uppercase font-mono text-muted-foreground font-bold">Charges Status</span>
                    <p className="font-bold text-xs text-emerald-500">
                      {testResult.chargesEnabled ? "Active & Ready" : "Pending Review"}
                    </p>
                  </div>
                </div>

                {testResult.availableBalances && testResult.availableBalances.length > 0 && (
                  <div className="p-3 rounded-xl border border-border/60 bg-background/50 flex items-center justify-between text-xs">
                    <span className="text-muted-foreground font-medium">Available Account Balance</span>
                    <span className="font-mono font-bold text-foreground">
                      {testResult.availableBalances.join(", ")}
                    </span>
                  </div>
                )}
              </div>
            ) : testResult ? (
              <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/25 text-rose-700 dark:text-rose-300 text-xs space-y-1">
                <div className="flex items-center gap-2 font-bold">
                  <AlertTriangle className="h-4 w-4 shrink-0 text-rose-500" />
                  <span>Stripe Authentication Failed</span>
                </div>
                <p className="text-[11px] opacity-90 pl-6">{testResult.message}</p>
              </div>
            ) : (
              <div className="py-8 text-center space-y-2">
                <ShieldCheck className="mx-auto h-8 w-8 text-muted-foreground/40" />
                <p className="text-xs font-semibold text-foreground">No test executed yet</p>
                <p className="text-[11px] text-muted-foreground">
                  Click "Run Live Test" to verify that your keys can charge cards and connect to Stripe.
                </p>
              </div>
            )}
          </div>

          {/* Webhook Endpoint Card */}
          <div className="rounded-2xl border border-border/60 bg-card/80 p-5 sm:p-6 backdrop-blur-xl space-y-3">
            <div className="pb-2 border-b border-border/50">
              <h3 className="text-xs font-bold text-foreground">Stripe Webhook Endpoint URL</h3>
              <p className="text-[11px] text-muted-foreground">
                Copy this URL into your Stripe Webhook settings for payment event notifications.
              </p>
            </div>

            <div className="flex items-center gap-2 rounded-xl border border-border/70 bg-background/80 p-2.5 font-mono text-xs">
              <span className="truncate flex-1 text-foreground/90">{webhookUrl}</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => copyToClipboard(webhookUrl, "whurl")}
                className="h-7 px-2 text-xs font-bold cursor-pointer"
              >
                {copiedField === "whurl" ? (
                  <Check className="h-3.5 w-3.5 text-emerald-500" />
                ) : (
                  <Copy className="h-3.5 w-3.5" />
                )}
              </Button>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
