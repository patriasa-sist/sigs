"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Search, Package, Building2, Layers } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { ProductoFormDialog } from "./ProductoFormDialog";
import {
  desactivarProducto,
  reactivarProducto,
} from "@/app/admin/seguros/productos/actions";
import type {
  ProductoConRelaciones,
  CompaniaAseguradoraDB,
  TipoSeguroConHijos,
} from "@/types/catalogo-seguros";

interface ProductosTableProps {
  data: ProductoConRelaciones[];
  aseguradoras: CompaniaAseguradoraDB[];
  ramos: TipoSeguroConHijos[];
}

export function ProductosTable({
  data,
  aseguradoras,
  ramos,
}: ProductosTableProps) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [showInactive, setShowInactive] = useState(false);
  const [filterAseguradora, setFilterAseguradora] = useState<string>("all");
  const [filterRamo, setFilterRamo] = useState<string>("all");

  const filteredData = useMemo(() => {
    return data.filter((producto) => {
      // Filter by active status
      if (!showInactive && !producto.activo) {
        return false;
      }

      // Filter by aseguradora
      if (
        filterAseguradora !== "all" &&
        producto.compania_aseguradora_id !== filterAseguradora
      ) {
        return false;
      }

      // Filter by ramo
      if (
        filterRamo !== "all" &&
        producto.tipo_seguro_id.toString() !== filterRamo
      ) {
        return false;
      }

      // Filter by search
      if (search) {
        const searchLower = search.toLowerCase();
        return (
          producto.nombre_producto.toLowerCase().includes(searchLower) ||
          producto.codigo_producto.toLowerCase().includes(searchLower) ||
          producto.companias_aseguradoras?.nombre
            .toLowerCase()
            .includes(searchLower) ||
          producto.tipos_seguros?.nombre.toLowerCase().includes(searchLower)
        );
      }

      return true;
    });
  }, [data, search, showInactive, filterAseguradora, filterRamo]);

  const handleRefresh = () => {
    router.refresh();
  };

  const formatPercent = (value: number) => {
    return `${(value * 100).toFixed(1)}%`;
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar productos..."
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

        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-muted-foreground" />
            <Select
              value={filterAseguradora}
              onValueChange={setFilterAseguradora}
            >
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Todas las aseguradoras" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las aseguradoras</SelectItem>
                {aseguradoras.map((a) => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2">
            <Layers className="h-4 w-4 text-muted-foreground" />
            <Select value={filterRamo} onValueChange={setFilterRamo}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Todos los ramos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los ramos</SelectItem>
                {ramos
                  .filter((r) => !r.es_ramo_padre)
                  .map((r) => (
                    <SelectItem key={r.id} value={r.id.toString()}>
                      {r.nombre}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Table */}
      {filteredData.length > 0 ? (
        <div className="rounded-md border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Código</TableHead>
                <TableHead>Nombre</TableHead>
                <TableHead className="hidden lg:table-cell">
                  Aseguradora
                </TableHead>
                <TableHead className="hidden md:table-cell">Ramo</TableHead>
                <TableHead className="hidden xl:table-cell text-right">
                  Factor Contado
                </TableHead>
                <TableHead className="hidden xl:table-cell text-right">
                  Factor Crédito
                </TableHead>
                <TableHead className="text-right">Comisión</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredData.map((producto) => (
                <TableRow key={producto.id}>
                  <TableCell>
                    <code className="text-xs bg-muted px-2 py-1 rounded">
                      {producto.codigo_producto}
                    </code>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Package className="h-4 w-4 text-muted-foreground hidden sm:block" />
                      <div>
                        <span className="font-medium block">
                          {producto.nombre_producto}
                        </span>
                        <span className="text-xs text-muted-foreground lg:hidden">
                          {producto.companias_aseguradoras?.nombre}
                        </span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="hidden lg:table-cell">
                    <span className="text-sm">
                      {producto.companias_aseguradoras?.nombre || "-"}
                    </span>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    <span className="text-sm text-muted-foreground">
                      {producto.tipos_seguros?.nombre || "-"}
                    </span>
                  </TableCell>
                  <TableCell className="hidden xl:table-cell text-right">
                    {producto.factor_contado}
                  </TableCell>
                  <TableCell className="hidden xl:table-cell text-right">
                    {producto.factor_credito}
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {formatPercent(producto.porcentaje_comision)}
                  </TableCell>
                  <TableCell>
                    <StatusBadge activo={producto.activo} />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-1">
                      <ProductoFormDialog
                        producto={producto}
                        onSuccess={handleRefresh}
                        triggerVariant="ghost"
                        iconOnly
                      />
                      <SoftDeleteDialog
                        itemName={producto.nombre_producto}
                        entityType="Producto"
                        isActive={producto.activo}
                        onAction={() =>
                          producto.activo
                            ? desactivarProducto(producto.id)
                            : reactivarProducto(producto.id)
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
          <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-sm text-muted-foreground">
            {search || filterAseguradora !== "all" || filterRamo !== "all"
              ? "No se encontraron productos con esos criterios"
              : showInactive
                ? "No hay productos registrados"
                : "No hay productos activos"}
          </p>
        </div>
      )}

      {/* Results count */}
      <div className="text-xs text-muted-foreground">
        Mostrando {filteredData.length} de {data.length} productos
      </div>
    </div>
  );
}
