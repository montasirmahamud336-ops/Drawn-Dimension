import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Linkedin, Facebook, Instagram, ArrowUp } from "lucide-react";
import { Link } from "react-router-dom";
import { getApiBaseUrl } from "@/components/admin/adminAuth";
import {
  DEFAULT_FOOTER_LINKS,
  DEFAULT_FOOTER_SERVICE_LINKS,
  isExternalHref,
  normalizeHeaderFooterSettings,
  type HeaderFooterLink,
} from "@/components/shared/headerFooterSettings";
import { resolveServiceLink, type ApiServiceRecord } from "@/components/shared/serviceCatalog";

type FooterServiceItem = HeaderFooterLink & {
  serviceId: number;
};

const buildOrderedFooterServices = (services: ApiServiceRecord[], savedOrder: number[]): FooterServiceItem[] => {
  const cleanedServices = services.filter(
    (service) => Number.isInteger(Number(service.id)) && Number(service.id) > 0 && String(service.name ?? "").trim()
  );

  const rank = new Map<number, number>();
  savedOrder.forEach((serviceId, index) => {
    rank.set(serviceId, index);
  });

  const mapped = cleanedServices.map((service, index) => {
    const serviceId = Number(service.id);
    const label = String(service.name ?? "").trim();
    return {
      id: `service-${serviceId}`,
      serviceId,
      label,
      href: resolveServiceLink(label, service.slug),
      fallbackIndex: index,
    };
  });

  mapped.sort((a, b) => {
    const aRank = rank.get(a.serviceId);
    const bRank = rank.get(b.serviceId);
    if (typeof aRank === "number" && typeof bRank === "number") return aRank - bRank;
    if (typeof aRank === "number") return -1;
    if (typeof bRank === "number") return 1;
    return a.fallbackIndex - b.fallbackIndex;
  });

  return mapped.map(({ fallbackIndex: _fallbackIndex, ...item }) => item);
};

const Footer = () => {
  const [footerMenuLinks, setFooterMenuLinks] = useState<HeaderFooterLink[]>(DEFAULT_FOOTER_LINKS);
  const [footerServiceLinks, setFooterServiceLinks] = useState<FooterServiceItem[]>(
    DEFAULT_FOOTER_SERVICE_LINKS.map((item, index) => ({ ...item, serviceId: index + 1 }))
  );

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  useEffect(() => {
    let mounted = true;
    const controller = new AbortController();
    const apiBase = getApiBaseUrl();

    const loadFooterData = async () => {
      try {
        const [settingsResult, servicesResult] = await Promise.allSettled([
          fetch(`${apiBase}/header-footer-settings`, { signal: controller.signal }),
          fetch(`${apiBase}/services?status=live`, { signal: controller.signal }),
        ]);

        if (!mounted) return;
        let savedOrder: number[] = [];

        if (settingsResult.status === "fulfilled") {
          if (settingsResult.value.ok) {
            const settingsData = await settingsResult.value.json();
            const normalized = normalizeHeaderFooterSettings(settingsData);
            setFooterMenuLinks(normalized.footer_links);
            savedOrder = normalized.footer_service_order;
          } else {
            console.error("Failed to fetch footer links");
          }
        }

        if (servicesResult.status === "fulfilled") {
          if (!servicesResult.value.ok) {
            console.error("Failed to fetch live services for footer");
            return;
          }
          const servicesData = (await servicesResult.value.json()) as ApiServiceRecord[];
          const liveServices = Array.isArray(servicesData) ? servicesData : [];
          setFooterServiceLinks(buildOrderedFooterServices(liveServices, savedOrder));
        }
      } catch (error) {
        if (controller.signal.aborted) return;
        console.error("Failed to load footer data", error);
      }
    };

    loadFooterData();

    return () => {
      mounted = false;
      controller.abort();
    };
  }, []);

  const footerLinks = {
    services: footerServiceLinks,
    company: footerMenuLinks,
    legal: [
      { id: "privacy-policy", label: "Privacy Policy", href: "/privacy-policy" },
      { id: "terms-of-service", label: "Terms of Service", href: "/terms-of-service" },
    ],
  };

  const socialLinks = [
    { icon: Linkedin, href: "#", label: "LinkedIn" },
    { icon: Facebook, href: "#", label: "Facebook" },
    { icon: Instagram, href: "#", label: "Instagram" },
  ];

  return (
    <footer className="relative overflow-hidden border-t border-border/50">
      <div className="absolute inset-0 bg-gradient-to-t from-secondary/50 to-transparent" />

      <div className="container-narrow relative z-10 py-16">
        <div className="grid md:grid-cols-2 lg:grid-cols-5 gap-12 mb-12">
          <div className="lg:col-span-2">
            <motion.div whileHover={{ scale: 1.02 }}>
              <Link to="/" className="flex items-center gap-3 mb-6">
                <img
                  src="/images/logo.png"
                  alt="DrawnDimension Logo"
                  width={48}
                  height={48}
                  loading="lazy"
                  decoding="async"
                  className="w-12 h-12 object-contain"
                />
                <span className="text-xl font-bold text-foreground">
                  Drawn<span className="text-primary">Dimension</span>
                </span>
              </Link>
            </motion.div>
            <p className="text-muted-foreground mb-6 max-w-sm">
              Engineering excellence meets digital innovation. We transform complex challenges into elegant solutions
              that drive your business forward.
            </p>
            <div className="flex gap-4">
              {socialLinks.map((social) => (
                <motion.a
                  key={social.label}
                  href={social.href}
                  aria-label={social.label}
                  className="w-10 h-10 rounded-lg bg-card border border-border flex items-center justify-center text-muted-foreground hover:text-primary hover:border-primary/50 transition-all"
                  whileHover={{ scale: 1.1, y: -2 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <social.icon className="w-5 h-5" />
                </motion.a>
              ))}
            </div>
          </div>

          <div>
            <h3 className="font-semibold text-foreground mb-4">Services</h3>
            <ul className="space-y-3">
              {footerLinks.services.length === 0 ? (
                <li className="text-muted-foreground/80 text-sm">No live services yet.</li>
              ) : (
                footerLinks.services.map((link) => (
                  <li key={link.id}>
                    <Link
                      to={link.href}
                      className="text-muted-foreground hover:text-primary transition-colors text-sm"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))
              )}
            </ul>
          </div>

          <div>
            <h3 className="font-semibold text-foreground mb-4">Company</h3>
            <ul className="space-y-3">
              {footerLinks.company.map((link) => (
                <li key={link.id}>
                  {isExternalHref(link.href) ? (
                    <a
                      href={link.href}
                      target="_blank"
                      rel="noreferrer"
                      className="text-muted-foreground hover:text-primary transition-colors text-sm"
                    >
                      {link.label}
                    </a>
                  ) : (
                    <Link to={link.href} className="text-muted-foreground hover:text-primary transition-colors text-sm">
                      {link.label}
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="font-semibold text-foreground mb-4">Legal</h3>
            <ul className="space-y-3">
              {footerLinks.legal.map((link) => (
                <li key={link.id}>
                  <Link to={link.href} className="text-muted-foreground hover:text-primary transition-colors text-sm">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="pt-8 border-t border-border/50 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-muted-foreground text-sm">
            (c) {new Date().getFullYear()} Drawn Dimension. All rights reserved.
          </p>
          <motion.button
            onClick={scrollToTop}
            className="w-10 h-10 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center text-primary hover:bg-primary hover:text-primary-foreground transition-all"
            whileHover={{ scale: 1.1, y: -2 }}
            whileTap={{ scale: 0.95 }}
            aria-label="Scroll to top"
          >
            <ArrowUp className="w-5 h-5" />
          </motion.button>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
