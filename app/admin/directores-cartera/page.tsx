import { UserCircle, CheckCircle2, XCircle } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { DirectoresCarteraTable } from "@/components/admin/DirectoresCarteraTable";
import { DirectoresCarteraFormDialog } from "@/components/admin/DirectoresCarteraFormDialog";
import {
  obtenerDirectoresCartera,
  obtenerDirectoresStats,
} from "./actions";

export default async function DirectoresCarteraPage() {
  const [directores, stats] = await Promise.all([
    obtenerDirectoresCartera(true),
    obtenerDirectoresStats(),
  ]);

  return (
    <div className="flex-1 w-full flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Directores de Cartera
          </h1>
          <p className="text-gray-600 mt-1">
            Gestiona los directores de cartera asignables a clientes
          </p>
        </div>
        <DirectoresCarteraFormDialog />
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total</CardTitle>
            <UserCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">
              Registrados en el sistema
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Activos</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {stats.activos}
            </div>
            <p className="text-xs text-muted-foreground">
              Disponibles para asignación
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Inactivos</CardTitle>
            <XCircle className="h-4 w-4 text-gray-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-500">
              {stats.inactivos}
            </div>
            <p className="text-xs text-muted-foreground">
              Deshabilitados del sistema
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserCircle className="h-5 w-5" />
            Lista de Directores
          </CardTitle>
          <CardDescription>
            Personas responsables de gestionar carteras de clientes
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DirectoresCarteraTable data={directores} />
        </CardContent>
      </Card>
    </div>
  );
}
