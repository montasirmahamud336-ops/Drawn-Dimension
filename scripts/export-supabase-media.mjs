import fs from "node:fs/promises";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

const ROOT_DIR = process.cwd();
const OUTPUT_DIR = path.join(ROOT_DIR, "backup", "supabase-media");

function parseEnvText(text) {
  const env = {};

  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;

    const eqIndex = line.indexOf("=");
    if (eqIndex === -1) continue;

    const key = line.slice(0, eqIndex).trim();
    let value = line.slice(eqIndex + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    env[key] = value;
  }

  return env;
}

async function loadEnvFile(filePath) {
  try {
    const content = await fs.readFile(filePath, "utf8");
    return parseEnvText(content);
  } catch {
    return {};
  }
}

function pickFirst(...values) {
  return values.find((value) => typeof value === "string" && value.trim().length > 0)?.trim();
}

function sanitizeSegment(segment) {
  return segment.replace(/[<>:"/\\|?*\u0000-\u001F]/g, "-");
}

async function ensureDir(dirPath) {
  await fs.mkdir(dirPath, { recursive: true });
}

async function writeFileSafe(filePath, buffer) {
  await ensureDir(path.dirname(filePath));
  await fs.writeFile(filePath, buffer);
}

async function listAllFiles(bucket, prefix, client, files = []) {
  let offset = 0;

  while (true) {
    const { data, error } = await client.storage.from(bucket).list(prefix, {
      limit: 100,
      offset,
      sortBy: { column: "name", order: "asc" },
    });

    if (error) {
      throw new Error(`Failed to list "${prefix || "/"}": ${error.message}`);
    }

    if (!data || data.length === 0) {
      break;
    }

    for (const item of data) {
      const itemName = String(item.name || "").trim();
      if (!itemName) continue;

      const nextPath = prefix ? `${prefix}/${itemName}` : itemName;
      const isFolder = item.id == null;

      if (isFolder) {
        await listAllFiles(bucket, nextPath, client, files);
      } else {
        files.push({
          path: nextPath,
          name: itemName,
          metadata: item.metadata ?? null,
          updated_at: item.updated_at ?? null,
          created_at: item.created_at ?? null,
        });
      }
    }

    if (data.length < 100) {
      break;
    }

    offset += data.length;
  }

  return files;
}

async function downloadFile(bucket, objectPath, client) {
  const { data, error } = await client.storage.from(bucket).download(objectPath);

  if (error) {
    throw new Error(`Failed to download "${objectPath}": ${error.message}`);
  }

  const arrayBuffer = await data.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

async function main() {
  const rootEnv = await loadEnvFile(path.join(ROOT_DIR, ".env"));
  const prodEnv = await loadEnvFile(path.join(ROOT_DIR, ".env.production"));
  const nodeEnv = await loadEnvFile(path.join(ROOT_DIR, "server-node", ".env"));
  const chatEnv = await loadEnvFile(path.join(ROOT_DIR, "server", ".env"));

  const supabaseUrl = pickFirst(
    process.env.SUPABASE_URL,
    process.env.VITE_SUPABASE_URL,
    nodeEnv.SUPABASE_URL,
    chatEnv.SUPABASE_URL,
    chatEnv.VITE_SUPABASE_URL,
    prodEnv.VITE_SUPABASE_URL,
    rootEnv.VITE_SUPABASE_URL
  );

  const serviceKey = pickFirst(
    process.env.SUPABASE_SERVICE_KEY,
    nodeEnv.SUPABASE_SERVICE_KEY,
    chatEnv.SUPABASE_SERVICE_KEY,
    rootEnv.SUPABASE_SERVICE_KEY
  );

  const bucket = pickFirst(
    process.env.SUPABASE_STORAGE_BUCKET,
    process.env.VITE_SUPABASE_BUCKET,
    nodeEnv.SUPABASE_STORAGE_BUCKET,
    chatEnv.SUPABASE_STORAGE_BUCKET,
    rootEnv.SUPABASE_STORAGE_BUCKET,
    prodEnv.VITE_SUPABASE_BUCKET
  ) || "cms-uploads";

  if (!supabaseUrl || !serviceKey) {
    throw new Error(
      "Missing Supabase URL or service key. Set SUPABASE_URL/VITE_SUPABASE_URL and SUPABASE_SERVICE_KEY."
    );
  }

  const client = createClient(supabaseUrl, serviceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const targetRoot = path.join(OUTPUT_DIR, `${bucket}-${timestamp}`);
  const filesDir = path.join(targetRoot, bucket);

  await ensureDir(filesDir);

  console.log(`Listing objects from bucket "${bucket}"...`);
  const files = await listAllFiles(bucket, "", client);
  console.log(`Found ${files.length} file(s).`);

  for (let index = 0; index < files.length; index += 1) {
    const item = files[index];
    const safeParts = item.path.split("/").map(sanitizeSegment);
    const localPath = path.join(filesDir, ...safeParts);
    const buffer = await downloadFile(bucket, item.path, client);
    await writeFileSafe(localPath, buffer);
    console.log(`[${index + 1}/${files.length}] ${item.path}`);
  }

  const manifest = {
    exportedAt: new Date().toISOString(),
    bucket,
    supabaseUrl,
    fileCount: files.length,
    files,
  };

  await fs.writeFile(path.join(targetRoot, "manifest.json"), JSON.stringify(manifest, null, 2));

  console.log("");
  console.log(`Media export complete: ${targetRoot}`);
  console.log("Keep at least two copies before deleting anything from Supabase Storage.");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
