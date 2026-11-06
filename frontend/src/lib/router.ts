import { useSyncExternalStore } from "react";

function subscribe(notify: () => void) {
  window.addEventListener("popstate", notify);
  return () => window.removeEventListener("popstate", notify);
}

function currentPath() {
  return window.location.pathname.replace(/\/$/, "") || "/";
}

export function usePathname() {
  return useSyncExternalStore(subscribe, currentPath);
}

export function navigate(path: string) {
  if (window.location.pathname !== path) window.history.pushState(null, "", path);
  window.dispatchEvent(new PopStateEvent("popstate"));
  window.scrollTo(0, 0);
}

export function isPlainClick(event: { button: number; metaKey: boolean; ctrlKey: boolean; shiftKey: boolean; altKey: boolean }) {
  return event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey;
}
