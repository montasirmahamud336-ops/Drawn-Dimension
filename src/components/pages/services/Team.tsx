import { ArrowRight, Building2, Users } from "lucide-react";
import { Link } from "react-router-dom";
import Footer from "@/components/Footer";
import LeadershipTeam from "@/components/LeadershipTeam";
import Navigation from "@/components/Navigation";
import OurEmployeesSection from "@/components/OurEmployeesSection";
import PageHero from "@/components/shared/PageHero";
import PremiumBackground from "@/components/shared/PremiumBackground";
import PageTransition from "@/components/shared/PageTransition";

const Team = () => {
  return (
    <PageTransition>
      <PremiumBackground>
        <Navigation />
        <main className="relative" aria-label="Drawn Dimension team page">
          <PageHero
            title="Team"
            subtitle="Meet Drawn Dimension"
            description="Meet the leadership team and employees behind Drawn Dimension. This page brings everyone together in one place."
            actions={
              <>
                <a
                  href="#leadership-team"
                  className="btn-primary inline-flex items-center justify-center gap-2 min-w-[200px]"
                >
                  Leadership Team
                  <ArrowRight className="w-4 h-4" />
                </a>
                <a
                  href="#our-employees"
                  className="btn-outline inline-flex items-center justify-center gap-2 min-w-[200px]"
                >
                  Our Employees
                </a>
              </>
            }
          />
          
          <div className="relative">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_84%_18%,rgba(239,68,68,0.1),transparent_36%)] pointer-events-none" />
            <LeadershipTeam compact />
          </div>

          <div className="relative">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_14%_16%,rgba(239,68,68,0.1),transparent_36%)] pointer-events-none" />
            <OurEmployeesSection compact showAll />
          </div>
        </main>
        <Footer />
      </PremiumBackground>
    </PageTransition>
  );
};

export default Team;
