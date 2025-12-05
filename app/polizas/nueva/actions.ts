"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";
import type { PolizaFormState } from "@/types/poliza";

export async function guardarPoliza(formState: PolizaFormState) {
	const supabase = await createClient();

	try {
		// Verificar autenticación
		const {
			data: { user },
		} = await supabase.auth.getUser();

		if (!user) {
			return { success: false, error: "No autenticado" };
		}

		// 1. Validar que todos los datos necesarios estén presentes
		if (!formState.asegurado) {
			return { success: false, error: "Asegurado no seleccionado" };
		}

		if (!formState.datos_basicos) {
			return { success: false, error: "Datos básicos incompletos" };
		}

		if (!formState.modalidad_pago) {
			return { success: false, error: "Modalidad de pago no definida" };
		}

		// 2. Insertar póliza principal
		const { data: poliza, error: errorPoliza } = await supabase
			.from("polizas")
			.insert({
				client_id: formState.asegurado.id,
				numero_poliza: formState.datos_basicos.numero_poliza,
				compania_aseguradora_id: formState.datos_basicos.compania_aseguradora_id,
				tipo_seguro: formState.datos_basicos.ramo,
				inicio_vigencia: formState.datos_basicos.inicio_vigencia,
				fin_vigencia: formState.datos_basicos.fin_vigencia,
				fecha_emision_compania: formState.datos_basicos.fecha_emision_compania,
				responsable_id: formState.datos_basicos.responsable_id,
				regional_id: formState.datos_basicos.regional_id,
				categoria_id: formState.datos_basicos.categoria_id,
				modalidad_pago: formState.modalidad_pago.tipo,
				prima_total: formState.modalidad_pago.prima_total,
				moneda: formState.modalidad_pago.moneda,
				estado: "activa",
			})
			.select()
			.single();

		if (errorPoliza || !poliza) {
			console.error("Error insertando póliza:", errorPoliza);
			return { success: false, error: "Error al guardar la póliza" };
		}

		// 3. Insertar cuotas de pago
		if (formState.modalidad_pago.tipo === "contado") {
			const { error: errorPago } = await supabase.from("polizas_pagos").insert({
				poliza_id: poliza.id,
				numero_cuota: 1,
				monto: formState.modalidad_pago.cuota_unica,
				fecha_vencimiento: formState.modalidad_pago.fecha_pago_unico,
				estado: "pendiente",
			});

			if (errorPago) {
				console.error("Error insertando pago contado:", errorPago);
				// No hacemos rollback automático, se podría implementar
			}
		} else {
			// Insertar cuota inicial si existe
			const cuotas: any[] = [];

			if (formState.modalidad_pago.cuota_inicial > 0) {
				cuotas.push({
					poliza_id: poliza.id,
					numero_cuota: 0, // Cuota inicial
					monto: formState.modalidad_pago.cuota_inicial,
					fecha_vencimiento: formState.datos_basicos.inicio_vigencia,
					estado: "pendiente",
				});
			}

			// Insertar cuotas restantes
			formState.modalidad_pago.cuotas.forEach((cuota) => {
				cuotas.push({
					poliza_id: poliza.id,
					numero_cuota: cuota.numero,
					monto: cuota.monto,
					fecha_vencimiento: cuota.fecha_vencimiento,
					estado: "pendiente",
				});
			});

			const { error: errorCuotas } = await supabase.from("polizas_pagos").insert(cuotas);

			if (errorCuotas) {
				console.error("Error insertando cuotas:", errorCuotas);
			}
		}

		// 4. Insertar datos específicos por ramo
		if (formState.datos_especificos?.tipo_ramo === "Automotores") {
			const vehiculos = formState.datos_especificos.datos.vehiculos.map((vehiculo) => ({
				poliza_id: poliza.id,
				placa: vehiculo.placa,
				valor_asegurado: vehiculo.valor_asegurado,
				franquicia: vehiculo.franquicia,
				nro_chasis: vehiculo.nro_chasis,
				uso: vehiculo.uso,
				tipo_vehiculo_id: vehiculo.tipo_vehiculo_id || null,
				marca_id: vehiculo.marca_id || null,
				modelo: vehiculo.modelo || null,
				ano: vehiculo.ano || null,
				color: vehiculo.color || null,
				ejes: vehiculo.ejes || null,
				nro_motor: vehiculo.nro_motor || null,
				nro_asientos: vehiculo.nro_asientos || null,
				plaza_circulacion: vehiculo.plaza_circulacion || null,
			}));

			const { error: errorVehiculos } = await supabase
				.from("polizas_automotor_vehiculos")
				.insert(vehiculos);

			if (errorVehiculos) {
				console.error("Error insertando vehículos:", errorVehiculos);
			}
		}

		// 5. Subir documentos a Supabase Storage y registrar en base de datos
		if (formState.documentos.length > 0) {
			for (const documento of formState.documentos) {
				if (!documento.file) continue;

				// Generar nombre único para el archivo
				const timestamp = Date.now();
				const nombreArchivo = `${poliza.id}/${timestamp}-${documento.nombre_archivo}`;

				// Subir a Storage
				const { data: uploadData, error: uploadError } = await supabase.storage
					.from("polizas-documentos")
					.upload(nombreArchivo, documento.file);

				if (uploadError) {
					console.error("Error subiendo documento:", uploadError);
					continue; // Continuar con el siguiente documento
				}

				// Obtener URL pública
				const {
					data: { publicUrl },
				} = supabase.storage.from("polizas-documentos").getPublicUrl(nombreArchivo);

				// Registrar en base de datos
				const { error: errorDoc } = await supabase.from("polizas_documentos").insert({
					poliza_id: poliza.id,
					tipo_documento: documento.tipo_documento,
					nombre_archivo: documento.nombre_archivo,
					archivo_url: publicUrl,
					tamano_bytes: documento.tamano_bytes,
					estado: 'activo',
				});

				if (errorDoc) {
					console.error("Error registrando documento:", errorDoc);
				}
			}
		}

		// 6. Revalidar la ruta de pólizas
		revalidatePath("/polizas");

		return { success: true, poliza_id: poliza.id };
	} catch (error) {
		console.error("Error general guardando póliza:", error);
		return {
			success: false,
			error: error instanceof Error ? error.message : "Error desconocido",
		};
	}
}
