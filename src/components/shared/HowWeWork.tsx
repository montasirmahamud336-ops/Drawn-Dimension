import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import { CheckCircle } from "lucide-react";

interface Step {
  step: string;
  title: string;
  description: string;
}

interface HowWeWorkProps {
  steps: Step[];
  badge?: string;
  title?: string;
}

const HowWeWork = ({ steps, badge = "Our Process", title = "How We Work" }: HowWeWorkProps) => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <section className="section-padding relative overflow-hidden" ref={ref}>
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_12%_15%,rgba(239,68,68,0.1),transparent_34%)]" />
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_88%_20%,rgba(14,165,233,0.07),transparent_36%)]" />
      <div className="container-narrow">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8 }}
          className="text-center mb-16"
        >
          <span className="inline-flex items-center rounded-full border border-primary/35 bg-primary/10 px-4 py-1.5 text-primary font-semibold text-xs uppercase tracking-[0.16em]">
            {badge}
          </span>
          <h2 className="text-[clamp(1.95rem,4.2vw,3rem)] font-bold mt-4 text-foreground text-balance">
            {title}
          </h2>
        </motion.div>

        <div className="relative max-w-4xl mx-auto">
          {/* Connection line */}
          <div className="absolute left-8 md:left-1/2 md:-translate-x-px top-0 bottom-0 w-0.5 bg-border/70" />
          
          {/* Animated progress line */}
          <motion.div
            className="absolute left-8 md:left-1/2 md:-translate-x-px top-0 w-0.5 bg-gradient-to-b from-primary via-primary/90 to-primary/40 origin-top"
            initial={{ height: 0 }}
            animate={isInView ? { height: "100%" } : {}}
            transition={{ duration: 2, ease: "easeOut", delay: 0.3 }}
          />

          {steps.map((item, index) => (
            <motion.div
              key={item.step}
              initial={{ opacity: 0, x: index % 2 === 0 ? -40 : 40 }}
              animate={isInView ? { opacity: 1, x: 0 } : {}}
              transition={{ duration: 0.6, delay: 0.4 + index * 0.4 }}
              className={`relative flex items-start mb-12 last:mb-0 ${
                index % 2 === 0 ? "md:flex-row" : "md:flex-row-reverse"
              }`}
            >
              {/* Step content */}
              <div className={`ml-20 md:ml-0 md:w-[calc(50%-2rem)] ${index % 2 === 0 ? "md:pr-8 md:text-right" : "md:pl-8"}`}>
                <div className="glass-card p-6 border-border/60 bg-[linear-gradient(145deg,rgba(255,255,255,0.07),rgba(255,255,255,0.015)_45%,rgba(239,68,68,0.07)_100%)] shadow-[0_20px_40px_-30px_rgba(239,68,68,0.45)]">
                  <span className="text-primary font-bold text-sm">Step {item.step}</span>
                  <h3 className="text-lg font-semibold text-foreground mt-1 mb-2">{item.title}</h3>
                  <p className="text-sm text-muted-foreground/90 leading-relaxed">{item.description}</p>
                </div>
              </div>

              {/* Circle indicator */}
              <motion.div
                className="absolute left-5 md:left-1/2 md:-translate-x-1/2 w-7 h-7 rounded-full bg-background border-2 border-primary flex items-center justify-center z-10 shadow-[0_0_18px_rgba(239,68,68,0.45)]"
                initial={{ scale: 0 }}
                animate={isInView ? { scale: 1 } : {}}
                transition={{ duration: 0.4, delay: 0.6 + index * 0.4, type: "spring", stiffness: 300 }}
              >
                <CheckCircle className="w-4 h-4 text-primary" />
              </motion.div>

              {/* Spacer for opposite side */}
              <div className="hidden md:block md:w-[calc(50%-2rem)]" />
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default HowWeWork;
