import { Building2, CheckCircle2, XCircle } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { AseguradorasTable } from "@/components/admin/seguros/AseguradorasTable";
import { AseguradoraFormDialog } from "@/components/admin/seguros/AseguradoraFormDialog";
import {
  obtenerAseguradoras,
  obtenerAseguradorasStats,
} from "./actions";

export default async function AseguradorasPage() {
  const [aseguradoras, stats] = await Promise.all([
    obtenerAseguradoras(true), // Include inactive for admin view
    obtenerAseguradorasStats(),
  ]);

  return (
    <div className="flex-1 w-full flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Empresas Aseguradoras
          </h1>
          <p className="text-gray-600 mt-1">
            Gestiona las compañías aseguradoras del sistema
          </p>
        </div>
        <AseguradoraFormDialog />
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total de Aseguradoras
            </CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">
              Registradas en el sistema
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Activas</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {stats.activos}
            </div>
            <p className="text-xs text-muted-foreground">
              Disponibles para pólizas
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Inactivas</CardTitle>
            <XCircle className="h-4 w-4 text-gray-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-500">
              {stats.inactivos}
            </div>
            <p className="text-xs text-muted-foreground">
              Deshabilitadas del sistema
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Lista de Aseguradoras
          </CardTitle>
          <CardDescription>
            Compañías de seguros con las que trabaja la empresa
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AseguradorasTable data={aseguradoras} />
        </CardContent>
      </Card>
    </div>
  );
}
