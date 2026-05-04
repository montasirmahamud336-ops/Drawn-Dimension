import { useEffect, useState } from "react";
import { getApiBaseUrl } from "@/components/admin/adminAuth";
import {
  Loader2,
  Inbox,
  Trash2,
  Download,
  File,
  Calendar,
  MoreHorizontal,
  ArrowLeft,
  Archive,
  ArchiveRestore,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

type ViewMode = "active" | "draft";

const InquiriesManager = () => {
  const [inquiries, setInquiries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedInq, setSelectedInq] = useState<any | null>(null);
  const [menuOpenId, setMenuOpenId] = useState<number | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("active");
  const [updatingId, setUpdatingId] = useState<number | null>(null);

  useEffect(() => {
    fetchInquiries();
    const handler = () => setMenuOpenId(null);
    document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, [viewMode]);

  const fetchInquiries = () => {
    setLoading(true);
    const status = viewMode === "draft" ? "draft" : "active";
    fetch(`${getApiBaseUrl()}/inquiries?status=${status}`)
      .then((res) => res.json())
      .then((data) => {
        const rows = Array.isArray(data) ? data : [];
        setInquiries(
          rows.filter((inq) => {
            const rowStatus = String(inq.status ?? "").toLowerCase();
            return rowStatus ? rowStatus === status : status === "active";
          })
        );
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  // Soft delete (move to draft)
  const handleMoveToDraft = async (id: number) => {
    try {
      setUpdatingId(id);
      const res = await fetch(`${getApiBaseUrl()}/inquiries/${id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "draft" }),
      });
      if (!res.ok) throw new Error();
      setInquiries((prev) => prev.filter((inq) => inq.id !== id));
      if (selectedInq?.id === id) setSelectedInq(null);
      fetchInquiries();
    } catch (error) {
      console.error("Move to draft failed", error);
    } finally {
      setUpdatingId(null);
      setMenuOpenId(null);
    }
  };

  // Restore to active (move to inbox)
  const handleRestoreToActive = async (id: number) => {
    try {
      setUpdatingId(id);
      const res = await fetch(`${getApiBaseUrl()}/inquiries/${id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "active" }),
      });
      if (!res.ok) throw new Error();
      setInquiries((prev) => prev.filter((inq) => inq.id !== id));
      if (selectedInq?.id === id) setSelectedInq(null);
      fetchInquiries();
    } catch (error) {
      console.error("Restore failed", error);
    } finally {
      setUpdatingId(null);
      setMenuOpenId(null);
    }
  };

  // Permanent delete
  const handlePermanentDelete = async (id: number) => {
    if (!window.confirm("Permanently delete this inquiry? This cannot be undone.")) return;
    try {
      setUpdatingId(id);
      const res = await fetch(`${getApiBaseUrl()}/inquiries/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error();
      setInquiries((prev) => prev.filter((inq) => inq.id !== id));
      if (selectedInq?.id === id) setSelectedInq(null);
      fetchInquiries();
    } catch (error) {
      console.error("Permanent delete failed", error);
    } finally {
      setUpdatingId(null);
      setMenuOpenId(null);
    }
  };

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

  const isSelected = (inq: any) => selectedInq?.id === inq.id;

  const toggleView = () => {
    setViewMode((prev) => (prev === "active" ? "draft" : "active"));
    setSelectedInq(null);
    setMenuOpenId(null);
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="glass-panel p-0 overflow-hidden flex h-[calc(100dvh-10rem)]">
      {/* ── Left Panel: List ── */}
      <div className="w-full md:w-[380px] border-r border-border/40 flex flex-col bg-card/50">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border/40">
          <div className="flex items-center gap-2">
            {viewMode === "draft" && (
              <button
                type="button"
                onClick={toggleView}
                className="p-1.5 rounded-full hover:bg-muted/40 text-muted-foreground transition-colors"
                aria-label="Back to active inquiries"
                title="Back to active inquiries"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
            )}
            <Inbox className="w-5 h-5 text-primary" />
            <h1 className="text-lg font-bold">
              {viewMode === "active" ? "Inquiries" : "Drafts"}
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">
              {inquiries.length} {viewMode === "active" ? "active" : "draft"}
            </span>
            {viewMode === "active" && (
              <button
                type="button"
                onClick={toggleView}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors"
              >
                <Archive className="w-3.5 h-3.5" />
                Drafts
              </button>
            )}
            {/* 3-dot menu to switch view */}
            <div className="relative">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setMenuOpenId(menuOpenId === -1 ? null : -1); // -1 for view toggle menu
                }}
                className="p-1 rounded-full hover:bg-muted/40 text-muted-foreground"
              >
                <MoreHorizontal className="w-4 h-4" />
              </button>
              {menuOpenId === -1 && (
                <div className="absolute right-0 top-full mt-1 w-36 bg-card border border-border/60 rounded-lg shadow-xl z-20 overflow-hidden">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleView();
                      setMenuOpenId(null);
                    }}
                    className="w-full text-left px-3 py-2 text-xs hover:bg-muted/30 flex items-center gap-2"
                  >
                    {viewMode === "active" ? (
                      <>
                        <Archive className="w-3.5 h-3.5" /> Show Drafts
                      </>
                    ) : (
                      <>
                        <ArchiveRestore className="w-3.5 h-3.5" /> Show Active
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto">
          {inquiries.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Inbox className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p className="text-sm">
                {viewMode === "active" ? "No active inquiries" : "No drafts"}
              </p>
            </div>
          ) : (
            inquiries.map((inq) => (
              <div
                key={inq.id}
                onClick={() => setSelectedInq(inq)}
                className={`flex items-start gap-3 px-4 py-3 border-b border-border/20 cursor-pointer transition-colors hover:bg-muted/20 ${
                  isSelected(inq)
                    ? "bg-primary/5 border-l-2 border-l-primary"
                    : ""
                }`}
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{inq.email}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {inq.description
                      ? inq.description.slice(0, 60) +
                        (inq.description.length > 60 ? "..." : "")
                      : "No description"}
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-1">
                    {formatDate(inq.created_at)}
                  </p>
                </div>
                {/* Per-item 3-dot menu */}
                <div className="relative shrink-0">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setMenuOpenId(menuOpenId === inq.id ? null : inq.id);
                    }}
                    className="p-1 rounded-full hover:bg-muted/40 text-muted-foreground"
                  >
                    <MoreHorizontal className="w-4 h-4" />
                  </button>
                  {menuOpenId === inq.id && (
                    <div className="absolute right-0 top-full mt-1 w-44 bg-card border border-border/60 rounded-lg shadow-xl z-20 overflow-hidden">
                      {viewMode === "active" ? (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleMoveToDraft(inq.id);
                          }}
                          disabled={updatingId === inq.id}
                          className="w-full text-left px-3 py-2 text-xs hover:bg-muted/30 flex items-center gap-2"
                        >
                          {updatingId === inq.id ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Archive className="w-3.5 h-3.5" />
                          )}
                          Move to Draft
                        </button>
                      ) : (
                        <>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handlePermanentDelete(inq.id);
                            }}
                            disabled={updatingId === inq.id}
                            className="w-full text-left px-3 py-2 text-xs text-red-500 hover:bg-muted/30 flex items-center gap-2"
                          >
                            <Trash2 className="w-3.5 h-3.5" /> Permanent Delete
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRestoreToActive(inq.id);
                            }}
                            disabled={updatingId === inq.id}
                            className="w-full text-left px-3 py-2 text-xs hover:bg-muted/30 flex items-center gap-2"
                          >
                            {updatingId === inq.id ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <ArchiveRestore className="w-3.5 h-3.5" />
                            )}
                            Move to Inbox
                          </button>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* ── Right: Detail Panel ── */}
      <AnimatePresence>
        {selectedInq && (
          <motion.div
            className="flex-1 flex flex-col bg-card/80 overflow-hidden"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.2 }}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-border/40">
              <h2 className="text-sm font-semibold">Details</h2>
              <div className="flex gap-2">
                {viewMode === "draft" && (
                  <button
                    onClick={() => handleRestoreToActive(selectedInq.id)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                  >
                    <ArchiveRestore className="w-3.5 h-3.5" /> Restore
                  </button>
                )}
                <button
                  onClick={() => {
                    if (viewMode === "active") {
                      handleMoveToDraft(selectedInq.id);
                    } else {
                      handlePermanentDelete(selectedInq.id);
                    }
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium text-red-500 hover:bg-destructive/10 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />{" "}
                  {viewMode === "active" ? "Move to Draft" : "Delete Permanently"}
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-foreground">{selectedInq.email}</p>
                  <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                    <Calendar className="w-3.5 h-3.5" /> {formatDate(selectedInq.created_at)}
                  </p>
                </div>
              </div>

              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                  Project Details
                </h3>
                <p className="text-sm text-foreground/80 whitespace-pre-wrap leading-relaxed bg-muted/30 p-4 rounded-xl">
                  {selectedInq.description || "No description provided."}
                </p>
              </div>

              {selectedInq.files && selectedInq.files.length > 0 && (
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                    Attachments ({selectedInq.files.length})
                  </h3>
                  <div className="space-y-2">
                    {selectedInq.files.map((file: any) => (
                      <a
                        key={file.id}
                        href={`${getApiBaseUrl()}/${file.file_path}`}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-3 p-3 rounded-xl border border-border/40 hover:bg-muted/30 transition-colors group"
                      >
                        <File className="w-4 h-4 text-primary" />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium truncate">{file.file_name}</p>
                          <p className="text-xs text-muted-foreground">
                            {(file.file_size / 1024).toFixed(1)} KB • {file.mime_type}
                          </p>
                        </div>
                        <Download className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {!selectedInq && inquiries.length > 0 && (
        <div className="hidden md:flex flex-1 items-center justify-center text-muted-foreground">
          <div className="text-center">
            <Inbox className="w-12 h-12 mx-auto mb-3 opacity-20" />
            <p className="text-sm">Select an inquiry to view details</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default InquiriesManager;
