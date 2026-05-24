import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { useEffect } from "react";
import Navigation from "./components/Navigation";
import Footer from "./components/Footer";
import GlobalSeo from "./components/GlobalSeo";
import Index from "./pages/Index";
import Program from "./pages/Program";
import Pricing from "./pages/Pricing";
import Cases from "./pages/Cases";
import Experts from "./pages/Experts";
import Faq from "./pages/Faq";
import Contacts from "./pages/Contacts";
import Privacy from "./pages/Privacy";
import About from "./pages/About";
import Reviews from "./pages/Reviews";
import Vacancies from "./pages/Vacancies";
import Blog from "./pages/Blog";
import BlogArticle from "./pages/BlogArticle";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Account from "./pages/Account";
import OAuthCallback from "./pages/OAuthCallback";
import NotFound from "./pages/NotFound";
import { useVisitorTracking, getVisitorData } from "./hooks/useVisitorTracking";
import { AuthProvider } from "./contexts/AuthContext";
import func2url from "../backend/func2url.json";

const queryClient = new QueryClient();

const FORM_SUBMITTED_KEY = "vt_form_submitted";

export function markFormSubmitted() {
  sessionStorage.setItem(FORM_SUBMITTED_KEY, "1");
}

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

function VisitorTracker() {
  useVisitorTracking();

  useEffect(() => {
    const handleUnload = () => {
      if (sessionStorage.getItem(FORM_SUBMITTED_KEY)) return;
      const data = getVisitorData();
      if (!data.pages.length) return;
      const url = (func2url as Record<string, string>)["track-visit"];
      if (!url) return;
      navigator.sendBeacon(url, JSON.stringify({ visitor: data }));
    };
    window.addEventListener("pagehide", handleUnload);
    return () => window.removeEventListener("pagehide", handleUnload);
  }, []);

  return null;
}

const App = () => (
  <HelmetProvider>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <ScrollToTop />
            <VisitorTracker />
            <GlobalSeo />
            <Navigation />
            <div>
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/program" element={<Program />} />
                <Route path="/pricing" element={<Pricing />} />
                <Route path="/cases" element={<Cases />} />
                <Route path="/experts" element={<Experts />} />
                <Route path="/faq" element={<Faq />} />
                <Route path="/contacts" element={<Contacts />} />
                <Route path="/privacy" element={<Privacy />} />
                <Route path="/about" element={<About />} />
                <Route path="/reviews" element={<Reviews />} />
                <Route path="/vacancies" element={<Vacancies />} />
                <Route path="/blog" element={<Blog />} />
                <Route path="/blog/:slug" element={<BlogArticle />} />
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                <Route path="/account" element={<Account />} />
                <Route path="/oauth/callback" element={<OAuthCallback />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </div>
            <Footer />
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </HelmetProvider>
);

export default App;