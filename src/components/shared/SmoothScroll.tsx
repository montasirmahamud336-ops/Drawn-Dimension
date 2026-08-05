import { useEffect, useRef } from "react";
import Lenis from "lenis";

const SmoothScroll = () => {
    const lenisRef = useRef<Lenis | null>(null);

    useEffect(() => {
        const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        const isMobileScreen = window.matchMedia("(max-width: 640px)").matches;
        const connection = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
        const isVeryLowPowerDevice =
            typeof navigator.hardwareConcurrency === "number" && navigator.hardwareConcurrency <= 2;

        // Keep native scroll only for reduced-motion, saveData, or low-end mobile devices.
        if (
            prefersReducedMotion ||
            connection?.saveData ||
            (isMobileScreen && isVeryLowPowerDevice)
        ) {
            return;
        }

        const shouldUseNativeScroll = (node?: Element | null) => {
            const element = node as HTMLElement | null;
            if (!element) return false;
            if (element.closest("[data-lenis-prevent]")) return true;
            return Boolean(
                element.closest(
                    "textarea, [contenteditable='true'], [contenteditable='plaintext-only'], .cms-rich-editor",
                ),
            );
        };

        const lenis = new Lenis({
            duration: 1.25,
            easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)), // Buttery smooth momentum glide
            orientation: "vertical",
            gestureOrientation: "vertical",
            smoothWheel: true,
            touchMultiplier: 1.5,
            wheelMultiplier: 1.0,
            // Keep native scrolling inside overlays/modals and text-editing boxes.
            prevent: (node) => shouldUseNativeScroll(node),
        });

        lenisRef.current = lenis;
        (window as Window & { __lenis?: Lenis }).__lenis = lenis;

        const syncLenisState = () => {
            const hasOpenDialog = !!document.querySelector('[role="dialog"][data-state="open"]');
            const isScrollLocked = document.body.hasAttribute("data-scroll-locked");

            if (hasOpenDialog || isScrollLocked) {
                lenis.stop();
            } else {
                lenis.start();
                lenis.resize();
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

        // Auto-recalculate scroll height when dynamic content (like portfolio items) loads or resizes
        const resizeObserver = new ResizeObserver(() => {
            lenis.resize();
        });
        resizeObserver.observe(document.body);

        let rafId = 0;
        const raf = (time: number) => {
            lenis.raf(time);
            rafId = requestAnimationFrame(raf);
        };

        rafId = requestAnimationFrame(raf);

        return () => {
            observer.disconnect();
            resizeObserver.disconnect();
            cancelAnimationFrame(rafId);
            delete (window as Window & { __lenis?: Lenis }).__lenis;
            lenis.destroy();
        };
    }, []);

    return null;
};

export default SmoothScroll;
