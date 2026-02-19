import { useEffect, useRef } from "react";
import { useInView, animate } from "framer-motion";

interface CountUpProps {
    to: number;
    from?: number;
    duration?: number;
    decimals?: number;
    suffix?: string;
    prefix?: string;
    className?: string;
}

const CountUp = ({
    to,
    from = 0,
    duration = 2.5, // Default slower duration
    decimals = 0,
    suffix = "",
    prefix = "",
    className = "",
}: CountUpProps) => {
    const nodeRef = useRef<HTMLSpanElement>(null);
    const inView = useInView(nodeRef, { once: true, margin: "-50px" });

    useEffect(() => {
        if (!nodeRef.current) return;

        // Set initial value immediately
        nodeRef.current.textContent = `${prefix}${from.toFixed(decimals)}${suffix}`;

        if (inView) {
            const controls = animate(from, to, {
                duration: duration,
                ease: "easeOut",
                onUpdate: (value) => {
                    if (nodeRef.current) {
                        nodeRef.current.textContent = `${prefix}${value.toFixed(decimals)}${suffix}`;
                    }
                },
            });

            return () => controls.stop();
        }
    }, [from, to, duration, inView, decimals, prefix, suffix]);

    return <span ref={nodeRef} className={className} />;
};

export default CountUp;
