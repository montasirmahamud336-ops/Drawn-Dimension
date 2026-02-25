import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import { AuthProvider } from "@/contexts/AuthContext";
import ChatWidget from "@/components/ChatWidget";
import CustomCursor from "@/components/CustomCursor";
import ScrollToTop from "@/components/shared/ScrollToTop";
import SmoothScroll from "@/components/shared/SmoothScroll";
import AdminLogin from "@/components/admin/AdminLogin";
import AdminProtectedRoute from "@/components/admin/AdminProtectedRoute";
// CMS Components
import CMSLayout from "@/components/cms/CMSLayout";
import DashboardStats from "@/components/cms/Dashboard";
import WorksManager from "@/components/cms/WorksManager";
import ProductsManager from "@/components/cms/ProductsManager";
import TeamManager from "@/components/cms/TeamManager";
import ReviewsManager from "@/components/cms/ReviewsManager";
import EmployeesManager from "@/components/cms/EmployeesManager";
import WorkAssignManager from "@/components/cms/WorkAssignManager";
import WorkForm from "@/components/cms/WorkForm"; // Importing specifically for route wrapper if needed, but managing differently

// Pages
import Home from "./pages/services/Home";
import About from "./pages/services/About";
import OurEmployees from "./pages/services/OurEmployees";
import Services from "./pages/services/Services";
import Portfolio from "./pages/services/Portfolio";
import Testimonials from "./pages/services/Testimonials";
import AllReviews from "./pages/services/AllReviews";
import Contact from "./pages/services/Contact";
import NotFound from "./pages/services/NotFound";
import Auth from "./pages/services/Auth";
import ResetPassword from "./pages/services/ResetPassword";
import Dashboard from "./pages/services/Dashboard";
import EmployeeDashboard from "./pages/services/EmployeeDashboard";
import PrivacyPolicy from "./pages/services/PrivacyPolicy";
import TermsOfService from "./pages/services/TermsOfService";
import Products from "./pages/Products";
import ProductDetails from "./pages/ProductDetails";
import Payment from "./pages/Payment";
import PortfolioDetails from "./pages/services/PortfolioDetails";

// Service Pages
import WebDesign from "./pages/WebDesign";
import AutoCAD from "./pages/AutoCAD";
import SolidWorks from "./pages/SolidWorks";
import PFDPID from "./pages/PFDPID";
import HAZOP from "./pages/HAZOP";
import GraphicDesign from "./pages/GraphicDesign";

const queryClient = new QueryClient();

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
                <Route path="upload" element={<WorksManager />} /> {/* Map /upload to WorksManager which has the form, or specialized page */}
                <Route path="products" element={<ProductsManager />} />
                <Route path="team" element={<TeamManager />} />
                <Route path="employees" element={<EmployeesManager />} />
                <Route path="work-assign" element={<WorkAssignManager />} />
              </Route>
              {/* CMS Routes Alias */}
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
              </Route>

              <Route path="*" element={<NotFound />} />
            </Routes>
          </AnimatePresence>
          <ChatWidget />
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
