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
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  crearDirectorCartera,
  actualizarDirectorCartera,
} from "@/app/admin/directores-cartera/actions";
import type { DirectorCarteraDB } from "@/app/admin/directores-cartera/actions";

const formSchema = z.object({
  nombre: z
    .string()
    .min(2, "El nombre debe tener al menos 2 caracteres")
    .max(100, "El nombre no puede exceder 100 caracteres"),
  apellidos: z.string().max(100, "Los apellidos no pueden exceder 100 caracteres").optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface DirectoresCarteraFormDialogProps {
  director?: DirectorCarteraDB;
  onSuccess?: () => void;
  triggerVariant?: "default" | "ghost" | "outline";
  iconOnly?: boolean;
}

export function DirectoresCarteraFormDialog({
  director,
  onSuccess,
  triggerVariant = "default",
  iconOnly = false,
}: DirectoresCarteraFormDialogProps) {
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isEditing = !!director;

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      nombre: director?.nombre || "",
      apellidos: director?.apellidos || "",
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        nombre: director?.nombre || "",
        apellidos: director?.apellidos || "",
      });
    }
  }, [open, director, form]);

  const onSubmit = async (values: FormValues) => {
    setIsSubmitting(true);
    try {
      const payload = {
        nombre: values.nombre,
        apellidos: values.apellidos?.trim() || null,
      };

      const result = isEditing
        ? await actualizarDirectorCartera(director.id, payload)
        : await crearDirectorCartera(payload);

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
            Nuevo Director
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Editar Director de Cartera" : "Nuevo Director de Cartera"}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Modifica los datos del director de cartera."
              : "Ingresa los datos del nuevo director de cartera."}
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
                      placeholder="Ej: Juan"
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
              name="apellidos"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Apellidos</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Ej: Pérez García"
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
                  "Crear Director"
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
