import { redirect, notFound } from "next/navigation";
import { getCurrentUser, requirePermission } from "@/utils/auth/helpers";
import { obtenerEmpleado } from "../actions";
import EmpleadoProfile from "@/components/rrhh/EmpleadoProfile";

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props) {
  const { id } = await params;
  const { data } = await obtenerEmpleado(id);
  if (!data) return { title: "Empleado | RRHH | Patria S.A." };
  return { title: `${data.apellidos}, ${data.nombres} | RRHH | Patria S.A.` };
}

export default async function EmpleadoDetailPage({ params }: Props) {
  const { id } = await params;

  const user = await getCurrentUser();
  if (!user) redirect("/auth/login");

  await requirePermission("rrhh.ver");

  const { data: empleado, error } = await obtenerEmpleado(id);

  if (error || !empleado) notFound();

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl">
      <EmpleadoProfile empleado={empleado} />
    </div>
  );
}
