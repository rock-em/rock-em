import { useMemo, useSyncExternalStore } from "react";

function subscribe(notify: () => void) {
  window.addEventListener("popstate", notify);
  return () => window.removeEventListener("popstate", notify);
}

function currentPath() {
  return window.location.pathname.replace(/\/$/, "") || "/";
}

function currentSearch() {
  return window.location.search;
}

export function usePathname() {
  return useSyncExternalStore(subscribe, currentPath);
}

/** The query string as URLSearchParams, so filters live in shareable URLs. */
export function useQuery() {
  const search = useSyncExternalStore(subscribe, currentSearch);
  return useMemo(() => new URLSearchParams(search), [search]);
}

/** Replaces the query string in place: no history entry and no scroll jump. */
export function setQuery(query: URLSearchParams) {
  const search = query.toString();
  window.history.replaceState(null, "", window.location.pathname + (search ? `?${search}` : ""));
  window.dispatchEvent(new PopStateEvent("popstate"));
}

export function navigate(path: string) {
  if (window.location.pathname + window.location.search !== path) window.history.pushState(null, "", path);
  window.dispatchEvent(new PopStateEvent("popstate"));
  window.scrollTo(0, 0);
}

export function isPlainClick(event: {
  button: number;
  metaKey: boolean;
  ctrlKey: boolean;
  shiftKey: boolean;
  altKey: boolean;
}) {
  return event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey;
}
