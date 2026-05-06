import App from "./App";
import { KangarooPocketApp } from "./components/KangarooPocketApp";

export function RootApp() {
  const params = new URLSearchParams(window.location.search);
  return params.get("view") === "kangaroo-pocket" ? <KangarooPocketApp /> : <App />;
}
