import { AuthProvider } from "@/components/admin/auth";
import { Shell } from "@/components/admin/shell";

export default function DashLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <Shell>{children}</Shell>
    </AuthProvider>
  );
}
