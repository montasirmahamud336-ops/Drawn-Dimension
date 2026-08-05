import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";

const ScrollToTop = () => {
  const { pathname } = useLocation();
  const isFirstRender = useRef(true);

  useEffect(() => {
    const lenis = (window as Window & { __lenis?: any }).__lenis;
    if (lenis) {
      lenis.scrollTo(0, { immediate: true });
      setTimeout(() => lenis.resize(), 50);
    } else {
      window.scrollTo(0, 0);
    }
  }, [pathname]);

  return null;
};

export default ScrollToTop;
