import { motion } from "framer-motion";
import { LucideIcon, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

interface ServiceCardProps {
  icon: LucideIcon;
  title: string;
  description: string;
  link: string;
  features?: string[];
  index?: number;
}

const ServiceCard = ({ icon: Icon, title, description, link, features, index = 0 }: ServiceCardProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 50 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-100px" }}
      transition={{ duration: 0.6, delay: index * 0.1 }}
      className="group h-full"
    >
      <div className="service-card h-full flex flex-col relative overflow-hidden bg-[linear-gradient(152deg,rgba(255,255,255,0.06),rgba(255,255,255,0.015)_45%,rgba(239,68,68,0.09)_100%)] border-border/70 hover:border-primary/50 transition-all duration-500 hover:-translate-y-1.5 hover:shadow-[0_24px_48px_-28px_rgba(239,68,68,0.48)]">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_0%_0%,rgba(239,68,68,0.14),transparent_42%)] opacity-80" />
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.04),transparent_34%)] dark:opacity-100 opacity-80" />
        <div className="pointer-events-none absolute top-0 left-6 right-6 h-px bg-gradient-to-r from-transparent via-primary/75 to-transparent" />
        <div className="flex items-start justify-between mb-6">
          <div className="w-14 h-14 bg-primary/12 border border-primary/30 rounded-2xl flex items-center justify-center group-hover:bg-primary/20 group-hover:border-primary/50 transition-all duration-300 shadow-[0_10px_24px_rgba(239,68,68,0.16)]">
            <Icon className="w-7 h-7 text-primary" />
          </div>
        </div>
        
        <h3 className="text-xl font-semibold tracking-tight text-foreground mb-3 group-hover:text-primary transition-colors text-balance">
          {title}
        </h3>
        <p className="text-muted-foreground/90 text-sm leading-relaxed mb-6 flex-grow">
          {description}
        </p>
        
        {features && features.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-6 pt-4 border-t border-border/60">
            {features.map((feature) => (
              <span
                key={feature}
                className="text-xs px-3 py-1.5 rounded-full border border-primary/25 bg-primary/[0.12] text-primary font-medium"
              >
                {feature}
              </span>
            ))}
          </div>
        )}

        <Link
          to={link}
          className="inline-flex items-center justify-center gap-2 w-full py-3 rounded-xl text-sm font-semibold bg-secondary/90 text-secondary-foreground hover:bg-primary hover:text-primary-foreground border border-border/70 hover:border-primary transition-all duration-300"
        >
          Get Started
          <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
        </Link>
      </div>
    </motion.div>
  );
};

export default ServiceCard;
