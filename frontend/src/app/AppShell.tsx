import type { ReactNode } from "react";
import { AccountMenu } from "../features/auth/AccountMenu";
import { Link } from "../lib/Link";
import { usePathname } from "../lib/router";
import { CommandPalette } from "./CommandPalette";
import { SiteNavigation } from "./SiteNavigation";
import { ThemeToggle } from "./ThemeToggle";
import "./AppShell.css";

export function AppShell({ children }: { children: ReactNode }) {
  // The problem workspace fills the window and brings its own slim bar.
  if (usePathname().startsWith("/problems/")) return <>{children}</>;
  return (
    <>
      <header className="site-header">
        <div className="site-header-start">
          <Link className="site-brand" href="/">
            rock em
          </Link>
          <SiteNavigation />
        </div>
        <div className="site-header-end">
          <CommandPalette />
          <ThemeToggle />
          <AccountMenu />
        </div>
      </header>
      {children}
    </>
  );
}
