import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import PageTransition from "@/components/shared/PageTransition";
import PageHero from "@/components/shared/PageHero";
import LeadershipTeam from "@/components/LeadershipTeam";
import OurEmployeesSection from "@/components/OurEmployeesSection";
import { motion } from "framer-motion";
import { useInView } from "framer-motion";
import { useRef } from "react";
import { Target, Lightbulb, Users, Award, Building2, Globe, Wrench } from "lucide-react";
import PremiumBackground from "@/components/shared/PremiumBackground";

const About = () => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  const values = [
    {
      icon: Target,
      title: "Precision",
      description: "Every detail matters. We deliver accuracy that exceeds industry standards in all our engineering and design work.",
    },
    {
      icon: Lightbulb,
      title: "Innovation",
      description: "Pioneering solutions that push boundaries and redefine what's possible in engineering and digital design.",
    },
    {
      icon: Users,
      title: "Collaboration",
      description: "Your vision, our expertise. Together we create extraordinary results that exceed expectations.",
    },
    {
      icon: Award,
      title: "Excellence",
      description: "Committed to delivering nothing less than exceptional quality in every project we undertake.",
    },
  ];

  const stats = [
    { value: "500+", label: "Projects Delivered" },
    { value: "98%", label: "Client Satisfaction" },
    { value: "15+", label: "Years Experience" },
    { value: "50+", label: "Team Experts" },
  ];

  const milestones = [
    { year: "2008", title: "Founded", description: "Drawn Dimension was established with a vision to bridge engineering precision with creative innovation." },
    { year: "2012", title: "Expansion", description: "Expanded our services to include comprehensive 3D modeling and digital design solutions." },
    { year: "2016", title: "Global Reach", description: "Extended our client base globally, serving industries across 20+ countries." },
    { year: "2020", title: "Digital Transformation", description: "Launched our web development division, offering end-to-end digital solutions." },
    { year: "2024", title: "Industry Leader", description: "Recognized as a leading provider of engineering and creative services worldwide." },
  ];

  return (
    <PageTransition>
      <PremiumBackground>
        <Navigation />
        <main>
          <PageHero
            title="About Drawn Dimension"
            subtitle="Our Story"
            description="Where precision engineering meets digital innovation. We transform complex challenges into elegant solutions through cutting-edge technology and expert craftsmanship."
          />

          {/* Mission & Vision */}
          <section className="section-padding section-no-blend relative overflow-hidden" ref={ref}>
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_18%,rgba(239,68,68,0.11),transparent_35%)] pointer-events-none" />
            <div className="absolute -bottom-20 right-[-9%] w-[23rem] h-[23rem] rounded-full bg-primary/10 blur-3xl pointer-events-none" />
            <div className="container-narrow relative z-10">
              <div className="grid lg:grid-cols-2 gap-16 items-center">
                <motion.div
                  initial={{ opacity: 0, x: -50 }}
                  animate={isInView ? { opacity: 1, x: 0 } : {}}
                  transition={{ duration: 0.8 }}
                >
                  <h2 className="text-4xl font-bold leading-[1.12] mb-6 pb-1 text-foreground">
                    Building Tomorrow's
                    <span className="text-gradient-primary block leading-[1.12] pb-1">Engineering Legacy</span>
                  </h2>
                  <p className="text-muted-foreground text-lg leading-relaxed mb-6">
                    At Drawn Dimension, we blend decades of technical expertise with
                    cutting-edge digital innovation. Our multidisciplinary team transforms
                    complex engineering challenges into streamlined, elegant solutions
                    that drive your business forward.
                  </p>
                  <p className="text-muted-foreground leading-relaxed mb-8">
                    From intricate AutoCAD technical drawings to sophisticated 3D modeling,
                    from comprehensive HAZOP studies to stunning web experiences—we deliver
                    excellence across every discipline we touch.
                  </p>

                  <div className="grid grid-cols-2 gap-4">
                    {[
                      { icon: Building2, label: "Industry Expertise" },
                      { icon: Globe, label: "Global Projects" },
                      { icon: Wrench, label: "Technical Excellence" },
                      { icon: Award, label: "Award Winning" },
                    ].map((item) => (
                      <div key={item.label} className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                          <item.icon className="w-5 h-5 text-primary" />
                        </div>
                        <span className="text-sm text-foreground">{item.label}</span>
                      </div>
                    ))}
                  </div>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, x: 50 }}
                  animate={isInView ? { opacity: 1, x: 0 } : {}}
                  transition={{ duration: 0.8, delay: 0.2 }}
                  className="glass-card p-8"
                >
                  <h3 className="text-2xl font-bold mb-6 text-foreground">Our Mission</h3>
                  <p className="text-muted-foreground mb-8">
                    To empower businesses with innovative engineering and digital solutions
                    that drive growth, efficiency, and success in an ever-evolving world.
                  </p>
                  <h3 className="text-2xl font-bold mb-6 text-foreground">Our Vision</h3>
                  <p className="text-muted-foreground">
                    To be the global leader in integrated engineering and creative services,
                    setting new standards for excellence, innovation, and client satisfaction.
                  </p>
                </motion.div>
              </div>
            </div>
          </section>

          {/* Stats */}
          <section className="py-16">
            <div className="container-narrow">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
                {stats.map((stat, index) => (
                  <motion.div
                    key={stat.label}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5, delay: index * 0.1 }}
                    className="text-center"
                  >
                    <div className="text-4xl md:text-5xl font-bold text-primary mb-2">
                      {stat.value}
                    </div>
                    <div className="text-muted-foreground">{stat.label}</div>
                  </motion.div>
                ))}
              </div>
            </div>
          </section>

          {/* Core Values */}
          <section className="section-padding">
            <div className="container-narrow">
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.8 }}
                className="text-center mb-16"
              >
                <span className="text-primary font-semibold text-sm uppercase tracking-wider">
                  What Drives Us
                </span>
                <h2 className="text-4xl md:text-5xl font-bold mt-4 text-foreground">
                  Our Core Values
                </h2>
              </motion.div>

              <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                {values.map((value, index) => (
                  <motion.div
                    key={value.title}
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5, delay: index * 0.1 }}
                    className="glass-card p-6 group hover:border-primary/50 transition-all duration-500"
                  >
                    <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                      <value.icon className="w-6 h-6 text-primary" />
                    </div>
                    <h3 className="font-semibold text-foreground mb-2">{value.title}</h3>
                    <p className="text-sm text-muted-foreground">{value.description}</p>
                  </motion.div>
                ))}
              </div>
            </div>
          </section>

          {/* Timeline */}
          <section className="section-padding">
            <div className="container-narrow">
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.8 }}
                className="text-center mb-16"
              >
                <span className="text-primary font-semibold text-sm uppercase tracking-wider">
                  Our Journey
                </span>
                <h2 className="text-4xl md:text-5xl font-bold mt-4 text-foreground">
                  Company Milestones
                </h2>
              </motion.div>

              <div className="relative">
                <div className="absolute left-1/2 transform -translate-x-1/2 h-full w-px bg-border/50 hidden md:block" />

                {milestones.map((milestone, index) => (
                  <motion.div
                    key={milestone.year}
                    initial={{ opacity: 0, x: index % 2 === 0 ? -50 : 50 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6, delay: index * 0.1 }}
                    className={`relative flex items-center mb-8 ${index % 2 === 0 ? "md:flex-row" : "md:flex-row-reverse"
                      }`}
                  >
                    <div className={`w-full md:w-1/2 ${index % 2 === 0 ? "md:pr-12 md:text-right" : "md:pl-12"}`}>
                      <div className="glass-card p-6">
                        <span className="text-primary font-bold text-xl">{milestone.year}</span>
                        <h3 className="text-lg font-semibold text-foreground mt-2">{milestone.title}</h3>
                        <p className="text-sm text-muted-foreground mt-2">{milestone.description}</p>
                      </div>
                    </div>
                    <div className="absolute left-1/2 transform -translate-x-1/2 w-4 h-4 bg-primary rounded-full hidden md:block" />
                  </motion.div>
                ))}
              </div>
            </div>
          </section>

          {/* Leadership Team */}
          <LeadershipTeam />

          {/* Our Employees */}
          <OurEmployeesSection />
        </main>
        <Footer />
      </PremiumBackground>
    </PageTransition>
  );
};

export default About;
