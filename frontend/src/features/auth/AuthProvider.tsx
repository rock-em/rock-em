import { useEffect, useMemo, useState, type ReactNode } from "react";
import { getSession, type User } from "./api";
import { SessionContext } from "./session";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let active = true;
    getSession()
      .then((next) => active && setUser(next))
      .catch(() => {})
      .finally(() => active && setChecking(false));
    return () => {
      active = false;
    };
  }, []);

  const value = useMemo(() => ({ user, checking, setUser }), [user, checking]);
  return <SessionContext value={value}>{children}</SessionContext>;
}
