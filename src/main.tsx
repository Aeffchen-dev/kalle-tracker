import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Resolve safe-area-inset-top via JS and expose as CSS variable
// This avoids iOS PWA env() timing issues on initial paint
function setSafeAreaVar() {
  const probe = document.createElement('div');
  probe.style.cssText = 'position:fixed;top:0;left:0;width:0;padding-top:env(safe-area-inset-top, 0px);visibility:hidden;pointer-events:none;';
  document.body.appendChild(probe);

  const resolve = () => {
    const value = probe.offsetHeight;
    document.documentElement.style.setProperty('--sat', `${value}px`);
    probe.remove();
  };

  // Try immediately, then after paint, then after a short delay
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      resolve();
    });
  });
}

if (window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as { standalone?: boolean }).standalone === true) {
  setSafeAreaVar();
} else {
  document.documentElement.style.setProperty('--sat', '0px');
}

createRoot(document.getElementById("root")!).render(<App />);
