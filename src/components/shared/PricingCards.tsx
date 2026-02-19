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
}

const PricingCards = ({ tiers }: PricingCardsProps) => {
  return (
    <section className="section-padding bg-secondary/30">
      <div className="container-narrow">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="text-center mb-16"
        >
          <span className="text-primary font-semibold text-sm uppercase tracking-wider">
            Pricing Plans
          </span>
          <h2 className="text-4xl font-bold mt-4 text-foreground">
            Choose Your Plan
          </h2>
          <p className="text-muted-foreground mt-4 max-w-xl mx-auto">
            All plans require payment before service delivery begins. Custom quotes available for complex projects.
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
              className={`relative glass-card p-6 flex flex-col border-primary/30 bg-gradient-to-b from-primary/5 to-transparent ${tier.popular ? "border-primary ring-2 ring-primary/40 shadow-glow overflow-hidden pt-12" : ""
                }`}
            >
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
                <h3 className="text-lg font-semibold text-foreground">{tier.name}</h3>
                <div className="mt-2">
                  <span className="text-3xl font-bold text-foreground">{tier.price}</span>
                </div>
                <p className="text-sm text-muted-foreground mt-2">{tier.description}</p>
              </div>

              <ul className="space-y-3 flex-grow mb-6">
                {tier.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2.5">
                    <Check className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                    <span className="text-sm text-muted-foreground">{feature}</span>
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
