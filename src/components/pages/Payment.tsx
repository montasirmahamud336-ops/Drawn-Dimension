import { Link, useSearchParams } from "react-router-dom";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import PageTransition from "@/components/shared/PageTransition";
import PremiumBackground from "@/components/shared/PremiumBackground";
import PageHero from "@/components/shared/PageHero";
import { Button } from "@/components/ui/button";
import { CheckCircle, ShieldCheck, Lock } from "lucide-react";
import { motion } from "framer-motion";

const Payment = () => {
    const [searchParams] = useSearchParams();
    const plan = searchParams.get("plan") || "Selected Plan";
    const price = searchParams.get("price") || "";

    return (
        <PageTransition>
            <PremiumBackground>
                <Navigation />
                <main>
                    <PageHero
                        title="Secure Checkout"
                        subtitle="Payment Gateway"
                        description="Complete your purchase safely with encrypted checkout and dedicated support."
                    />
                    <section className="section-padding pt-0 px-4 relative overflow-hidden">
                        <div className="absolute inset-0 bg-[radial-gradient(circle_at_82%_20%,rgba(239,68,68,0.12),transparent_34%)] pointer-events-none" />
                        <div className="container-narrow max-w-4xl relative z-10">
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="glass-card border-border/60 bg-[linear-gradient(155deg,rgba(255,255,255,0.05),rgba(255,255,255,0.01)_44%,rgba(239,68,68,0.08)_100%)] p-8 md:p-12 text-center shadow-[0_18px_48px_-28px_rgba(15,23,42,0.6)]"
                            >
                                <div className="w-20 h-20 bg-primary/10 border border-primary/30 rounded-full flex items-center justify-center mx-auto mb-8">
                                    <Lock className="w-10 h-10 text-primary" />
                                </div>

                                <h1 className="text-3xl md:text-4xl font-bold mb-4">Secure Checkout</h1>
                                <p className="text-muted-foreground text-lg mb-8">
                                    You are purchasing the <span className="text-primary font-semibold">{plan}</span>
                                    {price && <span className="font-semibold text-foreground"> for {price}</span>}
                                </p>

                                <div className="max-w-md mx-auto glass-panel border-border/60 bg-background/70 rounded-xl p-6 mb-8 text-left">
                                    <h3 className="font-semibold mb-4 flex items-center gap-2">
                                        <ShieldCheck className="w-5 h-5 text-green-500" />
                                        Integration Coming Soon
                                    </h3>
                                    <p className="text-sm text-muted-foreground mb-4">
                                        We are currently integrating our secure payment gateway. For now, please contact our sales team to finalize your purchase.
                                    </p>
                                    <Link to="/contact">
                                        <Button className="w-full">
                                            Contact Sales to Purchase
                                        </Button>
                                    </Link>
                                </div>

                                <div className="flex flex-wrap justify-center gap-6 text-sm text-muted-foreground">
                                    <div className="flex items-center gap-2">
                                        <CheckCircle className="w-4 h-4 text-primary" />
                                        <span>Secure SSL Encryption</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <CheckCircle className="w-4 h-4 text-primary" />
                                        <span>Money-Back Guarantee</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <CheckCircle className="w-4 h-4 text-primary" />
                                        <span>24/7 Support</span>
                                    </div>
                                </div>
                            </motion.div>
                        </div>
                    </section>
                </main>
                <Footer />
            </PremiumBackground>
        </PageTransition>
    );
};

export default Payment;
