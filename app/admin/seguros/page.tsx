import Link from "next/link";
import {
  FileText,
  Building2,
  Layers,
  Package,
  Tag,
  ArrowRight,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { obtenerAseguradorasStats } from "./aseguradoras/actions";
import { obtenerRamosStats } from "./ramos/actions";
import { obtenerProductosStats } from "./productos/actions";
import { obtenerCategoriasStats } from "./categorias/actions";

export default async function SegurosPage() {
  const [aseguradorasStats, ramosStats, productosStats, categoriasStats] =
    await Promise.all([
      obtenerAseguradorasStats(),
      obtenerRamosStats(),
      obtenerProductosStats(),
      obtenerCategoriasStats(),
    ]);

  const sections = [
    {
      title: "Empresas Aseguradoras",
      description: "Compañías de seguros con las que trabajamos",
      icon: Building2,
      href: "/admin/seguros/aseguradoras",
      stats: aseguradorasStats,
      color: "blue",
    },
    {
      title: "Ramos de Seguros",
      description: "Tipos de seguros organizados jerárquicamente",
      icon: Layers,
      href: "/admin/seguros/ramos",
      stats: ramosStats,
      color: "purple",
    },
    {
      title: "Productos",
      description: "Productos de seguros con factores de cálculo",
      icon: Package,
      href: "/admin/seguros/productos",
      stats: productosStats,
      color: "green",
    },
    {
      title: "Categorías",
      description: "Grupos de negocios para clasificar pólizas",
      icon: Tag,
      href: "/admin/seguros/categorias",
      stats: categoriasStats,
      color: "orange",
    },
  ];

  const getColorClasses = (color: string) => {
    const colors: Record<string, { bg: string; text: string; icon: string }> = {
      blue: {
        bg: "bg-blue-50",
        text: "text-blue-700",
        icon: "text-blue-600",
      },
      purple: {
        bg: "bg-purple-50",
        text: "text-purple-700",
        icon: "text-purple-600",
      },
      green: {
        bg: "bg-green-50",
        text: "text-green-700",
        icon: "text-green-600",
      },
      orange: {
        bg: "bg-orange-50",
        text: "text-orange-700",
        icon: "text-orange-600",
      },
    };
    return colors[color] || colors.blue;
  };

  return (
    <div className="flex-1 w-full flex flex-col gap-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">
          Gestión de Seguros
        </h1>
        <p className="text-gray-600 mt-1">
          Administra los catálogos del sistema de seguros
        </p>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Aseguradoras</CardTitle>
            <Building2 className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{aseguradorasStats.activos}</div>
            <p className="text-xs text-muted-foreground">activas</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ramos</CardTitle>
            <Layers className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{ramosStats.activos}</div>
            <p className="text-xs text-muted-foreground">activos</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Productos</CardTitle>
            <Package className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{productosStats.activos}</div>
            <p className="text-xs text-muted-foreground">activos</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Categorías</CardTitle>
            <Tag className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{categoriasStats.activos}</div>
            <p className="text-xs text-muted-foreground">activas</p>
          </CardContent>
        </Card>
      </div>

      {/* Section Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {sections.map((section) => {
          const colors = getColorClasses(section.color);
          const Icon = section.icon;

          return (
            <Card key={section.href} className="relative overflow-hidden">
              <div
                className={`absolute top-0 right-0 w-32 h-32 -mr-8 -mt-8 rounded-full ${colors.bg} opacity-50`}
              />
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${colors.bg}`}>
                      <Icon className={`h-5 w-5 ${colors.icon}`} />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{section.title}</CardTitle>
                      <CardDescription>{section.description}</CardDescription>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="flex gap-6">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                      <span className="text-sm">
                        <strong>{section.stats.activos}</strong> activos
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <XCircle className="h-4 w-4 text-gray-400" />
                      <span className="text-sm text-muted-foreground">
                        <strong>{section.stats.inactivos}</strong> inactivos
                      </span>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" asChild>
                    <Link href={section.href}>
                      Gestionar
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Info Box */}
      <Card className="bg-muted/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <FileText className="h-5 w-5" />
            Acerca de los catálogos de seguros
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>
            <strong>Aseguradoras:</strong> Compañías de seguros con las que se
            tienen convenios para emitir pólizas.
          </p>
          <p>
            <strong>Ramos:</strong> Tipos de seguros organizados en categorías
            (ej: Generales, Personales) y sub-ramos específicos (ej: Automotor,
            Salud).
          </p>
          <p>
            <strong>Productos:</strong> Configuraciones específicas de cada
            aseguradora con factores de cálculo para prima neta y comisiones.
          </p>
          <p>
            <strong>Categorías:</strong> Grupos de negocios para clasificar
            pólizas (ej: Grupo Empresarial ABC, Asociación XYZ).
          </p>
          <p className="pt-2 border-t mt-4">
            <strong>Nota:</strong> Los registros desactivados no se eliminan
            permanentemente y pueden reactivarse en cualquier momento. Las
            pólizas existentes no son afectadas cuando se desactiva un catálogo.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
