import { AuthPage } from "../features/auth/AuthPage";
import { PasswordResetPage } from "../features/auth/PasswordResetPage";
import { GeneratePage } from "../features/generate/GeneratePage";
import { LearnPage } from "../features/learn/LearnPage";
import { BrowsePage } from "../features/problems/BrowsePage";
import { CatalogGate } from "../features/problems/CatalogGate";
import { ProgressPage } from "../features/progress/ProgressPage";
import { WorkspacePage } from "../features/workspace/WorkspacePage";
import { usePathname } from "../lib/router";
import { AboutPage } from "../pages/AboutPage";
import { NotFoundPage } from "../pages/NotFoundPage";

const PROBLEM_PATH = /^\/problems\/([a-z0-9]+(?:-[a-z0-9]+)*)$/;

export function Routes() {
  const path = usePathname();
  const problem = path.match(PROBLEM_PATH);
  if (problem) return <WorkspacePage key={problem[1]} slug={problem[1]} />;

  switch (path) {
    case "/":
      return <CatalogGate><BrowsePage /></CatalogGate>;
    case "/learn":
      return <CatalogGate><LearnPage /></CatalogGate>;
    case "/progress":
      return <CatalogGate><ProgressPage /></CatalogGate>;
    case "/generate":
      return <GeneratePage />;
    case "/about":
      return <AboutPage />;
    case "/sign-in":
    case "/sign-up":
      return <AuthPage key={path} mode={path.slice(1) as "sign-in" | "sign-up"} />;
    case "/forgot-password":
    case "/reset-password":
      return <PasswordResetPage key={path} resetting={path === "/reset-password"} />;
    default:
      return <NotFoundPage />;
  }
}
