import { ArrowRight, Play, Code, Ruler, Box, FileText } from "lucide-react";
import { Link } from "react-router-dom";

const HeroSection = () => {
  const services = [
    {
      icon: FileText,
      title: "PFD & P&ID Diagrams",
      description: "Process flow documentation",
      link: "/services/pfd-pid"
    },
    {
      icon: Box,
      title: "3D SolidWorks Modeling",
      description: "Advanced 3D modeling solutions",
      link: "/services/solidworks"
    },
    {
      icon: Ruler,
      title: "AutoCAD Technical Drawings",
      description: "Precision engineering drawings",
      link: "/services/autocad"
    },
    {
      icon: Code,
      title: "Web Design & Development",
      description: "Modern, responsive websites",
      link: "/services/web-design"
    }
  ];

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden py-20 md:py-24">
      {/* Premium layered background */}
      <div className="absolute inset-0">
        <div className="hero-glow top-24 -left-32" />
        <div className="absolute top-20 right-[-10rem] w-[28rem] h-[28rem] rounded-full bg-primary/7 blur-3xl" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(239,68,68,0.09),transparent_45%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0.05),transparent_22%,rgba(0,0,0,0.25)_100%)]" />

      </div>

      {/* Floating accents */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none hidden lg:block">
        <div className="absolute top-1/4 left-[8%] w-28 h-28 border border-primary/25 rounded-2xl bg-primary/10 backdrop-blur-sm motion-safe:animate-float" />
        <div className="absolute top-1/3 right-[12%] w-20 h-20 border border-border/50 rounded-xl bg-card/50 backdrop-blur-sm motion-safe:animate-float-delayed" />
        <div
          className="absolute bottom-1/3 left-[18%] w-14 h-14 border border-primary/30 rounded-lg bg-primary/10 motion-safe:animate-float"
          style={{ animationDelay: "1s" }}
        />
      </div>

      <div className="container-narrow relative z-10">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* LEFT SIDE - Hero Content */}
          <div>
            <div>
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/12 border border-primary/35 backdrop-blur-sm mb-6 shadow-[0_0_24px_rgba(239,68,68,0.2)]">
                <span className="w-2 h-2 bg-primary rounded-full animate-pulse" />
                <span className="text-sm font-medium text-primary">Engineering Excellence Redefined</span>
              </div>
            </div>

            <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold leading-[1.05] tracking-tight mb-6">
              <span className="text-foreground">Drawn</span>
              <br />
              <span className="text-gradient-primary">Dimension</span>
            </h1>

            <p className="text-lg md:text-xl text-muted-foreground/95 mb-8 leading-relaxed max-w-xl">
              Where precision engineering meets digital innovation. We transform complex challenges into elegant solutions.
            </p>

            <div className="flex flex-col sm:flex-row gap-4">
              <div>
                <Link
                  to="/contact"
                  className="btn-primary inline-flex items-center justify-center gap-2 group min-w-[210px] shadow-[0_12px_30px_rgba(239,68,68,0.35)]"
                >
                  Start Your Project
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </Link>
              </div>
              <div>
                <Link
                  to="/portfolio"
                  className="btn-outline inline-flex items-center justify-center gap-2 min-w-[210px] border-primary/25 bg-background/40 backdrop-blur-sm"
                >
                  <Play className="w-5 h-5" />
                  View Our Work
                </Link>
              </div>
            </div>
          </div>

          {/* RIGHT SIDE - Service Cards Grid */}
          <div className="grid grid-cols-2 gap-4 md:gap-5">
            {services.map((service, index) => {
              const Icon = service.icon;
              return (
                <div key={service.title}>
                  <Link to={service.link}>
                    <div className="group relative h-full p-6 rounded-2xl border border-border/50 bg-card/80 backdrop-blur-sm shadow-lg hover:shadow-xl hover:border-primary/40 transition-all duration-300 cursor-pointer">
                      {/* Glow effect on hover */}
                      <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-primary/0 to-primary/0 group-hover:from-primary/5 group-hover:to-primary/10 transition-all duration-300" />

                      <div className="relative z-10">
                        <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center mb-4 group-hover:bg-primary/15 group-hover:border-primary/30 transition-all duration-300">
                          <Icon className="w-6 h-6 text-primary" />
                        </div>
                        <h3 className="text-base font-semibold text-foreground mb-2 leading-tight">
                          {service.title}
                        </h3>
                        <p className="text-sm text-muted-foreground leading-snug">
                          {service.description}
                        </p>
                      </div>
                    </div>
                  </Link>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Smooth blend into next section */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-gradient-to-b from-transparent via-background/65 to-background" />
      <div className="pointer-events-none absolute -bottom-24 left-1/2 -translate-x-1/2 w-[70rem] h-40 rounded-full bg-background/60 blur-3xl opacity-70" />
    </section>
  );
};

export default HeroSection;
