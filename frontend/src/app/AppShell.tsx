import type { ReactNode } from "react";
import { AccountMenu } from "../features/auth/AccountMenu";
import { Link } from "../lib/Link";
import { SiteNavigation } from "./SiteNavigation";
import { ThemeToggle } from "./ThemeToggle";
import "./AppShell.css";

export function AppShell({ children }: { children: ReactNode }) {
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
          <ThemeToggle />
          <AccountMenu />
        </div>
      </header>
      {children}
    </>
  );
}
