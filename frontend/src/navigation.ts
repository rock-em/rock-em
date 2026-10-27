import { useSyncExternalStore } from 'react';

const subscribe = (notify: () => void) => {
  window.addEventListener('popstate', notify);
  return () => window.removeEventListener('popstate', notify);
};
const pathname = () => window.location.pathname.replace(/\/$/, '') || '/';

export function usePathname() {
  return useSyncExternalStore(subscribe, pathname);
}

export function navigateTo(path: string) {
  if (window.location.pathname !== path) window.history.pushState(null, '', path);
  window.dispatchEvent(new PopStateEvent('popstate'));
  window.scrollTo(0, 0);
}

