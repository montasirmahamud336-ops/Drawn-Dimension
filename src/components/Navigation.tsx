import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X, ChevronDown, User, LogOut } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import ThemeToggle from "@/components/ThemeToggle";

const Navigation = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isServicesOpen, setIsServicesOpen] = useState(false);
  const location = useLocation();
  const { user, signOut } = useAuth();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    setIsMobileMenuOpen(false);
    setIsServicesOpen(false);
  }, [location]);

  const navLinks = [
    { href: "/", label: "Home" },
    { href: "/about", label: "About" },
    {
      href: "/services",
      label: "Services",
      submenu: [
        { href: "/services/web-design", label: "Web Design & Development" },
        { href: "/services/autocad", label: "AutoCAD Drawings" },
        { href: "/services/solidworks", label: "3D SolidWorks" },
        { href: "/services/pfd-pid", label: "PFD & P&ID" },
        { href: "/services/hazop", label: "HAZOP Study" },
        { href: "/services/graphic-design", label: "Graphic Design" },
      ]
    },
    { href: "/products", label: "Products" },
    { href: "/portfolio", label: "Our Works" },
    { href: "/testimonials", label: "Reviews" },
    { href: "/contact", label: "Contact" },
  ];

  return (
    <motion.nav
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${isScrolled
        ? "bg-background/80 backdrop-blur-xl border-b border-border/50"
        : "bg-transparent"
        }`}
    >
      <div className="w-full px-4 sm:px-6 lg:px-10 xl:px-14 2xl:px-20">
        <div className="relative flex h-20 items-center justify-between">
          {/* Left: Logo */}
          <motion.div whileHover={{ scale: 1.02 }} className="z-20">
            <Link
              to="/"
              className="flex items-center gap-3"
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            >
              <img src="/images/logo.png" alt="DrawnDimension Logo" className="w-12 h-12 object-contain" />
              <span className="text-xl font-bold text-foreground">
                Drawn<span className="text-primary">Dimension</span>
              </span>
            </Link>
          </motion.div>

          {/* Center: Navigation Links */}
          <div className="hidden lg:flex items-center gap-6 absolute left-1/2 -translate-x-1/2">
            {navLinks.map((link) => (
              <div key={link.href} className="relative group">
                {link.submenu ? (
                  <>
                    <Link
                      to={link.href}
                      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                      className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors duration-300 text-sm font-medium py-2"
                    >
                      {link.label}
                      <ChevronDown className="w-4 h-4" />
                    </Link>
                    <div className="absolute top-full left-0 pt-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300">
                      <div className="bg-card/95 backdrop-blur-xl border border-border rounded-xl p-2 min-w-[220px] shadow-lg">
                        <Link
                          to={link.href}
                          className="block px-4 py-2 text-sm text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-lg transition-colors"
                        >
                          All Services
                        </Link>
                        <div className="border-t border-border my-2" />
                        {link.submenu.map((sublink) => (
                          <Link
                            key={sublink.href}
                            to={sublink.href}
                            className="block px-4 py-2 text-sm text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-lg transition-colors"
                          >
                            {sublink.label}
                          </Link>
                        ))}
                      </div>
                    </div>
                  </>
                ) : (
                  <motion.div whileHover={{ y: -2 }}>
                    <Link
                      to={link.href}
                      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                      className={`text-sm font-medium transition-colors duration-300 ${location.pathname === link.href
                        ? "text-primary"
                        : "text-muted-foreground hover:text-foreground"
                        }`}
                    >
                      {link.label}
                    </Link>
                  </motion.div>
                )}
              </div>
            ))}
          </div>

          {/* Right: Theme Toggle + Auth */}
          <div className="hidden lg:flex items-center gap-3 ml-auto z-20">
            <ThemeToggle />
            {user ? (
              <div className="flex items-center gap-3">
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.98 }}>
                  <Link to="/dashboard" className="btn-primary text-sm py-3 px-6">
                    Dashboard
                  </Link>
                </motion.div>
                <button
                  onClick={() => signOut()}
                  className="p-2 rounded-lg text-muted-foreground hover:text-foreground transition-colors"
                  title="Sign out"
                >
                  <LogOut className="w-5 h-5" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.98 }}>
                  <Link to="/contact" className="btn-outline h-10 min-w-[132px] px-5 py-2 text-sm rounded-lg">
                    Get Started
                  </Link>
                </motion.div>
                <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.98 }}>
                  <Link
                    to="/auth?mode=signup"
                    className="btn-primary h-10 min-w-[132px] px-5 py-2 text-sm rounded-lg"
                  >
                    Sign Up
                  </Link>
                </motion.div>
              </div>
            )}
          </div>

          {/* Mobile Controls */}
          <div className="lg:hidden flex items-center gap-2">
            <ThemeToggle />
            <button
              className="text-foreground p-2"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="lg:hidden bg-background/95 backdrop-blur-xl border-b border-border"
          >
            <div className="container-narrow py-6 flex flex-col gap-2">
              {navLinks.map((link) => (
                <div key={link.href}>
                  {link.submenu ? (
                    <>
                      <div className="flex items-center justify-between">
                        <Link
                          to={link.href}
                          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                          className="flex-1 text-muted-foreground hover:text-foreground transition-colors py-3 text-lg"
                        >
                          {link.label}
                        </Link>
                        <button
                          onClick={() => setIsServicesOpen(!isServicesOpen)}
                          className="p-3 text-muted-foreground hover:text-foreground transition-colors"
                        >
                          <ChevronDown className={`w-5 h-5 transition-transform ${isServicesOpen ? 'rotate-180' : ''}`} />
                        </button>
                      </div>
                      <AnimatePresence>
                        {isServicesOpen && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                            className="pl-4 border-l border-border ml-2"
                          >
                            <Link
                              to={link.href}
                              className="block text-muted-foreground hover:text-primary transition-colors py-2"
                            >
                              All Services
                            </Link>
                            {link.submenu.map((sublink) => (
                              <Link
                                key={sublink.href}
                                to={sublink.href}
                                className="block text-muted-foreground hover:text-primary transition-colors py-2"
                              >
                                {sublink.label}
                              </Link>
                            ))}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </>
                  ) : (
                    <Link
                      to={link.href}
                      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                      className={`block py-3 text-lg transition-colors ${location.pathname === link.href
                        ? "text-primary"
                        : "text-muted-foreground hover:text-foreground"
                        }`}
                    >
                      {link.label}
                    </Link>
                  )}
                </div>
              ))}
              {user ? (
                <div className="flex flex-col gap-2 mt-4">
                  <Link to="/dashboard" className="btn-primary text-center">
                    Dashboard
                  </Link>
                  <button
                    onClick={() => signOut()}
                    className="text-muted-foreground hover:text-foreground transition-colors py-2"
                  >
                    Sign Out
                  </button>
                </div>
              ) : (
                <div className="flex flex-col gap-2 mt-4">
                  <Link to="/contact" className="btn-outline text-center h-11">
                    Get Started
                  </Link>
                  <Link to="/auth?mode=signup" className="btn-primary text-center h-11">
                    Sign Up
                  </Link>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.nav>
  );
};

export default Navigation;
