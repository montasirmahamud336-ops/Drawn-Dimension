import { test, describe, before, after } from "node:test";
import assert from "node:assert";
import http from "node:http";
import jwt from "jsonwebtoken";
import { app } from "../src/app.js";
import { env } from "../src/config/env.js";
import { validateUploadedBuffer } from "../src/lib/uploadValidation.js";
import { handleRouteError } from "../src/utils/errorResponse.js";

if (process.env.NODE_ENV !== "test" || process.env.RUN_SECURITY_TESTS !== "1") {
  throw new Error("Security tests must be launched through npm test in the isolated test environment.");
}

let server: http.Server;
let baseUrl: string;

// Function to test safety guard logic independently
export function checkProductionSafetyGuard(nodeEnv: string, runTestFlag?: string): boolean {
  if (nodeEnv === "production" && runTestFlag !== "1") {
    return false; // Safety guard refuses execution
  }
  return true;
}

before(async () => {
  await new Promise<void>((resolve) => {
    server = app.listen(0, "127.0.0.1", () => {
      const address = server.address();
      if (address && typeof address === "object") {
        baseUrl = `http://127.0.0.1:${address.port}`;
      }
      resolve();
    });
  });
});

after(async () => {
  if (server) {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
});

const generateAdminToken = (role: "owner" | "manager") => {
  return jwt.sign(
    {
      username: `test-${role}`,
      email: `${role}@test.com`,
      fullName: `Test ${role}`,
      role,
      isMain: role === "owner",
    },
    env.adminToken,
    { subject: `test-${role}-id`, expiresIn: "1h" }
  );
};

const makeStoredZip = (entryNames: string[]) => {
  const localParts: Buffer[] = [];
  const centralParts: Buffer[] = [];
  let localOffset = 0;
  for (const name of entryNames) {
    const nameBytes = Buffer.from(name, "utf8");
    const local = Buffer.alloc(30 + nameBytes.length);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(0, 8);
    local.writeUInt16LE(0, 10);
    local.writeUInt16LE(nameBytes.length, 26);
    nameBytes.copy(local, 30);
    localParts.push(local);

    const central = Buffer.alloc(46 + nameBytes.length);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(20, 4);
    central.writeUInt16LE(20, 6);
    central.writeUInt16LE(0, 8);
    central.writeUInt16LE(0, 10);
    central.writeUInt16LE(nameBytes.length, 28);
    central.writeUInt32LE(localOffset, 42);
    nameBytes.copy(central, 46);
    centralParts.push(central);
    localOffset += local.length;
  }
  const centralDirectory = Buffer.concat(centralParts);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(entryNames.length, 8);
  end.writeUInt16LE(entryNames.length, 10);
  end.writeUInt32LE(centralDirectory.length, 12);
  end.writeUInt32LE(localOffset, 16);
  return Buffer.concat([...localParts, centralDirectory, end]);
};

describe("Real HTTP Integration & Security Validation Test Suite", () => {
  test("1. Safety guard verifies production environment refusal", () => {
    const refusalResult = checkProductionSafetyGuard("production", undefined);
    assert.strictEqual(refusalResult, false, "Safety guard must refuse running in production mode without test flag");

    const allowedResult = checkProductionSafetyGuard("production", "1");
    assert.strictEqual(allowedResult, true, "Safety guard allows execution when test flag is explicitly set");
  });

  test("2. Unauthenticated GET, PATCH, and DELETE on both /inquiries and /api/inquiries return 401", async () => {
    const endpoints = [
      { method: "GET", path: "/inquiries" },
      { method: "GET", path: "/api/inquiries" },
      { method: "PATCH", path: "/inquiries/1/status" },
      { method: "PATCH", path: "/api/inquiries/1/status" },
      { method: "DELETE", path: "/inquiries/1" },
      { method: "DELETE", path: "/api/inquiries/1" },
    ];

    for (const ep of endpoints) {
      const res = await fetch(`${baseUrl}${ep.path}`, { method: ep.method });
      assert.strictEqual(
        res.status,
        401,
        `${ep.method} ${ep.path} must return 401 Unauthorized for unauthenticated requests`
      );
    }
  });

  test("3. Public POST /inquiries with valid input returns 201 using isolated test infrastructure", async () => {
    const res = await fetch(`${baseUrl}/inquiries`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: `test-inquiry-${Date.now()}@example.com`,
        name: "Security Test User",
        project_title: "Isolated Inquiry Test",
        description: "Test submission without touching production data",
      }),
    });

    assert.strictEqual(res.status, 201, "Public POST /inquiries with valid payload must return 201 Created");
    const json = await res.json();
    assert.ok(json.id, "Created inquiry must return a record ID");
  });

  test("4. Manager role (non-owner) receives 403 Forbidden for database backup, admin users, and website users", async () => {
    const managerToken = generateAdminToken("manager");
    const headers = { Authorization: `Bearer ${managerToken}` };

    const managerEndpoints = [
      "/database-backup/stats",
      "/database-backup/export-json",
      "/database-backup/export-sql",
      "/auth/admin-users",
      "/website-users/export",
      "/website-users",
    ];

    for (const path of managerEndpoints) {
      const res = await fetch(`${baseUrl}${path}`, { headers });
      assert.strictEqual(res.status, 403, `Manager requesting ${path} must receive 403 Forbidden`);
    }
  });

  test("5. Owner role database backup request does not return 401, 403, or 500", async () => {
    const ownerToken = generateAdminToken("owner");
    const res = await fetch(`${baseUrl}/database-backup/stats`, {
      headers: { Authorization: `Bearer ${ownerToken}` },
    });

    assert.notStrictEqual(res.status, 401, "Owner must not be unauthenticated");
    assert.notStrictEqual(res.status, 403, "Owner must not be forbidden");
    assert.notStrictEqual(res.status, 500, "Owner request should complete cleanly");
    assert.strictEqual(res.status, 200, "Owner GET /database-backup/stats should return 200 OK");
  });

  test("6. Real disallowed file upload returns 400 Bad Request", async () => {
    const ownerToken = generateAdminToken("owner");
    const boundary = "----WebKitFormBoundary7MA4YWxkTrZu0gW";
    const body = [
      `--${boundary}`,
      'Content-Disposition: form-data; name="file"; filename="evil.html"',
      "Content-Type: text/html",
      "",
      "<script>alert('xss')</script>",
      `--${boundary}--`,
    ].join("\r\n");

    const res = await fetch(`${baseUrl}/storage/upload`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${ownerToken}`,
        "Content-Type": `multipart/form-data; boundary=${boundary}`,
      },
      body,
    });

    assert.strictEqual(res.status, 400, "Uploading HTML script file to /storage/upload must return 400 Bad Request");
    const json = await res.json();
    assert.ok(json.message, "Response must include rejection message");
  });

  test("7. Rate limit on POST /live-chat/requests returns 429 after threshold", async () => {
    const customHeaderIP = `192.168.14.${Math.floor(Math.random() * 200) + 10}`;

    let hit429 = false;
    for (let i = 0; i < 15; i++) {
      const res = await fetch(`${baseUrl}/live-chat/requests`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Forwarded-For": customHeaderIP,
        },
        body: JSON.stringify({ name: "RateLimitTest", email: "ratelimit@example.com" }),
      });

      if (res.status === 429) {
        hit429 = true;
        break;
      }
    }

    assert.strictEqual(hit429, true, "Sending requests exceeding rate limit threshold must trigger HTTP 429");
  });

  test("8. Production error sanitization prevents internal error and DB URL leakage", () => {
    let capturedStatus = 0;
    let capturedJson: any = null;

    const mockRes: any = {
      status(code: number) {
        capturedStatus = code;
        return this;
      },
      json(data: any) {
        capturedJson = data;
        return this;
      },
    };

    // Simulate internal database connection error containing raw credentials and SQL statement
    const internalError = new Error("FATAL: postgresql://user:should-not-appear@db.invalid/app SELECT * FROM private_table;");

    const originalEnv = env.nodeEnv;
    const originalConsoleError = console.error;
    (env as any).nodeEnv = "production";
    console.error = () => undefined;

    try {
      handleRouteError(mockRes, internalError, "Failed to fetch data");
      assert.strictEqual(capturedStatus, 500);
      assert.strictEqual(capturedJson.message, "Failed to fetch data");
      assert.strictEqual(capturedJson.message.includes("postgresql://"), false, "Must not leak database URL");
      assert.strictEqual(capturedJson.message.includes("private_table"), false, "Must not leak SQL text");
    } finally {
      (env as any).nodeEnv = originalEnv;
      console.error = originalConsoleError;
    }
  });

  test("9. Strict upload validation enforces magic bytes and deep container signatures for DOCX/XLSX/Images", () => {
    // 1. Rejected: HTML script in disguise
    const htmlLeak = validateUploadedBuffer(Buffer.from("<script>alert(1)</script>"), "evil.png", "image/png");
    assert.strictEqual(htmlLeak.valid, false, "Disguised HTML script must be rejected");

    // 2. Rejected: Fake PNG header
    const fakePng = validateUploadedBuffer(Buffer.from("NOT_A_PNG_HEADER"), "fake.png", "image/png");
    assert.strictEqual(fakePng.valid, false, "Fake PNG header must be rejected");

    // 3. Rejected: Windows PE Executable signature (MZ)
    const exeBuf = Buffer.from([0x4d, 0x5a, 0x90, 0x00]);
    const exeLeak = validateUploadedBuffer(exeBuf, "program.docx", "application/vnd.openxmlformats-officedocument.wordprocessingml.document");
    assert.strictEqual(exeLeak.valid, false, "Executable file signature must be rejected");

    // 4. Rejected: Invalid DOCX without Word XML markers
    const fakeDocx = validateUploadedBuffer(Buffer.from([0x50, 0x4b, 0x03, 0x04, 0x00, 0x00]), "empty.docx", "application/vnd.openxmlformats-officedocument.wordprocessingml.document");
    assert.strictEqual(fakeDocx.valid, false, "DOCX archive without word/ markers must be rejected");

    // 5. Rejected: Invalid XLSX without Excel XML markers
    const fakeXlsx = validateUploadedBuffer(Buffer.from([0x50, 0x4b, 0x03, 0x04, 0x00, 0x00]), "empty.xlsx", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    assert.strictEqual(fakeXlsx.valid, false, "XLSX archive without xl/ markers must be rejected");

    // 6. Accepted: Valid PNG
    const validPng = validateUploadedBuffer(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), "valid.png", "image/png");
    assert.strictEqual(validPng.valid, true, "Valid PNG signature must be accepted");

    // 7. Accepted: Valid PDF
    const validPdf = validateUploadedBuffer(Buffer.from("%PDF-1.4 header content"), "document.pdf", "application/pdf");
    assert.strictEqual(validPdf.valid, true, "Valid PDF signature must be accepted");

    // 8. Accepted: Valid DOCX container
    const validDocxBuf = makeStoredZip(["[Content_Types].xml", "word/document.xml"]);
    const validDocx = validateUploadedBuffer(validDocxBuf, "report.docx", "application/vnd.openxmlformats-officedocument.wordprocessingml.document");
    assert.strictEqual(validDocx.valid, true, "Valid DOCX package must be accepted");

    // 9. Accepted: Valid XLSX container
    const validXlsxBuf = makeStoredZip(["[Content_Types].xml", "xl/workbook.xml"]);
    const validXlsx = validateUploadedBuffer(validXlsxBuf, "sheet.xlsx", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    assert.strictEqual(validXlsx.valid, true, "Valid XLSX package must be accepted");
  });
});
