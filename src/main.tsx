import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Visual redesign experiment (DEV only): `/dev/home-v2` can keep design v2 on for
// every page, so the Workspace pages can be judged in it too. Production never sets it.
if (import.meta.env.DEV) {
  try {
    if (localStorage.getItem('cpb.designPreview') === 'v2') document.documentElement.setAttribute('data-design', 'v2');
  } catch { /* storage blocked: preview stays off */ }
}

createRoot(document.getElementById("root")!).render(<App />);

// Register service worker for return-visitor caching (deferred, non-blocking)
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {
      // Silent fail — SW is an enhancement, not a requirement
    });
  });
}
