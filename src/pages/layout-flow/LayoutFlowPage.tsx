import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Breadcrumbs, Stepper } from "../../components/layout/Breadcrumbs";
import { Button, Sparkle } from "../../components/ui/Button";
import { GeneratingOverlay } from "../../components/ui/GeneratingOverlay";
import { Tag } from "../../components/ui/Tag";
import { FloorPlanSketch } from "../../components/visuals/FloorPlanSketch";
import { LIFESTYLE_TAG_GROUPS, ROOM_TAG_LIBRARY } from "../../data/rooms";
import { useI18n } from "../../i18n/LanguageContext";
import { LAYOUT_GENERATION_STEPS, runGeneration } from "../../lib/agents";
import { useDesignStore } from "../../store/useDesignStore";
import "./layout-flow.css";

type Stage = "empty" | "detecting" | "confirm";

export function LayoutFlowPage() {
  const navigate = useNavigate();
  const { t, tTag } = useI18n();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const layout = useDesignStore((s) => s.layout);
  const { setLayoutFile, renameRoom, toggleLifestyleTag, setLayoutPhase } = useDesignStore();

  const [stage, setStage] = useState<Stage>(layout.fileName ? "confirm" : "empty");
  const [activeRoomId, setActiveRoomId] = useState<string | null>(null);

  const steps = [
    { title: t("layout.step1"), hint: t("layout.step1hint") },
    { title: t("layout.step2"), hint: t("layout.step2hint") },
    { title: t("layout.step3"), hint: t("layout.step3hint") },
  ];

  const startDetection = (name: string, url: string | null) => {
    setLayoutFile(name, url);
    setStage("detecting");
    window.setTimeout(() => setStage("confirm"), 1400);
  };

  const onFileChosen = (file: File | undefined) => {
    if (!file) return;
    startDetection(file.name, URL.createObjectURL(file));
  };

  const onGenerate = async () => {
    setLayoutPhase("generating", 0);
    try {
      await runGeneration(LAYOUT_GENERATION_STEPS, (i) => setLayoutPhase("generating", i));
      setLayoutPhase("done");
      navigate("/layout/result");
    } catch {
      setLayoutPhase("error");
    }
  };

  const activeRoom = layout.rooms.find((r) => r.id === activeRoomId) ?? null;

  return (
    <main className="page flow-page">
      <Breadcrumbs crumbs={[{ label: t("crumb.home"), to: "/" }, { label: t("layout.crumb") }]} />

      <div className="flow-head">
        <div>
          <h1 className="flow-title">
            {t("layout.titleA")}
            <br />
            {t("layout.titleB")}
          </h1>
          <p className="flow-sub">{t("layout.sub")}</p>
        </div>
        <div className="flow-stepper">
          <Stepper steps={steps} current={stage === "confirm" ? 1 : 0} />
        </div>
      </div>

      {stage === "empty" && (
        <section className="card upload-zone" aria-label={t("upload.title")}>
          <svg width="56" height="56" viewBox="0 0 56 56" fill="none" aria-hidden="true">
            <circle cx="28" cy="28" r="27" stroke="var(--color-line-strong)" strokeWidth="1.5" strokeDasharray="5 6" />
            <path d="M28 36V20m0 0-7 7m7-7 7 7" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <h2>{t("upload.title")}</h2>
          <p>{t("upload.desc")}</p>
          <div className="upload-zone__actions">
            <Button onClick={() => fileInputRef.current?.click()}>{t("upload.choose")}</Button>
            <Button variant="secondary" onClick={() => startDetection("Hillcrest-Floorplan.pdf", null)}>
              {t("upload.sample")}
            </Button>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".jpg,.jpeg,.png,.pdf"
            className="visually-hidden"
            onChange={(e) => onFileChosen(e.target.files?.[0])}
          />
          <p className="upload-zone__note">{t("upload.note")}</p>
        </section>
      )}

      {stage === "detecting" && (
        <section className="card upload-zone" aria-live="polite">
          <div className="detecting-pulse" aria-hidden="true">
            <Sparkle size={40} />
          </div>
          <h2>{t("detecting.title")}</h2>
          <p>{t("detecting.sub")}</p>
        </section>
      )}

      {stage === "confirm" && (
        <div className="flow-grid">
          <section className="card plan-panel" aria-label={t("upload.title")}>
            <header className="plan-panel__filebar">
              <span className="plan-panel__check" aria-hidden="true">
                <svg viewBox="0 0 20 20" width="20" height="20" fill="none">
                  <circle cx="10" cy="10" r="9" stroke="currentColor" strokeWidth="1.5" />
                  <path d="m6.5 10.4 2.4 2.4 4.6-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
              <div className="plan-panel__fileinfo">
                <strong>{layout.fileName}</strong>
                <span>{t("filebar.justNow")}</span>
              </div>
              <Button variant="secondary" onClick={() => fileInputRef.current?.click()}>
                {t("filebar.change")}
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".jpg,.jpeg,.png,.pdf"
                className="visually-hidden"
                onChange={(e) => onFileChosen(e.target.files?.[0])}
              />
            </header>
            <div className="plan-panel__canvas">
              <FloorPlanSketch
                rooms={layout.rooms.map((r) => ({ ...r, label: tTag(r.label) }))}
                activeRoomId={activeRoomId}
                onRoomClick={(id) => setActiveRoomId(id === activeRoomId ? null : id)}
              />
            </div>
            <p className="upload-zone__note">{t("upload.note")}</p>
          </section>

          <section className="card--pad card confirm-panel" aria-label={t("confirm.title")}>
            <h2 className="confirm-panel__title">{t("confirm.title")}</h2>
            <p className="confirm-panel__sub">{t("confirm.sub", { n: layout.rooms.length })}</p>

            {activeRoom ? (
              <div className="room-editor" aria-live="polite">
                <p className="room-editor__hint">
                  <strong>{tTag(activeRoom.label)}</strong> — {t("roomEditor.hint")}
                </p>
                <div className="tag-grid">
                  {ROOM_TAG_LIBRARY.map((tag) => (
                    <Tag
                      key={tag}
                      label={tTag(tag)}
                      selected={activeRoom.label === tag}
                      onToggle={() => {
                        renameRoom(activeRoom.id, tag);
                        setActiveRoomId(null);
                      }}
                    />
                  ))}
                </div>
                <Button variant="ghost" onClick={() => setActiveRoomId(null)}>
                  {t("roomEditor.done")}
                </Button>
              </div>
            ) : (
              <>
                <p className="confirm-panel__question">{t("confirm.question")}</p>
                <div className="tag-grid" aria-label={t("confirm.title")}>
                  {layout.rooms.map((room) => (
                    <Tag key={room.id} label={tTag(room.label)} selected={false} onToggle={() => setActiveRoomId(room.id)} />
                  ))}
                </div>

                <h3 className="confirm-panel__special">{t("confirm.special")}</h3>
                <p className="confirm-panel__sub">{t("confirm.selectAll")}</p>
                {LIFESTYLE_TAG_GROUPS.map((group) => (
                  <div key={group.group} className="tag-group">
                    <span className="tag-group__name">{tTag(group.group)}</span>
                    <div className="tag-grid">
                      {group.tags.map((tag) => (
                        <Tag
                          key={tag}
                          label={tTag(tag)}
                          selected={layout.lifestyleTags.includes(tag)}
                          onToggle={() => toggleLifestyleTag(tag)}
                        />
                      ))}
                    </div>
                  </div>
                ))}

                <div className="confirm-panel__actions">
                  <Button size="lg" onClick={onGenerate}>
                    <Sparkle />
                    {t("confirm.generate")}
                  </Button>
                  <Button variant="secondary" size="lg" onClick={onGenerate}>
                    {t("confirm.skip")}
                  </Button>
                </div>
                <p className="upload-zone__note">{t("confirm.privacy")}</p>
              </>
            )}
          </section>
        </div>
      )}

      {layout.phase === "generating" && (
        <GeneratingOverlay title={t("gen.layoutTitle")} steps={LAYOUT_GENERATION_STEPS} activeIndex={layout.stepIndex} />
      )}
    </main>
  );
}
