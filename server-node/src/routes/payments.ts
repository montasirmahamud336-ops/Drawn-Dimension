import { Router, Request, Response } from "express";
import Stripe from "stripe";
import { env } from "../config/env.js";
import { isDatabaseConfigured, query } from "../db.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

interface PaymentSettingsRow {
  id: number;
  stripe_publishable_key: string;
  stripe_secret_key: string;
  stripe_webhook_secret: string;
  is_active: boolean;
  mode: string;
  currency: string;
  created_at: string;
  updated_at: string;
}

let localMemorySettings: PaymentSettingsRow = {
  id: 1,
  stripe_publishable_key: "",
  stripe_secret_key: "",
  stripe_webhook_secret: "",
  is_active: true,
  mode: "test",
  currency: "usd",
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

let ensuredTable = false;
const ensurePaymentSettingsTable = async () => {
  if (ensuredTable || !isDatabaseConfigured()) return;
  try {
    await query(`
      CREATE TABLE IF NOT EXISTS public.payment_settings (
        id SMALLINT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
        stripe_publishable_key TEXT NOT NULL DEFAULT '',
        stripe_secret_key TEXT NOT NULL DEFAULT '',
        stripe_webhook_secret TEXT NOT NULL DEFAULT '',
        is_active BOOLEAN NOT NULL DEFAULT true,
        mode VARCHAR(10) NOT NULL DEFAULT 'test',
        currency VARCHAR(10) NOT NULL DEFAULT 'usd',
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
      INSERT INTO public.payment_settings (id, stripe_publishable_key, stripe_secret_key, stripe_webhook_secret, is_active, mode, currency)
      VALUES (1, '', '', '', true, 'test', 'usd')
      ON CONFLICT (id) DO NOTHING;
    `);
    ensuredTable = true;
  } catch (err) {
    console.debug("PostgreSQL payment_settings table check:", (err as any)?.message || err);
  }
};

export const getActivePaymentSettings = async () => {
  await ensurePaymentSettingsTable();

  let dbRow: PaymentSettingsRow | null = null;
  if (isDatabaseConfigured()) {
    try {
      const res = await query<PaymentSettingsRow>(
        `SELECT id, stripe_publishable_key, stripe_secret_key, stripe_webhook_secret, is_active, mode, currency, updated_at
         FROM public.payment_settings WHERE id = 1 LIMIT 1`
      );
      dbRow = res.rows[0] || null;
    } catch (err) {
      console.debug("Postgres payment_settings query fallback to local memory:", (err as any)?.message || err);
    }
  }

  const effectiveRow = dbRow || localMemorySettings;
  const publishableKey = effectiveRow.stripe_publishable_key?.trim() || env.stripePublishableKey || "";
  const secretKey = effectiveRow.stripe_secret_key?.trim() || env.stripeSecretKey || "";
  const webhookSecret = effectiveRow.stripe_webhook_secret?.trim() || "";
  const isActive = effectiveRow.is_active !== undefined ? effectiveRow.is_active : true;
  const mode = effectiveRow.mode || (secretKey.startsWith("sk_live_") ? "live" : "test");
  const currency = effectiveRow.currency?.toLowerCase() || "usd";

  return {
    publishableKey,
    secretKey,
    webhookSecret,
    isActive,
    mode,
    currency,
    isUsingEnvFallback: !effectiveRow.stripe_secret_key?.trim() && Boolean(env.stripeSecretKey),
    updatedAt: effectiveRow.updated_at || null,
  };
};

const getStripeInstance = async () => {
  const settings = await getActivePaymentSettings();
  if (!settings.isActive) {
    throw new Error("Payment gateway is temporarily in maintenance mode");
  }
  if (!settings.secretKey) {
    throw new Error("Stripe secret key is not configured on the server. Please set it in CMS > Payment Integration.");
  }
  return new Stripe(settings.secretKey, {
    apiVersion: "2025-02-24.acacia" as unknown as Stripe.LatestApiVersion,
  });
};

// Helper: Parse price string (e.g. "$499/mo", "$1,200", "500", "BDT 15,000") to integer cents
const parseAmountToCents = (priceInput: string | number, _currency = "usd"): number => {
  if (typeof priceInput === "number") {
    return Math.round(priceInput * 100);
  }

  const clean = String(priceInput || "")
    .replace(/[^0-9.]/g, "")
    .trim();
  const numeric = parseFloat(clean);
  if (!Number.isFinite(numeric) || numeric <= 0) {
    return 1000; // default fallback $10.00
  }

  return Math.round(numeric * 100);
};

// 1. GET /api/payments/config - Public publishable key for client
router.get("/api/payments/config", async (_req: Request, res: Response) => {
  try {
    const settings = await getActivePaymentSettings();
    return res.json({
      publishableKey: settings.publishableKey,
      isConfigured: Boolean(settings.secretKey && settings.publishableKey),
      isActive: settings.isActive,
      mode: settings.mode,
      currency: settings.currency,
    });
  } catch {
    return res.json({
      publishableKey: env.stripePublishableKey || "",
      isConfigured: Boolean(env.stripeSecretKey && env.stripePublishableKey),
      isActive: true,
      mode: "test",
      currency: "usd",
    });
  }
});

// 2. GET /api/payment-settings - Admin API to retrieve gateway configuration
router.get("/api/payment-settings", requireAuth, async (_req: Request, res: Response) => {
  try {
    const settings = await getActivePaymentSettings();
    return res.json({
      publishableKey: settings.publishableKey,
      secretKey: settings.secretKey,
      webhookSecret: settings.webhookSecret,
      isActive: settings.isActive,
      mode: settings.mode,
      currency: settings.currency,
      isUsingEnvFallback: settings.isUsingEnvFallback,
      updatedAt: settings.updatedAt,
    });
  } catch (error: any) {
    return res.status(500).json({ message: error?.message || "Failed to fetch payment settings" });
  }
});

// 3. PATCH /api/payment-settings - Admin API to update gateway configuration
router.patch("/api/payment-settings", requireAuth, async (req: Request, res: Response) => {
  try {
    await ensurePaymentSettingsTable();
    if (!isDatabaseConfigured()) {
      return res.status(503).json({ message: "DATABASE_URL is not configured on the server" });
    }

    const {
      publishableKey = "",
      secretKey = "",
      webhookSecret = "",
      isActive = true,
      mode = "test",
      currency = "usd",
    } = req.body ?? {};

    const cleanPk = String(publishableKey).trim();
    const cleanSk = String(secretKey).trim();
    const cleanWh = String(webhookSecret).trim();
    const cleanMode = String(mode).toLowerCase() === "live" ? "live" : "test";
    const cleanCurrency = String(currency).toLowerCase().trim() || "usd";
    const cleanIsActive = Boolean(isActive);

    // Validation: if secret key is provided, check prefix
    if (cleanSk && !cleanSk.startsWith("sk_test_") && !cleanSk.startsWith("sk_live_")) {
      return res.status(400).json({
        message: "Stripe Secret Key must start with 'sk_test_' or 'sk_live_'",
      });
    }

    if (cleanPk && !cleanPk.startsWith("pk_test_") && !cleanPk.startsWith("pk_live_")) {
      return res.status(400).json({
        message: "Stripe Publishable Key must start with 'pk_test_' or 'pk_live_'",
      });
    }

    const timestamp = new Date().toISOString();

    // Update in-memory state
    localMemorySettings = {
      id: 1,
      stripe_publishable_key: cleanPk,
      stripe_secret_key: cleanSk,
      stripe_webhook_secret: cleanWh,
      is_active: cleanIsActive,
      mode: cleanMode,
      currency: cleanCurrency,
      created_at: localMemorySettings.created_at || timestamp,
      updated_at: timestamp,
    };

    if (isDatabaseConfigured()) {
      try {
        await query(
          `INSERT INTO public.payment_settings (id, stripe_publishable_key, stripe_secret_key, stripe_webhook_secret, is_active, mode, currency, updated_at)
           VALUES (1, $1, $2, $3, $4, $5, $6, $7)
           ON CONFLICT (id) DO UPDATE
           SET stripe_publishable_key = EXCLUDED.stripe_publishable_key,
               stripe_secret_key = EXCLUDED.stripe_secret_key,
               stripe_webhook_secret = EXCLUDED.stripe_webhook_secret,
               is_active = EXCLUDED.is_active,
               mode = EXCLUDED.mode,
               currency = EXCLUDED.currency,
               updated_at = EXCLUDED.updated_at`,
          [cleanPk, cleanSk, cleanWh, cleanIsActive, cleanMode, cleanCurrency, timestamp]
        );
      } catch (dbErr) {
        console.debug("PostgreSQL update payment_settings skipped or failed, fallback active:", (dbErr as any)?.message || dbErr);
      }
    }

    return res.json({
      message: "Payment gateway credentials successfully saved and activated",
      publishableKey: cleanPk,
      isActive: cleanIsActive,
      mode: cleanMode,
      currency: cleanCurrency,
      updatedAt: timestamp,
    });
  } catch (error: any) {
    return res.status(400).json({ message: error?.message || "Failed to update payment settings" });
  }
});

// 4. POST /api/payment-settings/test-connection - Verify Stripe API credentials live
router.post("/api/payment-settings/test-connection", requireAuth, async (req: Request, res: Response) => {
  try {
    const { secretKey } = req.body ?? {};
    let testSecret = String(secretKey || "").trim();

    if (!testSecret) {
      const active = await getActivePaymentSettings();
      testSecret = active.secretKey;
    }

    if (!testSecret) {
      return res.status(400).json({ message: "No Stripe secret key provided or configured to test" });
    }

    const startTime = Date.now();
    const testStripe = new Stripe(testSecret, {
      apiVersion: "2025-02-24.acacia" as unknown as Stripe.LatestApiVersion,
    });

    // Test API call to verify key authenticity and permissions
    const [balance, account] = await Promise.all([
      testStripe.balance.retrieve().catch(() => null),
      testStripe.accounts.retrieve().catch(() => null),
    ]);

    const latencyMs = Date.now() - startTime;
    const isLive = testSecret.startsWith("sk_live_");

    return res.json({
      success: true,
      latencyMs,
      isLive,
      accountId: account?.id || "N/A",
      businessName: account?.business_profile?.name || account?.settings?.dashboard?.display_name || "Stripe Account",
      defaultCurrency: account?.default_currency?.toUpperCase() || "USD",
      chargesEnabled: account?.charges_enabled ?? true,
      payoutsEnabled: account?.payouts_enabled ?? true,
      availableBalances: balance?.available?.map((b) => `${(b.amount / 100).toFixed(2)} ${b.currency.toUpperCase()}`) || [],
    });
  } catch (error: any) {
    console.error("Stripe test-connection error:", error);
    return res.status(400).json({
      success: false,
      message: error?.message || "Could not connect to Stripe with the provided credentials",
    });
  }
});

// 5. POST /api/payments/create-payment-intent (For Inline Card & Digital Wallet Checkout)
router.post("/api/payments/create-payment-intent", async (req: Request, res: Response) => {
  try {
    const stripe = await getStripeInstance();
    const {
      planName = "Service Package",
      price = 100,
      currency = "usd",
      customerEmail,
      customerName,
      metadata = {},
    } = req.body ?? {};

    const amountInCents = parseAmountToCents(price, currency);
    const normalizedCurrency = String(currency).toLowerCase() || "usd";

    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountInCents,
      currency: normalizedCurrency,
      automatic_payment_methods: {
        enabled: true,
      },
      receipt_email: customerEmail ? String(customerEmail).trim() : undefined,
      description: `Drawn Dimension - ${planName}`,
      metadata: {
        ...metadata,
        customerName: customerName || "",
        customerEmail: customerEmail || "",
        planName,
      },
    });

    return res.json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      amount: paymentIntent.amount / 100,
      currency: paymentIntent.currency.toUpperCase(),
    });
  } catch (error: unknown) {
    console.error("Stripe create-payment-intent error:", error);
    return res.status(500).json({
      message: error instanceof Error ? error.message : "Failed to create payment intent",
    });
  }
});

// 6. POST /api/payments/create-checkout-session (For Stripe Hosted Redirect)
router.post("/api/payments/create-checkout-session", async (req: Request, res: Response) => {
  try {
    const stripe = await getStripeInstance();
    const {
      planName = "Service Plan",
      description = "Drawn Dimension Engineering & Digital Innovation Services",
      price = 100,
      currency = "usd",
      customerEmail,
      customerName,
      successUrl,
      cancelUrl,
      metadata = {},
    } = req.body ?? {};

    const amountInCents = parseAmountToCents(price, currency);
    const normalizedCurrency = String(currency).toLowerCase() || "usd";

    const origin = req.headers.origin || env.siteBaseUrl || "http://localhost:8080";
    const defaultSuccessUrl = `${origin}/payment?status=success&session_id={CHECKOUT_SESSION_ID}&plan=${encodeURIComponent(
      planName
    )}`;
    const defaultCancelUrl = `${origin}/payment?status=cancelled&plan=${encodeURIComponent(planName)}`;

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: normalizedCurrency,
            product_data: {
              name: planName,
              description: description,
              images: env.brandLogoUrl ? [env.brandLogoUrl] : [],
            },
            unit_amount: amountInCents,
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      customer_email: customerEmail ? String(customerEmail).trim() : undefined,
      success_url: successUrl || defaultSuccessUrl,
      cancel_url: cancelUrl || defaultCancelUrl,
      metadata: {
        ...metadata,
        customerName: customerName || "",
        planName,
      },
    });

    return res.json({
      sessionId: session.id,
      url: session.url,
    });
  } catch (error: unknown) {
    console.error("Stripe create-checkout-session error:", error);
    return res.status(500).json({
      message: error instanceof Error ? error.message : "Failed to create Stripe checkout session",
    });
  }
});

// 7. GET /api/payments/verify-session
router.get("/api/payments/verify-session", async (req: Request, res: Response) => {
  try {
    const sessionId = String(req.query.session_id || "").trim();
    if (!sessionId) {
      return res.status(400).json({ message: "session_id query parameter is required" });
    }

    const stripe = await getStripeInstance();
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ["payment_intent", "line_items"],
    });

    const isPaid = session.payment_status === "paid";
    const amountTotal = (session.amount_total ?? 0) / 100;

    return res.json({
      id: session.id,
      paymentStatus: session.payment_status,
      isPaid,
      amountTotal,
      currency: (session.currency ?? "usd").toUpperCase(),
      customerEmail: session.customer_details?.email ?? session.customer_email ?? "",
      customerName: session.customer_details?.name ?? session.metadata?.customerName ?? "",
      planName: session.metadata?.planName ?? "Service Plan",
      created: session.created ? new Date(session.created * 1000).toISOString() : new Date().toISOString(),
    });
  } catch (error: unknown) {
    console.error("Stripe verify-session error:", error);
    return res.status(500).json({
      message: error instanceof Error ? error.message : "Failed to verify session",
    });
  }
});

// 8. GET /api/payments/verify-payment-intent
router.get("/api/payments/verify-payment-intent", async (req: Request, res: Response) => {
  try {
    const intentId = String(req.query.intent_id || "").trim();
    if (!intentId) {
      return res.status(400).json({ message: "intent_id query parameter is required" });
    }

    const stripe = await getStripeInstance();
    const intent = await stripe.paymentIntents.retrieve(intentId);

    const isPaid = intent.status === "succeeded";
    const amountTotal = (intent.amount ?? 0) / 100;

    return res.json({
      id: intent.id,
      paymentStatus: intent.status,
      isPaid,
      amountTotal,
      currency: (intent.currency ?? "usd").toUpperCase(),
      customerEmail: intent.receipt_email ?? intent.metadata?.customerEmail ?? "",
      customerName: intent.metadata?.customerName ?? "",
      planName: intent.metadata?.planName ?? "Service Plan",
      created: intent.created ? new Date(intent.created * 1000).toISOString() : new Date().toISOString(),
    });
  } catch (error: unknown) {
    console.error("Stripe verify-payment-intent error:", error);
    return res.status(500).json({
      message: error instanceof Error ? error.message : "Failed to verify payment intent",
    });
  }
});

export default router;
