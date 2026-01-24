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
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  crearCategoria,
  actualizarCategoria,
} from "@/app/admin/seguros/categorias/actions";
import type { CategoriaDB } from "@/types/catalogo-seguros";

const formSchema = z.object({
  nombre: z
    .string()
    .min(3, "El nombre debe tener al menos 3 caracteres")
    .max(100, "El nombre no puede exceder 100 caracteres"),
  descripcion: z
    .string()
    .max(500, "La descripción no puede exceder 500 caracteres")
    .optional()
    .or(z.literal("")),
});

type FormValues = z.infer<typeof formSchema>;

interface CategoriaFormDialogProps {
  categoria?: CategoriaDB;
  onSuccess?: () => void;
  triggerVariant?: "default" | "ghost" | "outline";
  iconOnly?: boolean;
}

export function CategoriaFormDialog({
  categoria,
  onSuccess,
  triggerVariant = "default",
  iconOnly = false,
}: CategoriaFormDialogProps) {
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isEditing = !!categoria;

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      nombre: categoria?.nombre || "",
      descripcion: categoria?.descripcion || "",
    },
  });

  // Reset form when dialog opens/closes or categoria changes
  useEffect(() => {
    if (open) {
      form.reset({
        nombre: categoria?.nombre || "",
        descripcion: categoria?.descripcion || "",
      });
    }
  }, [open, categoria, form]);

  const onSubmit = async (values: FormValues) => {
    setIsSubmitting(true);
    try {
      const result = isEditing
        ? await actualizarCategoria(categoria.id, {
            nombre: values.nombre,
            descripcion: values.descripcion || null,
          })
        : await crearCategoria({
            nombre: values.nombre,
            descripcion: values.descripcion || null,
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
            Nueva Categoría
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Editar Categoría" : "Nueva Categoría"}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Modifica los datos de la categoría."
              : "Ingresa los datos de la nueva categoría."}
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
                      placeholder="Ej: Grupo Empresarial ABC"
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
              name="descripcion"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descripción</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Descripción opcional de la categoría..."
                      className="resize-none"
                      rows={3}
                      {...field}
                      disabled={isSubmitting}
                    />
                  </FormControl>
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
                  "Crear Categoría"
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
