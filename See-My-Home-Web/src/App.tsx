import { useEffect } from "react";
import { BrowserRouter, Link, Route, Routes, useLocation } from "react-router-dom";
import { SiteHeader } from "./components/layout/SiteHeader";
import { LanguageProvider, useI18n } from "./i18n/LanguageContext";
import { HomePage } from "./pages/home/HomePage";
import { LayoutFlowPage } from "./pages/layout-flow/LayoutFlowPage";
import { LayoutResultPage } from "./pages/layout-flow/LayoutResultPage";
import { StyleFlowPage } from "./pages/style-flow/StyleFlowPage";
import { StyleResultPage } from "./pages/style-flow/StyleResultPage";
import { FurniturePage } from "./pages/furniture/FurniturePage";
import { MyDesignsPage } from "./pages/designs/MyDesignsPage";
import { HelpPage } from "./pages/help/HelpPage";
import { ComingSoonPage } from "./pages/misc/ComingSoonPage";

/**
 * Consistent page transitions: every route change scrolls back to the top
 * (unless jumping to an in-page anchor) and enters with the same fade-rise
 * animation, keyed on the pathname.
 */
function RouteView() {
  const location = useLocation();
  const { lang, t } = useI18n();

  useEffect(() => {
    if (!location.hash) {
      window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
      return;
    }

    const targetId = decodeURIComponent(location.hash.slice(1));
    const frame = window.requestAnimationFrame(() => {
      document.getElementById(targetId)?.scrollIntoView({ block: "start" });
    });

    return () => window.cancelAnimationFrame(frame);
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
          <Route path="/furniture/*" element={<FurniturePage />} />
          <Route path="/designs" element={<MyDesignsPage />} />
          <Route path="/explore" element={<ComingSoonPage titleKey="coming.explore" />} />
          <Route path="/pricing" element={<ComingSoonPage titleKey="coming.pricing" />} />
          <Route path="/help" element={<HelpPage />} />
          <Route path="*" element={<ComingSoonPage titleKey="coming.notFound" />} />
        </Routes>
      </div>
      <footer className="site-footer">
        <div className="page site-footer__inner">
          <div className="site-footer__copy">
            <span>{t("footer.tagline")}</span>
            <nav className="site-footer__links" aria-label={lang === "zh" ? "页脚导航" : "Footer navigation"}>
              <Link to="/help">{lang === "zh" ? "帮助与常见问题" : "Help & FAQ"}</Link>
              <Link to="/#templates">{lang === "zh" ? "选择设计工具" : "Choose a design tool"}</Link>
            </nav>
          </div>
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
