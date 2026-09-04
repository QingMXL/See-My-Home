import { Link } from "react-router-dom";
import { Button, Sparkle } from "../../components/ui/Button";
import { useI18n } from "../../i18n/LanguageContext";
import type { MsgKey } from "../../i18n/translations";
import { useDesignStore } from "../../store/useDesignStore";
import "./home.css";

const TEMPLATE_CARDS: { to: string; titleKey: MsgKey; textKey: MsgKey; ctaKey: MsgKey; image: string }[] = [
  {
    to: "/layout",
    titleKey: "home.layout.title",
    textKey: "home.layout.text",
    ctaKey: "home.layout.cta",
    image: "/images/home/layout.jpg",
  },
  {
    to: "/style",
    titleKey: "home.style.title",
    textKey: "home.style.text",
    ctaKey: "home.style.cta",
    image: "/images/home/style.jpg",
  },
  {
    to: "/furniture",
    titleKey: "home.furniture.title",
    textKey: "home.furniture.text",
    ctaKey: "home.furniture.cta",
    image: "/images/home/furniture.jpg",
  },
];

const HOW_IT_WORKS: { stepKey: MsgKey; textKey: MsgKey }[] = [
  { stepKey: "home.how1.title", textKey: "home.how1.text" },
  { stepKey: "home.how2.title", textKey: "home.how2.text" },
  { stepKey: "home.how3.title", textKey: "home.how3.text" },
];

export function HomePage() {
  const saved = useDesignStore((s) => s.saved);
  const { t, tTag } = useI18n();

  return (
    <main>
      <section className="page hero" aria-labelledby="hero-heading">
        <div className="hero__copy">
          <h1 id="hero-heading">{t("home.heroTitle")}</h1>
          <p className="hero__sub">{t("home.heroSub")}</p>
          <div className="hero__actions">
            <a href="#templates">
              <Button size="lg">{t("nav.start")}</Button>
            </a>
            <a href="#how">
              <Button variant="secondary" size="lg">
                {t("home.seeHow")}
              </Button>
            </a>
          </div>
          <p className="hero__trust">
            <span aria-hidden="true">★★★★★</span> {t("home.trust")}
          </p>
        </div>
        <div className="hero__art card">
          <img
            src="/images/home/hero.jpg"
            alt="Warm modern open-plan living room and kitchen"
            width="1584"
            height="990"
            fetchPriority="high"
          />
        </div>
      </section>

      <section className="page templates" id="templates" aria-labelledby="templates-heading">
        <h2 id="templates-heading" className="section-title">
          {t("home.whatSee")}
        </h2>
        <div className="templates__grid">
          {TEMPLATE_CARDS.map((card) => (
            <article key={card.titleKey} className="template-card card">
              <div className="template-card__art">
                <img src={card.image} alt="" width="1584" height="990" loading="lazy" />
              </div>
              <div className="template-card__body">
                <h3>{t(card.titleKey)}</h3>
                <p>{t(card.textKey)}</p>
                <Link to={card.to} className="template-card__cta">
                  <Button variant="secondary">
                    <Sparkle size={14} />
                    {t(card.ctaKey)}
                  </Button>
                </Link>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="page how" id="how" aria-labelledby="how-heading">
        <h2 id="how-heading" className="section-title section-title--left">
          {t("home.how")}
        </h2>
        <ol className="how__list">
          {HOW_IT_WORKS.map((item) => (
            <li key={item.stepKey} className="how__item">
              <span className="how__step">{t(item.stepKey)}</span>
              <p>{t(item.textKey)}</p>
            </li>
          ))}
        </ol>
      </section>

      {saved.length > 0 && (
        <section className="page recent" aria-labelledby="recent-heading">
          <div className="recent__head">
            <h2 id="recent-heading" className="section-title section-title--left">
              {t("home.recent")}
            </h2>
            <Link to="/designs" className="recent__all">
              {t("home.viewAll")}
            </Link>
          </div>
          <ul className="recent__grid">
            {saved.slice(0, 4).map((d) => (
              <li key={d.id} className="card recent__card">
                <span className="chip">{tTag(d.kind)}</span>
                <strong>{tTag(d.title)}</strong>
                <span className="recent__meta">{tTag(d.project)}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}
