import { redirect } from "next/navigation";
import { getCurrentUser, requirePermission } from "@/utils/auth/helpers";
import NuevoEmpleadoForm from "@/components/rrhh/NuevoEmpleadoForm";

export const metadata = { title: "Nuevo Empleado | RRHH | Patria S.A." };

export default async function NuevoEmpleadoPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/auth/login");

  await requirePermission("rrhh.crear");

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-foreground">Registrar Empleado</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Complete todos los datos del nuevo empleado paso a paso.
        </p>
      </div>
      <NuevoEmpleadoForm />
    </div>
  );
}
