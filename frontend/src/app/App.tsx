import { AuthProvider } from "../features/auth/AuthProvider";
import { PracticeProvider } from "../features/practice/PracticeProvider";
import { AppShell } from "./AppShell";
import { Routes } from "./Routes";

export function App() {
  return (
    <AuthProvider>
      <PracticeProvider>
        <AppShell>
          <Routes />
        </AppShell>
      </PracticeProvider>
    </AuthProvider>
  );
}
