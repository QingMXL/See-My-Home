import { Link } from "react-router-dom";
import { Breadcrumbs } from "../../components/layout/Breadcrumbs";
import { Button } from "../../components/ui/Button";
import { useI18n } from "../../i18n/LanguageContext";
import { useDesignStore } from "../../store/useDesignStore";
import "./designs.css";

const KIND_ICON: Record<string, string> = { Layout: "▦", Style: "◐", Furniture: "▤" };

export function MyDesignsPage() {
  const { t, tTag, lang } = useI18n();
  const saved = useDesignStore((s) => s.saved);
  const deleteDesign = useDesignStore((s) => s.deleteDesign);

  const projects = [...new Set(saved.map((d) => d.project))];
  const locale = lang === "zh" ? "zh-CN" : "en-US";

  return (
    <main className="page flow-page">
      <Breadcrumbs crumbs={[{ label: t("crumb.home"), to: "/" }, { label: t("designs.title") }]} />
      <header className="result-head">
        <h1 className="flow-title">{t("designs.title")}</h1>
        <p className="flow-sub">{t("designs.sub")}</p>
      </header>

      {saved.length === 0 ? (
        <section className="card designs-empty">
          <h2>{t("designs.emptyTitle")}</h2>
          <p>{t("designs.emptyText")}</p>
          <Link to="/">
            <Button>{t("nav.start")}</Button>
          </Link>
        </section>
      ) : (
        projects.map((project) => {
          const items = saved.filter((d) => d.project === project);
          return (
            <section key={project} className="project" aria-label={tTag(project)}>
              <div className="project__head">
                <h2>{tTag(project)}</h2>
                <span className="chip">{t("designs.count", { n: items.length })}</span>
                <Link to="/" className="project__continue">
                  {t("designs.continue")}
                </Link>
              </div>
              <ul className="project__grid">
                {items.map((d) => (
                  <li key={d.id} className="card design-card">
                    <span className="design-card__icon" aria-hidden="true">
                      {KIND_ICON[d.kind]}
                    </span>
                    <div className="design-card__body">
                      <strong>{d.title}</strong>
                      <span>{d.detail}</span>
                      <span className="design-card__time">
                        {t("designs.savedAt", {
                          kind: tTag(d.kind),
                          time: new Date(d.savedAt).toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" }),
                        })}
                      </span>
                    </div>
                    <button
                      type="button"
                      className="design-card__delete"
                      aria-label={t("designs.delete", { title: d.title })}
                      onClick={() => deleteDesign(d.id)}
                    >
                      ✕
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          );
        })
      )}
    </main>
  );
}
