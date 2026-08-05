import { motion, useReducedMotion } from "framer-motion";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

interface PremiumBackgroundProps {
    className?: string;
    children?: React.ReactNode;
}

const PremiumBackground = ({ className, children }: PremiumBackgroundProps) => {
    const prefersReducedMotion = useReducedMotion();
    const [canRenderEffects, setCanRenderEffects] = useState(false);

    useEffect(() => {
        const isDesktop = window.matchMedia("(min-width: 1024px)").matches;
        const connection = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
        setCanRenderEffects(isDesktop && !prefersReducedMotion && !connection?.saveData);
    }, [prefersReducedMotion]);

    return (
        <div className={cn("relative min-h-screen bg-background overflow-x-hidden", className)}>
            {canRenderEffects ? (
                <>
                    {/* Background Effects */}
                    <div className="fixed inset-0 z-0 pointer-events-none transform-gpu opacity-80">
                        {/* Glow Effects */}
                        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-primary/5 blur-[80px] transform-gpu" />
                        <div className="absolute top-[20%] right-[-5%] w-[30%] h-[30%] rounded-full bg-primary/8 blur-[90px] transform-gpu" />
                        <div className="absolute bottom-[-10%] left-[20%] w-[35%] h-[35%] rounded-full bg-secondary/15 blur-[80px] transform-gpu" />

                        {/* Gradient Overlays */}
                        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,hsl(var(--primary)/0.03),transparent_60%)]" />
                        <div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(255,255,255,0.02)_0%,transparent_100%)] dark:bg-[linear-gradient(to_bottom,rgba(0,0,0,0.02)_0%,transparent_100%)]" />
                    </div>

                    {/* Floating Elements (Subtle & GPU hardware accelerated) */}
                    <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden transform-gpu">
                        <div className="absolute top-[15%] left-[5%] w-64 h-64 border border-foreground/5 rounded-full opacity-20 transform-gpu" />
                        <div className="absolute top-[40%] right-[10%] w-96 h-96 border border-primary/10 rounded-full opacity-20 transform-gpu" />
                    </div>
                </>
            ) : (
                <div className="fixed inset-0 z-0 pointer-events-none bg-[radial-gradient(circle_at_top,hsl(var(--primary)/0.02),transparent_62%)]" />
            )}

            {/* Content */}
            <div className="relative z-10">
                {children}
            </div>
        </div>
    );
};

export default PremiumBackground;
