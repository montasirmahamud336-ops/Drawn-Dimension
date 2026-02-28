import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";

const ScrollToTop = () => {
  const { pathname } = useLocation();
  const isFirstRender = useRef(true);

  useEffect(() => {
    const behavior = isFirstRender.current ? "auto" : "smooth";
    window.scrollTo({ top: 0, left: 0, behavior });
    isFirstRender.current = false;
  }, [pathname]);

  return null;
};

export default ScrollToTop;
