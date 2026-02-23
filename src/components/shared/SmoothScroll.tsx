import { useEffect, useRef } from "react";
import Lenis from "lenis";

const SmoothScroll = () => {
    const lenisRef = useRef<Lenis | null>(null);

    useEffect(() => {
        const lenis = new Lenis({
            duration: 0.85,
            easing: (t) => 1 - Math.pow(1 - t, 3),
            orientation: "vertical",
            gestureOrientation: "vertical",
            smoothWheel: true,
            touchMultiplier: 1.2,
            // Keep native scrolling inside overlays/modals.
            prevent: (node) => {
                return !!node?.closest?.("[data-lenis-prevent]");
            },
        });

        lenisRef.current = lenis;

        const syncLenisState = () => {
            const hasOpenDialog = !!document.querySelector('[role="dialog"][data-state="open"]');
            const isScrollLocked = document.body.hasAttribute("data-scroll-locked");

            if (hasOpenDialog || isScrollLocked) {
                lenis.stop();
            } else {
                lenis.start();
            }
        };

        syncLenisState();

        const observer = new MutationObserver(() => {
            syncLenisState();
        });

        observer.observe(document.body, {
            attributes: true,
            attributeFilter: ["data-scroll-locked"],
            childList: true,
            subtree: false,
        });

        const raf = (time: number) => {
            lenis.raf(time);
            requestAnimationFrame(raf);
        };

        requestAnimationFrame(raf);

        return () => {
            observer.disconnect();
            lenis.destroy();
        };
    }, []);

    return null;
};

export default SmoothScroll;
