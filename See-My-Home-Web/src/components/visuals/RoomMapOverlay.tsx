import { Minus, Plus } from "lucide-react";
import { useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import type { DetectedRoom } from "../../data/rooms";
import type { AnalyzedLayoutBoundary, AnalyzedLayoutOpening } from "../../lib/homeLayoutApi";

interface RoomMapOverlayProps {
  imageUrl: string;
  imageAlt: string;
  rooms: DetectedRoom[];
  boundaries: AnalyzedLayoutBoundary[];
  openings: AnalyzedLayoutOpening[];
  activeRoomId: string | null;
  editable: boolean;
  onRoomClick: (roomId: string) => void;
  onMoveVertex: (roomId: string, vertexIndex: number, point: [number, number]) => void;
  onInsertVertex: (roomId: string, edgeIndex: number) => void;
  onRemoveVertex: (roomId: string, vertexIndex: number) => void;
  roomLabel: (room: DetectedRoom) => string;
  controls: {
    label: string;
    zoomOut: string;
    zoomIn: string;
    expand: string;
    close: string;
    vertexHint: string;
    insertVertex: string;
    removeVertex: string;
  };
}

const ROOM_PALETTE = [
  { fill: "#dbe5e8", stroke: "#8399a1" },
  { fill: "#e1e8dc", stroke: "#8e9f83" },
  { fill: "#eee6d8", stroke: "#aa9676" },
  { fill: "#e6e1ea", stroke: "#9b8fa6" },
  { fill: "#e7e4df", stroke: "#9c9489" },
] as const;

interface DraggedVertex {
  roomId: string;
  vertexIndex: number;
  pointerId: number;
}

function normalizedPoint(event: PointerEvent<HTMLButtonElement>, stage: HTMLDivElement | null): [number, number] {
  if (!stage) return [0, 0];
  const bounds = stage.getBoundingClientRect();
  return [
    Math.min(1, Math.max(0, (event.clientX - bounds.left) / bounds.width)),
    Math.min(1, Math.max(0, (event.clientY - bounds.top) / bounds.height)),
  ];
}

export function RoomMapOverlay({
  imageUrl,
  imageAlt,
  rooms,
  boundaries,
  openings,
  activeRoomId,
  editable,
  onRoomClick,
  onMoveVertex,
  onInsertVertex,
  onRemoveVertex,
  roomLabel,
  controls,
}: RoomMapOverlayProps) {
  const [zoom, setZoom] = useState(1);
  const [expanded, setExpanded] = useState(false);
  const [draggedVertex, setDraggedVertex] = useState<DraggedVertex | null>(null);
  const [selectedVertex, setSelectedVertex] = useState<{ roomId: string; vertexIndex: number } | null>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const activeRoom = rooms.find((room) => room.id === activeRoomId) ?? null;
  const selectedVertexIndex = selectedVertex?.roomId === activeRoomId ? selectedVertex.vertexIndex : null;

  const startVertexDrag = (event: PointerEvent<HTMLButtonElement>, roomId: string, vertexIndex: number) => {
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    setSelectedVertex({ roomId, vertexIndex });
    setDraggedVertex({ roomId, vertexIndex, pointerId: event.pointerId });
  };

  const moveVertex = (event: PointerEvent<HTMLButtonElement>) => {
    if (!draggedVertex || draggedVertex.pointerId !== event.pointerId) return;
    onMoveVertex(draggedVertex.roomId, draggedVertex.vertexIndex, normalizedPoint(event, stageRef.current));
  };

  const stopVertexDrag = (event: PointerEvent<HTMLButtonElement>) => {
    if (draggedVertex?.pointerId !== event.pointerId) return;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    setDraggedVertex(null);
  };

  const moveVertexWithKeyboard = (
    event: KeyboardEvent<HTMLButtonElement>,
    roomId: string,
    vertexIndex: number,
    point: [number, number],
  ) => {
    const step = event.shiftKey ? 0.0025 : 0.0075;
    const delta: Record<string, [number, number]> = {
      ArrowLeft: [-step, 0],
      ArrowRight: [step, 0],
      ArrowUp: [0, -step],
      ArrowDown: [0, step],
    };
    const movement = delta[event.key];
    if ((event.key === "Delete" || event.key === "Backspace") && (activeRoom?.polygon?.length ?? 0) > 3) {
      event.preventDefault();
      onRemoveVertex(roomId, vertexIndex);
      setSelectedVertex(null);
      return;
    }
    if (!movement) return;
    event.preventDefault();
    onMoveVertex(roomId, vertexIndex, [point[0] + movement[0], point[1] + movement[1]]);
  };

  return (
    <div className={`room-map-viewer${expanded ? " is-expanded" : ""}`}>
      <div className="room-map-toolbar" aria-label={controls.label}>
        {editable && activeRoomId && <span className="room-map-toolbar__hint">{controls.vertexHint}</span>}
        {editable && activeRoom?.polygon && (
          <button
            type="button"
            className="room-map-toolbar__remove"
            disabled={selectedVertexIndex === null || activeRoom.polygon.length <= 3}
            onClick={() => {
              if (selectedVertexIndex === null) return;
              onRemoveVertex(activeRoom.id, selectedVertexIndex);
              setSelectedVertex(null);
            }}
            aria-label={controls.removeVertex}
            title={controls.removeVertex}
          >
            <Minus size={15} aria-hidden="true" />
            {controls.removeVertex}
          </button>
        )}
        <button type="button" onClick={() => setZoom((value) => Math.max(1, value - 0.25))} aria-label={controls.zoomOut}>−</button>
        <span>{Math.round(zoom * 100)}%</span>
        <button type="button" onClick={() => setZoom((value) => Math.min(3, value + 0.25))} aria-label={controls.zoomIn}>+</button>
        <button type="button" onClick={() => setExpanded((value) => !value)} aria-label={expanded ? controls.close : controls.expand}>
          {expanded ? "×" : "↗"}
        </button>
      </div>
      <div className="room-map-scroll">
        <div ref={stageRef} className="room-map-stage" style={{ width: `${zoom * 100}%` }}>
          <img className="uploaded-plan-preview" src={imageUrl} alt={imageAlt} />
          <svg className="room-map-geometry" viewBox="0 0 1 1" preserveAspectRatio="none" aria-label={controls.vertexHint}>
            {rooms.map((room, index) => room.polygon && (
              <polygon
                key={room.id}
                points={room.polygon.map(([x, y]) => `${x},${y}`).join(" ")}
                className={`room-map-polygon${room.id === activeRoomId ? " is-active" : ""}${room.functionCode === "unknown" ? " needs-confirmation" : ""}`}
                style={{
                  fill: ROOM_PALETTE[index % ROOM_PALETTE.length].fill,
                  stroke: ROOM_PALETTE[index % ROOM_PALETTE.length].stroke,
                }}
                onClick={() => editable && onRoomClick(room.id)}
              />
            ))}
            {boundaries.map((boundary) => (
              <polyline
                key={boundary.id}
                points={boundary.path.map(([x, y]) => `${x},${y}`).join(" ")}
                className={`room-map-boundary room-map-boundary--${boundary.kind}`}
              />
            ))}
            {openings.map((opening) => (
              <circle key={opening.id} cx={opening.position[0]} cy={opening.position[1]} r="0.006" className={`room-map-opening room-map-opening--${opening.kind}`} />
            ))}
          </svg>
          <div className="room-map-labels">
            {rooms.map((room) => {
              const anchor = room.labelAnchor ?? [room.x / 900, room.y / 560];
              return editable ? (
                <button
                  key={room.id}
                  type="button"
                  className={`room-map-label${room.id === activeRoomId ? " is-active" : ""}`}
                  style={{ left: `${anchor[0] * 100}%`, top: `${anchor[1] * 100}%` }}
                  onClick={() => onRoomClick(room.id)}
                >
                  {roomLabel(room)}
                </button>
              ) : (
                <span
                  key={room.id}
                  className="room-map-label is-confirmed"
                  style={{ left: `${anchor[0] * 100}%`, top: `${anchor[1] * 100}%` }}
                >
                  {roomLabel(room)}
                </span>
              );
            })}
          </div>
          {editable && (
            <div className="room-map-edge-points" aria-label={controls.insertVertex}>
              {activeRoom?.polygon?.map((point, edgeIndex, polygon) => {
                const next = polygon[(edgeIndex + 1) % polygon.length];
                const midpoint: [number, number] = [(point[0] + next[0]) / 2, (point[1] + next[1]) / 2];
                return (
                  <button
                    key={`${activeRoom.id}-edge-${edgeIndex}`}
                    type="button"
                    className="room-map-edge-point"
                    style={{ left: `${midpoint[0] * 100}%`, top: `${midpoint[1] * 100}%` }}
                    aria-label={`${controls.insertVertex} ${edgeIndex + 1}`}
                    title={controls.insertVertex}
                    onClick={() => onInsertVertex(activeRoom.id, edgeIndex)}
                  >
                    <Plus size={10} aria-hidden="true" />
                  </button>
                );
              })}
            </div>
          )}
          {editable && (
            <div className="room-map-vertices" aria-label={controls.vertexHint}>
              {rooms.map((room) => room.id === activeRoomId && room.polygon?.map((point, vertexIndex) => (
                <button
                  key={`${room.id}-${vertexIndex}`}
                  type="button"
                  className={`room-map-vertex${selectedVertexIndex === vertexIndex ? " is-selected" : ""}`}
                  style={{ left: `${point[0] * 100}%`, top: `${point[1] * 100}%` }}
                  aria-label={`${controls.vertexHint} ${vertexIndex + 1}`}
                  aria-pressed={selectedVertexIndex === vertexIndex}
                  onPointerDown={(event) => startVertexDrag(event, room.id, vertexIndex)}
                  onPointerMove={moveVertex}
                  onPointerUp={stopVertexDrag}
                  onPointerCancel={stopVertexDrag}
                  onKeyDown={(event) => moveVertexWithKeyboard(event, room.id, vertexIndex, point as [number, number])}
                />
              )))}
            </div>
          )}
          {editable && activeRoom?.polygon && selectedVertexIndex !== null && activeRoom.polygon.length > 3 && (
            <button
              type="button"
              className="room-map-vertex-remove"
              style={{
                left: `${activeRoom.polygon[selectedVertexIndex][0] * 100}%`,
                top: `${activeRoom.polygon[selectedVertexIndex][1] * 100}%`,
              }}
              aria-label={controls.removeVertex}
              title={controls.removeVertex}
              onClick={() => {
                onRemoveVertex(activeRoom.id, selectedVertexIndex);
                setSelectedVertex(null);
              }}
            >
              <Minus size={13} aria-hidden="true" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
