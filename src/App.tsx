import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { HelmetProvider } from "@/lib/helmet-shim";
import { useEffect } from "react";
import Navigation from "./components/Navigation";
import Footer from "./components/Footer";
import CookieConsent from "./components/CookieConsent";
import GlobalSeo from "./components/GlobalSeo";
import AlphaTestStrip from "./components/AlphaTestStrip";
import MobileStickyCta from "./components/MobileStickyCta";
import Index from "./pages/Index";
import Program from "./pages/Program";
import Pricing from "./pages/Pricing";
import Cases from "./pages/Cases";
import Experts from "./pages/Experts";
import Faq from "./pages/Faq";
import Contacts from "./pages/Contacts";
import Privacy from "./pages/Privacy";
import Offer from "./pages/Offer";
import About from "./pages/About";
import Reviews from "./pages/Reviews";
import Vacancies from "./pages/Vacancies";
import Blog from "./pages/Blog";
import BlogArticle from "./pages/BlogArticle";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Account from "./pages/Account";
import VerifyEmail from "./pages/VerifyEmail";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import OAuthCallback from "./pages/OAuthCallback";
import CaeLanding from "./pages/CaeLanding";
import CaeProjects from "./pages/CaeProjects";
import CaeNewProject from "./pages/CaeNewProject";
import CaeEditor from "./pages/CaeEditor";
import CaeDemoEditor from "./pages/CaeDemoEditor";
import AdGenerator from "./pages/AdGenerator";
import NotFound from "./pages/NotFound";
import { useVisitorTracking, getVisitorData } from "./hooks/useVisitorTracking";
import { AuthProvider } from "./contexts/AuthContext";
import { ThemeProvider } from "./hooks/use-theme";
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

/**
 * При прямом запросе /oauth/callback хостинг отдаёт public/oauth/callback/index.html,
 * который перенаправляет на /?__oauth_cb=1&code=...&state=...
 * Здесь мы перехватываем этот маркер и поднимаем SPA-роут /oauth/callback с теми же query.
 */
function OAuthCallbackBootstrap() {
  const loc = useLocation();
  useEffect(() => {
    if (loc.pathname !== "/") return;
    const sp = new URLSearchParams(loc.search);
    if (sp.get("__oauth_cb") !== "1") return;
    sp.delete("__oauth_cb");
    const next = `/oauth/callback?${sp.toString()}${loc.hash || ""}`;
    window.history.replaceState(null, "", next);
    // Триггерим обновление роутера (popstate, чтобы react-router увидел смену URL)
    window.dispatchEvent(new PopStateEvent("popstate"));
  }, [loc.pathname, loc.search, loc.hash]);
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
    <ThemeProvider>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <ScrollToTop />
            <OAuthCallbackBootstrap />
            <VisitorTracker />
            <GlobalSeo />
            <Navigation />
            <AlphaTestStrip />
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
                <Route path="/offer" element={<Offer />} />
                <Route path="/about" element={<About />} />
                <Route path="/reviews" element={<Reviews />} />
                <Route path="/vacancies" element={<Vacancies />} />
                <Route path="/blog" element={<Blog />} />
                <Route path="/blog/:slug" element={<BlogArticle />} />
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                <Route path="/account" element={<Account />} />
                <Route path="/verify-email" element={<VerifyEmail />} />
                <Route path="/forgot-password" element={<ForgotPassword />} />
                <Route path="/reset-password" element={<ResetPassword />} />
                <Route path="/cae" element={<CaeLanding />} />
                <Route path="/cae/projects" element={<CaeProjects />} />
                <Route path="/cae/projects/new" element={<CaeNewProject />} />
                <Route path="/cae/projects/:id" element={<CaeEditor />} />
                <Route path="/cae/demo" element={<CaeDemoEditor />} />
                <Route path="/oauth/callback" element={<OAuthCallback />} />
                <Route path="/admin/generator" element={<AdGenerator />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </div>
            <Footer />
            <CookieConsent />
            <MobileStickyCta />
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
    </ThemeProvider>
  </HelmetProvider>
);

export default App;