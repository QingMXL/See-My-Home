import { useEffect } from "react";
import { BrowserRouter, Route, Routes, useLocation } from "react-router-dom";
import { SiteHeader } from "./components/layout/SiteHeader";
import { LanguageProvider, useI18n } from "./i18n/LanguageContext";
import { HomePage } from "./pages/home/HomePage";
import { LayoutFlowPage } from "./pages/layout-flow/LayoutFlowPage";
import { LayoutResultPage } from "./pages/layout-flow/LayoutResultPage";
import { StyleFlowPage } from "./pages/style-flow/StyleFlowPage";
import { StyleResultPage } from "./pages/style-flow/StyleResultPage";
import { FurniturePage } from "./pages/furniture/FurniturePage";
import { MyDesignsPage } from "./pages/designs/MyDesignsPage";
import { ComingSoonPage } from "./pages/misc/ComingSoonPage";

/**
 * Consistent page transitions: every route change scrolls back to the top
 * (unless jumping to an in-page anchor) and enters with the same fade-rise
 * animation, keyed on the pathname.
 */
function RouteView() {
  const location = useLocation();
  const { t } = useI18n();

  useEffect(() => {
    if (!location.hash) {
      window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
    }
  }, [location.pathname, location.hash]);

  return (
    <>
      <div className="route-view" key={location.pathname}>
        <Routes location={location}>
          <Route path="/" element={<HomePage />} />
          <Route path="/layout" element={<LayoutFlowPage />} />
          <Route path="/layout/result" element={<LayoutResultPage />} />
          <Route path="/style" element={<StyleFlowPage />} />
          <Route path="/style/result" element={<StyleResultPage />} />
          <Route path="/furniture" element={<FurniturePage />} />
          <Route path="/designs" element={<MyDesignsPage />} />
          <Route path="/explore" element={<ComingSoonPage titleKey="coming.explore" />} />
          <Route path="/pricing" element={<ComingSoonPage titleKey="coming.pricing" />} />
          <Route path="/help" element={<ComingSoonPage titleKey="coming.help" />} />
          <Route path="*" element={<ComingSoonPage titleKey="coming.notFound" />} />
        </Routes>
      </div>
      <footer className="site-footer">
        <div className="page site-footer__inner">
          <span>{t("footer.tagline")}</span>
          <span>{t("footer.made")}</span>
        </div>
      </footer>
    </>
  );
}

export default function App() {
  return (
    <LanguageProvider>
      <BrowserRouter>
        <SiteHeader />
        <RouteView />
      </BrowserRouter>
    </LanguageProvider>
  );
}
