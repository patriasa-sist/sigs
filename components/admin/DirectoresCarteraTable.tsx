"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Search, UserCircle } from "lucide-react";
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
import { StatusBadge } from "@/components/admin/seguros/StatusBadge";
import { SoftDeleteDialog } from "@/components/admin/seguros/SoftDeleteDialog";
import { DirectoresCarteraFormDialog } from "./DirectoresCarteraFormDialog";
import {
  desactivarDirectorCartera,
  reactivarDirectorCartera,
} from "@/app/admin/directores-cartera/actions";
import type { DirectorCarteraDB } from "@/app/admin/directores-cartera/actions";

interface DirectoresCarteraTableProps {
  data: DirectorCarteraDB[];
}

export function DirectoresCarteraTable({ data }: DirectoresCarteraTableProps) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [showInactive, setShowInactive] = useState(false);

  const filteredData = useMemo(() => {
    return data.filter((director) => {
      if (!showInactive && !director.activo) return false;

      if (search) {
        const q = search.toLowerCase();
        const fullName = `${director.nombre} ${director.apellidos || ""}`.toLowerCase();
        return fullName.includes(q);
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
            placeholder="Buscar directores..."
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
                <TableHead>Apellidos</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredData.map((director) => (
                <TableRow key={director.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <UserCircle className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">{director.nombre}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="text-muted-foreground">
                      {director.apellidos || "-"}
                    </span>
                  </TableCell>
                  <TableCell>
                    <StatusBadge activo={director.activo} />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-1">
                      <DirectoresCarteraFormDialog
                        director={director}
                        onSuccess={handleRefresh}
                        triggerVariant="ghost"
                        iconOnly
                      />
                      <SoftDeleteDialog
                        itemName={`${director.nombre}${director.apellidos ? ` ${director.apellidos}` : ""}`}
                        entityType="Director"
                        isActive={director.activo}
                        onAction={() =>
                          director.activo
                            ? desactivarDirectorCartera(director.id)
                            : reactivarDirectorCartera(director.id)
                        }
                        onSuccess={handleRefresh}
                        warningText="Los clientes asignados no serán afectados pero quedarán sin director"
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
          <UserCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-sm text-muted-foreground">
            {search
              ? "No se encontraron directores con ese criterio"
              : showInactive
                ? "No hay directores registrados"
                : "No hay directores activos"}
          </p>
        </div>
      )}

      {/* Results count */}
      <div className="text-xs text-muted-foreground">
        Mostrando {filteredData.length} de {data.length} directores
      </div>
    </div>
  );
}
