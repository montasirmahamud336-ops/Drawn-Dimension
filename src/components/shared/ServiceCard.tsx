import { motion } from "framer-motion";
import { LucideIcon, ArrowRight, CheckCircle2, Sparkles } from "lucide-react";
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
  const formattedIndex = String(index + 1).padStart(2, "0");

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ duration: 0.5, delay: index * 0.08 }}
      className="group h-full"
    >
      <div className="h-full flex flex-col justify-between relative overflow-hidden rounded-3xl border border-border/80 bg-gradient-to-b from-card via-card to-primary/[0.08] dark:from-card dark:via-card dark:to-primary/[0.14] p-7 backdrop-blur-2xl hover:border-primary/60 hover:shadow-[0_20px_50px_rgba(239,68,68,0.22)] hover:-translate-y-2 transition-all duration-400">
        
        {/* Ambient Top Glow Overlay */}
        <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-primary/10 via-transparent to-transparent opacity-50 group-hover:opacity-100 transition-opacity duration-400 pointer-events-none" />
        <div className="absolute top-0 left-6 right-6 h-[3px] bg-gradient-to-r from-transparent via-primary to-transparent opacity-70 group-hover:opacity-100 transition-opacity duration-400" />

        <div className="relative z-10">
          {/* Header Row */}
          <div className="flex items-center justify-between mb-6">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary/20 via-primary/10 to-primary/5 border border-primary/35 text-primary flex items-center justify-center group-hover:bg-primary group-hover:text-white group-hover:scale-110 group-hover:shadow-[0_0_24px_rgba(239,68,68,0.5)] transition-all duration-300 shadow-md">
              <Icon className="w-7 h-7" />
            </div>
            <span className="text-xs font-black tracking-widest px-3 py-1 rounded-full bg-primary/10 text-primary border border-primary/20 shadow-sm">
              #{formattedIndex}
            </span>
          </div>

          {/* Title & Description */}
          <h3 className="text-xl font-extrabold tracking-tight text-foreground mb-3 group-hover:text-primary transition-colors leading-snug">
            {title}
          </h3>
          <p className="text-xs sm:text-sm text-muted-foreground/95 leading-relaxed mb-6 font-medium">
            {description}
          </p>

          {/* Features Pills List */}
          {features && features.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-6 pt-4 border-t border-border/60">
              {features.map((feature) => (
                <span
                  key={feature}
                  className="inline-flex items-center gap-1.5 text-[11px] font-bold px-3 py-1 rounded-full border border-primary/30 bg-primary/15 text-primary shadow-sm"
                >
                  <CheckCircle2 className="w-3 h-3 text-primary shrink-0" />
                  {feature}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* High-Impact Vibrant Action Button */}
        <Link
          to={link}
          className="relative z-10 inline-flex items-center justify-center gap-2 w-full py-3.5 rounded-2xl text-xs font-extrabold text-white bg-gradient-to-r from-primary via-red-500 to-primary border border-primary/40 shadow-[0_8px_20px_rgba(239,68,68,0.35)] hover:shadow-[0_12px_28px_rgba(239,68,68,0.55)] hover:scale-[1.02] active:scale-[0.98] transition-all duration-300"
        >
          Explore Service Solution
          <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
        </Link>
      </div>
    </motion.div>
  );
};

export default ServiceCard;
