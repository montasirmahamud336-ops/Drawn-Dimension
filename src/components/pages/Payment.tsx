import { useEffect, useState, useMemo } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ShieldCheck,
  Lock,
  CheckCircle2,
  AlertCircle,
  CreditCard,
  Loader2,
  Sparkles,
  Receipt,
  Download,
  Mail,
  User,
  Check,
  HelpCircle,
  FileText,
  ArrowRight,
  ChevronDown,
  Calendar,
} from "lucide-react";
import { toast } from "sonner";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import PageTransition from "@/components/shared/PageTransition";
import PremiumBackground from "@/components/shared/PremiumBackground";
import PageHero from "@/components/shared/PageHero";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getApiBaseUrl } from "@/components/admin/adminAuth";

// ================= High-Definition Payment Provider Badges =================
const VisaLogo = ({ className = "h-3.5" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 36 12" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path
      d="M14.28 0.38L9.36 11.62H6.12L3.72 2.85C3.58 2.3 3.44 2.09 3.01 1.85C2.29 1.46 1.07 1.1 0 0.87L0.08 0.38H5.25C5.92 0.38 6.52 0.82 6.66 1.6L7.93 8.3L11.08 0.38H14.28ZM26.81 7.91C26.82 4.91 22.61 4.74 22.63 3.41C22.64 3 23.03 2.57 23.89 2.46C24.32 2.41 25.51 2.36 26.83 2.96L27.38 0.44C26.63 0.17 25.66 0 24.43 0C21.46 0 19.35 1.57 19.34 3.82C19.32 5.47 20.81 6.39 21.95 6.94C23.12 7.51 23.51 7.87 23.5 8.37C23.49 9.15 22.56 9.49 21.69 9.5C20.2 9.53 19.33 9.11 18.64 8.79L18.08 11.39C18.78 11.7 20.08 11.97 21.43 12C24.59 12 26.8 10.45 26.81 7.91ZM34.73 11.62H37.56L35.1 0.38H32.47C31.88 0.38 31.39 0.71 31.18 1.22L26.64 11.62H29.91L30.56 9.84H34.54L34.73 11.62ZM31.45 7.39L33.08 2.95L34.02 7.39H31.45ZM18.47 0.38L15.92 11.62H12.86L15.41 0.38H18.47Z"
      fill="#2563EB"
    />
  </svg>
);

const MastercardLogo = ({ className = "h-4" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 28 18" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="28" height="18" rx="3" fill="#1E293B" fillOpacity="0.4" />
    <circle cx="10" cy="9" r="6" fill="#EB001B" />
    <circle cx="18" cy="9" r="6" fill="#F79E1B" fillOpacity="0.95" />
    <path
      d="M14 4.8C15.2 5.9 16 7.4 16 9C16 10.6 15.2 12.1 14 13.2C12.8 12.1 12 10.6 12 9C12 7.4 12.8 5.9 14 4.8Z"
      fill="#FF5F00"
    />
  </svg>
);

const AmexLogo = () => (
  <div className="inline-flex h-3.5 items-center justify-center rounded-[3px] bg-[#006FCF] px-1.5 py-0.5 text-[8px] font-black tracking-tighter text-white">
    AMEX
  </div>
);

const ApplePayLogo = ({ className = "h-3.5 w-3.5" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 170 170" fill="currentColor">
    <path d="M150.37 130.25c-2.45 5.66-5.35 10.87-8.71 15.66-4.58 6.53-8.33 11.05-11.22 13.56-4.48 4.12-9.28 6.23-14.42 6.35-3.69 0-8.14-1.05-13.32-3.18-5.19-2.12-9.97-3.17-14.34-3.17-4.58 0-9.49 1.05-14.75 3.17-5.26 2.13-9.5 3.24-12.74 3.35-4.35.13-9.16-1.9-14.42-6.08-3.69-3.04-7.67-7.81-11.96-14.34-5.77-8.91-10.28-19.14-13.52-30.7-3.25-11.55-4.88-22.61-4.88-33.17 0-15.65 4.09-28.71 12.27-39.18 8.18-10.47 18.57-15.82 31.17-16.06 4.9 0 10.32 1.34 16.27 4.02 5.95 2.68 9.77 4.07 11.46 4.17 1.48-.1 5.37-1.52 11.67-4.27 6.3-2.74 11.63-4.02 16-3.83 12.63.78 22.84 5.32 30.63 13.62-11.03 6.69-16.43 15.93-16.2 27.72.23 9.38 3.84 17.26 10.83 23.63 7 6.38 15.17 9.87 24.51 10.49-2.22 6.78-4.99 13.88-8.31 21.3zm-32.94-106.3c0-6.19 2.23-12.01 6.69-17.47 4.46-5.46 10.15-9.17 17.07-11.13.78 2.01 1.17 4.11 1.17 6.3 0 6.3-2.4 12.35-7.2 18.15-4.8 5.8-10.83 9.5-18.09 11.1-.22-2.31-.33-4.63-.33-6.95z" />
  </svg>
);

const GoogleGLogo = ({ className = "h-3.5 w-3.5" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24">
    <path
      fill="#4285F4"
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
    />
    <path
      fill="#34A853"
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
    />
    <path
      fill="#FBBC05"
      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
    />
    <path
      fill="#EA4335"
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
    />
  </svg>
);

interface VerifiedPaymentSession {
  id: string;
  paymentStatus: string;
  isPaid: boolean;
  amountTotal: number;
  currency: string;
  customerEmail: string;
  customerName: string;
  planName: string;
  created: string;
}

export default function Payment() {
  const [searchParams] = useSearchParams();
  const plan = searchParams.get("plan") || "Engineering & Innovation Plan";
  const rawPrice = searchParams.get("price") || "$499";
  const status = searchParams.get("status"); // 'success' | 'cancelled' | null
  const sessionId = searchParams.get("session_id");

  // Form State
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [cardNumber, setCardNumber] = useState("");
  const [cardExpiry, setCardExpiry] = useState("");
  const [cardCvc, setCardCvc] = useState("");
  const [projectNotes, setProjectNotes] = useState("");
  const [country, setCountry] = useState("United States");
  const [loadingCheckout, setLoadingCheckout] = useState(false);

  // Verification state for return URL
  const [verifying, setVerifying] = useState(Boolean(status === "success" && sessionId));
  const [verifiedSession, setVerifiedSession] = useState<VerifiedPaymentSession | null>(null);

  const apiBase = getApiBaseUrl();

  // Normalize display price string
  const cleanNumeric = rawPrice.replace(/[^0-9.]/g, "");
  const formattedPriceNumber = parseFloat(cleanNumeric) || 200;
  const displayPrice = `$${formattedPriceNumber.toFixed(2)}`;

  // Detect card brand from number
  const cardBrand = useMemo(() => {
    const clean = cardNumber.replace(/\s+/g, "");
    if (clean.startsWith("4")) return "visa";
    if (/^(5[1-5]|2[2-7])/.test(clean)) return "mastercard";
    if (/^(34|37)/.test(clean)) return "amex";
    return "generic";
  }, [cardNumber]);

  // Format Card Number into 4-digit blocks
  const handleCardNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, "").slice(0, 16);
    const formatted = value.replace(/(\d{4})/g, "$1 ").trim();
    setCardNumber(formatted);
  };

  // Format Card Expiry MM / YY
  const handleExpiryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, "").slice(0, 4);
    if (value.length >= 3) {
      value = `${value.slice(0, 2)} / ${value.slice(2, 4)}`;
    }
    setCardExpiry(value);
  };

  // Format Card CVC
  const handleCvcChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const maxLen = cardBrand === "amex" ? 4 : 3;
    const value = e.target.value.replace(/\D/g, "").slice(0, maxLen);
    setCardCvc(value);
  };

  // Verify Stripe Session if customer just completed checkout
  useEffect(() => {
    if (status === "success" && sessionId) {
      const verify = async () => {
        setVerifying(true);
        try {
          const res = await fetch(
            `${apiBase}/api/payments/verify-session?session_id=${encodeURIComponent(sessionId)}`
          );
          if (!res.ok) {
            throw new Error("Could not verify payment session");
          }
          const data = (await res.json()) as VerifiedPaymentSession;
          setVerifiedSession(data);
          if (data.isPaid) {
            toast.success("Payment confirmed successfully! Thank you for your business.");
          }
        } catch (err: unknown) {
          console.error(err);
          toast.error("Failed to verify payment status with Stripe");
        } finally {
          setVerifying(false);
        }
      };

      void verify();
    }
  }, [status, sessionId, apiBase]);

  // Handle Express Wallet Checkout (Apple Pay / Google Pay)
  const handleWalletCheckout = (walletName: string) => {
    if (!customerEmail.trim()) {
      toast.info("Please enter your email address to receive your invoice receipt", {
        description: "Receipt & onboarding details will be sent immediately upon confirmation.",
      });
      return;
    }
    toast.loading(`Connecting to ${walletName} secure gateway...`);
    void handleProceedToCheckout(`express_${walletName.toLowerCase()}`);
  };

  // Unified Checkout Processing via Stripe
  const handleProceedToCheckout = async (methodType = "card") => {
    if (!customerEmail.trim()) {
      toast.error("Please enter your email address for the invoice receipt");
      return;
    }

    if (methodType === "card") {
      const cleanCard = cardNumber.replace(/\s+/g, "");
      if (cleanCard.length > 0 && cleanCard.length < 15) {
        toast.error("Please enter a valid 16-digit card number");
        return;
      }
    }

    setLoadingCheckout(true);
    try {
      const response = await fetch(`${apiBase}/api/payments/create-checkout-session`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          planName: plan,
          description: `Drawn Dimension Service Package - ${plan}`,
          price: rawPrice,
          currency: "usd",
          customerEmail: customerEmail.trim(),
          customerName: customerName.trim() || undefined,
          metadata: {
            projectNotes: projectNotes.trim(),
            paymentMethod: methodType,
            country,
          },
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.message || "Failed to initialize secure Stripe payment");
      }

      const data = await response.json();
      if (data?.url) {
        window.location.href = data.url;
      } else {
        throw new Error("No checkout URL returned from server");
      }
    } catch (error: unknown) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : "Payment gateway error. Please try again.");
      setLoadingCheckout(false);
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void handleProceedToCheckout("card");
  };

  const handlePrintReceipt = () => {
    window.print();
  };

  return (
    <PageTransition>
      <PremiumBackground>
        <Navigation />
        <main className="pt-6 md:pt-10">
          <PageHero
            title={status === "success" ? "Payment Confirmed" : "Secure Payment"}
            subtitle="Encrypted Financial Gateway"
            description="Complete your order securely with Visa, Mastercard, American Express, Apple Pay, or Google Pay."
          />

          <section className="section-padding pt-0 px-4 relative overflow-hidden pb-28">
            <div className="container-narrow max-w-6xl relative z-10">
              {/* ================= CASE 1: VERIFYING SUCCESSFUL PAYMENT ================= */}
              {verifying && (
                <div className="rounded-3xl border border-border/70 bg-card/85 p-16 text-center shadow-2xl backdrop-blur-2xl">
                  <Loader2 className="w-12 h-12 text-[#635BFF] animate-spin mx-auto mb-4" />
                  <h2 className="text-2xl font-bold text-foreground">Verifying Your Transaction...</h2>
                  <p className="text-muted-foreground mt-2 text-sm">
                    Connecting to Stripe to finalize your statement and receipt.
                  </p>
                </div>
              )}

              {/* ================= CASE 2: PAYMENT SUCCESSFUL & CONFIRMED ================= */}
              {!verifying && status === "success" && verifiedSession && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="rounded-3xl border border-emerald-500/30 bg-card/85 p-8 md:p-12 shadow-2xl backdrop-blur-2xl space-y-6"
                >
                  <div className="flex flex-col items-center text-center">
                    <div className="w-16 h-16 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-500 mb-4 shadow-sm">
                      <CheckCircle2 className="w-9 h-9 stroke-[2.5]" />
                    </div>
                    <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 text-xs font-bold px-3 py-1 mb-2">
                      Payment Verified & Confirmed
                    </Badge>
                    <h2 className="text-3xl font-extrabold text-foreground">Transaction Completed!</h2>
                    <p className="text-muted-foreground text-sm max-w-lg mt-1">
                      A payment receipt has been dispatched to{" "}
                      <strong className="text-foreground">{verifiedSession.customerEmail || "your email"}</strong>.
                    </p>
                  </div>

                  {/* Receipt Box */}
                  <div className="rounded-2xl border border-border/70 bg-background/60 p-6 space-y-4">
                    <div className="flex items-center justify-between border-b border-border/40 pb-3">
                      <div className="flex items-center gap-2">
                        <Receipt className="w-4 h-4 text-emerald-500" />
                        <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                          Official Stripe Receipt
                        </span>
                      </div>
                      <span className="font-mono text-xs text-muted-foreground">
                        Ref: {verifiedSession.id.slice(0, 20)}...
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-xs text-muted-foreground">Plan / Deliverable</p>
                        <p className="font-bold text-foreground text-base mt-0.5">{verifiedSession.planName}</p>
                      </div>

                      <div className="sm:text-right">
                        <p className="text-xs text-muted-foreground">Amount Paid</p>
                        <p className="font-extrabold text-emerald-600 dark:text-emerald-400 text-2xl mt-0.5">
                          ${verifiedSession.amountTotal.toFixed(2)} {verifiedSession.currency}
                        </p>
                      </div>

                      {verifiedSession.customerName && (
                        <div>
                          <p className="text-xs text-muted-foreground">Client Name</p>
                          <p className="font-semibold text-foreground">{verifiedSession.customerName}</p>
                        </div>
                      )}

                      <div className={verifiedSession.customerName ? "sm:text-right" : ""}>
                        <p className="text-xs text-muted-foreground">Timestamp</p>
                        <p className="font-semibold text-foreground">
                          {new Date(verifiedSession.created).toLocaleDateString("en-US", {
                            dateStyle: "medium",
                            timeStyle: "short",
                          })}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                    <Button onClick={handlePrintReceipt} variant="outline" className="gap-2 rounded-xl h-11 px-5 text-xs font-bold">
                      <Download className="w-4 h-4" /> Download / Print Invoice
                    </Button>
                    <Link to="/start-project">
                      <Button className="gap-2 rounded-xl bg-primary text-primary-foreground h-11 px-6 text-xs font-bold shadow-sm">
                        <Sparkles className="w-4 h-4" /> Submit Project Requirements
                      </Button>
                    </Link>
                  </div>
                </motion.div>
              )}

              {/* ================= CASE 3: PAYMENT CANCELLED ================= */}
              {!verifying && status === "cancelled" && (
                <motion.div
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-5 mb-8 flex items-start gap-3.5 backdrop-blur-md"
                >
                  <AlertCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                  <div className="space-y-0.5 text-sm">
                    <h3 className="font-bold text-foreground">Payment Incomplete</h3>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Your checkout session was cancelled before completion. No funds were debited. You can review your details and re-initiate payment below.
                    </p>
                  </div>
                </motion.div>
              )}

              {/* ================= CASE 4: UNIFIED EXECUTIVE CHECKOUT ================= */}
              {!verifying && status !== "success" && (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
                  {/* Left Column (7 Columns): Express Wallets & Card Billing Form */}
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="lg:col-span-7 flex flex-col justify-between rounded-3xl border border-border/80 bg-card/90 p-6 sm:p-8 shadow-2xl backdrop-blur-3xl space-y-6"
                  >
                    <div className="space-y-5">
                      {/* Header */}
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-border/50 pb-5">
                        <div>
                          <h2 className="text-xl font-bold tracking-tight text-foreground">Billing & Payment</h2>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            Instant, 256-bit encrypted checkout powered by Stripe
                          </p>
                        </div>

                        {/* Brand Logo Row */}
                        <div className="flex items-center gap-2 rounded-xl border border-border/60 bg-background/90 px-3 py-1.5 shadow-xs">
                          <VisaLogo />
                          <MastercardLogo />
                          <AmexLogo />
                        </div>
                      </div>

                      {/* 1. Express Checkout Wallets Strip */}
                      <div className="space-y-2.5">
                        <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                          Express 1-Click Checkout
                        </label>
                        <div className="grid grid-cols-2 gap-3">
                          {/* Apple Pay Button with authentic SVG icon */}
                          <button
                            type="button"
                            onClick={() => handleWalletCheckout("Apple Pay")}
                            className="h-11 rounded-xl bg-black hover:bg-neutral-900 text-white flex items-center justify-center gap-2 text-xs font-bold transition-all shadow-xs cursor-pointer active:scale-[0.98] border border-white/20"
                          >
                            <ApplePayLogo className="h-4 w-4 fill-white" />
                            <span>Pay</span>
                          </button>

                          {/* Google Pay Button with 4-color Google G */}
                          <button
                            type="button"
                            onClick={() => handleWalletCheckout("Google Pay")}
                            className="h-11 rounded-xl bg-background hover:bg-muted/80 text-foreground flex items-center justify-center gap-2 text-xs font-bold transition-all shadow-xs cursor-pointer active:scale-[0.98] border border-border/80"
                          >
                            <GoogleGLogo className="h-4 w-4" />
                            <span>Pay</span>
                          </button>
                        </div>
                      </div>

                      {/* Divider */}
                      <div className="relative flex items-center justify-center my-2">
                        <div className="h-px w-full bg-border/60" />
                        <span className="absolute bg-card px-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                          Or pay with card
                        </span>
                      </div>

                      {/* 2. Main Card & Billing Form */}
                      <form onSubmit={handleFormSubmit} className="space-y-4">
                        {/* Name & Email in 2 columns */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                          <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-foreground flex items-center gap-1.5 h-5">
                              <User className="w-3.5 h-3.5 text-muted-foreground" /> Cardholder Name
                            </label>
                            <Input
                              placeholder="e.g. John Doe"
                              value={customerName}
                              onChange={(e) => setCustomerName(e.target.value)}
                              className="h-11 rounded-xl border-border/80 bg-background/80 text-sm focus:border-[#635BFF]"
                            />
                          </div>

                          <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-foreground flex items-center gap-1.5 h-5">
                              <Mail className="w-3.5 h-3.5 text-muted-foreground" /> Email Address <span className="text-rose-500">*</span>
                            </label>
                            <Input
                              type="email"
                              required
                              placeholder="client@company.com"
                              value={customerEmail}
                              onChange={(e) => setCustomerEmail(e.target.value)}
                              className="h-11 rounded-xl border-border/80 bg-background/80 text-sm focus:border-[#635BFF]"
                            />
                          </div>
                        </div>

                        {/* Card Number Field with Dynamic Logo */}
                        <div className="space-y-1.5">
                          <label className="text-xs font-semibold text-foreground flex items-center justify-between h-5">
                            <span className="flex items-center gap-1.5">
                              <CreditCard className="w-3.5 h-3.5 text-muted-foreground" /> Card Number
                            </span>
                            <span className="text-[11px] text-muted-foreground font-normal">Protected by Stripe</span>
                          </label>
                          <div className="relative">
                            <Input
                              placeholder="4111  2222  3333  4444"
                              value={cardNumber}
                              onChange={handleCardNumberChange}
                              maxLength={19}
                              className="h-11 rounded-xl border-border/80 bg-background/90 pl-3.5 pr-14 font-mono text-sm tracking-wider focus:border-[#635BFF]"
                            />
                            <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
                              {cardBrand === "visa" && <VisaLogo />}
                              {cardBrand === "mastercard" && <MastercardLogo />}
                              {cardBrand === "amex" && <AmexLogo />}
                              {cardBrand === "generic" && <CreditCard className="h-4 w-4 text-muted-foreground/50" />}
                            </div>
                          </div>
                        </div>

                        {/* Expiry, CVC & Country in a perfectly aligned 3-column row */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                          {/* Expiration */}
                          <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-foreground flex items-center gap-1.5 h-5">
                              <Calendar className="w-3.5 h-3.5 text-muted-foreground" /> Expires (MM/YY)
                            </label>
                            <Input
                              placeholder="MM / YY"
                              value={cardExpiry}
                              onChange={handleExpiryChange}
                              maxLength={7}
                              className="h-11 rounded-xl border-border/80 bg-background/90 font-mono text-sm text-center focus:border-[#635BFF]"
                            />
                          </div>

                          {/* CVC / CVV */}
                          <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-foreground flex items-center gap-1.5 h-5">
                              <Lock className="w-3.5 h-3.5 text-muted-foreground" /> CVC / CVV
                            </label>
                            <Input
                              type="password"
                              placeholder="•••"
                              value={cardCvc}
                              onChange={handleCvcChange}
                              maxLength={4}
                              className="h-11 rounded-xl border-border/80 bg-background/90 font-mono text-sm text-center focus:border-[#635BFF]"
                            />
                          </div>

                          {/* Billing Region */}
                          <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-foreground flex items-center h-5">
                              Billing Country
                            </label>
                            <div className="relative">
                              <select
                                value={country}
                                onChange={(e) => setCountry(e.target.value)}
                                className="h-11 w-full rounded-xl border border-border/80 bg-background/90 px-3 pr-8 text-xs font-medium text-foreground focus:border-[#635BFF] focus:outline-none appearance-none cursor-pointer"
                              >
                                <option value="United States">United States</option>
                                <option value="United Kingdom">United Kingdom</option>
                                <option value="Canada">Canada</option>
                                <option value="Australia">Australia</option>
                                <option value="Germany">Germany</option>
                                <option value="Bangladesh">Bangladesh</option>
                                <option value="UAE">United Arab Emirates</option>
                                <option value="Other">International / Other</option>
                              </select>
                              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                            </div>
                          </div>
                        </div>

                        {/* Optional Notes */}
                        <div className="space-y-1.5 pt-1">
                          <label className="text-xs font-semibold text-foreground flex items-center gap-1.5 h-5">
                            <FileText className="w-3.5 h-3.5 text-muted-foreground" /> Project Scope / Instructions (Optional)
                          </label>
                          <Input
                            placeholder="Special requirements, deadline preferences, or guidelines..."
                            value={projectNotes}
                            onChange={(e) => setProjectNotes(e.target.value)}
                            className="h-11 rounded-xl border-border/80 bg-background/80 text-sm focus:border-[#635BFF]"
                          />
                        </div>

                        {/* Action Stripe Pay Button */}
                        <button
                          type="submit"
                          disabled={loadingCheckout}
                          className="w-full h-12 rounded-xl bg-gradient-to-r from-[#635BFF] via-[#5851E0] to-[#4F46E5] hover:from-[#5851E0] hover:to-[#4338CA] text-white font-bold text-sm shadow-[0_8px_25px_-5px_rgba(99,91,255,0.4)] flex items-center justify-center gap-2 mt-4 transition-all duration-200 cursor-pointer active:scale-[0.99] disabled:opacity-70"
                        >
                          {loadingCheckout ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin text-white" />
                              <span>Connecting to Stripe...</span>
                            </>
                          ) : (
                            <>
                              <Lock className="w-4 h-4 text-white/90" />
                              <span>Pay {displayPrice} USD with Stripe</span>
                              <ArrowRight className="w-4 h-4 ml-1" />
                            </>
                          )}
                        </button>
                      </form>
                    </div>

                    {/* Bottom Security Footer */}
                    <div className="pt-4 border-t border-border/40 flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1.5">
                        <ShieldCheck className="w-4 h-4 text-emerald-500" />
                        <span>256-Bit TLS Encryption</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                        <span>Instant Project Activation</span>
                      </div>
                    </div>
                  </motion.div>

                  {/* Right Column (5 Columns): Matching Order Summary & Deliverables */}
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="lg:col-span-5 flex flex-col justify-between rounded-3xl border border-border/80 bg-card/90 p-6 sm:p-8 shadow-2xl backdrop-blur-3xl space-y-6"
                  >
                    <div className="space-y-5">
                      {/* Summary Header */}
                      <div className="flex items-center justify-between border-b border-border/50 pb-5">
                        <div>
                          <h3 className="text-xl font-bold tracking-tight text-foreground">Order Summary</h3>
                          <p className="text-xs text-muted-foreground mt-0.5">Package breakdown and deliverables</p>
                        </div>
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" /> Active Plan
                        </span>
                      </div>

                      {/* Plan Box */}
                      <div className="space-y-4">
                        <div className="flex justify-between items-start gap-2">
                          <div>
                            <p className="font-bold text-foreground text-lg leading-tight">{plan}</p>
                            <p className="text-xs text-muted-foreground mt-1">Professional Engineering & Architecture Deliverable</p>
                          </div>
                          <span className="font-black text-foreground text-xl whitespace-nowrap">{displayPrice}</span>
                        </div>

                        {/* Deliverables Checklist with Crisp Green Checkmarks */}
                        <div className="rounded-2xl border border-border/60 bg-background/50 p-4 space-y-3 text-xs">
                          <div className="flex items-center gap-2.5">
                            <div className="flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                              <Check className="h-3 w-3 stroke-[3]" />
                            </div>
                            <span className="font-medium text-foreground">Dedicated Engineering & Design Team</span>
                          </div>
                          <div className="flex items-center gap-2.5">
                            <div className="flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                              <Check className="h-3 w-3 stroke-[3]" />
                            </div>
                            <span className="font-medium text-foreground">100% Intellectual Property Transfer</span>
                          </div>
                          <div className="flex items-center gap-2.5">
                            <div className="flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                              <Check className="h-3 w-3 stroke-[3]" />
                            </div>
                            <span className="font-medium text-foreground">Guaranteed Delivery Timeline</span>
                          </div>
                          <div className="flex items-center gap-2.5">
                            <div className="flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                              <Check className="h-3 w-3 stroke-[3]" />
                            </div>
                            <span className="font-medium text-foreground">Post-Deployment Revisions & Support</span>
                          </div>
                        </div>

                        {/* Pricing Ledger */}
                        <div className="border-t border-border/50 pt-3.5 space-y-2 text-xs">
                          <div className="flex justify-between text-muted-foreground">
                            <span>Subtotal</span>
                            <span className="font-semibold text-foreground">{displayPrice}</span>
                          </div>
                          <div className="flex justify-between text-muted-foreground">
                            <span>Platform Processing Fee</span>
                            <span className="text-emerald-600 dark:text-emerald-400 font-bold">$0.00 (Waived)</span>
                          </div>
                          <div className="flex justify-between text-base font-extrabold text-foreground pt-3 border-t border-border/40 items-baseline">
                            <span className="text-sm font-bold text-foreground">Total Due</span>
                            <span className="text-2xl font-black text-foreground">
                              {displayPrice} <span className="text-xs font-normal text-muted-foreground">USD</span>
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Support Notice */}
                    <div className="rounded-2xl border border-border/60 bg-muted/30 p-4 text-xs text-muted-foreground space-y-1">
                      <p className="font-semibold text-foreground flex items-center gap-1.5">
                        <HelpCircle className="h-3.5 w-3.5 text-primary" /> Need an invoice or wire transfer?
                      </p>
                      <p className="text-[11px] leading-relaxed">
                        For direct bank transfer or custom company billing, contact{" "}
                        <a href="mailto:drawndimensioninfo@gmail.com" className="text-primary font-semibold hover:underline">
                          drawndimensioninfo@gmail.com
                        </a>.
                      </p>
                    </div>
                  </motion.div>
                </div>
              )}
            </div>
          </section>
        </main>
        <Footer />
      </PremiumBackground>
    </PageTransition>
  );
}
