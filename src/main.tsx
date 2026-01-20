import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Global error handlers to surface runtime errors (helpful for debugging in-browser)
window.addEventListener('error', (ev) => {
  // eslint-disable-next-line no-console
  console.error('Global error caught', ev.error || ev.message, ev);
});
window.addEventListener('unhandledrejection', (ev) => {
  // eslint-disable-next-line no-console
  console.error('Unhandled rejection', ev.reason || ev);
});

createRoot(document.getElementById("root")!).render(<App />);
