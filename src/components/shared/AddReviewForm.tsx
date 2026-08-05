import { motion, AnimatePresence } from "framer-motion";
import { Loader2, Plus, Star } from "lucide-react";
import { type FormEvent, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { submitReview } from "@/components/shared/reviews";

interface AddReviewFormProps {
  onSubmitted?: () => void;
}

const SERVICE_OPTIONS = [
  "Web Development",
  "AutoCAD Technical Drawings",
  "3D SolidWorks Modeling",
  "P&ID Engineering",
  "HAZOP Study",
  "Graphic Design",
  "General Service",
];

const AddReviewForm = ({ onSubmitted }: AddReviewFormProps) => {
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [rating, setRating] = useState(5);
  const [form, setForm] = useState({
    name: "",
    role: "",
    service: SERVICE_OPTIONS[0],
    content: "",
  });

  const remaining = useMemo(() => Math.max(0, 1000 - form.content.length), [form.content.length]);

  const onChange = (field: keyof typeof form, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const validate = () => {
    if (form.name.trim().length < 2) {
      toast({
        title: "Name is required",
        description: "Please enter your full name.",
        variant: "destructive",
      });
      return false;
    }

    if (!form.service.trim()) {
      toast({
        title: "Select a service",
        description: "Please choose the service you used.",
        variant: "destructive",
      });
      return false;
    }

    if (form.content.trim().length < 20) {
      toast({
        title: "Review is too short",
        description: "Please write at least 20 characters.",
        variant: "destructive",
      });
      return false;
    }

    return true;
  };

  const reset = () => {
    setRating(5);
    setForm({
      name: "",
      role: "",
      service: SERVICE_OPTIONS[0],
      content: "",
    });
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSubmitting || !validate()) {
      return;
    }

    setIsSubmitting(true);
    try {
      await submitReview({
        name: form.name,
        role: form.role,
        content: form.content,
        project: form.service,
        rating,
      });

      toast({
        title: "Review submitted",
        description: "Thanks. Your review has been added.",
      });

      reset();
      setIsOpen(false);
      onSubmitted?.();
    } catch (error: any) {
      toast({
        title: "Submission failed",
        description: error?.message ?? "Could not submit your review right now.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mt-8 md:mt-12">
      <div className="flex justify-center">
        <Button
          type="button"
          onClick={() => setIsOpen((prev) => !prev)}
          className="px-6 py-3 bg-primary text-primary-foreground font-semibold text-sm rounded-2xl hover:bg-primary/90 transition-all duration-200 ease-out hover:scale-[1.03] active:scale-[0.98] shadow-md gap-2 h-auto"
        >
          <Plus className="w-4 h-4" />
          {isOpen ? "Close Review Form" : "Submit Your Review"}
        </Button>
      </div>

      <AnimatePresence initial={false}>
        {isOpen ? (
          <motion.div
            key="review-form"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.3 }}
            className="mt-6 rounded-3xl border-[2.5px] border-border/70 dark:border-border bg-card p-6 md:p-8 shadow-md"
          >
            <h3 className="text-xl font-bold text-foreground mb-4">Share Your Feedback</h3>
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Your Name</label>
                  <Input
                    value={form.name}
                    onChange={(event) => onChange("name", event.target.value)}
                    placeholder="John Doe"
                    maxLength={80}
                    required
                    className="rounded-xl border-[1.5px] border-border/70 bg-background/50 focus:ring-2 focus:ring-primary/20 h-11"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Role / Company (Optional)</label>
                  <Input
                    value={form.role}
                    onChange={(event) => onChange("role", event.target.value)}
                    placeholder="CEO, TechCorp"
                    maxLength={120}
                    className="rounded-xl border-[1.5px] border-border/70 bg-background/50 focus:ring-2 focus:ring-primary/20 h-11"
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Service Used</label>
                  <select
                    value={form.service}
                    onChange={(event) => onChange("service", event.target.value)}
                    className="flex h-11 w-full rounded-xl border-[1.5px] border-border/70 bg-background/50 px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                    required
                  >
                    {SERVICE_OPTIONS.map((service) => (
                      <option key={service} value={service}>
                        {service}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Rating</label>
                  <div className="h-11 px-4 rounded-xl border-[1.5px] border-border/70 bg-background/50 flex items-center gap-1.5">
                    {Array.from({ length: 5 }).map((_, index) => {
                      const starValue = index + 1;
                      const active = starValue <= rating;

                      return (
                        <button
                          key={starValue}
                          type="button"
                          onClick={() => setRating(starValue)}
                          className="p-1 hover:scale-110 transition-transform"
                          aria-label={`Set rating to ${starValue}`}
                        >
                          <Star
                            className={`w-5 h-5 transition-colors ${
                              active ? "fill-amber-400 text-amber-400 drop-shadow-sm" : "text-muted-foreground/30"
                            }`}
                          />
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Review</label>
                <Textarea
                  value={form.content}
                  onChange={(event) => onChange("content", event.target.value)}
                  placeholder="Share your experience with DrawnDimension..."
                  className="min-h-[120px] resize-y rounded-xl border-[1.5px] border-border/70 bg-background/50 focus:ring-2 focus:ring-primary/20"
                  maxLength={1000}
                  required
                />
                <div className="text-xs text-muted-foreground text-right">{remaining} characters left</div>
              </div>

              <div className="pt-2 flex justify-end">
                <Button type="submit" disabled={isSubmitting} className="min-w-[170px] h-11 rounded-2xl font-semibold shadow-md">
                  {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                  {isSubmitting ? "Submitting..." : "Submit Review"}
                </Button>
              </div>
            </form>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
};

export default AddReviewForm;
