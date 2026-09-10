import { Link, NavLink } from "react-router-dom";
import { useI18n } from "../../i18n/LanguageContext";
import type { MsgKey } from "../../i18n/translations";
import { Button } from "../ui/Button";
import "./chrome.css";

const NAV_ITEMS: { to: string; labelKey: MsgKey }[] = [
  { to: "/layout", labelKey: "nav.layout" },
  { to: "/style", labelKey: "nav.style" },
  { to: "/furniture", labelKey: "nav.furniture" },
  { to: "/help", labelKey: "nav.help" },
];

export function SiteHeader() {
  const { t, lang, setLang } = useI18n();

  return (
    <header className="site-header">
      <div className="page site-header__inner">
        <Link to="/" className="site-header__brand">
          <svg width="28" height="28" viewBox="0 0 32 32" fill="none" aria-hidden="true">
            <path
              d="M5 14 L16 5 L27 14 V26 a1 1 0 0 1 -1 1 H6 a1 1 0 0 1 -1 -1 Z"
              stroke="currentColor"
              strokeWidth="2.4"
              strokeLinejoin="round"
            />
            <path d="M13 27 V19 a1 1 0 0 1 1 -1 h4 a1 1 0 0 1 1 1 v8" stroke="currentColor" strokeWidth="2.4" strokeLinejoin="round" />
          </svg>
          See My Home
        </Link>

        <nav aria-label="Main navigation" className="site-header__nav">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => `site-header__link${isActive ? " site-header__link--active" : ""}`}
            >
              {t(item.labelKey)}
            </NavLink>
          ))}
        </nav>

        <div className="site-header__actions">
          <div className="lang-toggle" role="radiogroup" aria-label="Language / 语言">
            <button
              type="button"
              className="lang-toggle__option"
              role="radio"
              aria-checked={lang === "en"}
              onClick={() => setLang("en")}
            >
              EN
            </button>
            <button
              type="button"
              className="lang-toggle__option"
              role="radio"
              aria-checked={lang === "zh"}
              onClick={() => setLang("zh")}
              lang="zh-CN"
            >
              中文
            </button>
          </div>
          <Link to="/#templates">
            <Button>{t("nav.start")}</Button>
          </Link>
        </div>
      </div>
    </header>
  );
}
