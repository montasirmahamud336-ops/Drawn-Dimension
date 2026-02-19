import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import PageTransition from "@/components/shared/PageTransition";
import PageHero from "@/components/shared/PageHero";
import PremiumBackground from "@/components/shared/PremiumBackground";

const TermsOfService = () => {
  return (
    <PageTransition>
      <PremiumBackground>
        <Navigation />
        <main>
          <PageHero
            title="Terms of Service"
            subtitle="Legal"
            description="Terms and conditions governing your use of Drawn Dimension services."
          />

          <section className="section-padding">
            <div className="container-narrow max-w-4xl">
              <div className="space-y-8">
                <div className="glass-card p-8">
                  <h2 className="text-2xl font-bold text-foreground mb-4">1. Acceptance of Terms</h2>
                  <p className="text-muted-foreground leading-relaxed">
                    By accessing or using Drawn Dimension's services, you agree to be bound by these Terms
                    of Service and all applicable laws and regulations. If you do not agree with any of these
                    terms, you are prohibited from using our services.
                  </p>
                </div>

                <div className="glass-card p-8">
                  <h2 className="text-2xl font-bold text-foreground mb-4">2. Services</h2>
                  <p className="text-muted-foreground leading-relaxed">
                    Drawn Dimension provides engineering, design, and digital services including but not limited
                    to web development, AutoCAD drafting, 3D modeling, P&ID engineering, HAZOP studies, and
                    graphic design. Service scope is defined in individual project agreements.
                  </p>
                </div>

                <div className="glass-card p-8">
                  <h2 className="text-2xl font-bold text-foreground mb-4">3. Payment Terms</h2>
                  <p className="text-muted-foreground leading-relaxed">
                    Payment is required before service delivery begins. Invoices are due upon receipt unless
                    otherwise specified in a written agreement. Late payments may incur additional charges.
                    All prices are in USD unless otherwise stated.
                  </p>
                </div>

                <div className="glass-card p-8">
                  <h2 className="text-2xl font-bold text-foreground mb-4">4. Intellectual Property</h2>
                  <p className="text-muted-foreground leading-relaxed">
                    Upon full payment, clients receive full ownership of deliverables unless otherwise agreed.
                    Drawn Dimension retains the right to showcase completed work in its portfolio unless
                    confidentiality is agreed upon.
                  </p>
                </div>

                <div className="glass-card p-8">
                  <h2 className="text-2xl font-bold text-foreground mb-4">5. Revisions & Changes</h2>
                  <p className="text-muted-foreground leading-relaxed">
                    Each project includes a defined number of revision rounds as specified in the project
                    agreement. Additional revisions beyond the agreed scope may incur extra charges.
                  </p>
                </div>

                <div className="glass-card p-8">
                  <h2 className="text-2xl font-bold text-foreground mb-4">6. Confidentiality</h2>
                  <p className="text-muted-foreground leading-relaxed">
                    We maintain strict confidentiality regarding all client information, project details,
                    and proprietary data shared during the course of our engagement.
                  </p>
                </div>

                <div className="glass-card p-8">
                  <h2 className="text-2xl font-bold text-foreground mb-4">7. Limitation of Liability</h2>
                  <p className="text-muted-foreground leading-relaxed">
                    Drawn Dimension shall not be liable for any indirect, incidental, special, consequential,
                    or punitive damages arising out of or relating to the use of our services.
                  </p>
                </div>

                <p className="text-sm text-muted-foreground text-center pt-4">
                  Last updated: February 2026. Contact us at legal@drawndimension.com for questions.
                </p>
              </div>
            </div>
          </section>
        </main>
        <Footer />
      </PremiumBackground>
    </PageTransition>
  );
};

export default TermsOfService;
