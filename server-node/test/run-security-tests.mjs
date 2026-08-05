import { spawnSync } from "node:child_process";

if (process.env.NODE_ENV === "production") {
  console.error("Refusing to run security tests with NODE_ENV=production.");
  process.exit(1);
}

const result = spawnSync(
  process.execPath,
  ["--import", "tsx", "--test", "test/security.test.ts"],
  {
    stdio: "inherit",
    env: { ...process.env, NODE_ENV: "test", RUN_SECURITY_TESTS: "1" }
  }
);

process.exit(result.status ?? 1);
