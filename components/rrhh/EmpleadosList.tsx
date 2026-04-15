"use client";

import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Plus, Search, User2, AlertCircle, CheckCircle2 } from "lucide-react";
import type { EmployeeListItem } from "@/types/rrhh";

interface Props {
  empleados: EmployeeListItem[];
  error: string | null;
}

export default function EmpleadosList({ empleados, error }: Props) {
  const [query, setQuery] = useState("");
  const [soloActivos, setSoloActivos] = useState(true);

  const filtrados = empleados.filter((e) => {
    const nombre = `${e.nombres} ${e.apellidos} ${e.nro_documento} ${e.cargo}`.toLowerCase();
    const coincide = nombre.includes(query.toLowerCase());
    const estadoOk = soloActivos ? e.activo : true;
    return coincide && estadoOk;
  });

  if (error) {
    return (
      <div className="flex items-center gap-3 text-destructive bg-destructive/10 border border-destructive/20 rounded-lg px-4 py-3 text-sm">
        <AlertCircle className="h-4 w-4 shrink-0" />
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex gap-3 flex-1">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input
              placeholder="Buscar por nombre, CI o cargo..."
              className="pl-9"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <Button
            variant={soloActivos ? "default" : "outline"}
            size="sm"
            onClick={() => setSoloActivos(!soloActivos)}
          >
            {soloActivos ? "Activos" : "Todos"}
          </Button>
        </div>
        <Link href="/rrhh/nuevo">
          <Button size="sm" className="gap-2 shrink-0">
            <Plus className="h-4 w-4" />
            Nuevo Empleado
          </Button>
        </Link>
      </div>

      {/* Stats */}
      <div className="text-xs text-muted-foreground">
        {filtrados.length} empleado{filtrados.length !== 1 ? "s" : ""}
        {query && ` encontrado${filtrados.length !== 1 ? "s" : ""} para "${query}"`}
      </div>

      {/* Table */}
      {filtrados.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground">
          <User2 className="h-10 w-10 opacity-30" />
          <p className="text-sm">
            {empleados.length === 0
              ? "No hay empleados registrados"
              : "No se encontraron resultados"}
          </p>
          {empleados.length === 0 && (
            <Link href="/rrhh/nuevo">
              <Button size="sm" variant="outline" className="gap-2">
                <Plus className="h-4 w-4" />
                Registrar primer empleado
              </Button>
            </Link>
          )}
        </div>
      ) : (
        <div className="rounded-lg border bg-card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/40">
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Empleado</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden md:table-cell">CI</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden lg:table-cell">Cargo</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden lg:table-cell">Ingreso</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Checklist</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden sm:table-cell">Estado</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filtrados.map((emp) => (
                <tr key={emp.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3">
                    <div className="font-medium">{emp.apellidos}, {emp.nombres}</div>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">
                    {emp.nro_documento}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground hidden lg:table-cell">
                    {emp.cargo}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground hidden lg:table-cell">
                    {new Date(emp.fecha_ingreso).toLocaleDateString("es-BO")}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2 min-w-[100px]">
                      <Progress value={emp.completitud_checklist} className="h-1.5 flex-1" />
                      <span className="text-xs text-muted-foreground w-8 shrink-0">
                        {emp.completitud_checklist}%
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 hidden sm:table-cell">
                    {emp.activo ? (
                      <Badge variant="outline" className="gap-1 text-emerald-700 border-emerald-200 bg-emerald-50 text-xs">
                        <CheckCircle2 className="h-3 w-3" />
                        Activo
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-muted-foreground text-xs">
                        Inactivo
                      </Badge>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link href={`/rrhh/${emp.id}`}>
                      <Button variant="ghost" size="sm">Ver</Button>
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
