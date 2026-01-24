"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Search, Layers, FolderOpen, FileText, ChevronRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { StatusBadge } from "./StatusBadge";
import { SoftDeleteDialog } from "./SoftDeleteDialog";
import { RamoFormDialog } from "./RamoFormDialog";
import {
  desactivarRamo,
  reactivarRamo,
} from "@/app/admin/seguros/ramos/actions";
import type { TipoSeguroConHijos } from "@/types/catalogo-seguros";

interface RamosTableProps {
  data: TipoSeguroConHijos[];
}

export function RamosTable({ data }: RamosTableProps) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [showInactive, setShowInactive] = useState(false);

  // Organize data: parents first, then their children
  const organizedData = useMemo(() => {
    const padres = data.filter((r) => r.es_ramo_padre);
    const hijos = data.filter((r) => !r.es_ramo_padre);

    // Create a flat list with proper ordering
    const result: (TipoSeguroConHijos & { isChild?: boolean })[] = [];

    padres.forEach((padre) => {
      result.push({ ...padre, isChild: false });
      // Add children of this parent
      const children = hijos.filter((h) => h.ramo_padre_id === padre.id);
      children.forEach((child) => {
        result.push({ ...child, isChild: true });
      });
    });

    // Add orphan children (without parent)
    const orphans = hijos.filter(
      (h) => !h.ramo_padre_id || !padres.find((p) => p.id === h.ramo_padre_id)
    );
    orphans.forEach((orphan) => {
      result.push({ ...orphan, isChild: true });
    });

    return result;
  }, [data]);

  const filteredData = useMemo(() => {
    return organizedData.filter((ramo) => {
      // Filter by active status
      if (!showInactive && !ramo.activo) {
        return false;
      }

      // Filter by search
      if (search) {
        const searchLower = search.toLowerCase();
        return (
          ramo.nombre.toLowerCase().includes(searchLower) ||
          ramo.codigo.toLowerCase().includes(searchLower)
        );
      }

      return true;
    });
  }, [organizedData, search, showInactive]);

  const handleRefresh = () => {
    router.refresh();
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar ramos..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        <div className="flex items-center space-x-2">
          <Switch
            id="show-inactive"
            checked={showInactive}
            onCheckedChange={setShowInactive}
          />
          <Label htmlFor="show-inactive" className="text-sm">
            Mostrar inactivos
          </Label>
        </div>
      </div>

      {/* Table */}
      {filteredData.length > 0 ? (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[100px]">Código</TableHead>
                <TableHead>Nombre</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredData.map((ramo) => (
                <TableRow
                  key={ramo.id}
                  className={ramo.isChild ? "bg-muted/30" : ""}
                >
                  <TableCell>
                    <code className="text-xs bg-muted px-2 py-1 rounded">
                      {ramo.codigo}
                    </code>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {ramo.isChild && (
                        <ChevronRight className="h-4 w-4 text-muted-foreground ml-4" />
                      )}
                      {ramo.es_ramo_padre ? (
                        <FolderOpen className="h-4 w-4 text-blue-600" />
                      ) : (
                        <FileText className="h-4 w-4 text-muted-foreground" />
                      )}
                      <span className={ramo.es_ramo_padre ? "font-medium" : ""}>
                        {ramo.nombre}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    {ramo.es_ramo_padre ? (
                      <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                        Categoría
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="bg-gray-50 text-gray-600">
                        Ramo
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <StatusBadge activo={ramo.activo} />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-1">
                      <RamoFormDialog
                        ramo={ramo}
                        onSuccess={handleRefresh}
                        triggerVariant="ghost"
                        iconOnly
                      />
                      <SoftDeleteDialog
                        itemName={ramo.nombre}
                        entityType="Ramo"
                        isActive={ramo.activo}
                        onAction={() =>
                          ramo.activo
                            ? desactivarRamo(ramo.id)
                            : reactivarRamo(ramo.id)
                        }
                        onSuccess={handleRefresh}
                        warningText={
                          ramo.es_ramo_padre
                            ? "Debe desactivar todos los ramos hijos primero"
                            : undefined
                        }
                      />
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <div className="text-center py-12 border rounded-md">
          <Layers className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-sm text-muted-foreground">
            {search
              ? "No se encontraron ramos con ese criterio"
              : showInactive
                ? "No hay ramos registrados"
                : "No hay ramos activos"}
          </p>
        </div>
      )}

      {/* Results count */}
      <div className="text-xs text-muted-foreground">
        Mostrando {filteredData.length} de {data.length} ramos
      </div>
    </div>
  );
}
