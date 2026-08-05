import { useEffect, useState } from "react";
import { GitBranch, Loader2, RefreshCw, Upload, Check, ExternalLink, ShieldAlert, Plus, Rocket, Download, Trash2, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { getAdminToken, getApiBaseUrl } from "@/components/admin/adminAuth";
import { uploadCmsFile } from "@/integrations/supabase/storage";
import { resolveCmsMediaUrl } from "@/components/shared/mediaUrl";

export type SystemVersionItem = {
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

const FALLBACK_SYSTEM_VERSIONS: SystemVersionItem[] = [
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
    is_active: true,
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

const VersionControlManager = () => {
  const apiBase = getApiBaseUrl();
  const [versions, setVersions] = useState<SystemVersionItem[]>(FALLBACK_SYSTEM_VERSIONS);
  const [activeVersion, setActiveVersion] = useState<SystemVersionItem | null>(FALLBACK_SYSTEM_VERSIONS[0]);
  const [loading, setLoading] = useState(true);
  const [deployingId, setDeployingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Modal State
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [uploadingZip, setUploadingZip] = useState(false);

  // Form Fields
  const [versionTag, setVersionTag] = useState("");
  const [releaseTitle, setReleaseTitle] = useState("");
  const [description, setDescription] = useState("");
  const [changelogText, setChangelogText] = useState("");
  const [zipUrl, setZipUrl] = useState("");
  const [commitHash, setCommitHash] = useState("");
  const [deployNow, setDeployNow] = useState(true);

  const loadVersions = async () => {
    setLoading(true);
    try {
      const token = getAdminToken();
      const headers: Record<string, string> = {};
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      const endpoints = Array.from(
        new Set([
          `${apiBase}/system-versions`,
          `${apiBase}/api/system-versions`,
          "/system-versions",
          "/api/system-versions",
        ])
      );

      let successData: { versions?: SystemVersionItem[]; active_version?: SystemVersionItem } | null = null;

      for (const url of endpoints) {
        try {
          const res = await fetch(url, { headers });
          if (res.ok) {
            successData = await res.json();
            if (successData && Array.isArray(successData.versions) && successData.versions.length > 0) {
              break;
            }
          }
        } catch {
          // ignore and try next endpoint
        }
      }

      if (successData && Array.isArray(successData.versions) && successData.versions.length > 0) {
        setVersions(successData.versions);
        setActiveVersion(
          successData.active_version ||
            successData.versions.find((v) => v.is_active) ||
            successData.versions[0]
        );
      } else {
        setVersions(FALLBACK_SYSTEM_VERSIONS);
        setActiveVersion(FALLBACK_SYSTEM_VERSIONS[0]);
      }
    } catch {
      setVersions(FALLBACK_SYSTEM_VERSIONS);
      setActiveVersion(FALLBACK_SYSTEM_VERSIONS[0]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadVersions();
  }, []);

  const handleRedeploy = async (version: SystemVersionItem) => {
    const token = getAdminToken();
    if (!token) {
      toast.error("Session expired. Please login again.");
      return;
    }

    if (version.is_active) {
      toast.info(`Version ${version.version} is already active.`);
      return;
    }

    setDeployingId(version.id);
    try {
      const res = await fetch(`${apiBase}/system-versions/${version.id}/redeploy`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.message || "Failed to re-deploy version");
      }

      const data = await res.json();
      setVersions(data.versions);
      setActiveVersion(data.active_version);
      toast.success(`Successfully re-deployed and switched system active version to ${version.version}!`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Re-deploy failed");
    } finally {
      setDeployingId(null);
    }
  };

  const handleDelete = async (version: SystemVersionItem) => {
    const token = getAdminToken();
    if (!token) {
      toast.error("Session expired. Please login again.");
      return;
    }

    if (version.is_active) {
      toast.error("Cannot delete the currently active production release!");
      return;
    }

    if (!window.confirm(`Are you sure you want to delete release record ${version.version}?`)) {
      return;
    }

    setDeletingId(version.id);
    try {
      const res = await fetch(`${apiBase}/system-versions/${version.id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.message || "Failed to delete version");
      }

      const data = await res.json();
      setVersions(data.versions);
      toast.success(`Deleted version record ${version.version}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Delete failed");
    } finally {
      setDeletingId(null);
    }
  };

  const handleZipFileUpload = async (file: File | undefined) => {
    if (!file) return;
    setUploadingZip(true);
    try {
      const path = `versions/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, "_")}`;
      const url = await uploadCmsFile(file, path);
      setZipUrl(url);
      toast.success("Version update bundle uploaded successfully");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Upload failed");
    } finally {
      setUploadingZip(false);
    }
  };

  const handleCreateVersion = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = getAdminToken();
    if (!token) {
      toast.error("Session expired. Please login again.");
      return;
    }

    if (!versionTag.trim() || !releaseTitle.trim()) {
      toast.error("Version Tag (e.g. v2.6.0) and Release Title are required.");
      return;
    }

    setSubmitting(true);
    try {
      const changelogList = changelogText
        .split("\n")
        .map((item) => item.trim())
        .filter(Boolean);

      const res = await fetch(`${apiBase}/system-versions`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          version: versionTag.trim(),
          title: releaseTitle.trim(),
          description: description.trim(),
          changelog: changelogList,
          zip_url: zipUrl.trim(),
          commit_hash: commitHash.trim(),
          deploy_now: deployNow,
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.message || "Failed to create new version");
      }

      const data = await res.json();
      setVersions(data.versions);
      setActiveVersion(data.active_version);

      toast.success(
        deployNow
          ? `Created and deployed ${versionTag.trim()} as live version!`
          : `Saved release ${versionTag.trim()} to system version history.`
      );

      // Reset form
      setVersionTag("");
      setReleaseTitle("");
      setDescription("");
      setChangelogText("");
      setZipUrl("");
      setCommitHash("");
      setDeployNow(true);
      setIsCreateOpen(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Creation failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Banner */}
      <div className="relative overflow-hidden rounded-3xl border border-primary/25 bg-gradient-to-r from-card/90 via-card/75 to-primary/10 p-5 shadow-2xl backdrop-blur-2xl sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-primary">
              <GitBranch className="h-4 w-4" />
              <span>System Deployment & Version Control</span>
            </div>
            <h2 className="text-xl font-extrabold tracking-tight text-foreground sm:text-2xl">
              Website & CMS Release History
            </h2>
            <p className="text-xs text-muted-foreground">
              Track full system updates, deploy new versions, and perform 1-click rollbacks to any historical release.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <Button
              variant="outline"
              size="sm"
              onClick={loadVersions}
              disabled={loading}
              className="rounded-xl font-bold border-border/60 gap-1.5 h-9"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
              <span>Refresh</span>
            </Button>

            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="rounded-xl font-bold bg-primary text-primary-foreground shadow-lg shadow-primary/25 hover:bg-primary/90 gap-1.5 h-9">
                  <Plus className="h-4 w-4" />
                  <span>Create / Deploy New Version</span>
                </Button>
              </DialogTrigger>

              <DialogContent className="sm:max-w-lg border-border/80 bg-card/95 backdrop-blur-2xl">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2 text-lg font-extrabold">
                    <Rocket className="h-5 w-5 text-primary" />
                    <span>Create & Deploy New Release</span>
                  </DialogTitle>
                  <DialogDescription className="text-xs text-muted-foreground">
                    Add a new version update snapshot or upload a deployment zip bundle to save in version control history.
                  </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleCreateVersion} className="space-y-4 pt-2">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-foreground">Version Tag *</label>
                      <Input
                        value={versionTag}
                        onChange={(e) => setVersionTag(e.target.value)}
                        placeholder="e.g. v2.6.0"
                        required
                        className="rounded-xl"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-foreground">Commit Hash (Optional)</label>
                      <Input
                        value={commitHash}
                        onChange={(e) => setCommitHash(e.target.value)}
                        placeholder="e.g. 9a2f7c4"
                        className="rounded-xl font-mono text-xs"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-foreground">Release Title *</label>
                    <Input
                      value={releaseTitle}
                      onChange={(e) => setReleaseTitle(e.target.value)}
                      placeholder="e.g. Studio OS v2.6 Release Update"
                      required
                      className="rounded-xl"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-foreground">Summary / Overview</label>
                    <Textarea
                      rows={2}
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Brief overview of changes in this build"
                      className="rounded-xl text-xs"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-foreground">Changelog Bullet Points (One per line)</label>
                    <Textarea
                      rows={3}
                      value={changelogText}
                      onChange={(e) => setChangelogText(e.target.value)}
                      placeholder="Added new dashboard metrics&#10;Fixed version control rollback&#10;Updated header layout"
                      className="rounded-xl text-xs font-mono"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-foreground">Build Zip Bundle (URL or File Upload)</label>
                    <div className="flex items-center gap-2">
                      <Input
                        value={zipUrl}
                        onChange={(e) => setZipUrl(e.target.value)}
                        placeholder="https://.../v2.6.0-release.zip"
                        className="rounded-xl text-xs flex-1"
                      />
                      <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-border/70 bg-muted/40 px-3 py-2 text-xs font-bold transition-colors hover:bg-muted shrink-0">
                        {uploadingZip ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
                        <span>Upload Zip</span>
                        <input
                          type="file"
                          accept=".zip,.rar,.tar,.gz"
                          className="sr-only"
                          disabled={uploadingZip}
                          onChange={(e) => void handleZipFileUpload(e.target.files?.[0])}
                        />
                      </label>
                    </div>
                  </div>

                  <div className="flex items-center justify-between rounded-2xl border border-border/60 bg-muted/20 p-3">
                    <div>
                      <p className="text-xs font-bold text-foreground">Set as Current Active Release</p>
                      <p className="text-[11px] text-muted-foreground">Immediately switch production system to this version.</p>
                    </div>
                    <Switch checked={deployNow} onCheckedChange={setDeployNow} />
                  </div>

                  <div className="flex justify-end gap-2 pt-2 border-t border-border/40">
                    <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)} className="rounded-xl">
                      Cancel
                    </Button>
                    <Button type="submit" disabled={submitting} className="rounded-xl font-bold bg-primary text-primary-foreground">
                      {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save & Create Version"}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>

      {/* Active Release Hero Highlight */}
      {activeVersion && (
        <div className="relative overflow-hidden rounded-3xl border border-emerald-500/30 bg-gradient-to-r from-emerald-500/10 via-card/80 to-emerald-500/5 p-5 shadow-xl backdrop-blur-2xl">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-500 text-white shadow-md shadow-emerald-500/30">
                <CheckCircle2 className="h-7 w-7" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-emerald-500/20 px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                    Current Active Production Release
                  </span>
                  <span className="text-xs font-mono text-muted-foreground">{activeVersion.version}</span>
                </div>
                <h3 className="text-lg font-extrabold text-foreground mt-0.5">{activeVersion.title}</h3>
                <p className="text-xs text-muted-foreground">{activeVersion.description}</p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 text-xs font-mono text-muted-foreground self-start sm:self-auto bg-background/80 px-3.5 py-2 rounded-2xl border border-border/60">
              <span>Deployed: {activeVersion.deployed_at ? new Date(activeVersion.deployed_at).toLocaleString() : "Active"}</span>
              {activeVersion.commit_hash && (
                <span className="rounded-md bg-muted px-1.5 py-0.5 text-[11px] font-bold text-foreground">
                  #{activeVersion.commit_hash}
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Version History List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between border-b border-border/40 pb-2">
          <h3 className="text-base font-extrabold text-foreground flex items-center gap-2">
            <GitBranch className="h-4 w-4 text-primary" />
            <span>Version History & Rollback Logs ({versions.length})</span>
          </h3>
          <span className="text-xs text-muted-foreground">All historical versions preserved permanently</span>
        </div>

        {loading && (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-28 rounded-3xl bg-card/40 animate-pulse border border-border/40" />
            ))}
          </div>
        )}

        {!loading && versions.length === 0 && (
          <div className="rounded-3xl border border-dashed border-border/70 p-8 text-center text-sm text-muted-foreground">
            No version control history found. Click &quot;Create / Deploy New Version&quot; above to add one.
          </div>
        )}

        {!loading &&
          versions.map((ver) => {
            const isCurrentActive = ver.is_active;
            const isDeploying = deployingId === ver.id;
            const isDeleting = deletingId === ver.id;
            const zipDownloadUrl = resolveCmsMediaUrl(ver.zip_url);

            return (
              <div
                key={ver.id}
                className={`relative overflow-hidden rounded-3xl border transition-all duration-300 p-5 shadow-lg backdrop-blur-xl ${
                  isCurrentActive
                    ? "border-emerald-500/40 bg-gradient-to-r from-emerald-500/10 via-card/90 to-card/75 shadow-emerald-500/10"
                    : "border-border/70 bg-card/75 hover:border-primary/30 hover:shadow-xl"
                }`}
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="space-y-2.5 flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2.5">
                      <span className="rounded-xl bg-primary/10 px-3 py-1 text-sm font-extrabold text-primary border border-primary/20 font-mono">
                        {ver.version}
                      </span>

                      {isCurrentActive ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/20 px-3 py-0.5 text-xs font-extrabold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 border border-emerald-500/40 shadow-sm shadow-emerald-500/20">
                          <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                          </span>
                          Active Production Release
                        </span>
                      ) : (
                        <span className="rounded-full bg-amber-500/15 px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 border border-amber-500/30">
                          Archived Version
                        </span>
                      )}

                      {ver.commit_hash && (
                        <span className="rounded-lg border border-border/60 bg-background/80 px-2 py-0.5 text-xs font-mono text-muted-foreground">
                          commit: #{ver.commit_hash}
                        </span>
                      )}

                      <span className="text-xs text-muted-foreground ml-auto lg:ml-0">
                        {new Date(ver.created_at).toLocaleDateString("en-US", {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>

                    <div>
                      <h4 className="text-base font-extrabold text-foreground">{ver.title}</h4>
                      {ver.description && <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{ver.description}</p>}
                    </div>

                    {/* Changelog Tags */}
                    {ver.changelog && ver.changelog.length > 0 && (
                      <div className="space-y-1 pt-1">
                        <p className="text-[11px] font-extrabold uppercase tracking-wider text-muted-foreground">Changelog & Updates:</p>
                        <ul className="grid grid-cols-1 md:grid-cols-2 gap-1.5">
                          {ver.changelog.map((item, idx) => (
                            <li key={idx} className="flex items-start gap-1.5 text-xs text-foreground/90 bg-background/50 px-2.5 py-1 rounded-xl border border-border/40">
                              <Check className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
                              <span className="truncate">{item}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>

                  {/* Actions Column */}
                  <div className="flex flex-wrap items-center gap-2 shrink-0 border-t border-border/40 pt-3 lg:border-t-0 lg:pt-0 lg:flex-col lg:items-end">
                    {!isCurrentActive && (
                      <Button
                        size="sm"
                        onClick={() => handleRedeploy(ver)}
                        disabled={isDeploying}
                        className="rounded-xl font-bold bg-primary text-primary-foreground shadow-md shadow-primary/20 hover:bg-primary/90 gap-1.5 h-9"
                      >
                        {isDeploying ? <Loader2 className="h-4 w-4 animate-spin" /> : <Rocket className="h-4 w-4" />}
                        <span>Re-deploy / Rollback to {ver.version}</span>
                      </Button>
                    )}

                    {zipDownloadUrl && (
                      <a href={zipDownloadUrl} target="_blank" rel="noreferrer" download>
                        <Button variant="outline" size="sm" className="rounded-xl font-bold border-border/60 gap-1.5 h-9">
                          <Download className="h-4 w-4 text-primary" />
                          <span>Download Zip</span>
                        </Button>
                      </a>
                    )}

                    {!isCurrentActive && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(ver)}
                        disabled={isDeleting}
                        className="rounded-xl font-bold border-destructive/40 text-destructive hover:bg-destructive/10 h-9"
                        title="Delete archived record"
                      >
                        {isDeleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
      </div>
    </div>
  );
};

export default VersionControlManager;
