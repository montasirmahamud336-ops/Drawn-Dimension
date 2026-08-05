import { env } from "../config/env.js";

/**
 * Test-only behavior is deliberately opt-in. This must never be enabled by a
 * normal development or production process.
 */
export const isSecurityTestMode = () =>
  env.nodeEnv === "test" && process.env.RUN_SECURITY_TESTS === "1";
