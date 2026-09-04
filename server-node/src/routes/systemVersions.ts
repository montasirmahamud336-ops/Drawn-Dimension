import { Router } from "express";
import fs from "fs/promises";
import path from "path";
import { requireAuth } from "../middleware/auth.js";
import { SERVER_DATA_DIR } from "../lib/runtimePaths.js";

export type SystemVersionRecord = {
  id: string;
  version: string;
  title: string;
  description: string;
  changelog: string[];
  zip_url?: string;
  commit_hash?: string;
  is_active: boolean;
  created_at: string;
  deployed_at?: string;
  created_by?: string;
};

const router = Router();
const LOCAL_DATA_DIR = SERVER_DATA_DIR;
const LOCAL_VERSIONS_FILE = path.join(LOCAL_DATA_DIR, "system-versions.json");

const DEFAULT_SYSTEM_VERSIONS: SystemVersionRecord[] = [
  {
    id: "ver-v3-0-0",
    version: "v3.0.0",
    title: "Studio OS v3.0 Release — Dynamic Stripe Integration & Quantum CMS Boot",
    description: "Major milestone release featuring complete CMS Dynamic Stripe Payment Gateway Integration with live diagnostics, Quantum HUD CMS boot entrance animation, interactive Portfolio grid, World Map alignment, and PostgreSQL database migrations.",
    changelog: [
      "Integrated Dynamic Payment Integration CMS module with Stripe Publishable, Secret, and Webhook Key management",
      "Added live Stripe API Health Diagnostics testing with account latency and capability verification",
      "Enabled zero-downtime Stripe account switching directly from CMS without server restarts or .env editing",
      "Implemented Quantum Holographic HUD entrance animation with live UTC telemetry and quick keyboard skip",
      "Upgraded Database Works management with dynamic category pills and compact view switcher",
      "Refined World Map manager with synchronized bottom border alignment and removed redundant chip tray",
      "Created PostgreSQL payment_settings migration schema with resilient fallback adapter"
    ],
    zip_url: "/media/cms-uploads/versions/v3.0.0-release.zip",
    commit_hash: "v3.0.0",
    is_active: true,
    created_at: "2026-09-04T17:20:00.000Z",
    deployed_at: "2026-09-04T17:20:00.000Z",
    created_by: "Lead Engineer"
  },
  {
    id: "ver-v2-6-0",
    version: "v2.6.0",
    title: "Studio OS v2.6 Release — Tools Suite & VidGrab Downloader",
    description: "Integrated VidGrab 4K Downloader & PDFForge Suite, Auth-gated tools, Android Share Sheet intent support, Live Streaming engine, and Admin User tracking.",
    changelog: [
      "Integrated VidGrab 4K High-Speed Media Downloader with instant streaming pipeline",
      "Integrated PDFForge Multi-Tool Document Suite with 3D Red Branding",
      "Added Member Auth-Gating for all Downloader and PDF tools with instant redirect",
      "Resolved Android App Share-Sheet media URL extraction & upgraded Kotlin 2.0",
      "Implemented VidGrab Admin Panel User Downloads Activity Tracking & Search",
      "Optimized Localhost Dev URL Routing & Cleaned JWT tokens from browser address bar"
    ],
    zip_url: "/media/cms-uploads/versions/v2.6.0-release.zip",
    commit_hash: "v2.6.0",
    is_active: false,
    created_at: "2026-08-24T00:00:00.000Z",
    deployed_at: "2026-08-24T00:00:00.000Z",
    created_by: "Lead Engineer"
  },
  {
    id: "ver-v2-5-0",
    version: "v2.5.0",
    title: "Studio OS v2.5 Release",
    description: "Enhanced Glassmorphic CMS, Website Version Control System, Sidebar Scroll Persistence, and Custom Logo Support.",
    changelog: [
      "Added System Version Control & 1-Click Rollback / Re-deploy Engine",
      "Persisted CMS Navigation Sidebar Scroll Position across page clicks",
      "Upgraded Workspace Cards, Pages Overview, FAQ Manager & Blog Manager",
      "Fixed Main Scroll Container auto-jump issues on action button clicks",
      "Integrated Website Branding Logo into CMS Navigation Panel"
    ],
    zip_url: "/media/cms-uploads/versions/v2.5.0-release.zip",
    commit_hash: "9a2f7c4",
    is_active: false,
    created_at: "2026-08-05T12:00:00.000Z",
    deployed_at: "2026-08-05T12:00:00.000Z",
    created_by: "System Admin"
  },
  {
    id: "ver-v2-4-0",
    version: "v2.4.0",
    title: "Studio OS v2.4 Release",
    description: "Advanced CMS Workspace Redesign, Glass Panel Aesthetics, and Service FAQ Engine.",
    changelog: [
      "Redesigned CMS Workspace Selection Cards with custom gradient accents",
      "Implemented FAQ Management & Service Filter Engine",
      "Added Live vs Draft Filter Tabs for Blog Articles & FAQs",
      "Optimized VPS Media Storage API endpoints"
    ],
    zip_url: "/media/cms-uploads/versions/v2.4.0-release.zip",
    commit_hash: "7e1d8b2",
    is_active: false,
    created_at: "2026-07-20T10:30:00.000Z",
    deployed_at: "2026-07-20T10:30:00.000Z",
    created_by: "Lead Engineer"
  },
  {
    id: "ver-v2-3-0",
    version: "v2.3.0",
    title: "Studio OS v2.3 Release",
    description: "VPS Media Storage Endpoint Integration & Employee Work Assignment System.",
    changelog: [
      "Switched Storage Endpoints to VPS Express API /storage/upload",
      "Added Work Assignments and Employee Invoice Builder",
      "Improved Client Dashboard & Project Detail pages"
    ],
    zip_url: "/media/cms-uploads/versions/v2.3.0-release.zip",
    commit_hash: "4c8f3a1",
    is_active: false,
    created_at: "2026-06-15T15:00:00.000Z",
    deployed_at: "2026-06-15T15:00:00.000Z",
    created_by: "DevOps"
  },
  {
    id: "ver-v1-0-0",
    version: "v1.0.0",
    title: "Initial Production Launch",
    description: "First Production Release of Drawn Dimension Platform & CMS Studio.",
    changelog: [
      "Initial Release of Drawn Dimension Core Website",
      "Admin Authentication & Access Control System",
      "Basic Content Management for Services, Portfolio & Testimonials"
    ],
    zip_url: "/media/cms-uploads/versions/v1.0.0-release.zip",
    commit_hash: "1b9e2f0",
    is_active: false,
    created_at: "2026-05-01T09:00:00.000Z",
    deployed_at: "2026-05-01T09:00:00.000Z",
    created_by: "System Administrator"
  }
];

const loadLocalVersions = async (): Promise<SystemVersionRecord[]> => {
  try {
    await fs.mkdir(LOCAL_DATA_DIR, { recursive: true });
    const content = await fs.readFile(LOCAL_VERSIONS_FILE, "utf-8");
    const parsed = JSON.parse(content);
    if (Array.isArray(parsed) && parsed.length > 0) {
      const hasV30 = parsed.some((v: any) => v.version === "v3.0.0" || v.version === "3.0.0");
      if (!hasV30) {
        parsed.forEach((v: any) => { v.is_active = false; });
        parsed.unshift(DEFAULT_SYSTEM_VERSIONS[0]);
        await fs.writeFile(LOCAL_VERSIONS_FILE, JSON.stringify(parsed, null, 2), "utf-8");
      }
      return parsed as SystemVersionRecord[];
    }
  } catch {
    await fs.writeFile(LOCAL_VERSIONS_FILE, JSON.stringify(DEFAULT_SYSTEM_VERSIONS, null, 2), "utf-8");
  }
  return DEFAULT_SYSTEM_VERSIONS;
};

const saveLocalVersions = async (versions: SystemVersionRecord[]): Promise<void> => {
  try {
    await fs.mkdir(LOCAL_DATA_DIR, { recursive: true });
    await fs.writeFile(LOCAL_VERSIONS_FILE, JSON.stringify(versions, null, 2), "utf-8");
  } catch (error) {
    console.error("Could not save system versions to disk", error);
  }
};

// GET /system-versions & /api/system-versions
router.get(["/system-versions", "/api/system-versions"], async (_req, res) => {
  try {
    const versions = await loadLocalVersions();
    const activeVersion = versions.find((v) => v.is_active) ?? versions[0];
    res.json({
      versions,
      active_version: activeVersion,
      total_count: versions.length
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch system versions", error: String(error) });
  }
});

// POST /system-versions (Create new release version)
router.post(["/system-versions", "/api/system-versions"], requireAuth, async (req, res) => {
  try {
    const { version, title, description, changelog, zip_url, commit_hash, deploy_now } = req.body;

    if (!version || !title) {
      return res.status(400).json({ message: "Version tag and release title are required" });
    }

    const versions = await loadLocalVersions();

    if (versions.some((v) => v.version.toLowerCase().trim() === String(version).toLowerCase().trim())) {
      return res.status(400).json({ message: `Version tag "${version}" already exists` });
    }

    const shouldDeploy = Boolean(deploy_now);
    const now = new Date().toISOString();

    const newRecord: SystemVersionRecord = {
      id: `ver-${String(version).replace(/[^a-zA-Z0-9]/g, "-").toLowerCase()}-${Date.now().toString(36)}`,
      version: String(version).trim(),
      title: String(title).trim(),
      description: String(description || "").trim(),
      changelog: Array.isArray(changelog) ? changelog.map(String).filter(Boolean) : [],
      zip_url: zip_url ? String(zip_url).trim() : undefined,
      commit_hash: commit_hash ? String(commit_hash).trim() : undefined,
      is_active: shouldDeploy,
      created_at: now,
      deployed_at: shouldDeploy ? now : undefined,
      created_by: (req as any).user?.username || "Admin"
    };

    let updatedVersions = [newRecord, ...versions];

    if (shouldDeploy) {
      updatedVersions = updatedVersions.map((v) => ({
        ...v,
        is_active: v.id === newRecord.id,
        deployed_at: v.id === newRecord.id ? now : v.deployed_at
      }));
    }

    await saveLocalVersions(updatedVersions);

    const activeVersion = updatedVersions.find((v) => v.is_active) ?? updatedVersions[0];

    res.status(201).json({
      message: shouldDeploy ? `Deployed new version ${newRecord.version} successfully` : `Created version ${newRecord.version}`,
      version: newRecord,
      versions: updatedVersions,
      active_version: activeVersion
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to create new version", error: String(error) });
  }
});

// POST /system-versions/:id/redeploy (Re-deploy / Rollback to a version)
router.post(["/system-versions/:id/redeploy", "/api/system-versions/:id/redeploy"], requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const versions = await loadLocalVersions();

    const targetVersion = versions.find((v) => v.id === id || v.version === id);
    if (!targetVersion) {
      return res.status(404).json({ message: "System version not found" });
    }

    const now = new Date().toISOString();
    const updatedVersions = versions.map((v) => {
      const matches = v.id === targetVersion.id;
      return {
        ...v,
        is_active: matches,
        deployed_at: matches ? now : v.deployed_at
      };
    });

    await saveLocalVersions(updatedVersions);

    const activeVersion = updatedVersions.find((v) => v.is_active) ?? targetVersion;

    res.json({
      message: `Re-deployed and switched active site version to ${targetVersion.version}`,
      target_version: targetVersion,
      versions: updatedVersions,
      active_version: activeVersion
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to re-deploy system version", error: String(error) });
  }
});

// DELETE /system-versions/:id (Delete archived version)
router.delete(["/system-versions/:id", "/api/system-versions/:id"], requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const versions = await loadLocalVersions();

    const targetVersion = versions.find((v) => v.id === id || v.version === id);
    if (!targetVersion) {
      return res.status(404).json({ message: "Version record not found" });
    }

    if (targetVersion.is_active) {
      return res.status(400).json({ message: "Cannot delete the currently active production release" });
    }

    const updatedVersions = versions.filter((v) => v.id !== targetVersion.id);
    await saveLocalVersions(updatedVersions);

    res.json({
      message: `Deleted version ${targetVersion.version}`,
      versions: updatedVersions
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to delete version", error: String(error) });
  }
});

export default router;
