import { useEffect, useRef } from "react";
import Lenis from "lenis";

const SmoothScroll = () => {
    const lenisRef = useRef<Lenis | null>(null);

    useEffect(() => {
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
            duration: 0.85,
            easing: (t) => 1 - Math.pow(1 - t, 3),
            orientation: "vertical",
            gestureOrientation: "vertical",
            smoothWheel: true,
            touchMultiplier: 1.2,
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
            delete (window as Window & { __lenis?: Lenis }).__lenis;
            lenis.destroy();
        };
    }, []);

    return null;
};

export default SmoothScroll;
