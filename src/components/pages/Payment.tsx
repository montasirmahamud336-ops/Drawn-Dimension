import { Link, useSearchParams } from "react-router-dom";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import PageTransition from "@/components/shared/PageTransition";
import PremiumBackground from "@/components/shared/PremiumBackground";
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
                <main className="min-h-screen pt-32 pb-20 px-4">
                    <div className="container-narrow max-w-4xl">
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="glass-card p-8 md:p-12 text-center"
                        >
                            <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-8">
                                <Lock className="w-10 h-10 text-primary" />
                            </div>

                            <h1 className="text-3xl md:text-4xl font-bold mb-4">Secure Checkout</h1>
                            <p className="text-muted-foreground text-lg mb-8">
                                You are purchasing the <span className="text-primary font-semibold">{plan}</span>
                                {price && <span className="font-semibold text-foreground"> for {price}</span>}
                            </p>

                            <div className="max-w-md mx-auto bg-card/50 border border-border rounded-xl p-6 mb-8 text-left">
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
                </main>
                <Footer />
            </PremiumBackground>
        </PageTransition>
    );
};

export default Payment;
