"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Search, Building2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
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
import { AseguradoraFormDialog } from "./AseguradoraFormDialog";
import {
  desactivarAseguradora,
  reactivarAseguradora,
} from "@/app/admin/seguros/aseguradoras/actions";
import type { CompaniaAseguradoraDB } from "@/types/catalogo-seguros";

interface AseguradorasTableProps {
  data: CompaniaAseguradoraDB[];
}

export function AseguradorasTable({ data }: AseguradorasTableProps) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [showInactive, setShowInactive] = useState(false);

  const filteredData = useMemo(() => {
    return data.filter((aseguradora) => {
      // Filter by active status
      if (!showInactive && !aseguradora.activo) {
        return false;
      }

      // Filter by search
      if (search) {
        const searchLower = search.toLowerCase();
        return (
          aseguradora.nombre.toLowerCase().includes(searchLower) ||
          aseguradora.codigo?.toString().includes(searchLower)
        );
      }

      return true;
    });
  }, [data, search, showInactive]);

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
            placeholder="Buscar aseguradoras..."
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
                <TableHead>Nombre</TableHead>
                <TableHead>Código</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredData.map((aseguradora) => (
                <TableRow key={aseguradora.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">{aseguradora.nombre}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="text-muted-foreground">
                      {aseguradora.codigo || "-"}
                    </span>
                  </TableCell>
                  <TableCell>
                    <StatusBadge activo={aseguradora.activo} />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-1">
                      <AseguradoraFormDialog
                        aseguradora={aseguradora}
                        onSuccess={handleRefresh}
                        triggerVariant="ghost"
                        iconOnly
                      />
                      <SoftDeleteDialog
                        itemName={aseguradora.nombre}
                        entityType="Aseguradora"
                        isActive={aseguradora.activo}
                        onAction={() =>
                          aseguradora.activo
                            ? desactivarAseguradora(aseguradora.id)
                            : reactivarAseguradora(aseguradora.id)
                        }
                        onSuccess={handleRefresh}
                        warningText="Las pólizas existentes no serán afectadas"
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
          <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-sm text-muted-foreground">
            {search
              ? "No se encontraron aseguradoras con ese criterio"
              : showInactive
                ? "No hay aseguradoras registradas"
                : "No hay aseguradoras activas"}
          </p>
        </div>
      )}

      {/* Results count */}
      <div className="text-xs text-muted-foreground">
        Mostrando {filteredData.length} de {data.length} aseguradoras
      </div>
    </div>
  );
}
