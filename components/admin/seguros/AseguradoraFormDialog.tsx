"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Pencil } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  crearAseguradora,
  actualizarAseguradora,
} from "@/app/admin/seguros/aseguradoras/actions";
import type { CompaniaAseguradoraDB } from "@/types/catalogo-seguros";

const formSchema = z.object({
  nombre: z
    .string()
    .min(3, "El nombre debe tener al menos 3 caracteres")
    .max(200, "El nombre no puede exceder 200 caracteres"),
  codigo: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface AseguradoraFormDialogProps {
  aseguradora?: CompaniaAseguradoraDB;
  onSuccess?: () => void;
  triggerVariant?: "default" | "ghost" | "outline";
  iconOnly?: boolean;
}

export function AseguradoraFormDialog({
  aseguradora,
  onSuccess,
  triggerVariant = "default",
  iconOnly = false,
}: AseguradoraFormDialogProps) {
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isEditing = !!aseguradora;

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      nombre: aseguradora?.nombre || "",
      codigo: aseguradora?.codigo?.toString() || "",
    },
  });

  // Reset form when dialog opens/closes or aseguradora changes
  useEffect(() => {
    if (open) {
      form.reset({
        nombre: aseguradora?.nombre || "",
        codigo: aseguradora?.codigo?.toString() || "",
      });
    }
  }, [open, aseguradora, form]);

  const onSubmit = async (values: FormValues) => {
    setIsSubmitting(true);
    try {
      // Parse codigo to number or null
      const codigoNum = values.codigo?.trim()
        ? parseInt(values.codigo, 10)
        : null;

      const result = isEditing
        ? await actualizarAseguradora(aseguradora.id, {
            nombre: values.nombre,
            codigo: isNaN(codigoNum as number) ? null : codigoNum,
          })
        : await crearAseguradora({
            nombre: values.nombre,
            codigo: isNaN(codigoNum as number) ? null : codigoNum,
          });

      if (result.success) {
        toast.success(result.message);
        setOpen(false);
        form.reset();
        onSuccess?.();
      } else {
        toast.error(result.error);
      }
    } catch {
      toast.error("Ocurrió un error inesperado");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {isEditing ? (
          iconOnly ? (
            <Button variant={triggerVariant} size="sm" title="Editar">
              <Pencil className="h-4 w-4" />
            </Button>
          ) : (
            <Button variant={triggerVariant} size="sm">
              <Pencil className="h-4 w-4 mr-2" />
              Editar
            </Button>
          )
        ) : (
          <Button variant={triggerVariant}>
            <Plus className="h-4 w-4 mr-2" />
            Nueva Aseguradora
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Editar Aseguradora" : "Nueva Aseguradora"}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Modifica los datos de la compañía aseguradora."
              : "Ingresa los datos de la nueva compañía aseguradora."}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="nombre"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nombre *</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Ej: Nacional Seguros S.A."
                      {...field}
                      disabled={isSubmitting}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="codigo"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Código</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      placeholder="Ej: 101"
                      {...field}
                      disabled={isSubmitting}
                    />
                  </FormControl>
                  <FormDescription>
                    Código único de identificación (opcional)
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
                disabled={isSubmitting}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
                    {isEditing ? "Guardando..." : "Creando..."}
                  </>
                ) : isEditing ? (
                  "Guardar Cambios"
                ) : (
                  "Crear Aseguradora"
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
