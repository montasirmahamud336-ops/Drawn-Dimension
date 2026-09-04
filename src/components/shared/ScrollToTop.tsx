import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";

const ScrollToTop = () => {
  const location = useLocation();

  useEffect(() => {
    const lenis = (window as Window & { __lenis?: any }).__lenis;
    if (lenis) {
      lenis.scrollTo(0, { immediate: true });
      setTimeout(() => lenis.resize(), 50);
      setTimeout(() => lenis.resize(), 250);
      setTimeout(() => lenis.resize(), 600);
    } else {
      window.scrollTo(0, 0);
    }
  }, [location.pathname, location.search]);

  return null;
};

export default ScrollToTop;
