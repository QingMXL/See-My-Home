import { RotateCcw, Trash2 } from "lucide-react";
import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Breadcrumbs, Stepper } from "../../components/layout/Breadcrumbs";
import { Button, Sparkle } from "../../components/ui/Button";
import { GeneratingOverlay } from "../../components/ui/GeneratingOverlay";
import { Tag } from "../../components/ui/Tag";
import { FloorPlanSketch } from "../../components/visuals/FloorPlanSketch";
import { RoomMapOverlay } from "../../components/visuals/RoomMapOverlay";
import { ROOM_RECTS } from "../../components/visuals/planGeometry";
import {
  ROOM_CONFIRMATION_OPTIONS,
  STEP_TWO_REQUIREMENT_GROUPS,
  roomFunctionFrom,
  roomFunctionLabel,
  SAMPLE_DETECTED_ROOMS,
} from "../../data/rooms";
import { useI18n } from "../../i18n/LanguageContext";
import { LAYOUT_GENERATION_STEPS } from "../../lib/agents";
import {
  createLayoutProject,
  generateLayout,
  uploadLayoutFile,
  type AnalyzedLayoutRoom,
} from "../../lib/homeLayoutApi";
import {
  insertPolygonVertex,
  isUsablePolygon,
  movePolygonVertex,
  polygonLabelAnchor,
  removePolygonVertex,
} from "../../lib/polygon";
import { useDesignStore } from "../../store/useDesignStore";
import "./layout-flow.css";

type Stage = "empty" | "uploading" | "detecting" | "confirm";
type ConfirmationStep = "rooms" | "considerations";
const SAMPLE_PLAN_WIDTH = 900;
const SAMPLE_PLAN_HEIGHT = 560;

function sampleRoomGeometry(roomId: string) {
  const room = ROOM_RECTS.find((candidate) => candidate.id === roomId);
  if (!room) return undefined;
  const left = room.x / SAMPLE_PLAN_WIDTH;
  const top = room.y / SAMPLE_PLAN_HEIGHT;
  const right = (room.x + room.w) / SAMPLE_PLAN_WIDTH;
  const bottom = (room.y + room.h) / SAMPLE_PLAN_HEIGHT;
  return {
    kind: "polygon" as const,
    coordinates: [
      [left, top],
      [right, top],
      [right, bottom],
      [left, bottom],
    ],
  };
}

function analyzedRoomToDetectedRoom(room: AnalyzedLayoutRoom) {
  const centroid = room.polygon.reduce(
    (sum, point) => ({ x: sum.x + point[0], y: sum.y + point[1] }),
    { x: 0, y: 0 },
  );
  const functionCode = roomFunctionFrom(room.suggested_function_code || room.suggested_function || room.label);
  const label = room.planning_status === "excluded" ? room.label : roomFunctionLabel(functionCode);
  return {
    id: room.id,
    label,
    x: (room.centroid?.[0] ?? centroid.x / room.polygon.length) * SAMPLE_PLAN_WIDTH,
    y: (room.centroid?.[1] ?? centroid.y / room.polygon.length) * SAMPLE_PLAN_HEIGHT,
    polygon: room.polygon,
    labelAnchor: room.label_anchor,
    confidence: room.confidence,
    boundaryConfidence: room.boundary_confidence,
    boundaryStatus: "confirmed" as const,
    currentUse: label,
    functionCode,
    functionStatus: functionCode === "unknown" ? "inferred" as const : "confirmed" as const,
    targetUse: null,
    planningStatus: room.planning_status,
    exclusionReason: room.exclusion_reason,
    excludedBy: room.planning_status === "excluded" ? "agent" as const : undefined,
  };
}

export function LayoutFlowPage() {
  const navigate = useNavigate();
  const { lang, t, tTag } = useI18n();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const layout = useDesignStore((s) => s.layout);
  const {
    setLayoutFile,
    setLayoutRooms,
    setLayoutExcludedRooms,
    excludeLayoutRoom,
    restoreExcludedLayoutRoom,
    setRoomFunction,
    toggleLifestyleTag,
    setSpecialConsiderations,
    setLayoutPhase,
    setLayoutAgentRun,
    setLayoutAgentError,
    setLayoutUploadedAsset,
    setLayoutImageAnalysis,
  } = useDesignStore();

  const [stage, setStage] = useState<Stage>(
    layout.fileName && (layout.fileUrl || layout.fileName === "Hillcrest-Floorplan.pdf") ? "confirm" : "empty",
  );
  const [confirmationStep, setConfirmationStep] = useState<ConfirmationStep>("rooms");
  const [activeRoomId, setActiveRoomId] = useState<string | null>(layout.rooms[0]?.id ?? null);
  const uploadedAsset = layout.uploadedAsset;
  const imageAnalysis = layout.imageAnalysis;
  const [sampleProjectId] = useState(() => `home_sample_${Date.now().toString(36)}`);

  const steps = [
    { title: t("layout.step1"), hint: t("layout.step1hint") },
    { title: t("layout.step2"), hint: t("layout.step2hint") },
    { title: t("layout.step3"), hint: t("layout.step3hint") },
  ];

  const startDetection = (name: string, url: string | null) => {
    if (layout.fileUrl?.startsWith("blob:")) URL.revokeObjectURL(layout.fileUrl);
    setLayoutFile(name, url);
    setLayoutUploadedAsset(null);
    setLayoutImageAnalysis(null);
    setLayoutRooms(SAMPLE_DETECTED_ROOMS);
    setLayoutExcludedRooms([]);
    setActiveRoomId(SAMPLE_DETECTED_ROOMS[0]?.id ?? null);
    setConfirmationStep("rooms");
    setStage("detecting");
    window.setTimeout(() => setStage("confirm"), 1400);
  };

  const onFileChosen = async (file: File | undefined) => {
    if (!file) return;
    const objectUrl = URL.createObjectURL(file);
    if (layout.fileUrl?.startsWith("blob:")) URL.revokeObjectURL(layout.fileUrl);
    setLayoutFile(file.name, objectUrl);
    setLayoutUploadedAsset(null);
    setLayoutImageAnalysis(null);
    setLayoutRooms([]);
    setLayoutExcludedRooms([]);
    setConfirmationStep("rooms");
    setLayoutAgentError(null);
    setStage("uploading");
    try {
      const asset = await uploadLayoutFile(file, lang === "zh" ? "zh-CN" : "en-US");
      setLayoutUploadedAsset(asset);
      setStage("detecting");
      const analysis = await createLayoutProject(
        asset.project_id,
        asset.asset_id,
        lang === "zh" ? "zh-CN" : "en-US",
      );
      setLayoutImageAnalysis(analysis);
      if (analysis.rooms.length === 0) {
        setLayoutRooms([]);
        setActiveRoomId(null);
        setLayoutAgentError(analysis.summary || t("layout.uploadError"));
        setLayoutPhase("error");
        setStage("confirm");
        return;
      }
      const detectedRooms = analysis.rooms.map(analyzedRoomToDetectedRoom);
      setLayoutRooms(detectedRooms);
      setLayoutExcludedRooms((analysis.excluded_regions ?? []).map(analyzedRoomToDetectedRoom));
      setActiveRoomId(detectedRooms[0]?.id ?? null);
      setStage("confirm");
    } catch (error) {
      const message = error instanceof Error ? error.message : t("layout.uploadError");
      setLayoutAgentError(message);
      setLayoutPhase("error");
      setStage("confirm");
    }
  };

  const onGenerate = async () => {
    if (layout.fileUrl && (!uploadedAsset || !imageAnalysis)) {
      setLayoutAgentError(t("layout.uploadError"));
      setLayoutPhase("error");
      return;
    }
    const unresolved = layout.rooms.filter((room) =>
      room.functionCode === "unknown"
      || room.functionStatus !== "confirmed"
      || (Boolean(uploadedAsset) && !isUsablePolygon(room.polygon)));
    if (unresolved.length > 0) {
      setLayoutAgentError(t("confirm.resolveBeforeGenerate", { n: unresolved.length }));
      return;
    }
    setLayoutPhase("generating", 0);
    setLayoutAgentError(null);
    try {
      const labels = layout.rooms.map((room) => room.label).join(", ");
      const priorities = layout.lifestyleTags.length > 0 ? layout.lifestyleTags.join(", ") : "none selected";
      const considerations = (layout.specialConsiderations ?? "").trim();
      const agentRun = await generateLayout({
        home_id: uploadedAsset?.project_id ?? sampleProjectId,
        locale: lang === "zh" ? "zh-CN" : "en-US",
        user_message:
          lang === "zh"
            ? `用户确认了这些房间：${labels}。生活需求：${priorities}。特别考虑：${considerations || "无"}。请建立住宅模型并分析布局。`
            : `The user confirmed these rooms: ${labels}. Lifestyle priorities: ${priorities}. Special considerations: ${considerations || "none"}. Build the Home Model and analyze the layout.`,
        rooms: layout.rooms.map(({ id, label, currentUse, targetUse, boundaryStatus, polygon, functionCode, functionStatus }) => {
          const analyzedRoom = imageAnalysis?.rooms.find((room) => room.id === id);
          return {
            id,
            label,
            current_use: currentUse ?? label,
            function_code: functionCode ?? roomFunctionFrom(currentUse ?? label),
            function_confirmed: functionStatus === "confirmed",
            target_use: targetUse ?? null,
            boundary_confirmed: boundaryStatus === "confirmed" || !uploadedAsset,
            source_geometry: polygon
              ? { kind: "polygon" as const, coordinates: polygon }
              : analyzedRoom
                ? { kind: "polygon" as const, coordinates: analyzedRoom.polygon }
                : sampleRoomGeometry(id),
          };
        }),
        excluded_regions: (layout.excludedRooms ?? []).flatMap((room) => room.polygon ? [{
          id: room.id,
          label: room.label,
          reason: room.exclusionReason ?? "other",
          source_geometry: { kind: "polygon" as const, coordinates: room.polygon },
        }] : []),
        lifestyle_tags: layout.lifestyleTags,
        special_considerations: considerations,
        source_kind: uploadedAsset ? "uploaded_analyzed" : "sample_plan",
        file_name: layout.fileName ?? undefined,
        asset_id: uploadedAsset?.asset_id,
      });
      setLayoutAgentRun(agentRun);
      setLayoutPhase("done");
      navigate("/layout/result");
    } catch (error) {
      setLayoutAgentError(error instanceof Error ? error.message : t("layout.agentError"));
      setLayoutPhase("error");
    }
  };

  const activeRoom = layout.rooms.find((r) => r.id === activeRoomId) ?? null;
  const uploadedFileIsPdf = Boolean(layout.fileUrl && layout.fileName?.toLowerCase().endsWith(".pdf"));
  const confirmedFunctions = layout.rooms.filter((room) => room.functionStatus === "confirmed" && room.functionCode !== "unknown").length;
  const readyToGenerate = layout.rooms.length > 0
    && confirmedFunctions === layout.rooms.length
    && layout.rooms.every((room) => !uploadedAsset || isUsablePolygon(room.polygon));

  const updateRoomPolygon = (roomId: string, update: (polygon: number[][]) => number[][] | null) => {
    setLayoutRooms(layout.rooms.map((room) => {
      if (room.id !== roomId || !room.polygon) return room;
      const polygon = update(room.polygon);
      if (!polygon) return room;
      const center = polygonLabelAnchor(polygon);
      return {
        ...room,
        polygon,
        labelAnchor: center,
        x: center[0] * SAMPLE_PLAN_WIDTH,
        y: center[1] * SAMPLE_PLAN_HEIGHT,
        boundaryStatus: "confirmed" as const,
      };
    }));
  };

  const moveRoomVertex = (roomId: string, vertexIndex: number, rawPoint: [number, number]) => {
    updateRoomPolygon(roomId, (polygon) => movePolygonVertex(polygon, vertexIndex, rawPoint));
  };

  const insertRoomVertex = (roomId: string, edgeIndex: number) => {
    updateRoomPolygon(roomId, (polygon) => insertPolygonVertex(polygon, edgeIndex));
  };

  const removeRoomVertex = (roomId: string, vertexIndex: number) => {
    updateRoomPolygon(roomId, (polygon) => removePolygonVertex(polygon, vertexIndex));
  };

  const removeActiveRoom = () => {
    if (!activeRoom) return;
    const activeIndex = layout.rooms.findIndex((room) => room.id === activeRoom.id);
    const nextRoom = layout.rooms[activeIndex + 1] ?? layout.rooms[activeIndex - 1] ?? null;
    excludeLayoutRoom(activeRoom.id);
    setActiveRoomId(nextRoom?.id ?? null);
  };

  const lastUserExcludedRoom = [...(layout.excludedRooms ?? [])].reverse().find((room) => room.excludedBy === "user") ?? null;

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

      {stage === "uploading" && (
        <section className="card upload-zone" aria-live="polite">
          <div className="detecting-pulse" aria-hidden="true">
            <Sparkle size={40} />
          </div>
          <h2>{t("uploading.title")}</h2>
          <p>{t("uploading.sub")}</p>
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
              {layout.fileUrl ? (
                uploadedFileIsPdf ? (
                  <object
                    className="uploaded-plan-preview"
                    data={layout.fileUrl}
                    type="application/pdf"
                    aria-label={layout.fileName ?? t("upload.title")}
                  >
                    <p>{layout.fileName}</p>
                  </object>
                ) : (
                  <RoomMapOverlay
                    imageUrl={layout.fileUrl}
                    imageAlt={layout.fileName ?? t("upload.title")}
                    rooms={layout.rooms}
                    boundaries={imageAnalysis?.boundaries ?? []}
                    openings={imageAnalysis?.openings ?? []}
                    roomLabel={(room) => tTag(room.label)}
                    controls={{
                      label: t("confirm.viewControls"),
                      zoomOut: t("confirm.zoomOut"),
                      zoomIn: t("confirm.zoomIn"),
                      expand: t("confirm.expandPlan"),
                      close: t("confirm.closeExpanded"),
                      vertexHint: t("roomEditor.vertexHint"),
                      insertVertex: t("roomEditor.insertVertex"),
                      removeVertex: t("roomEditor.removeVertex"),
                    }}
                    activeRoomId={confirmationStep === "rooms" ? activeRoomId : null}
                    editable={confirmationStep === "rooms"}
                    onRoomClick={setActiveRoomId}
                    onMoveVertex={moveRoomVertex}
                    onInsertVertex={insertRoomVertex}
                    onRemoveVertex={removeRoomVertex}
                  />
                )
              ) : (
                <FloorPlanSketch
                  rooms={layout.rooms.map((r) => ({ ...r, label: tTag(r.label) }))}
                  activeRoomId={confirmationStep === "rooms" ? activeRoomId : null}
                  onRoomClick={confirmationStep === "rooms" ? setActiveRoomId : undefined}
                />
              )}
            </div>
            <p className="upload-zone__note">{t("upload.note")}</p>
          </section>

          <section className="card--pad card confirm-panel" aria-label={t("confirm.title")}>
            {(imageAnalysis?.rooms.length ?? 0) > 0 || !layout.fileUrl ? (
              <div className="step-two">
                <nav className="step-two__progress" aria-label={t("confirm.internalSteps")}>
                  <button
                    type="button"
                    className={`step-two__progress-item${confirmationStep === "rooms" ? " is-current" : " is-complete"}`}
                    onClick={() => setConfirmationStep("rooms")}
                  >
                    <span>2.1</span>
                    {t("confirm.boundaryTitle")}
                  </button>
                  <button
                    type="button"
                    className={`step-two__progress-item${confirmationStep === "considerations" ? " is-current" : ""}`}
                    onClick={() => readyToGenerate && setConfirmationStep("considerations")}
                    disabled={!readyToGenerate}
                  >
                    <span>2.2</span>
                    {t("confirm.specialTitle")}
                  </button>
                </nav>

                {confirmationStep === "rooms" ? (
                  <section className="step-two__panel" aria-labelledby="confirm-boundaries-title">
                    <h2 id="confirm-boundaries-title">{t("confirm.boundaryTitle")}</h2>
                    <p className="confirm-panel__sub">{t("confirm.boundaryIntro")}</p>

                    {activeRoom ? (
                      <div className="room-editor" aria-live="polite">
                        <div className="current-space">
                          <span>{t("confirm.currentSpace")}</span>
                          <strong>{tTag(activeRoom.label)}</strong>
                        </div>
                        <h3>{t("confirm.whatSpace")}</h3>
                        <div className="room-function-grid" role="group" aria-label={t("confirm.whatSpace")}>
                          {ROOM_CONFIRMATION_OPTIONS.map((functionCode) => {
                            const label = roomFunctionLabel(functionCode);
                            const selected = activeRoom.functionCode === functionCode;
                            return (
                              <button
                                key={functionCode}
                                type="button"
                                className={`room-function-chip${selected ? " is-selected" : ""}`}
                                aria-pressed={selected}
                                onClick={() => setRoomFunction(activeRoom.id, functionCode)}
                              >
                                {tTag(label)}
                              </button>
                            );
                          })}
                        </div>
                        {activeRoom.functionCode === "other" && (
                          <label className="custom-room-field">
                            <span>{t("confirm.customRoomName")}</span>
                            <input
                              value={activeRoom.label === "Other" ? "" : activeRoom.label}
                              placeholder={t("confirm.customRoomPlaceholder")}
                              onChange={(event) => setRoomFunction(activeRoom.id, "other", event.target.value)}
                            />
                          </label>
                        )}
                        <button type="button" className="exclude-space-button" onClick={removeActiveRoom}>
                          <Trash2 size={16} aria-hidden="true" />
                          {t("roomEditor.excludeSpace")}
                        </button>
                      </div>
                    ) : (
                      <p className="room-editor__empty">{t("confirm.selectSpace")}</p>
                    )}

                    {lastUserExcludedRoom && (
                      <div className="excluded-space-notice" role="status">
                        <span>{t("roomEditor.excludedNotice", { room: tTag(lastUserExcludedRoom.label) })}</span>
                        <button
                          type="button"
                          onClick={() => {
                            restoreExcludedLayoutRoom(lastUserExcludedRoom.id);
                            setActiveRoomId(lastUserExcludedRoom.id);
                          }}
                        >
                          <RotateCcw size={14} aria-hidden="true" />
                          {t("roomEditor.undoExclude")}
                        </button>
                      </div>
                    )}

                    <div className={`confirmation-summary${readyToGenerate ? " is-ready" : ""}`} role="status">
                      {readyToGenerate
                        ? layout.rooms.length === 1
                          ? t("confirm.confirmedCountOne")
                          : t("confirm.confirmedCount", { n: layout.rooms.length })
                        : t("confirm.confirmationProgress", { confirmed: confirmedFunctions, total: layout.rooms.length })}
                    </div>
                    <div className="confirm-panel__actions">
                      <Button
                        size="lg"
                        disabled={!readyToGenerate}
                        onClick={() => {
                          setLayoutAgentError(null);
                          setConfirmationStep("considerations");
                        }}
                      >
                        {t("confirm.nextSpecial")}
                      </Button>
                    </div>
                  </section>
                ) : (
                  <section className="step-two__panel" aria-labelledby="special-requirements-title">
                    <h2 id="special-requirements-title">{t("confirm.specialTitle")}</h2>
                    <p className="confirm-panel__sub">{t("confirm.specialIntro")}</p>
                    {STEP_TWO_REQUIREMENT_GROUPS.map((group) => (
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
                    <label className="considerations-field">
                      <span>{t("confirm.otherRequirements")}</span>
                      <textarea
                        rows={6}
                        value={layout.specialConsiderations ?? ""}
                        placeholder={t("confirm.specialPlaceholder")}
                        onChange={(event) => setSpecialConsiderations(event.target.value)}
                      />
                    </label>
                    <div className="confirm-panel__actions confirm-panel__actions--split">
                      <Button variant="secondary" onClick={() => setConfirmationStep("rooms")}>
                        {t("confirm.back")}
                      </Button>
                      <Button size="lg" onClick={onGenerate}>
                        <Sparkle />
                        {t("confirm.startGenerate")}
                      </Button>
                    </div>
                  </section>
                )}

                <p className="upload-zone__note">{t("confirm.privacy")}</p>
                {layout.agentError && <p className="layout-agent-error" role="alert">{layout.agentError}</p>}
              </div>
            ) : (
              <div className="image-adapter-notice" role="alert">
                <strong>{t("imageAdapter.title")}</strong>
                <p>{layout.agentError ?? t("layout.uploadError")}</p>
                <Button onClick={() => fileInputRef.current?.click()}>{t("filebar.change")}</Button>
              </div>
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
