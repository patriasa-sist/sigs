import { Package, CheckCircle2, XCircle } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ProductosTable } from "@/components/admin/seguros/ProductosTable";
import { ProductoFormDialog } from "@/components/admin/seguros/ProductoFormDialog";
import { obtenerProductos, obtenerProductosStats } from "./actions";
import { obtenerAseguradoras } from "../aseguradoras/actions";
import { obtenerRamos } from "../ramos/actions";

export default async function ProductosPage() {
  const [productos, stats, aseguradoras, ramos] = await Promise.all([
    obtenerProductos({ includeInactive: true }),
    obtenerProductosStats(),
    obtenerAseguradoras(false), // Only active for filters
    obtenerRamos(false), // Only active for filters
  ]);

  return (
    <div className="flex-1 w-full flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Productos</h1>
          <p className="text-gray-600 mt-1">
            Gestiona los productos de seguros por aseguradora
          </p>
        </div>
        <ProductoFormDialog />
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total de Productos
            </CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
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

      {/* Info Box */}
      <div className="rounded-lg bg-amber-50 border border-amber-200 p-4">
        <p className="text-sm text-amber-800">
          <strong>Nota:</strong> Los productos definen los factores de cálculo
          para la prima neta y el porcentaje de comisión. Cada producto está
          asociado a una aseguradora y un ramo de seguro específico.
        </p>
      </div>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Lista de Productos
          </CardTitle>
          <CardDescription>
            Productos de seguros con sus factores de cálculo y comisiones
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ProductosTable
            data={productos}
            aseguradoras={aseguradoras}
            ramos={ramos}
          />
        </CardContent>
      </Card>
    </div>
  );
}
