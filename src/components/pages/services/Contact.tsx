import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import PageTransition from "@/components/shared/PageTransition";
import PageHero from "@/components/shared/PageHero";
import { motion } from "framer-motion";
import { useState } from "react";
import { Mail, Phone, MapPin, Send, CheckCircle, Clock, Globe } from "lucide-react";
import PremiumBackground from "@/components/shared/PremiumBackground";

const Contact = () => {
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const formData = new FormData(form);

    const firstName = formData.get("firstName");
    const lastName = formData.get("lastName");
    const email = formData.get("email");
    const phone = formData.get("phone");
    const service = formData.get("service");
    const details = formData.get("details");

    const subject = `New Project Inquiry: ${service} - ${firstName} ${lastName}`;
    const body = `
Name: ${firstName} ${lastName}
Email: ${email}
Phone: ${phone}
Service Interested In: ${service}

Project Details:
${details}
    `.trim();

    window.location.href = `mailto:drawndimensioninfo@gmail.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

    setIsSubmitted(true);
    setTimeout(() => setIsSubmitted(false), 3000);
    form.reset();
  };

  const contactInfo = [
    {
      icon: Mail,
      title: "Email Us",
      value: "drawndimensioninfo@gmail.com",
      description: "We'll respond within 24 hours",
      href: "mailto:drawndimensioninfo@gmail.com",
    },
    {
      icon: Phone,
      title: "WhatsApp",
      value: "+880 1775-119416",
      description: "Mon-Fri from 9am to 6pm",
      href: "https://wa.me/8801775119416",
    },
    {
      icon: MapPin,
      title: "Visit Us",
      value: "Dhaka, Bangladesh",
      description: "Available for global projects",
      href: "https://maps.google.com/?q=Dhaka,Bangladesh",
    },
    {
      icon: Clock,
      title: "Business Hours",
      value: "9:00 AM - 6:00 PM",
      description: "Sunday to Thursday",
      href: null,
    },
  ];

  const services = [
    "Web Design & Development",
    "AutoCAD Technical Drawings",
    "3D SolidWorks Modeling",
    "PFD & P&ID Diagrams",
    "HAZOP Study & Risk Analysis",
    "Graphic Design & Branding",
    "Other Services",
  ];

  return (
    <PageTransition>
      <PremiumBackground>
        <Navigation />
        <main>
          <PageHero
            title="Get In Touch"
            subtitle="Contact Us"
            description="Have a project in mind? We'd love to hear from you. Send us a message and we'll respond as soon as possible."
          />

          <section className="section-padding relative overflow-hidden">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_20%,rgba(239,68,68,0.12),transparent_34%)] pointer-events-none" />
            <div className="absolute -bottom-24 right-[-10%] w-[25rem] h-[25rem] rounded-full bg-primary/10 blur-3xl pointer-events-none" />
            <div className="container-narrow relative z-10">
              <div className="grid lg:grid-cols-5 gap-10 xl:gap-12">
                {/* Contact Info */}
                <motion.div
                  initial={{ opacity: 0, x: -50 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.8 }}
                  className="lg:col-span-2 space-y-6"
                >
                  {contactInfo.map((info, index) => (
                    <motion.a
                      key={info.title}
                      href={info.href || "#"}
                      target={info.href ? "_blank" : undefined}
                      rel={info.href ? "noopener noreferrer" : undefined}
                      initial={{ opacity: 0, y: 20 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.5, delay: index * 0.1 }}
                      className={`glass-card p-6 group bg-[linear-gradient(150deg,rgba(255,255,255,0.04),rgba(255,255,255,0.01)_42%,rgba(239,68,68,0.08)_100%)] border-border/60 hover:border-primary/45 transition-all duration-500 hover:-translate-y-1 block ${!info.href ? 'cursor-default' : 'cursor-pointer'}`}
                      onClick={(e) => !info.href && e.preventDefault()}
                    >
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 bg-primary/12 border border-primary/25 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:bg-primary/20 group-hover:border-primary/45 transition-colors">
                          <info.icon className="w-6 h-6 text-primary" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-foreground mb-1">{info.title}</h3>
                          <p className="text-foreground">{info.value}</p>
                          <p className="text-sm text-muted-foreground">{info.description}</p>
                        </div>
                      </div>
                    </motion.a>
                  ))}

                  {/* Global Service */}
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5, delay: 0.4 }}
                    className="glass-card p-6 border-primary/20 bg-gradient-to-br from-background/80 to-primary/[0.06]"
                  >
                    <div className="flex items-center gap-3 mb-4">
                      <Globe className="w-6 h-6 text-primary" />
                      <h3 className="font-semibold text-foreground">Global Service</h3>
                    </div>
                    <p className="text-muted-foreground text-sm">
                      We work with clients worldwide. No matter where you're located,
                      we're ready to deliver exceptional engineering and design solutions.
                    </p>
                  </motion.div>
                </motion.div>

                {/* Contact Form */}
                <motion.div
                  initial={{ opacity: 0, x: 50 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.8, delay: 0.2 }}
                  className="lg:col-span-3"
                >
                  <form onSubmit={handleSubmit} className="glass-card p-8 md:p-9 border-border/60 bg-[linear-gradient(160deg,rgba(255,255,255,0.04),rgba(255,255,255,0.01)_42%,rgba(239,68,68,0.08)_100%)] relative overflow-hidden">
                    <div className="pointer-events-none absolute top-0 left-8 right-8 h-px bg-gradient-to-r from-transparent via-primary/70 to-transparent" />
                    <div className="mb-6">
                      <h3 className="text-xl font-semibold tracking-tight text-foreground">Project Brief</h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        Share your requirements and we will get back with a tailored execution plan.
                      </p>
                    </div>

                    <div className="grid sm:grid-cols-2 gap-6 mb-6">
                      <div>
                        <label className="block text-sm font-medium text-foreground mb-2">
                          First Name
                        </label>
                        <input
                          type="text"
                          name="firstName"
                          required
                          className="w-full px-4 py-3 bg-background/70 border border-border/65 rounded-xl focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all text-foreground placeholder:text-muted-foreground"
                          placeholder="John"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-foreground mb-2">
                          Last Name
                        </label>
                        <input
                          type="text"
                          name="lastName"
                          required
                          className="w-full px-4 py-3 bg-background/70 border border-border/65 rounded-xl focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all text-foreground placeholder:text-muted-foreground"
                          placeholder="Doe"
                        />
                      </div>
                    </div>

                    <div className="grid sm:grid-cols-2 gap-6 mb-6">
                      <div>
                        <label className="block text-sm font-medium text-foreground mb-2">
                          Email Address
                        </label>
                        <input
                          type="email"
                          name="email"
                          required
                          className="w-full px-4 py-3 bg-background/70 border border-border/65 rounded-xl focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all text-foreground placeholder:text-muted-foreground"
                          placeholder="john@example.com"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-foreground mb-2">
                          Phone Number
                        </label>
                        <input
                          type="tel"
                          name="phone"
                          className="w-full px-4 py-3 bg-background/70 border border-border/65 rounded-xl focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all text-foreground placeholder:text-muted-foreground"
                          placeholder="+1 (555) 000-0000"
                        />
                      </div>
                    </div>

                    <div className="mb-6">
                      <label className="block text-sm font-medium text-foreground mb-2">
                        Service Interested In
                      </label>
                      <select
                        name="service"
                        required
                        className="w-full px-4 py-3 bg-background/70 border border-border/65 rounded-xl focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all text-foreground appearance-none"
                      >
                        <option value="">Select a service</option>
                        {services.map((service) => (
                          <option key={service} value={service}>
                            {service}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="mb-6">
                      <label className="block text-sm font-medium text-foreground mb-2">
                        Project Details
                      </label>
                      <textarea
                        name="details"
                        required
                        rows={5}
                        className="w-full px-4 py-3 bg-background/70 border border-border/65 rounded-xl focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all text-foreground placeholder:text-muted-foreground resize-none"
                        placeholder="Tell us about your project, requirements, and timeline..."
                      />
                    </div>

                    <motion.button
                      type="submit"
                      className="w-full btn-primary flex items-center justify-center gap-2"
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.99 }}
                      disabled={isSubmitted || isLoading}
                    >
                      {isSubmitted ? (
                        <>
                          <CheckCircle className="w-5 h-5" />
                          An engineer will contact you shortly
                        </>
                      ) : isLoading ? (
                        <>
                          <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          Sending...
                        </>
                      ) : (
                        <>
                          <Send className="w-5 h-5" />
                          Send Message
                        </>
                      )}
                    </motion.button>
                  </form>
                </motion.div>
              </div>
            </div>
          </section>
        </main>
        <Footer />
      </PremiumBackground>
    </PageTransition>
  );
};

export default Contact;
