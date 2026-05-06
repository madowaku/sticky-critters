import { useRef, useEffect, useState, useCallback, useMemo } from "react";
import type { StickyNote, InkStroke, InkPoint } from "../types";
import { useTranslation } from "../i18n/I18nContext";

interface Props {
  note: StickyNote;
  onUpdate: (id: string, partial: Partial<StickyNote>) => void;
  locked?: boolean;
}

export function SketchCanvas({ note, onUpdate, locked }: Props) {
  const { t } = useTranslation();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [tool, setTool] = useState<"pen" | "eraser">("pen");
  const [isDrawing, setIsDrawing] = useState(false);
  const currentStroke = useRef<InkPoint[]>([]);
  const strokes = useMemo(() => note.inkStrokes || [], [note.inkStrokes]);

  const redraw = useCallback((previewStroke?: InkStroke) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const strokesToRender = previewStroke ? [...strokes, previewStroke] : strokes;
    renderSketch(ctx, canvas, strokesToRender, note.sketchBackground || "plain");
  }, [note.sketchBackground, strokes]);

  useEffect(() => {
    redraw();
  }, [redraw]);

  // Handle Resize
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      canvas.width = Math.max(1, Math.round(rect.width * dpr));
      canvas.height = Math.max(1, Math.round(rect.height * dpr));
      redraw();
    };

    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, [redraw]);

  const handlePointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (locked) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    setIsDrawing(true);
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    currentStroke.current = [{ x, y, pressure: e.pressure }];
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isDrawing || locked) return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    currentStroke.current.push({ x, y, pressure: e.pressure });

    redraw({
      id: "preview",
      tool,
      color: tool === "pen" ? "#333" : "#000",
      width: tool === "pen" ? 2 : 20,
      points: currentStroke.current,
    });
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isDrawing || locked) return;
    e.currentTarget.releasePointerCapture(e.pointerId);
    setIsDrawing(false);

    if (currentStroke.current.length < 2) return;

    const newStroke: InkStroke = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
      tool,
      color: tool === "pen" ? "#333" : "#000",
      width: tool === "pen" ? 2 : 20,
      points: currentStroke.current,
    };

    const nextStrokes = [...strokes, newStroke];
    onUpdate(note.id, { 
      inkStrokes: nextStrokes,
      lastInteractedAt: new Date().toISOString()
    });
    currentStroke.current = [];
  };

  const handleUndo = () => {
    if (locked) return;
    const nextStrokes = (note.inkStrokes || []).slice(0, -1);
    onUpdate(note.id, { 
      inkStrokes: nextStrokes,
      lastInteractedAt: new Date().toISOString()
    });
  };

  const handleClear = () => {
    if (locked || !window.confirm(t("sketch.clear"))) return;
    onUpdate(note.id, { 
      inkStrokes: [],
      lastInteractedAt: new Date().toISOString()
    });
  };

  const setBackground = (bg: "plain" | "grid" | "lined") => {
    if (locked) return;
    onUpdate(note.id, { sketchBackground: bg });
  };

  return (
    <div className={`sketch-canvas ${locked ? "sketch-canvas--locked" : ""}`}>
      <canvas
        ref={canvasRef}
        className="sketch-canvas__element"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onPointerLeave={handlePointerUp}
        onContextMenu={(e) => e.preventDefault()}
        style={{ touchAction: "none" }}
      />
      
      <div className="sketch-canvas__toolbar">
        <button 
          className={`sketch-canvas__tool ${tool === "pen" ? "sketch-canvas__tool--active" : ""}`}
          onClick={() => setTool("pen")}
          disabled={locked}
          title={t("sketch.pen")}
        >
          ✏️
        </button>
        <button 
          className={`sketch-canvas__tool ${tool === "eraser" ? "sketch-canvas__tool--active" : ""}`}
          onClick={() => setTool("eraser")}
          disabled={locked}
          title={t("sketch.eraser")}
        >
          🧽
        </button>
        <div className="sketch-canvas__divider" />
        <button 
          className="sketch-canvas__tool" 
          onClick={handleUndo} 
          disabled={locked || !note.inkStrokes?.length}
          title={t("sketch.undo")}
        >
          ↩️
        </button>
        <button 
          className="sketch-canvas__tool" 
          onClick={handleClear} 
          disabled={locked || !note.inkStrokes?.length}
          title={t("sketch.clear")}
        >
          🗑️
        </button>
        <div className="sketch-canvas__divider" />
        <div className="sketch-canvas__bg-tools">
          <button 
            className={`sketch-canvas__bg-btn ${note.sketchBackground === "plain" || !note.sketchBackground ? "sketch-canvas__bg-btn--active" : ""}`}
            onClick={() => setBackground("plain")}
            disabled={locked}
            title={t("sketch.plain")}
          >
            📄
          </button>
          <button 
            className={`sketch-canvas__bg-btn ${note.sketchBackground === "grid" ? "sketch-canvas__bg-btn--active" : ""}`}
            onClick={() => setBackground("grid")}
            disabled={locked}
            title={t("sketch.grid")}
          >
            #️⃣
          </button>
          <button 
            className={`sketch-canvas__bg-btn ${note.sketchBackground === "lined" ? "sketch-canvas__bg-btn--active" : ""}`}
            onClick={() => setBackground("lined")}
            disabled={locked}
            title={t("sketch.lined")}
          >
            ≡
          </button>
        </div>
      </div>
      
      {locked && (
        <div className="sketch-canvas__locked-overlay" title={t("sketch.locked")}>
          🔒
        </div>
      )}
    </div>
  );
}

function renderSketch(
  ctx: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  strokes: InkStroke[],
  background: string
) {
  const rect = canvas.getBoundingClientRect();
  const width = Math.max(1, rect.width);
  const height = Math.max(1, rect.height);
  const dpr = window.devicePixelRatio || 1;

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, width, height);
  drawBackground(ctx, width, height, background);

  const inkCanvas = document.createElement("canvas");
  inkCanvas.width = Math.max(1, Math.round(width * dpr));
  inkCanvas.height = Math.max(1, Math.round(height * dpr));

  const inkCtx = inkCanvas.getContext("2d");
  if (!inkCtx) return;

  inkCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
  strokes.forEach(stroke => drawStroke(inkCtx, stroke));

  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.drawImage(inkCanvas, 0, 0);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

function drawStroke(ctx: CanvasRenderingContext2D, stroke: InkStroke) {
  if (stroke.points.length < 2) return;

  ctx.save();
  ctx.beginPath();
  if (stroke.tool === "eraser") {
    ctx.globalCompositeOperation = "destination-out";
  } else {
    ctx.globalCompositeOperation = "source-over";
  }

  ctx.strokeStyle = stroke.tool === "eraser" ? "#000" : stroke.color;
  ctx.lineWidth = stroke.width;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
  for (let i = 1; i < stroke.points.length; i++) {
    ctx.lineTo(stroke.points[i].x, stroke.points[i].y);
  }
  ctx.stroke();
  ctx.restore();
}

function drawBackground(ctx: CanvasRenderingContext2D, width: number, height: number, type: string) {
  if (type === "plain") return;

  ctx.save();
  ctx.globalCompositeOperation = "source-over";
  ctx.strokeStyle = "rgba(0,0,0,0.05)";
  ctx.lineWidth = 1;

  if (type === "grid") {
    const size = 20;
    for (let x = 0; x < width; x += size) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    for (let y = 0; y < height; y += size) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }
  } else if (type === "lined") {
    const size = 24;
    for (let y = size; y < height; y += size) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }
  }
  ctx.restore();
}
