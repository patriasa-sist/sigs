import { Layers, FolderOpen, FileText, CheckCircle2 } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { RamosTable } from "@/components/admin/seguros/RamosTable";
import { RamoFormDialog } from "@/components/admin/seguros/RamoFormDialog";
import { obtenerRamos, obtenerRamosStats } from "./actions";

export default async function RamosPage() {
  const [ramos, stats] = await Promise.all([
    obtenerRamos(true), // Include inactive for admin view
    obtenerRamosStats(),
  ]);

  return (
    <div className="flex-1 w-full flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Ramos de Seguros</h1>
          <p className="text-gray-600 mt-1">
            Gestiona los tipos de seguros organizados por categorías
          </p>
        </div>
        <RamoFormDialog />
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total de Ramos
            </CardTitle>
            <Layers className="h-4 w-4 text-muted-foreground" />
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
              Disponibles para pólizas
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Categorías</CardTitle>
            <FolderOpen className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {stats.padres}
            </div>
            <p className="text-xs text-muted-foreground">
              Ramos principales (padres)
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Sub-ramos</CardTitle>
            <FileText className="h-4 w-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-600">
              {stats.hijos}
            </div>
            <p className="text-xs text-muted-foreground">Ramos específicos</p>
          </CardContent>
        </Card>
      </div>

      {/* Info Box */}
      <div className="rounded-lg bg-blue-50 border border-blue-200 p-4">
        <p className="text-sm text-blue-800">
          <strong>Estructura jerárquica:</strong> Los ramos se organizan en
          categorías (ej: &quot;Seguros Generales&quot;) que contienen ramos específicos
          (ej: &quot;Automotor&quot;, &quot;Incendio&quot;). Los ramos marcados como &quot;categoría
          principal&quot; pueden contener otros ramos.
        </p>
      </div>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Layers className="h-5 w-5" />
            Lista de Ramos
          </CardTitle>
          <CardDescription>
            Tipos de seguros disponibles para crear pólizas
          </CardDescription>
        </CardHeader>
        <CardContent>
          <RamosTable data={ramos} />
        </CardContent>
      </Card>
    </div>
  );
}
