"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Search, Tag } from "lucide-react";
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
import { CategoriaFormDialog } from "./CategoriaFormDialog";
import {
  desactivarCategoria,
  reactivarCategoria,
} from "@/app/admin/seguros/categorias/actions";
import type { CategoriaDB } from "@/types/catalogo-seguros";

interface CategoriasTableProps {
  data: CategoriaDB[];
}

export function CategoriasTable({ data }: CategoriasTableProps) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [showInactive, setShowInactive] = useState(false);

  const filteredData = useMemo(() => {
    return data.filter((categoria) => {
      // Filter by active status
      if (!showInactive && !categoria.activo) {
        return false;
      }

      // Filter by search
      if (search) {
        const searchLower = search.toLowerCase();
        return (
          categoria.nombre.toLowerCase().includes(searchLower) ||
          categoria.descripcion?.toLowerCase().includes(searchLower)
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
            placeholder="Buscar categorías..."
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
                <TableHead className="hidden md:table-cell">
                  Descripción
                </TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredData.map((categoria) => (
                <TableRow key={categoria.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Tag className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">{categoria.nombre}</span>
                    </div>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    <span className="text-muted-foreground text-sm">
                      {categoria.descripcion || "-"}
                    </span>
                  </TableCell>
                  <TableCell>
                    <StatusBadge activo={categoria.activo} />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-1">
                      <CategoriaFormDialog
                        categoria={categoria}
                        onSuccess={handleRefresh}
                        triggerVariant="ghost"
                        iconOnly
                      />
                      <SoftDeleteDialog
                        itemName={categoria.nombre}
                        entityType="Categoría"
                        isActive={categoria.activo}
                        onAction={() =>
                          categoria.activo
                            ? desactivarCategoria(categoria.id)
                            : reactivarCategoria(categoria.id)
                        }
                        onSuccess={handleRefresh}
                        warningText="Las pólizas existentes con esta categoría no serán afectadas"
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
          <Tag className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-sm text-muted-foreground">
            {search
              ? "No se encontraron categorías con ese criterio"
              : showInactive
                ? "No hay categorías registradas"
                : "No hay categorías activas"}
          </p>
        </div>
      )}

      {/* Results count */}
      <div className="text-xs text-muted-foreground">
        Mostrando {filteredData.length} de {data.length} categorías
      </div>
    </div>
  );
}
