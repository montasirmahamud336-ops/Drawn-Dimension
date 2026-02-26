import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import { Suspense, lazy } from "react";
import { AuthProvider } from "@/contexts/AuthContext";
import CustomCursor from "@/components/CustomCursor";
import ScrollToTop from "@/components/shared/ScrollToTop";
import SmoothScroll from "@/components/shared/SmoothScroll";
import AdminProtectedRoute from "@/components/admin/AdminProtectedRoute";

// Pages
import Home from "./pages/services/Home";

const ChatWidget = lazy(() => import("@/components/ChatWidget"));
const AdminLogin = lazy(() => import("@/components/admin/AdminLogin"));

// CMS Components
const CMSLayout = lazy(() => import("@/components/cms/CMSLayout"));
const DashboardStats = lazy(() => import("@/components/cms/Dashboard"));
const WorksManager = lazy(() => import("@/components/cms/WorksManager"));
const ProductsManager = lazy(() => import("@/components/cms/ProductsManager"));
const TeamManager = lazy(() => import("@/components/cms/TeamManager"));
const ReviewsManager = lazy(() => import("@/components/cms/ReviewsManager"));
const EmployeesManager = lazy(() => import("@/components/cms/EmployeesManager"));
const WorkAssignManager = lazy(() => import("@/components/cms/WorkAssignManager"));
const EmployeeChatManager = lazy(() => import("@/components/cms/EmployeeChatManager"));
const WorldMapManager = lazy(() => import("@/components/cms/WorldMapManager"));

// Routes
const About = lazy(() => import("./pages/services/About"));
const OurEmployees = lazy(() => import("./pages/services/OurEmployees"));
const Services = lazy(() => import("./pages/services/Services"));
const Portfolio = lazy(() => import("./pages/services/Portfolio"));
const Testimonials = lazy(() => import("./pages/services/Testimonials"));
const AllReviews = lazy(() => import("./pages/services/AllReviews"));
const Contact = lazy(() => import("./pages/services/Contact"));
const NotFound = lazy(() => import("./pages/services/NotFound"));
const Auth = lazy(() => import("./pages/services/Auth"));
const ResetPassword = lazy(() => import("./pages/services/ResetPassword"));
const Dashboard = lazy(() => import("./pages/services/Dashboard"));
const EmployeeDashboard = lazy(() => import("./pages/services/EmployeeDashboard"));
const PrivacyPolicy = lazy(() => import("./pages/services/PrivacyPolicy"));
const TermsOfService = lazy(() => import("./pages/services/TermsOfService"));
const Products = lazy(() => import("./pages/Products"));
const ProductDetails = lazy(() => import("./pages/ProductDetails"));
const Payment = lazy(() => import("./pages/Payment"));
const PortfolioDetails = lazy(() => import("./pages/services/PortfolioDetails"));

// Service Pages
const WebDesign = lazy(() => import("./pages/WebDesign"));
const AutoCAD = lazy(() => import("./pages/AutoCAD"));
const SolidWorks = lazy(() => import("./pages/SolidWorks"));
const PFDPID = lazy(() => import("./pages/PFDPID"));
const HAZOP = lazy(() => import("./pages/HAZOP"));
const GraphicDesign = lazy(() => import("./pages/GraphicDesign"));

const queryClient = new QueryClient();
const RouteFallback = () => (
  <div className="min-h-[40vh] flex items-center justify-center text-sm text-muted-foreground">
    Loading...
  </div>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <SmoothScroll />
        <CustomCursor />
        <BrowserRouter>
          <AnimatePresence mode="wait">
            <ScrollToTop />
            <Suspense fallback={<RouteFallback />}>
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/about" element={<About />} />
                <Route path="/our-employees" element={<OurEmployees />} />
                <Route path="/services" element={<Services />} />
                <Route path="/services/web-design" element={<WebDesign />} />
                <Route path="/services/autocad" element={<AutoCAD />} />
                <Route path="/services/solidworks" element={<SolidWorks />} />
                <Route path="/services/pfd-pid" element={<PFDPID />} />
                <Route path="/services/hazop" element={<HAZOP />} />
                <Route path="/services/graphic-design" element={<GraphicDesign />} />
                <Route path="/portfolio" element={<Portfolio />} />
                <Route path="/portfolio/:id" element={<PortfolioDetails />} />
                <Route path="/testimonials" element={<Testimonials />} />
                <Route path="/testimonials/all" element={<AllReviews />} />
                <Route path="/contact" element={<Contact />} />
                <Route path="/auth" element={<Auth />} />
                <Route path="/reset-password" element={<ResetPassword />} />
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/employee/dashboard" element={<EmployeeDashboard />} />
                <Route path="/privacy-policy" element={<PrivacyPolicy />} />
                <Route path="/terms-of-service" element={<TermsOfService />} />
                <Route path="/products" element={<Products />} />
                <Route path="/products/:id" element={<ProductDetails />} />
                <Route path="/payment" element={<Payment />} />

                <Route path="/database/login" element={<AdminLogin />} />
                <Route
                  path="/database"
                  element={
                    <AdminProtectedRoute>
                      <CMSLayout />
                    </AdminProtectedRoute>
                  }
                >
                  <Route index element={<DashboardStats />} />
                  <Route path="dashboard" element={<DashboardStats />} />
                  <Route path="works" element={<WorksManager />} />
                  <Route path="upload" element={<WorksManager />} />
                  <Route path="products" element={<ProductsManager />} />
                  <Route path="team" element={<TeamManager />} />
                  <Route path="reviews" element={<ReviewsManager />} />
                  <Route path="employees" element={<EmployeesManager />} />
                  <Route path="work-assign" element={<WorkAssignManager />} />
                  <Route path="world-map" element={<WorldMapManager />} />
                  <Route path="chat" element={<EmployeeChatManager />} />
                </Route>

                <Route
                  path="/cms"
                  element={
                    <AdminProtectedRoute>
                      <CMSLayout />
                    </AdminProtectedRoute>
                  }
                >
                  <Route index element={<DashboardStats />} />
                  <Route path="works" element={<WorksManager />} />
                  <Route path="products" element={<ProductsManager />} />
                  <Route path="team" element={<TeamManager />} />
                  <Route path="reviews" element={<ReviewsManager />} />
                  <Route path="employees" element={<EmployeesManager />} />
                  <Route path="work-assign" element={<WorkAssignManager />} />
                  <Route path="world-map" element={<WorldMapManager />} />
                  <Route path="chat" element={<EmployeeChatManager />} />
                </Route>

                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
          </AnimatePresence>
          <Suspense fallback={null}>
            <ChatWidget />
          </Suspense>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
