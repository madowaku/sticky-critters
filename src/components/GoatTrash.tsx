import { useState, forwardRef } from "react";
import { useTranslation } from "../i18n/I18nContext";

interface Props {
  isActive: boolean;
  isEating: boolean;
  targetSize?: { width: number; height: number } | null;
}

export const GoatTrash = forwardRef<HTMLDivElement, Props>(
  ({ isActive, isEating, targetSize }, ref) => {
    const { t } = useTranslation();
    const [hoverPulse, setHoverPulse] = useState(false);
    const sizeStyle = isActive && targetSize
      ? { "--goat-target-width": `${targetSize.width}px`, "--goat-target-height": `${targetSize.height}px` } as React.CSSProperties
      : undefined;

    return (
      <div
        ref={ref}
        className={`goat-trash${isActive ? " goat-trash--active" : ""}${isEating ? " goat-trash--eating" : ""}${hoverPulse ? " goat-trash--pulse" : ""}`}
        style={sizeStyle}
        onPointerEnter={() => setHoverPulse(true)}
        onPointerLeave={() => setHoverPulse(false)}
      >
        <div className="goat-trash__icon">{isEating ? "😋" : "🐐"}</div>
        <div className="goat-trash__label">
          {isEating
            ? t("goat.done")
            : isActive || hoverPulse
              ? t(isActive ? "goat.dropReady" : "goat.drag")
              : t("goat.idle")}
        </div>
      </div>
    );
  }
);

GoatTrash.displayName = "GoatTrash";
