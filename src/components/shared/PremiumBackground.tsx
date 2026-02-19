import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface PremiumBackgroundProps {
    className?: string;
    children?: React.ReactNode;
}

const PremiumBackground = ({ className, children }: PremiumBackgroundProps) => {
    return (
        <div className={cn("relative min-h-screen bg-background overflow-x-hidden", className)}>
            {/* Background Effects */}
            <div className="fixed inset-0 z-0 pointer-events-none">
                {/* Glow Effects */}
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-primary/5 blur-[100px] animate-glow-pulse" />
                <div className="absolute top-[20%] right-[-5%] w-[30%] h-[30%] rounded-full bg-primary/10 blur-[120px] animate-float" />
                <div className="absolute bottom-[-10%] left-[20%] w-[35%] h-[35%] rounded-full bg-secondary/20 blur-[100px] animate-float-delayed" />

                {/* Gradient Overlays */}
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,hsl(var(--primary)/0.03),transparent_60%)]" />
                <div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(255,255,255,0.02)_0%,transparent_100%)] dark:bg-[linear-gradient(to_bottom,rgba(0,0,0,0.02)_0%,transparent_100%)]" />
            </div>

            {/* Floating Elements (Subtle) */}
            <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
                <motion.div
                    animate={{ y: [-20, 20, -20], rotate: [0, 5, 0] }}
                    transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
                    className="absolute top-[15%] left-[5%] w-64 h-64 border border-foreground/5 rounded-full opacity-20"
                />
                <motion.div
                    animate={{ y: [20, -20, 20], rotate: [0, -5, 0] }}
                    transition={{ duration: 18, repeat: Infinity, ease: "easeInOut", delay: 2 }}
                    className="absolute top-[40%] right-[10%] w-96 h-96 border border-primary/10 rounded-full opacity-20"
                />
            </div>

            {/* Content */}
            <div className="relative z-10">
                {children}
            </div>
        </div>
    );
};

export default PremiumBackground;
