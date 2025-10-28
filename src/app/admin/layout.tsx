
import { AdminHeader } from "@/components/layout/admin-header";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div>
      <AdminHeader />
      {children}
    </div>
  );
}
