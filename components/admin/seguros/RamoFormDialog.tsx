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
import { Checkbox } from "@/components/ui/checkbox";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  crearRamo,
  actualizarRamo,
  obtenerRamosPadre,
} from "@/app/admin/seguros/ramos/actions";
import type { TipoSeguroDB, TipoSeguroConHijos } from "@/types/catalogo-seguros";

const formSchema = z
  .object({
    codigo: z
      .string()
      .min(2, "El código debe tener al menos 2 caracteres")
      .max(10, "El código no puede exceder 10 caracteres"),
    nombre: z
      .string()
      .min(3, "El nombre debe tener al menos 3 caracteres")
      .max(200, "El nombre no puede exceder 200 caracteres"),
    es_ramo_padre: z.boolean(),
    ramo_padre_id: z.string().optional(),
  })
  .refine(
    (data) => {
      if (!data.es_ramo_padre && !data.ramo_padre_id) {
        return false;
      }
      return true;
    },
    {
      message: "Debe seleccionar un ramo padre",
      path: ["ramo_padre_id"],
    }
  );

type FormValues = z.infer<typeof formSchema>;

interface RamoFormDialogProps {
  ramo?: TipoSeguroConHijos;
  onSuccess?: () => void;
  triggerVariant?: "default" | "ghost" | "outline";
  iconOnly?: boolean;
}

export function RamoFormDialog({
  ramo,
  onSuccess,
  triggerVariant = "default",
  iconOnly = false,
}: RamoFormDialogProps) {
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [ramosPadre, setRamosPadre] = useState<TipoSeguroDB[]>([]);
  const [loadingPadres, setLoadingPadres] = useState(false);
  const isEditing = !!ramo;

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      codigo: ramo?.codigo || "",
      nombre: ramo?.nombre || "",
      es_ramo_padre: ramo?.es_ramo_padre ?? false,
      ramo_padre_id: ramo?.ramo_padre_id?.toString() || "",
    },
  });

  const esRamoPadre = form.watch("es_ramo_padre");

  // Load parent ramos when dialog opens
  useEffect(() => {
    if (open) {
      setLoadingPadres(true);
      obtenerRamosPadre()
        .then((padres) => {
          // Exclude current ramo if editing (can't be its own parent)
          setRamosPadre(
            ramo ? padres.filter((p) => p.id !== ramo.id) : padres
          );
        })
        .finally(() => setLoadingPadres(false));

      form.reset({
        codigo: ramo?.codigo || "",
        nombre: ramo?.nombre || "",
        es_ramo_padre: ramo?.es_ramo_padre ?? false,
        ramo_padre_id: ramo?.ramo_padre_id?.toString() || "",
      });
    }
  }, [open, ramo, form]);

  // Clear parent selection when toggling to parent
  useEffect(() => {
    if (esRamoPadre) {
      form.setValue("ramo_padre_id", "");
    }
  }, [esRamoPadre, form]);

  const onSubmit = async (values: FormValues) => {
    setIsSubmitting(true);
    try {
      const formData = {
        codigo: values.codigo,
        nombre: values.nombre,
        es_ramo_padre: values.es_ramo_padre,
        ramo_padre_id: values.es_ramo_padre
          ? null
          : values.ramo_padre_id
            ? parseInt(values.ramo_padre_id, 10)
            : null,
      };

      const result = isEditing
        ? await actualizarRamo(ramo.id, formData)
        : await crearRamo(formData);

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
            Nuevo Ramo
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Editar Ramo de Seguro" : "Nuevo Ramo de Seguro"}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Modifica los datos del ramo de seguro."
              : "Ingresa los datos del nuevo ramo de seguro."}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="codigo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Código *</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Ej: AUT"
                        {...field}
                        disabled={isSubmitting}
                        className="uppercase"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="es_ramo_padre"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-end space-x-3 space-y-0 pb-2">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        disabled={isSubmitting}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>Es categoría principal</FormLabel>
                      <FormDescription>
                        Contiene otros ramos
                      </FormDescription>
                    </div>
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="nombre"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nombre *</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Ej: Automotor"
                      {...field}
                      disabled={isSubmitting}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {!esRamoPadre && (
              <FormField
                control={form.control}
                name="ramo_padre_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Ramo Padre *</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value}
                      disabled={isSubmitting || loadingPadres}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue
                            placeholder={
                              loadingPadres
                                ? "Cargando..."
                                : "Seleccionar ramo padre"
                            }
                          />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {ramosPadre.map((padre) => (
                          <SelectItem
                            key={padre.id}
                            value={padre.id.toString()}
                          >
                            {padre.nombre} ({padre.codigo})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Categoría a la que pertenece este ramo
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

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
                  "Crear Ramo"
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
