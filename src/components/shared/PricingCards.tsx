import { motion } from "framer-motion";
import { Check, Star, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

interface PricingTier {
  name: string;
  price: string;
  description: string;
  features: string[];
  popular?: boolean;
}

interface PricingCardsProps {
  tiers: PricingTier[];
  badge?: string;
  title?: string;
  description?: string;
}

const PricingCards = ({
  tiers,
  badge = "Pricing Plans",
  title = "Choose Your Plan",
  description = "All plans require payment before service delivery begins. Custom quotes available for complex projects.",
}: PricingCardsProps) => {
  return (
    <section className="section-padding bg-secondary/25 relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_18%_12%,rgba(239,68,68,0.1),transparent_34%)]" />
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_85%_24%,rgba(14,165,233,0.06),transparent_36%)]" />
      <div className="container-narrow">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="text-center mb-16"
        >
          <span className="inline-flex items-center rounded-full border border-primary/35 bg-primary/10 px-4 py-1.5 text-primary font-semibold text-xs uppercase tracking-[0.16em]">
            {badge}
          </span>
          <h2 className="text-[clamp(1.95rem,4.2vw,3rem)] font-bold mt-4 text-foreground text-balance">
            {title}
          </h2>
          <p className="text-muted-foreground/90 mt-4 max-w-2xl mx-auto leading-relaxed">
            {description}
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {tiers.map((tier, index) => (
            <motion.div
              key={tier.name}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className={`relative glass-card p-6 flex flex-col border-border/60 bg-[linear-gradient(160deg,rgba(255,255,255,0.08),rgba(255,255,255,0.015)_46%,rgba(239,68,68,0.06)_100%)] ${tier.popular ? "border-primary ring-2 ring-primary/35 shadow-[0_26px_48px_-30px_rgba(239,68,68,0.66)] overflow-hidden pt-12" : "hover:border-primary/40 hover:-translate-y-1 transition-all duration-500"
                }`}
            >
              <div className="pointer-events-none absolute top-0 left-8 right-8 h-px bg-gradient-to-r from-transparent via-primary/65 to-transparent" />
              {tier.popular && (
                <>
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-primary/5 pointer-events-none" />
                  <div className="absolute -top-24 -right-24 w-48 h-48 bg-primary/20 rounded-full blur-[60px] pointer-events-none animate-glow-pulse" />
                  <div className="absolute -bottom-16 -left-16 w-32 h-32 bg-primary/15 rounded-full blur-[40px] pointer-events-none animate-glow-pulse" style={{ animationDelay: '1.5s' }} />
                  <div className="absolute top-0 left-0 right-0 flex justify-center z-10">
                    <span className="inline-flex items-center gap-1 px-4 py-1.5 rounded-b-xl bg-primary text-primary-foreground text-xs font-bold shadow-glow">
                      <Star className="w-3 h-3" /> Most Popular
                    </span>
                  </div>
                </>
              )}

              <div className="mb-6">
                <h3 className="text-lg font-semibold text-foreground text-balance">{tier.name}</h3>
                <div className="mt-2">
                  <span className="text-3xl font-bold text-foreground">{tier.price}</span>
                </div>
                <p className="text-sm text-muted-foreground/90 mt-2 leading-relaxed">{tier.description}</p>
              </div>

              <ul className="space-y-3 flex-grow mb-6">
                {tier.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2.5">
                    <Check className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                    <span className="text-sm text-muted-foreground/90">{feature}</span>
                  </li>
                ))}
              </ul>

              <Link
                to={tier.price.includes("$") ? `/payment?plan=${encodeURIComponent(tier.name)}&price=${encodeURIComponent(tier.price)}` : "/contact"}
                className={`relative inline-flex items-center justify-center gap-2 w-full py-3 rounded-xl text-sm font-semibold transition-all duration-300 overflow-hidden ${tier.popular
                    ? "bg-primary text-primary-foreground hover:bg-primary/90 shadow-glow"
                    : "bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground border border-primary/30 hover:border-primary"
                  }`}
              >
                {tier.popular && (
                  <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer bg-[length:200%_100%]" />
                )}
                {tier.price.includes("$") ? "Buy Now" : "Get Started"}
                <ArrowRight className="w-4 h-4" />
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default PricingCards;
