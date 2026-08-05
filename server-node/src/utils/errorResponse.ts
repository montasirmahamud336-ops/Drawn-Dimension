import { Response } from "express";
import { env } from "../config/env.js";

const redact = (value: string) =>
  value
    .replace(/(postgres(?:ql)?:\/\/[^:\s]+:)[^@\s]+@/gi, "$1***@")
    .replace(/(password|token|secret|api[_-]?key)\s*[=:]\s*[^\s,;]+/gi, "$1=***");

export function handleRouteError(
  res: Response,
  error: unknown,
  fallbackMessage: string,
  statusCode = 500
) {
  // Test output must never echo synthetic or real connection strings. Production
  // retains a redacted diagnostic; the client always receives a safe message.
  if (env.nodeEnv !== "test") {
    const detail = error instanceof Error ? redact(error.message) : "Unknown error";
    console.error(`[Route Error] ${fallbackMessage}: ${detail}`);
  }

  const isProd = env.nodeEnv === "production";
  const message = isProd
    ? fallbackMessage
    : error instanceof Error
      ? error.message
      : fallbackMessage;

  return res.status(statusCode).json({ message });
}
