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
    <div className="mt-8 md:mt-10">
      <div className="flex justify-center">
        <Button
          type="button"
          onClick={() => setIsOpen((prev) => !prev)}
          className="h-11 rounded-xl px-6"
        >
          <Plus className="w-4 h-4" />
          {isOpen ? "Close Review Form" : "Add Your Review"}
        </Button>
      </div>

      <AnimatePresence initial={false}>
        {isOpen ? (
          <motion.div
            key="review-form"
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.24 }}
            className="glass-card mt-6 p-5 md:p-7 border border-border/60"
          >
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-sm text-foreground/90 font-medium">Your Name</label>
                  <Input
                    value={form.name}
                    onChange={(event) => onChange("name", event.target.value)}
                    placeholder="John Doe"
                    maxLength={80}
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm text-foreground/90 font-medium">Role / Company (Optional)</label>
                  <Input
                    value={form.role}
                    onChange={(event) => onChange("role", event.target.value)}
                    placeholder="Founder, Example Inc"
                    maxLength={120}
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-sm text-foreground/90 font-medium">Service Used</label>
                  <select
                    value={form.service}
                    onChange={(event) => onChange("service", event.target.value)}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
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
                  <label className="text-sm text-foreground/90 font-medium">Rating</label>
                  <div className="h-10 px-3 rounded-md border border-input bg-background flex items-center gap-1">
                    {Array.from({ length: 5 }).map((_, index) => {
                      const starValue = index + 1;
                      const active = starValue <= rating;

                      return (
                        <button
                          key={starValue}
                          type="button"
                          onClick={() => setRating(starValue)}
                          className="p-0.5"
                          aria-label={`Set rating to ${starValue}`}
                        >
                          <Star
                            className={`w-4 h-4 transition-colors ${
                              active ? "fill-primary text-primary" : "text-muted-foreground/40"
                            }`}
                          />
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm text-foreground/90 font-medium">Review</label>
                <Textarea
                  value={form.content}
                  onChange={(event) => onChange("content", event.target.value)}
                  placeholder="Share your experience with DrawnDimension..."
                  className="min-h-[120px] resize-y"
                  maxLength={1000}
                  required
                />
                <div className="text-xs text-muted-foreground text-right">{remaining} characters left</div>
              </div>

              <div className="pt-2 flex justify-end">
                <Button type="submit" disabled={isSubmitting} className="min-w-[170px] h-11 rounded-xl">
                  {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
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
