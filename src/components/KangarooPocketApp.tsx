import { useEffect, useState } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { useTranslation } from "../i18n/I18nContext";
import { sendPocketDropToMain } from "../lib/kangarooPocket";
import { isTauriDropAvailable, listenTauriDrop } from "../lib/tauriDrop";

type PocketState = "idle" | "active" | "done" | "error";

export function KangarooPocketApp() {
  const { t, isI18nLoaded } = useTranslation();
  const [state, setState] = useState<PocketState>("idle");

  useEffect(() => {
    if (!isTauriDropAvailable()) return;

    let cleanup: (() => void) | undefined;
    let cancelled = false;

    async function setupDrop() {
      try {
        cleanup = await listenTauriDrop({
          onEnter: () => setState("active"),
          onOver: () => setState("active"),
          onLeave: () => setState("idle"),
          onDrop: async (infos) => {
            setState("done");
            await sendPocketDropToMain(infos);
            window.setTimeout(() => {
              getCurrentWindow().hide().catch((error) => {
                console.warn("[kangaroo-pocket] Failed to hide pocket", error);
              });
              if (!cancelled) setState("idle");
            }, 300);
          },
          onError: (error) => {
            console.warn("[kangaroo-pocket] Drop failed", error);
            setState("error");
          },
        });
      } catch (error) {
        console.warn("[kangaroo-pocket] Failed to listen for drops", error);
        setState("error");
      }
    }

    setupDrop();

    return () => {
      cancelled = true;
      cleanup?.();
    };
  }, []);

  if (!isI18nLoaded) return null;

  return (
    <main className={`kangaroo-pocket kangaroo-pocket--${state}`}>
      <section className="kangaroo-pocket__card" aria-label={t("kangarooPocket.title")}>
        <div className="kangaroo-pocket__animal">🦘</div>
        <div className="kangaroo-pocket__copy">
          <h1>{t("kangarooPocket.title")}</h1>
          <p>
            {isTauriDropAvailable()
              ? state === "done"
                ? t("kangarooPocket.done")
                : state === "active"
                  ? t("kangarooPocket.release")
                  : t("kangarooPocket.subtitle")
              : t("kangarooPocket.tauriOnly")}
          </p>
        </div>
        <div className="kangaroo-pocket__pouch" aria-hidden="true">
          <span>+</span>
        </div>
      </section>
    </main>
  );
}
