import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { FileText, Clock, CheckCircle, DollarSign, LogOut, User } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import PageTransition from "@/components/shared/PageTransition";
import PremiumBackground from "@/components/shared/PremiumBackground";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

interface Quote {
  id: string;
  title: string;
  description: string | null;
  amount: number;
  currency: string;
  status: string;
  due_date: string | null;
  created_at: string;
}

interface Profile {
  full_name: string | null;
  email: string | null;
  company: string | null;
}

const Dashboard = () => {
  const { user, signOut, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user]);

  const loadData = async () => {
    if (!user) return;

    // Load profile
    const { data: profileData } = await supabase
      .from("profiles")
      .select("full_name, email, company")
      .eq("user_id", user.id)
      .single();

    if (profileData) setProfile(profileData);

    // Load quotes
    const { data: quotesData } = await supabase
      .from("quotes")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (quotesData) setQuotes(quotesData);
    setLoading(false);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "paid":
        return "bg-green-500/20 text-green-400 border-green-500/30";
      case "pending":
        return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
      case "overdue":
        return "bg-red-500/20 text-red-400 border-red-500/30";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  const handlePayQuote = async (quote: Quote) => {
    // This will be connected to Stripe later
    // For now, show a placeholder
    alert("Payment integration coming soon! This quote will be payable once Stripe is connected.");
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <PageTransition>
      <PremiumBackground>
        <Navigation />

        <main className="pt-28 pb-20 px-4">
          <div className="container-narrow">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <h1 className="text-3xl font-bold text-foreground">
                  Welcome, {profile?.full_name || "there"}!
                </h1>
                <p className="text-muted-foreground">Manage your quotes and payments</p>
              </motion.div>

              <div className="flex items-center gap-3">
                <Button variant="outline" onClick={() => signOut()}>
                  <LogOut className="w-4 h-4 mr-2" />
                  Sign Out
                </Button>
              </div>
            </div>

            {/* Stats */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8"
            >
              <Card className="glass-card">
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-primary/20 rounded-xl flex items-center justify-center">
                      <FileText className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-foreground">{quotes.length}</p>
                      <p className="text-sm text-muted-foreground">Total Quotes</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="glass-card">
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-yellow-500/20 rounded-xl flex items-center justify-center">
                      <Clock className="w-6 h-6 text-yellow-500" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-foreground">
                        {quotes.filter((q) => q.status === "pending").length}
                      </p>
                      <p className="text-sm text-muted-foreground">Pending</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="glass-card">
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-green-500/20 rounded-xl flex items-center justify-center">
                      <CheckCircle className="w-6 h-6 text-green-500" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-foreground">
                        {quotes.filter((q) => q.status === "paid").length}
                      </p>
                      <p className="text-sm text-muted-foreground">Paid</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="glass-card">
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-primary/20 rounded-xl flex items-center justify-center">
                      <DollarSign className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-foreground">
                        ${quotes.filter((q) => q.status === "pending").reduce((sum, q) => sum + q.amount, 0).toLocaleString()}
                      </p>
                      <p className="text-sm text-muted-foreground">Outstanding</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Quotes List */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <Card className="glass-card">
                <CardHeader>
                  <CardTitle>Your Quotes</CardTitle>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <div className="space-y-4">
                      {[1, 2, 3].map((i) => (
                        <Skeleton key={i} className="h-20 w-full" />
                      ))}
                    </div>
                  ) : quotes.length === 0 ? (
                    <div className="text-center py-12">
                      <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                      <h3 className="text-lg font-semibold text-foreground mb-2">No quotes yet</h3>
                      <p className="text-muted-foreground mb-4">
                        Contact us to get a custom quote for your project
                      </p>
                      <Button onClick={() => navigate("/contact")}>Request a Quote</Button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {quotes.map((quote) => (
                        <div
                          key={quote.id}
                          className="flex flex-col md:flex-row md:items-center justify-between p-4 rounded-xl border border-border bg-card/50 gap-4"
                        >
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <h4 className="font-semibold text-foreground">{quote.title}</h4>
                              <Badge className={getStatusColor(quote.status || "draft")}>
                                {quote.status || "Draft"}
                              </Badge>
                            </div>
                            {quote.description && (
                              <p className="text-sm text-muted-foreground mb-2">{quote.description}</p>
                            )}
                            <p className="text-xs text-muted-foreground">
                              Created: {new Date(quote.created_at).toLocaleDateString()}
                              {quote.due_date && ` • Due: ${new Date(quote.due_date).toLocaleDateString()}`}
                            </p>
                          </div>
                          <div className="flex items-center gap-4">
                            <p className="text-2xl font-bold text-foreground">
                              ${quote.amount.toLocaleString()}
                            </p>
                            {quote.status === "pending" && (
                              <Button onClick={() => handlePayQuote(quote)}>Pay Now</Button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </main>

        <Footer />
      </PremiumBackground>
    </PageTransition>
  );
};

export default Dashboard;
