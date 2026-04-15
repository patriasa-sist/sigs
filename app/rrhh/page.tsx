import { redirect } from "next/navigation";
import { getCurrentUser } from "@/utils/auth/helpers";
import { requirePermission } from "@/utils/auth/helpers";
import { listarEmpleados } from "./actions";
import EmpleadosList from "@/components/rrhh/EmpleadosList";

export const metadata = { title: "Recursos Humanos | Patria S.A." };

export default async function RRHHPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/auth/login");

  await requirePermission("rrhh.ver");

  const { data: empleados, error } = await listarEmpleados();

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-foreground">Recursos Humanos</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Registro y gestión del personal de Patria S.A.
        </p>
      </div>
      <EmpleadosList empleados={empleados} error={error} />
    </div>
  );
}
