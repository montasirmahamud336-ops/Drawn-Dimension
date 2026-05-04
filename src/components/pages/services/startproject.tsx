import { useState } from "react";
import { motion } from "framer-motion";
import { Send, Loader2, CheckCircle, AlertCircle, Paperclip, X, File } from "lucide-react";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import PageTransition from "@/components/shared/PageTransition";
import PremiumBackground from "@/components/shared/PremiumBackground";
import { getApiBaseUrl } from "@/components/admin/adminAuth";

const StartProject = () => {
  const [email, setEmail] = useState("");
  const [description, setDescription] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const newFiles = Array.from(e.target.files);
    setFiles((prev) => [...prev, ...newFiles]);
    // Reset input so same file can be re‑selected
    e.target.value = "";
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setSubmitting(true);
    setStatus("idle");

    try {
      const formData = new FormData();
      formData.append("email", email.trim());
      formData.append("description", description.trim());
      files.forEach((file) => formData.append("files", file));

      const res = await fetch(`${getApiBaseUrl()}/inquiries`, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) throw new Error();
      setStatus("success");
      setEmail("");
      setDescription("");
      setFiles([]);
    } catch {
      setStatus("error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <PageTransition>
      <PremiumBackground>
        <Navigation />
        <main className="pt-28 pb-20">
          <div className="container-narrow max-w-3xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="glass-card p-8 md:p-10 rounded-2xl border border-border/40"
            >
              <h1 className="text-2xl md:text-3xl font-bold mb-2">
                Start Your Project
              </h1>
              <p className="text-muted-foreground mb-8">
                Tell us about your idea, and we&apos;ll get back to you within 24 hours.
              </p>

              {status === "success" ? (
                <div className="flex flex-col items-center text-center py-6">
                  <CheckCircle className="w-12 h-12 text-emerald-500 mb-3" />
                  <p className="text-lg font-semibold">Submitted successfully!</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    We&apos;ll review your project and reply soon.
                  </p>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-5">
                  {/* Email / WhatsApp */}
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Email or WhatsApp Number *
                    </label>
                    <input
                      type="text"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full bg-white/[0.03] dark:bg-black/10 border border-border/60 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary/50 transition-colors"
                      placeholder="you@company.com or +8801XXXXXXXXX"
                    />
                  </div>

                  {/* Description */}
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Project Details
                    </label>
                    <textarea
                      rows={6}
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      className="w-full bg-white/[0.03] dark:bg-black/10 border border-border/60 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary/50 transition-colors resize-none"
                      placeholder="Describe what you need, any specifications, references, etc."
                    />
                  </div>

                  {/* File Attachments */}
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Attach Files (optional)
                    </label>
                    <div className="flex flex-wrap gap-2 mb-3">
                      {files.map((file, index) => (
                        <div
                          key={`${file.name}-${index}`}
                          className="flex items-center gap-2 bg-primary/5 border border-primary/20 rounded-lg px-3 py-2 text-xs"
                        >
                          <File className="w-3.5 h-3.5 text-primary" />
                          <span className="max-w-[120px] truncate">{file.name}</span>
                          <button
                            type="button"
                            onClick={() => removeFile(index)}
                            className="text-muted-foreground hover:text-red-500"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>

                    <label className="inline-flex items-center gap-2 cursor-pointer text-sm text-primary hover:text-primary/80 transition-colors">
                      <Paperclip className="w-4 h-4" />
                      <span>Add files</span>
                      <input
                        type="file"
                        multiple
                        onChange={handleFileChange}
                        className="hidden"
                        accept="*"
                      />
                    </label>
                    <p className="text-[11px] text-muted-foreground mt-1">
                      You can attach images, documents, DWG, PDF, or any file type.
                    </p>
                  </div>

                  {status === "error" && (
                    <div className="flex items-center gap-2 text-red-500 text-sm">
                      <AlertCircle className="w-4 h-4" /> Something went wrong. Please try again.
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full btn-primary inline-flex items-center justify-center gap-2 py-3 rounded-xl disabled:opacity-50"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" /> Sending...
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4" /> Send Inquiry
                      </>
                    )}
                  </button>
                </form>
              )}
            </motion.div>
          </div>
        </main>
        <Footer />
      </PremiumBackground>
    </PageTransition>
  );
};

export default StartProject;