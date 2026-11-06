import { useRef } from "react";
import { Link } from "../lib/Link";
import { usePathname } from "../lib/router";
import { useDismiss } from "../lib/useDismiss";

const pages = [
  ["/", "Problems"],
  ["/learn", "Learning paths"],
  ["/progress", "Practice review"],
  ["/generate", "Generate a problem"],
  ["/about", "About"],
];

export function SiteNavigation() {
  const path = usePathname();
  const menu = useRef<HTMLDetailsElement>(null);
  useDismiss(menu);
  const close = () => menu.current?.removeAttribute("open");

  return (
    <nav aria-label="Site" className="site-navigation">
      <details ref={menu} className="explore-menu">
        <summary>Explore</summary>
        <div className="explore-links">
          {pages.map(([href, label]) => (
            <Link key={href} href={href} aria-current={path === href ? "page" : undefined} onClick={close}>
              {label}
            </Link>
          ))}
        </div>
      </details>
    </nav>
  );
}
