import { Link } from "react-router-dom";
import { Button } from "../../components/ui/Button";
import { useI18n } from "../../i18n/LanguageContext";
import type { MsgKey } from "../../i18n/translations";

export function ComingSoonPage({ titleKey }: { titleKey: MsgKey }) {
  const { t } = useI18n();
  return (
    <main
      className="page"
      style={{
        paddingBlock: "var(--space-section)",
        textAlign: "center",
        display: "grid",
        gap: "var(--space-4)",
        justifyItems: "center",
      }}
    >
      <h1 style={{ fontSize: "var(--text-2xl)" }}>{t(titleKey)}</h1>
      <p style={{ color: "var(--color-ink-soft)", maxWidth: "28rem" }}>{t("coming.text")}</p>
      <Link to="/">
        <Button>{t("coming.back")}</Button>
      </Link>
    </main>
  );
}
