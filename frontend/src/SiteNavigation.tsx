import { PageLink } from './PageLink';
import { useEffect, useRef } from 'react';
import { usePathname } from './navigation';

const pages = [
  ['/', 'Problems'],
  ['/learn', 'Learning paths'],
  ['/progress', 'Practice review'],
  ['/generate', 'Generate a problem'],
  ['/about', 'About'],
];

export default function SiteNavigation() {
  const path = usePathname();
  const menu = useRef<HTMLDetailsElement>(null);
  useEffect(() => {
    const dismiss = (event: PointerEvent) => {
      if (menu.current && !menu.current.contains(event.target as Node)) menu.current.open = false;
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && menu.current?.open) {
        menu.current.open = false;
        menu.current.querySelector('summary')?.focus();
      }
    };
    document.addEventListener('pointerdown', dismiss);
    document.addEventListener('keydown', escape);
    return () => { document.removeEventListener('pointerdown', dismiss); document.removeEventListener('keydown', escape); };
  }, []);
  return <nav aria-label="Site" className="site-navigation">
    <details ref={menu} className="explore-menu">
      <summary>Explore</summary>
      <div className="explore-links">
        {pages.map(([href, label]) => <PageLink key={href} href={href} aria-current={path === href ? 'page' : undefined} onClick={() => { if (menu.current) menu.current.open = false; }}>{label}</PageLink>)}
      </div>
    </details>
  </nav>;
}
