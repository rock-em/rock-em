import { AuthLayout } from "./AuthLayout";
import { PasswordResetForm } from "./PasswordResetForm";
import { useSession } from "./session";

export function PasswordResetPage({ resetting }: { resetting: boolean }) {
  const { setUser } = useSession();
  return (
    <AuthLayout>
      <PasswordResetForm resetting={resetting} onReset={() => setUser(null)} />
    </AuthLayout>
  );
}
