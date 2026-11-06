import { createContext, useContext } from "react";
import type { User } from "./api";

export type Session = {
  user: User | null;
  checking: boolean;
  setUser: (user: User | null) => void;
};

export const SessionContext = createContext<Session | null>(null);

export function useSession() {
  const session = useContext(SessionContext);
  if (!session) throw new Error("useSession must be used inside AuthProvider");
  return session;
}
