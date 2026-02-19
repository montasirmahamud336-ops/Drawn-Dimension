import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import PageTransition from "@/components/shared/PageTransition";
import PageHero from "@/components/shared/PageHero";
import PremiumBackground from "@/components/shared/PremiumBackground";

const PrivacyPolicy = () => {
  return (
    <PageTransition>
      <PremiumBackground>
        <Navigation />
        <main>
          <PageHero
            title="Privacy Policy"
            subtitle="Legal"
            description="How we collect, use, and protect your personal information."
          />

          <section className="section-padding">
            <div className="container-narrow max-w-4xl">
              <div className="prose prose-lg dark:prose-invert max-w-none space-y-8">
                <div className="glass-card p-8">
                  <h2 className="text-2xl font-bold text-foreground mb-4">1. Information We Collect</h2>
                  <p className="text-muted-foreground leading-relaxed">
                    We collect information you provide directly, including name, email address, phone number,
                    company name, and project details when you contact us, create an account, or request a quote.
                    We also collect usage data automatically through cookies and similar technologies.
                  </p>
                </div>

                <div className="glass-card p-8">
                  <h2 className="text-2xl font-bold text-foreground mb-4">2. How We Use Your Information</h2>
                  <p className="text-muted-foreground leading-relaxed mb-4">We use collected information to:</p>
                  <ul className="list-disc list-inside text-muted-foreground space-y-2">
                    <li>Provide, maintain, and improve our services</li>
                    <li>Process transactions and send related information</li>
                    <li>Send technical notices, updates, and support messages</li>
                    <li>Respond to your comments, questions, and requests</li>
                    <li>Communicate about products, services, and events</li>
                  </ul>
                </div>

                <div className="glass-card p-8">
                  <h2 className="text-2xl font-bold text-foreground mb-4">3. Data Protection</h2>
                  <p className="text-muted-foreground leading-relaxed">
                    We implement appropriate technical and organizational security measures to protect your personal
                    data against unauthorized access, alteration, disclosure, or destruction. All data is encrypted
                    in transit and at rest.
                  </p>
                </div>

                <div className="glass-card p-8">
                  <h2 className="text-2xl font-bold text-foreground mb-4">4. Third-Party Services</h2>
                  <p className="text-muted-foreground leading-relaxed">
                    We may share your information with trusted third-party service providers who assist us in
                    operating our website, conducting our business, or serving you, so long as those parties
                    agree to keep this information confidential.
                  </p>
                </div>

                <div className="glass-card p-8">
                  <h2 className="text-2xl font-bold text-foreground mb-4">5. Your Rights</h2>
                  <p className="text-muted-foreground leading-relaxed">
                    You have the right to access, correct, or delete your personal information at any time.
                    You may also opt out of marketing communications. Contact us at privacy@drawndimension.com
                    to exercise these rights.
                  </p>
                </div>

                <div className="glass-card p-8">
                  <h2 className="text-2xl font-bold text-foreground mb-4">6. Payment Policy</h2>
                  <p className="text-muted-foreground leading-relaxed">
                    Payment is required before service delivery begins. All payments are processed securely
                    through trusted payment processors. We do not store your full payment card details on our servers.
                  </p>
                </div>

                <div className="glass-card p-8">
                  <h2 className="text-2xl font-bold text-foreground mb-4">7. Cookies Policy</h2>
                  <p className="text-muted-foreground leading-relaxed mb-4">
                    We use cookies and similar tracking technologies to enhance your browsing experience.
                  </p>
                  <h3 className="text-lg font-semibold text-foreground mb-2">Types of Cookies We Use:</h3>
                  <ul className="list-disc list-inside text-muted-foreground space-y-2">
                    <li><strong>Essential Cookies:</strong> Required for basic site functionality</li>
                    <li><strong>Analytics Cookies:</strong> Help us understand how visitors interact with our site</li>
                    <li><strong>Preference Cookies:</strong> Remember your settings and preferences (e.g., theme)</li>
                    <li><strong>Marketing Cookies:</strong> Used to deliver relevant advertisements</li>
                  </ul>
                  <p className="text-muted-foreground leading-relaxed mt-4">
                    You can manage cookie preferences through your browser settings. Disabling certain cookies
                    may affect site functionality.
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

export default PrivacyPolicy;
