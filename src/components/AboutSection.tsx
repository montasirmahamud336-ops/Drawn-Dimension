import { motion } from "framer-motion";
import { useInView } from "framer-motion";
import { useRef } from "react";
import { Target, Lightbulb, Users, Award, MessageCircle } from "lucide-react";
import { Link } from "react-router-dom";

const AboutSection = () => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });
  const whatsappUrl = "https://wa.me/8801775119416";

  const values = [
    {
      icon: Target,
      title: "Precision",
      description: "Every detail matters. We deliver accuracy that exceeds industry standards.",
    },
    {
      icon: Lightbulb,
      title: "Innovation",
      description: "Pioneering solutions that push boundaries and redefine possibilities.",
    },
    {
      icon: Users,
      title: "Collaboration",
      description: "Your vision, our expertise. Together we create extraordinary results.",
    },
    {
      icon: Award,
      title: "Excellence",
      description: "Committed to delivering nothing less than exceptional quality.",
    },
  ];

  return (
    <section id="about" className="section-no-blend relative py-14 md:py-16 lg:py-20">
      {/* <div className="pointer-events-none absolute top-0 inset-x-0 h-24 bg-gradient-to-b from-background to-transparent" /> */}
      {/* <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-primary/8 to-transparent" /> */}
      <div className="absolute -left-20 top-1/3 w-72 h-72 rounded-full bg-primary/5 blur-3xl opacity-40" />

      <div className="container-narrow relative z-10" ref={ref}>
        <div className="grid lg:grid-cols-2 gap-16 items-start">
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            animate={isInView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          >
            <span className="text-primary font-semibold text-sm uppercase tracking-wider">
              About Us
            </span>
            <h2 className="text-4xl md:text-5xl font-bold leading-[1.12] mt-4 mb-6 pb-1 text-foreground">
              Building Tomorrow's
              <span className="text-gradient-primary block leading-[1.12] pb-1">Engineering Legacy</span>
            </h2>
            <p className="text-muted-foreground/95 text-lg leading-relaxed mb-8">
              At Drawn Dimension, we blend decades of technical expertise with cutting-edge
              digital innovation. Our multidisciplinary team transforms complex engineering
              challenges into streamlined, elegant solutions that drive your business forward.
            </p>
            <p className="text-muted-foreground leading-relaxed mb-8">
              From intricate AutoCAD technical drawings to sophisticated 3D modeling, from
              comprehensive HAZOP studies to stunning web experiences - we deliver excellence
              across every discipline we touch.
            </p>
            <div className="flex flex-col sm:flex-row items-start gap-3 w-full">
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <Link to="/about" className="btn-primary inline-flex items-center gap-2 whitespace-nowrap w-full sm:w-auto sm:min-w-[280px]">
                  Learn More About Us
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

          <motion.div
            initial={{ opacity: 0, x: 50 }}
            animate={isInView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.8, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className="grid grid-cols-2 gap-4"
          >
            {values.map((value, index) => (
              <motion.div
                key={value.title}
                initial={{ opacity: 0, y: 30 }}
                animate={isInView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.6, delay: 0.3 + index * 0.1, ease: [0.22, 1, 0.36, 1] }}
                className="glass-card p-6 group hover:border-primary/50 transition-all duration-500 bg-gradient-to-br from-background via-background to-primary/[0.04] border-border/60"
              >
                <div className="w-12 h-12 bg-primary/10 border border-primary/25 rounded-xl flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                  <value.icon className="w-6 h-6 text-primary" />
                </div>
                <h3 className="font-semibold text-foreground mb-2 tracking-tight">{value.title}</h3>
                <p className="text-sm text-muted-foreground/95 leading-relaxed">{value.description}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </div>
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-b from-transparent via-background/65 to-background" />
    </section>
  );
};

export default AboutSection;
