import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation, Navigate } from "react-router-dom";
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
import GostCatalog from "./pages/GostCatalog";
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
import CaeBeamCalc from "./pages/CaeBeamCalc";
import CaeFrameCalc from "./pages/CaeFrameCalc";
import CaeTrussCalc from "./pages/CaeTrussCalc";
import CaeProjects from "./pages/CaeProjects";
import CaeNewProject from "./pages/CaeNewProject";
import CaeEditor from "./pages/CaeEditor";
import CaeDemoEditor from "./pages/CaeDemoEditor";
import CaeChangelog from "./pages/CaeChangelog";
import RoadmapView from "./pages/RoadmapView";
import AdGenerator from "./pages/AdGenerator";
import AdminStats from "./pages/AdminStats";
import OwnerVisitors from "./pages/OwnerVisitors";
import OwnerResearch from "./pages/OwnerResearch";
import OwnerBusinessPlans from "./pages/OwnerBusinessPlans";
import OwnerVisitorResearch from "./pages/OwnerVisitorResearch";
import OwnerCaeNaming from "./pages/OwnerCaeNaming";
import OwnerEconomics from "./pages/OwnerEconomics";
import OwnerBlog from "./pages/OwnerBlog";
import OwnerSeoReindex from "./pages/OwnerSeoReindex";
import OwnerPartners from "./pages/OwnerPartners";
import WidgetBeam from "./pages/WidgetBeam";
import WidgetLanding from "./pages/WidgetLanding";
import PartnerCabinet from "./pages/PartnerCabinet";
import AdminQr from "./pages/AdminQr";
import PrintFlyer from "./pages/PrintFlyer";
import UrfuQrCae from "./pages/UrfuQrCae";
import UrfuQrDiplom from "./pages/UrfuQrDiplom";
import NotFoundPage from "./pages/NotFoundPage";
import { useVisitorTracking, getVisitorData } from "./hooks/useVisitorTracking";
import { isPoehaliPreview } from "@/lib/attribution";
import { hasEverAuthenticated } from "@/lib/auth";
import { AuthProvider } from "./contexts/AuthContext";
import { ThemeProvider } from "./hooks/use-theme";
import func2url from "../backend/func2url.json";

const queryClient = new QueryClient();

const FORM_SUBMITTED_KEY = "vt_form_submitted";

export function markFormSubmitted() {
  sessionStorage.setItem(FORM_SUBMITTED_KEY, "1");
  // Цель Яндекс.Метрики: отправлена заявка с формы.
  if (typeof window !== "undefined" && typeof window.ym === "function") {
    window.ym(110100539, "reachGoal", "form_submit");
  }
}

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

const YM_COUNTER_ID = 110100539;

declare global {
  interface Window {
    ym?: (id: number, action: string, url?: string, options?: unknown) => void;
  }
}

// Отправляет в Яндекс.Метрику просмотр страницы при каждом переходе по SPA-роуту
// (BrowserRouter использует History API без перезагрузки, поэтому хит шлём вручную).
function MetrikaPageView() {
  const { pathname, search } = useLocation();
  useEffect(() => {
    if (typeof window.ym === "function") {
      window.ym(YM_COUNTER_ID, "hit", pathname + search);
    }
  }, [pathname, search]);
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
      // Учитываем ВСЕ заходы, включая «своих» (авторизованных и тех, у кого
      // на устройстве уже была регистрация/вход) — по требованию владельца.
      const data = getVisitorData();
      if (!data.pages.length) return;
      const url = (func2url as Record<string, string>)["track-visit"];
      if (!url) return;
      // Ключ визита для дедупликации на бэке (стабилен в рамках сессии).
      let visitKey = sessionStorage.getItem("vt_visit_key");
      if (!visitKey) {
        visitKey = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
        sessionStorage.setItem("vt_visit_key", visitKey);
      }
      const visitor = {
        ...data,
        visitKey,
        userAgent: navigator.userAgent,
        // Анонимный лид в CRM создаём только если форму не отправляли,
        // но визит для статистики пишем всегда.
        formSubmitted: !!sessionStorage.getItem(FORM_SUBMITTED_KEY),
        // Заход через превью редактора poehali.dev — статистику пишем,
        // но лид «Анонимный посетитель» в CRM не создаём.
        isPreview: isPoehaliPreview(),
        // Авторизованный «свой» заход — статистику пишем, но лид/сделку в CRM
        // не создаём (иначе мы сами плодим анонимные сделки в Битриксе).
        isAuthenticated: hasEverAuthenticated(),
      };
      navigator.sendBeacon(url, JSON.stringify({ visitor }));
    };
    window.addEventListener("pagehide", handleUnload);
    return () => window.removeEventListener("pagehide", handleUnload);
  }, []);

  return null;
}

// Голый layout для встраиваемых виджетов: без навигации, футера, трекеров.
// Используется, когда страница открыта в iframe на стороннем сайте.
function EmbedLayout() {
  return (
    <Routes>
      <Route path="/widget/beam" element={<WidgetBeam />} />
    </Routes>
  );
}

function MainLayout() {
  return (
    <>
      <ScrollToTop />
      <MetrikaPageView />
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
                <Route path="/gost-catalog" element={<GostCatalog />} />
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
                <Route path="/cae/raschet-balki-onlayn" element={<CaeBeamCalc />} />
                <Route path="/cae/raschet-ramy-onlayn" element={<CaeFrameCalc />} />
                <Route path="/cae/raschet-fermy-onlayn" element={<CaeTrussCalc />} />
                <Route path="/cae/projects" element={<CaeProjects />} />
                <Route path="/cae/projects/new" element={<CaeNewProject />} />
                <Route path="/cae/projects/:id" element={<CaeEditor />} />
                <Route path="/cae/demo" element={<CaeDemoEditor />} />
                <Route path="/cae/changelog" element={<CaeChangelog />} />
                <Route path="/widget-balka" element={<WidgetLanding />} />
                <Route path="/partner" element={<PartnerCabinet />} />
                <Route path="/roadmaps/:slug" element={<RoadmapView />} />
                <Route path="/cae/roadmap" element={<Navigate to="/roadmaps/plm" replace />} />
                <Route path="/oauth/callback" element={<OAuthCallback />} />
                <Route path="/admin/generator" element={<AdGenerator />} />
                <Route path="/admin/stats" element={<AdminStats />} />
                <Route path="/admin/visitors" element={<OwnerVisitors />} />
                <Route path="/owner/research" element={<OwnerResearch />} />
                <Route path="/owner/business-plans" element={<OwnerBusinessPlans />} />
                <Route path="/owner/visitor-research" element={<OwnerVisitorResearch />} />
                <Route path="/owner/cae-naming" element={<OwnerCaeNaming />} />
                <Route path="/owner/economics" element={<OwnerEconomics />} />
                <Route path="/owner/blog" element={<OwnerBlog />} />
                <Route path="/owner/seo-reindex" element={<OwnerSeoReindex />} />
                <Route path="/owner/partners" element={<OwnerPartners />} />
                <Route path="/admin/qr" element={<AdminQr />} />
                <Route path="/admin/print" element={<PrintFlyer />} />
                <Route path="/urfu_qr_cae" element={<UrfuQrCae />} />
                <Route path="/urfu_qr_diplom" element={<UrfuQrDiplom />} />
                <Route path="*" element={<NotFoundPage />} />
              </Routes>
      </div>
      <Footer />
      <CookieConsent />
      <MobileStickyCta />
    </>
  );
}

// Выбирает layout: встраиваемый виджет (/widget/*) рендерится без обвязки сайта.
function AppShell() {
  const { pathname } = useLocation();
  const isEmbed = pathname.startsWith("/widget/");
  return isEmbed ? <EmbedLayout /> : <MainLayout />;
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
            <AppShell />
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
    </ThemeProvider>
  </HelmetProvider>
);

export default App;