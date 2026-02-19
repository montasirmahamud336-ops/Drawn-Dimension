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
}

const HowWeWork = ({ steps }: HowWeWorkProps) => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <section className="section-padding" ref={ref}>
      <div className="container-narrow">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8 }}
          className="text-center mb-16"
        >
          <span className="text-primary font-semibold text-sm uppercase tracking-wider">
            Our Process
          </span>
          <h2 className="text-4xl font-bold mt-4 text-foreground">
            How We Work
          </h2>
        </motion.div>

        <div className="relative max-w-4xl mx-auto">
          {/* Connection line */}
          <div className="absolute left-8 md:left-1/2 md:-translate-x-px top-0 bottom-0 w-0.5 bg-border" />
          
          {/* Animated progress line */}
          <motion.div
            className="absolute left-8 md:left-1/2 md:-translate-x-px top-0 w-0.5 bg-primary origin-top"
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
                <div className="glass-card p-6">
                  <span className="text-primary font-bold text-sm">Step {item.step}</span>
                  <h3 className="text-lg font-semibold text-foreground mt-1 mb-2">{item.title}</h3>
                  <p className="text-sm text-muted-foreground">{item.description}</p>
                </div>
              </div>

              {/* Circle indicator */}
              <motion.div
                className="absolute left-5 md:left-1/2 md:-translate-x-1/2 w-7 h-7 rounded-full bg-background border-2 border-primary flex items-center justify-center z-10"
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
