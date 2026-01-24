"use client";

import { useState } from "react";
import { EyeOff, AlertTriangle, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import type { CatalogoActionResult } from "@/types/catalogo-seguros";

interface SoftDeleteDialogProps {
  /** Nombre del item a desactivar/reactivar */
  itemName: string;
  /** Tipo de entidad (para mensajes) */
  entityType: string;
  /** Si el item está activo actualmente */
  isActive: boolean;
  /** Función async que ejecuta la acción */
  onAction: () => Promise<CatalogoActionResult>;
  /** Callback opcional después de acción exitosa */
  onSuccess?: () => void;
  /** Texto de advertencia adicional */
  warningText?: string;
  /** Variante del botón trigger */
  triggerVariant?: "ghost" | "outline" | "destructive";
  /** Si mostrar el botón como ícono solamente */
  iconOnly?: boolean;
}

export function SoftDeleteDialog({
  itemName,
  entityType,
  isActive,
  onAction,
  onSuccess,
  warningText,
  triggerVariant = "ghost",
  iconOnly = true,
}: SoftDeleteDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [open, setOpen] = useState(false);

  const handleAction = async () => {
    setIsLoading(true);
    try {
      const result = await onAction();

      if (result.success) {
        toast.success(
          result.message ||
            (isActive
              ? `${entityType} desactivado correctamente`
              : `${entityType} reactivado correctamente`)
        );
        setOpen(false);
        onSuccess?.();
      } else {
        toast.error(result.error || `Error al ${isActive ? "desactivar" : "reactivar"} ${entityType.toLowerCase()}`);
      }
    } catch {
      toast.error("Ocurrió un error inesperado");
    } finally {
      setIsLoading(false);
    }
  };

  const Icon = isActive ? EyeOff : RefreshCw;
  const actionText = isActive ? "Desactivar" : "Reactivar";
  const actioningText = isActive ? "Desactivando..." : "Reactivando...";

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        {iconOnly ? (
          <Button variant={triggerVariant} size="sm" title={actionText}>
            <Icon className={`h-4 w-4 ${isActive ? "text-amber-600" : "text-green-600"}`} />
          </Button>
        ) : (
          <Button variant={triggerVariant} size="sm">
            <Icon className={`h-4 w-4 mr-2 ${isActive ? "text-amber-600" : "text-green-600"}`} />
            {actionText}
          </Button>
        )}
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertTriangle className={`h-5 w-5 ${isActive ? "text-amber-600" : "text-green-600"}`} />
            {actionText} {entityType}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {isActive ? (
              <>
                ¿Estás seguro de desactivar <strong>{itemName}</strong>?
              </>
            ) : (
              <>
                ¿Deseas reactivar <strong>{itemName}</strong>?
              </>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>

        {isActive && (
          <div className="bg-amber-50 border border-amber-200 rounded-md p-3 mb-4">
            <p className="text-sm font-medium text-amber-800 mb-2">Nota:</p>
            <ul className="text-sm space-y-1 list-disc list-inside text-amber-700">
              <li>El registro no será eliminado permanentemente</li>
              <li>Podrás reactivarlo en cualquier momento</li>
              <li>No aparecerá en las listas de selección mientras esté inactivo</li>
              {warningText && <li>{warningText}</li>}
            </ul>
          </div>
        )}

        {!isActive && (
          <div className="bg-green-50 border border-green-200 rounded-md p-3 mb-4">
            <p className="text-sm font-medium text-green-800 mb-2">Nota:</p>
            <ul className="text-sm space-y-1 list-disc list-inside text-green-700">
              <li>El registro volverá a estar visible en el sistema</li>
              <li>Aparecerá en las listas de selección</li>
            </ul>
          </div>
        )}

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isLoading}>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleAction}
            disabled={isLoading}
            className={
              isActive
                ? "bg-amber-600 text-white hover:bg-amber-700"
                : "bg-green-600 text-white hover:bg-green-700"
            }
          >
            {isLoading ? (
              <>
                <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
                {actioningText}
              </>
            ) : (
              <>
                <Icon className="h-4 w-4 mr-2" />
                {actionText}
              </>
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
