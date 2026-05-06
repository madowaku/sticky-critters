import { useState, useRef, useEffect } from "react";
import type { NoteColor, NoteKind } from "../types";
import { useTranslation } from "../i18n/I18nContext";

const COLORS: NoteColor[] = [
  "yellow",
  "blue",
  "pink",
  "green",
  "gray",
  "purple",
];

const COLOR_LABELS: Record<string, Record<NoteColor, string>> = {
  ja: {
    yellow: "イエロー",
    blue: "ブルー",
    pink: "ピンク",
    green: "グリーン",
    gray: "グレー",
    purple: "パープル",
  },
  en: {
    yellow: "Yellow",
    blue: "Blue",
    pink: "Pink",
    green: "Green",
    gray: "Gray",
    purple: "Purple",
  },
};

interface Props {
  defaultKind?: NoteKind;
  onSubmit: (body: string, color: NoteColor, kind?: NoteKind, alarmAt?: string, temporary?: { expiresAt: string, reviewAfter: string }) => void | Promise<void>;
  onClose: () => void;
}

export function QuickAddPanel({ defaultKind, onSubmit, onClose }: Props) {
  const { t, locale } = useTranslation();
  const [body, setBody] = useState("");
  const [color, setColor] = useState<NoteColor>("yellow");
  const [alarmEnabled, setAlarmEnabled] = useState(false);
  const [alarmTime, setAlarmTime] = useState("");
  const [todayOnly, setTodayOnly] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  const handleSubmit = async () => {
    const trimmed = body.trim();
    if (!trimmed) return;
    const alarmAt = alarmEnabled && alarmTime ? new Date(alarmTime).toISOString() : undefined;
    
    let temp: { expiresAt: string, reviewAfter: string } | undefined;
    if (todayOnly) {
      const expires = new Date();
      expires.setHours(23, 59, 59, 999);
      const review = new Date();
      review.setDate(review.getDate() + 1);
      review.setHours(9, 0, 0, 0);
      temp = { expiresAt: expires.toISOString(), reviewAfter: review.toISOString() };
    }

    await onSubmit(trimmed, color, defaultKind, alarmAt, temp);
    setBody("");
    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
    if (e.key === "Escape") {
      onClose();
    }
  };

  return (
    <div className="quick-add-overlay" onClick={onClose}>
      <div className="quick-add" onClick={(e) => e.stopPropagation()}>
        <div className="quick-add__header">
          <span className="quick-add__title">
            {defaultKind === "code" ? `💻 ${t("note.codeSnippet")}` : `📝 ${t("quickAdd.title")}`}
          </span>
          <button className="quick-add__close" onClick={onClose}>
            ×
          </button>
        </div>
        <textarea
          ref={textareaRef}
          className="quick-add__textarea"
          placeholder={t("quickAdd.placeholder")}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          onKeyDown={handleKeyDown}
          rows={4}
        />
        <div className="quick-add__hint">{t("quickAdd.hint")}</div>
        <div className="quick-add__footer">
          <div className="quick-add__footer-row">
            <div className="quick-add__colors" aria-label={t("color.change")}>
              {COLORS.map((c) => (
                <button
                  key={c}
                  className={`quick-add__color-dot quick-add__color-dot--${c}${c === color ? " quick-add__color-dot--selected" : ""}`}
                  onClick={() => setColor(c)}
                  title={COLOR_LABELS[locale][c]}
                  aria-label={COLOR_LABELS[locale][c]}
                />
              ))}
            </div>

            <button
              className="quick-add__submit"
              onClick={handleSubmit}
              disabled={!body.trim()}
            >
              {t("quickAdd.add")}
            </button>
          </div>

          <div className="quick-add__footer-row quick-add__footer-row--options">
            <div className="quick-add__alarm">
              <label className="quick-add__alarm-label">
                <input 
                  type="checkbox" 
                  checked={alarmEnabled} 
                  onChange={e => setAlarmEnabled(e.target.checked)} 
                />
                <span>🐔 {t("alarm.enable")}</span>
              </label>
              {alarmEnabled && (
                <input
                  type="datetime-local"
                  className="quick-add__alarm-input"
                  value={alarmTime}
                  onChange={e => setAlarmTime(e.target.value)}
                />
              )}
            </div>

            <div className="quick-add__temporary">
              <label className="quick-add__alarm-label" title={t("temporary.todayOnlyHint")}>
                <input 
                  type="checkbox" 
                  checked={todayOnly} 
                  onChange={e => setTodayOnly(e.target.checked)} 
                />
                <span>📅 {t("temporary.todayOnly")}</span>
              </label>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
