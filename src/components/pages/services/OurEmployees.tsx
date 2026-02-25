import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import PageTransition from "@/components/shared/PageTransition";
import PageHero from "@/components/shared/PageHero";
import PremiumBackground from "@/components/shared/PremiumBackground";
import OurEmployeesSection from "@/components/OurEmployeesSection";

const OurEmployees = () => {
  return (
    <PageTransition>
      <PremiumBackground>
        <Navigation />
        <main>
          <PageHero
            title="Our Employees"
            subtitle="Team Directory"
            description="Meet all the talented employees behind Drawn Dimension."
          />
          <OurEmployeesSection showAll />
        </main>
        <Footer />
      </PremiumBackground>
    </PageTransition>
  );
};

export default OurEmployees;
