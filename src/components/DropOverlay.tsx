import { useState, useCallback, useEffect, useRef } from "react";
import { useTranslation } from "../i18n/I18nContext";
import { isTauriDropAvailable, listenTauriDrop, type DroppedPathInfo } from "../lib/tauriDrop";

interface Props {
  onFileDrop: (files: FileList) => void;
  onPathDrop: (infos: DroppedPathInfo[]) => void;
}

export function DropOverlay({ onFileDrop, onPathDrop }: Props) {
  const { t } = useTranslation();
  const [isDragOver, setIsDragOver] = useState(false);
  const dragCounterRef = useRef(0);

  const handleDragEnter = useCallback(
    (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      // Only respond to external file drops (dataTransfer has files)
      if (!e.dataTransfer?.types.includes("Files")) return;
      dragCounterRef.current++;
      setIsDragOver(true);
    },
    []
  );

  const handleDragLeave = useCallback(
    (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      dragCounterRef.current--;
      if (dragCounterRef.current <= 0) {
        dragCounterRef.current = 0;
        setIsDragOver(false);
      }
    },
    []
  );

  const handleDragOver = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer) {
      e.dataTransfer.dropEffect = "copy";
    }
  }, []);

  const handleDrop = useCallback(
    (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      dragCounterRef.current = 0;
      setIsDragOver(false);

      if (e.dataTransfer?.files && e.dataTransfer.files.length > 0) {
        onFileDrop(e.dataTransfer.files);
      }
    },
    [onFileDrop]
  );

  useEffect(() => {
    if (isTauriDropAvailable()) return;

    const doc = document.documentElement;
    doc.addEventListener("dragenter", handleDragEnter);
    doc.addEventListener("dragleave", handleDragLeave);
    doc.addEventListener("dragover", handleDragOver);
    doc.addEventListener("drop", handleDrop);

    return () => {
      doc.removeEventListener("dragenter", handleDragEnter);
      doc.removeEventListener("dragleave", handleDragLeave);
      doc.removeEventListener("dragover", handleDragOver);
      doc.removeEventListener("drop", handleDrop);
    };
  }, [handleDragEnter, handleDragLeave, handleDragOver, handleDrop]);

  useEffect(() => {
    if (!isTauriDropAvailable()) return;

    let cleanup: (() => void) | undefined;
    const setupNativeDrop = async () => {
      cleanup = await listenTauriDrop({
        onEnter: () => setIsDragOver(true),
        onOver: () => setIsDragOver(true),
        onLeave: () => {
          setIsDragOver(false);
          dragCounterRef.current = 0;
        },
        onDrop: (infos) => {
          setIsDragOver(false);
          dragCounterRef.current = 0;
          onPathDrop(infos);
        },
        onError: (err) => {
          console.warn("[drop] Failed to inspect dropped paths", err);
          setIsDragOver(false);
          dragCounterRef.current = 0;
        },
      });
    };
    setupNativeDrop().catch((err: unknown) => {
      console.warn("[drop] Failed to set up native drag/drop", err);
    });

    return () => {
      if (cleanup) cleanup();
    };
  }, [onPathDrop]);

  if (!isDragOver) return null;

  return (
    <div className="drop-overlay">
      <div className="drop-overlay__content">
        <div className="drop-overlay__icon">📁</div>
        <div className="drop-overlay__text">{t("drop.title")}</div>
        <div className="drop-overlay__sub">{t("drop.subtitle")}</div>
      </div>
    </div>
  );
}
