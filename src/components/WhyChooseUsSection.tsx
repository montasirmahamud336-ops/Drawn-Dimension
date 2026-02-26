import { motion } from "framer-motion";
import { useInView } from "framer-motion";
import { useRef } from "react";
import { Check, Zap, Clock, HeadphonesIcon, Shield, TrendingUp, MessageCircle } from "lucide-react";
import { Link } from "react-router-dom";

const WhyChooseUsSection = () => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });
  const whatsappUrl = "https://wa.me/8801775119416";

  const reasons = [
    {
      icon: Zap,
      title: "Cutting-Edge Technology",
      description:
        "We leverage the latest tools and technologies to deliver innovative solutions that keep you ahead of the competition.",
    },
    {
      icon: Clock,
      title: "On-Time Delivery",
      description:
        "We respect your timelines. Our streamlined processes ensure projects are completed on schedule without compromising quality.",
    },
    {
      icon: HeadphonesIcon,
      title: "Dedicated Support",
      description:
        "Our team provides ongoing support and consultation, ensuring your success long after project completion.",
    },
    {
      icon: Shield,
      title: "Quality Assurance",
      description:
        "Rigorous quality checks at every stage guarantee deliverables that meet the highest industry standards.",
    },
    {
      icon: TrendingUp,
      title: "Scalable Solutions",
      description:
        "Our solutions grow with your business, designed to adapt and scale as your needs evolve.",
    },
    {
      icon: Check,
      title: "Proven Track Record",
      description:
        "With 500+ successful projects and a 98% client satisfaction rate, our results speak for themselves.",
    },
  ];

  return (
    <section id="why-us" className="relative overflow-hidden py-14 md:py-16 lg:py-20">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-border/55 to-transparent" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-background to-transparent" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/8 rounded-full blur-[100px]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_30%,rgba(239,68,68,0.12),transparent_36%)] pointer-events-none" />

      <div className="container-narrow relative z-10" ref={ref}>
        <div className="grid lg:grid-cols-2 gap-16 items-start">
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            animate={isInView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
            className="grid sm:grid-cols-2 gap-6"
          >
            {reasons.map((reason, index) => (
              <motion.div
                key={reason.title}
                initial={{ opacity: 0, y: 30 }}
                animate={isInView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.6, delay: index * 0.1, ease: [0.22, 1, 0.36, 1] }}
                className="group"
              >
                <div className="glass-card p-5 bg-gradient-to-br from-background via-background to-primary/[0.05] border-border/60 hover:border-primary/45 transition-all duration-500 flex items-start gap-4 h-full">
                  <div className="w-12 h-12 bg-primary/12 border border-primary/25 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:bg-primary/20 transition-colors duration-500">
                    <reason.icon className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground mb-2 tracking-tight">{reason.title}</h3>
                    <p className="text-sm text-muted-foreground/95 leading-relaxed">{reason.description}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 50 }}
            animate={isInView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.8, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className="lg:pl-8"
          >
            <span className="text-primary font-semibold text-sm uppercase tracking-wider">
              Why Choose Us
            </span>
            <h2 className="text-4xl md:text-5xl font-bold mt-4 mb-6 text-foreground">
              Your Success Is
              <span className="text-gradient-primary block">Our Priority</span>
            </h2>
            <p className="text-muted-foreground/95 text-lg leading-relaxed mb-8">
              We do not just deliver projects - we build partnerships. Our commitment to
              excellence, combined with deep technical expertise and genuine care for your
              success, sets us apart in the industry.
            </p>

            <div className="glass-card p-6 mb-8 border-primary/20 bg-gradient-to-br from-background to-primary/[0.06]">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <div className="text-2xl font-bold text-primary">ISO</div>
                  <div className="text-xs text-muted-foreground">Certified</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-primary">24/7</div>
                  <div className="text-xs text-muted-foreground">Support</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-primary">100%</div>
                  <div className="text-xs text-muted-foreground">Secure</div>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-start gap-3 w-full">
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <Link to="/contact" className="btn-primary gap-2 whitespace-nowrap w-full sm:w-auto sm:min-w-[280px]">
                  Start Your Project Today
                </Link>
              </motion.div>
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center justify-center gap-2 h-[48px] w-full sm:w-auto sm:min-w-[280px] whitespace-nowrap px-8 rounded-xl border border-emerald-600/50 dark:border-emerald-500/35 bg-emerald-500/16 dark:bg-emerald-500/12 text-emerald-700 dark:text-emerald-300 font-semibold hover:bg-emerald-500/24 dark:hover:bg-emerald-500/20 hover:border-emerald-700/70 dark:hover:border-emerald-400/55 shadow-[0_8px_20px_rgba(16,185,129,0.16)] transition-all duration-300"
                >
                  Message Us on WhatsApp
                  <MessageCircle className="w-4 h-4" />
                </a>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default WhyChooseUsSection;
