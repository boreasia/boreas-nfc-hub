import type { ReactNode } from "react";
import AdminShell from "@/components/admin/AdminShell";

// Server Component a propósito: lee ADMIN_USER del entorno para mostrarlo en
// el sidebar (AdminShell) sin exponer nunca ADMIN_PASSWORD al cliente — ese
// nunca sale de aquí. Envuelve TODAS las páginas de /admin (Resumen,
// Clientes, Chips, Reseñas y feedback, Configuración) con el mismo sidebar +
// topbar persistente, para que no se vuelvan a montar al navegar entre ellas.
export default function AdminLayout({ children }: { children: ReactNode }) {
  const adminUser = process.env.ADMIN_USER || "admin";
  return <AdminShell adminUser={adminUser}>{children}</AdminShell>;
}
