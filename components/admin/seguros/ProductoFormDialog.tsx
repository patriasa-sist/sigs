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
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { crearProducto, actualizarProducto } from "@/app/admin/seguros/productos/actions";
import { obtenerAseguradoras } from "@/app/admin/seguros/aseguradoras/actions";
import { obtenerRamos } from "@/app/admin/seguros/ramos/actions";
import type { ProductoConRelaciones, CompaniaAseguradoraDB, TipoSeguroConHijos } from "@/types/catalogo-seguros";

const formSchema = z.object({
	compania_aseguradora_id: z.string().min(1, "Debe seleccionar una aseguradora"),
	tipo_seguro_id: z.string().min(1, "Debe seleccionar un ramo"),
	codigo_producto: z.string().min(1, "El código es requerido").max(50, "El código no puede exceder 50 caracteres"),
	nombre_producto: z
		.string()
		.min(3, "El nombre debe tener al menos 3 caracteres")
		.max(300, "El nombre no puede exceder 300 caracteres"),
	factor_contado: z.string().min(1, "Requerido"),
	factor_credito: z.string().min(1, "Requerido"),
	porcentaje_comision: z.string().min(1, "Requerido"),
	regional: z
		.string()
		.min(2, "La regional debe tener al menos 2 caracteres")
		.max(50, "La regional no puede exceder 50 caracteres"),
});

type FormValues = z.infer<typeof formSchema>;

interface ProductoFormDialogProps {
	producto?: ProductoConRelaciones;
	onSuccess?: () => void;
	triggerVariant?: "default" | "ghost" | "outline";
	iconOnly?: boolean;
}

export function ProductoFormDialog({
	producto,
	onSuccess,
	triggerVariant = "default",
	iconOnly = false,
}: ProductoFormDialogProps) {
	const [open, setOpen] = useState(false);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [aseguradoras, setAseguradoras] = useState<CompaniaAseguradoraDB[]>([]);
	const [ramos, setRamos] = useState<TipoSeguroConHijos[]>([]);
	const [loadingData, setLoadingData] = useState(false);
	const isEditing = !!producto;

	const form = useForm<FormValues>({
		resolver: zodResolver(formSchema),
		defaultValues: {
			compania_aseguradora_id: producto?.compania_aseguradora_id || "",
			tipo_seguro_id: producto?.tipo_seguro_id?.toString() || "",
			codigo_producto: producto?.codigo_producto || "",
			nombre_producto: producto?.nombre_producto || "",
			factor_contado: producto?.factor_contado?.toString() || "35",
			factor_credito: producto?.factor_credito?.toString() || "40",
			porcentaje_comision: producto ? (producto.porcentaje_comision * 100).toString() : "15",
			regional: producto?.regional || "",
		},
	});

	// Load aseguradoras and ramos when dialog opens
	useEffect(() => {
		if (open) {
			setLoadingData(true);
			Promise.all([obtenerAseguradoras(false), obtenerRamos(false)])
				.then(([aseguradorasData, ramosData]) => {
					setAseguradoras(aseguradorasData);
					// Filter only non-parent ramos (actual insurance types)
					setRamos(ramosData.filter((r) => !r.es_ramo_padre));
				})
				.finally(() => setLoadingData(false));

			form.reset({
				compania_aseguradora_id: producto?.compania_aseguradora_id || "",
				tipo_seguro_id: producto?.tipo_seguro_id?.toString() || "",
				codigo_producto: producto?.codigo_producto || "",
				nombre_producto: producto?.nombre_producto || "",
				factor_contado: producto?.factor_contado?.toString() || "",
				factor_credito: producto?.factor_credito?.toString() || "",
				porcentaje_comision: producto ? (producto.porcentaje_comision * 100).toString() : "15",
				regional: producto?.regional || "Santa Cruz",
			});
		}
	}, [open, producto, form]);

	const onSubmit = async (values: FormValues) => {
		setIsSubmitting(true);
		try {
			// Parse numeric values
			const factorContado = parseFloat(values.factor_contado);
			const factorCredito = parseFloat(values.factor_credito);
			const porcentajeComision = parseFloat(values.porcentaje_comision) / 100;

			// Validate numeric values
			if (isNaN(factorContado) || factorContado <= 0 || factorContado > 100) {
				toast.error("Factor contado debe ser un número entre 0 y 100");
				setIsSubmitting(false);
				return;
			}
			if (isNaN(factorCredito) || factorCredito <= 0 || factorCredito > 100) {
				toast.error("Factor crédito debe ser un número entre 0 y 100");
				setIsSubmitting(false);
				return;
			}
			if (isNaN(porcentajeComision) || porcentajeComision < 0 || porcentajeComision > 1) {
				toast.error("Porcentaje de comisión debe ser entre 0 y 100%");
				setIsSubmitting(false);
				return;
			}

			const formData = {
				compania_aseguradora_id: values.compania_aseguradora_id,
				tipo_seguro_id: parseInt(values.tipo_seguro_id, 10),
				codigo_producto: values.codigo_producto,
				nombre_producto: values.nombre_producto,
				factor_contado: factorContado,
				factor_credito: factorCredito,
				porcentaje_comision: porcentajeComision,
				regional: values.regional,
			};

			const result = isEditing ? await actualizarProducto(producto.id, formData) : await crearProducto(formData);

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
						Nuevo Producto
					</Button>
				)}
			</DialogTrigger>
			<DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
				<DialogHeader>
					<DialogTitle>{isEditing ? "Editar Producto" : "Nuevo Producto"}</DialogTitle>
					<DialogDescription>
						{isEditing
							? "Modifica los datos del producto de seguro."
							: "Ingresa los datos del nuevo producto de seguro."}
					</DialogDescription>
				</DialogHeader>

				<Form {...form}>
					<form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
						<div className="grid grid-cols-2 gap-4">
							<FormField
								control={form.control}
								name="compania_aseguradora_id"
								render={({ field }) => (
									<FormItem>
										<FormLabel>Aseguradora *</FormLabel>
										<Select
											onValueChange={field.onChange}
											value={field.value}
											disabled={isSubmitting || loadingData}
										>
											<FormControl>
												<SelectTrigger>
													<SelectValue
														placeholder={loadingData ? "Cargando..." : "Seleccionar"}
													/>
												</SelectTrigger>
											</FormControl>
											<SelectContent>
												{aseguradoras.map((a) => (
													<SelectItem key={a.id} value={a.id}>
														{a.nombre}
													</SelectItem>
												))}
											</SelectContent>
										</Select>
										<FormMessage />
									</FormItem>
								)}
							/>

							<FormField
								control={form.control}
								name="tipo_seguro_id"
								render={({ field }) => (
									<FormItem>
										<FormLabel>Ramo *</FormLabel>
										<Select
											onValueChange={field.onChange}
											value={field.value}
											disabled={isSubmitting || loadingData}
										>
											<FormControl>
												<SelectTrigger>
													<SelectValue
														placeholder={loadingData ? "Cargando..." : "Seleccionar"}
													/>
												</SelectTrigger>
											</FormControl>
											<SelectContent>
												{ramos.map((r) => (
													<SelectItem key={r.id} value={r.id.toString()}>
														{r.nombre} ({r.codigo})
													</SelectItem>
												))}
											</SelectContent>
										</Select>
										<FormMessage />
									</FormItem>
								)}
							/>
						</div>

						<div className="grid grid-cols-2 gap-4">
							<FormField
								control={form.control}
								name="codigo_producto"
								render={({ field }) => (
									<FormItem>
										<FormLabel>Código *</FormLabel>
										<FormControl>
											<Input placeholder="Ej: 00" {...field} disabled={isSubmitting} />
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>

							<FormField
								control={form.control}
								name="regional"
								render={({ field }) => (
									<FormItem>
										<FormLabel>Regional *</FormLabel>
										<FormControl>
											<Input placeholder="Ej: Santa Cruz" {...field} disabled={isSubmitting} />
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>
						</div>

						<FormField
							control={form.control}
							name="nombre_producto"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Nombre del Producto *</FormLabel>
									<FormControl>
										<Input
											placeholder="Ej: Seguro de Automóvil Todo Riesgo"
											{...field}
											disabled={isSubmitting}
										/>
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>

						<div className="grid grid-cols-3 gap-4">
							<FormField
								control={form.control}
								name="factor_contado"
								render={({ field }) => (
									<FormItem>
										<FormLabel>Factor Contado *</FormLabel>
										<FormControl>
											<Input
												type="number"
												step="0.01"
												placeholder="35"
												{...field}
												disabled={isSubmitting}
											/>
										</FormControl>
										<FormDescription>Para cálculo prima neta</FormDescription>
										<FormMessage />
									</FormItem>
								)}
							/>

							<FormField
								control={form.control}
								name="factor_credito"
								render={({ field }) => (
									<FormItem>
										<FormLabel>Factor Crédito *</FormLabel>
										<FormControl>
											<Input
												type="number"
												step="0.01"
												placeholder="40"
												{...field}
												disabled={isSubmitting}
											/>
										</FormControl>
										<FormDescription>Para cálculo prima neta</FormDescription>
										<FormMessage />
									</FormItem>
								)}
							/>

							<FormField
								control={form.control}
								name="porcentaje_comision"
								render={({ field }) => (
									<FormItem>
										<FormLabel>Comisión % *</FormLabel>
										<FormControl>
											<Input
												type="number"
												step="0.1"
												placeholder="15"
												{...field}
												disabled={isSubmitting}
											/>
										</FormControl>
										<FormDescription>Sobre prima neta</FormDescription>
										<FormMessage />
									</FormItem>
								)}
							/>
						</div>

						<div className="bg-muted/50 rounded-md p-3 text-xs text-muted-foreground">
							<strong>Fórmulas:</strong>
							<br />
							Prima Neta = Prima Total / (Factor/100 + 1)
							<br />
							Comisión = Prima Neta × Porcentaje Comisión
						</div>

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
									"Crear Producto"
								)}
							</Button>
						</DialogFooter>
					</form>
				</Form>
			</DialogContent>
		</Dialog>
	);
}
