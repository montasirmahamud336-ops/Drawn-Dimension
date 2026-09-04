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

            // Only prevent Lenis on textarea if the textarea actually has overflowing scrollable text
            const textarea = element.closest("textarea") as HTMLTextAreaElement | null;
            if (textarea) {
                return textarea.scrollHeight > textarea.clientHeight;
            }

            return Boolean(
                element.closest(
                    "[contenteditable='true'], [contenteditable='plaintext-only'], .cms-rich-editor",
                ),
            );
        };

        const lenis = new Lenis({
            duration: 1.2,
            easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)), // Buttery smooth momentum glide
            orientation: "vertical",
            gestureOrientation: "vertical",
            smoothWheel: true,
            touchMultiplier: 1.5,
            wheelMultiplier: 1.0,
            // Keep native scrolling inside overlays/modals and scrollable text-editing boxes.
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

        // Auto-recalculate scroll height when dynamic content (like framer-motion sections) loads or resizes
        let resizeTimer = 0;
        const debouncedResize = () => {
            if (resizeTimer) window.clearTimeout(resizeTimer);
            resizeTimer = window.setTimeout(() => {
                lenis.resize();
            }, 150);
        };

        const resizeObserver = new ResizeObserver(() => {
            debouncedResize();
        });
        resizeObserver.observe(document.body);
        if (document.documentElement) {
            resizeObserver.observe(document.documentElement);
        }

        let rafId = 0;
        const raf = (time: number) => {
            lenis.raf(time);
            rafId = requestAnimationFrame(raf);
        };

        rafId = requestAnimationFrame(raf);

        return () => {
            if (resizeTimer) window.clearTimeout(resizeTimer);
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
