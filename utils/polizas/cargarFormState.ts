/**
 * Cargador compartido de póliza → PolizaFormState
 * @module utils/polizas/cargarFormState
 * @description Construye un PolizaFormState completo desde una póliza existente.
 *
 * Server-only. Lo consumen tanto la edición (`obtenerPolizaParaEdicion`) como la
 * renovación (`obtenerPolizaParaRenovacion`). Cada llamador aplica su propia
 * verificación de permisos ANTES de invocar esta función; aquí solo se cargan datos
 * usando el cliente Supabase (sesión del usuario) que se recibe por parámetro.
 *
 * IMPORTANTE: esta función NO verifica permisos. No exponerla como Server Action
 * (no es "use server"); solo debe importarse desde código de servidor.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type {
	PolizaFormState,
	AseguradoSeleccionado,
	DatosBasicosPoliza,
	DatosEspecificosPoliza,
	ModalidadPago,
	DocumentoPoliza,
	VehiculoAutomotor,
	NivelSalud,
	ContratanteAPVida,
	AseguradoAPVida,
	ContratanteSalud,
	TitularSalud,
	FamiliarSalud,
	RolContratanteSalud,
	NivelCobertura,
	AseguradoConNivel,
	BienAseguradoIncendio,
	AseguradoIncendio,
	ItemIncendio,
} from "@/types/poliza";
import type { ActionResult } from "@/types/policyPermission";

/**
 * Carga una póliza con todos sus datos y la transforma a PolizaFormState.
 * Devuelve el estado en modo edición (paso_actual=6, en_edicion=true, poliza_id).
 * Los llamadores pueden transformar el resultado según su flujo.
 */
export async function cargarPolizaFormState(
	supabase: SupabaseClient,
	polizaId: string
): Promise<ActionResult<PolizaFormState>> {
	try {
		// 1. Get main policy data
		const { data: poliza, error: errorPoliza } = await supabase
			.from("polizas")
			.select(`
				*,
				companias_aseguradoras (id, nombre),
				regionales!polizas_regional_id_fkey (id, nombre),
				categorias (id, nombre),
				profiles!polizas_responsable_id_fkey (id, full_name)
			`)
			.eq("id", polizaId)
			.single();

		if (errorPoliza || !poliza) {
			return { success: false, error: "Póliza no encontrada" };
		}

		// 2. Get client information
		const { data: client } = await supabase
			.from("clients")
			.select("id, client_type, status, created_at")
			.eq("id", poliza.client_id)
			.single();

		if (!client) {
			return { success: false, error: "Cliente no encontrado" };
		}

		let asegurado: AseguradoSeleccionado;

		if (client.client_type === "natural" || client.client_type === "unipersonal") {
			const { data: naturalClient } = await supabase
				.from("natural_clients")
				.select("*")
				.eq("client_id", poliza.client_id)
				.single();

			if (!naturalClient) {
				return { success: false, error: "Datos del cliente no encontrados" };
			}

			const nombres = [naturalClient.primer_nombre, naturalClient.segundo_nombre]
				.filter(Boolean)
				.join(" ");
			const apellidos = [naturalClient.primer_apellido, naturalClient.segundo_apellido]
				.filter(Boolean)
				.join(" ");

			let nombre_completo = `${nombres} ${apellidos}`.trim();
			let documento = naturalClient.numero_documento || "-";

			if (client.client_type === "unipersonal") {
				const { data: unipersonalClient } = await supabase
					.from("unipersonal_clients")
					.select("razon_social, nit")
					.eq("client_id", poliza.client_id)
					.single();

				if (unipersonalClient) {
					nombre_completo = `${nombre_completo} (${unipersonalClient.razon_social})`;
					documento = unipersonalClient.nit || documento;
				}
			}

			asegurado = {
				id: client.id,
				client_type: client.client_type === "unipersonal" ? "natural" : "natural",
				status: client.status,
				created_at: client.created_at,
				detalles: naturalClient,
				nombre_completo,
				documento,
			};
		} else {
			const { data: juridicClient } = await supabase
				.from("juridic_clients")
				.select("*")
				.eq("client_id", poliza.client_id)
				.single();

			if (!juridicClient) {
				return { success: false, error: "Datos del cliente no encontrados" };
			}

			asegurado = {
				id: client.id,
				client_type: "juridica",
				status: client.status,
				created_at: client.created_at,
				detalles: juridicClient,
				nombre_completo: juridicClient.razon_social,
				documento: juridicClient.nit || "-",
			};
		}

		// 3. Build datos_basicos
		const datos_basicos: DatosBasicosPoliza = {
			numero_poliza: poliza.numero_poliza,
			compania_aseguradora_id: poliza.compania_aseguradora_id,
			ramo: poliza.ramo,
			producto_id: poliza.producto_id || "",
			inicio_vigencia: poliza.inicio_vigencia,
			fin_vigencia: poliza.fin_vigencia,
			fecha_emision_compania: poliza.fecha_emision_compania,
			director_cartera_id: poliza.director_cartera_id || "",
			responsable_id: poliza.responsable_id,
			regional_id: poliza.regional_id,
			categoria_id: poliza.categoria_id || undefined,
			grupo_produccion: poliza.grupo_produccion || "generales",
			moneda: poliza.moneda,
			es_renovacion: poliza.es_renovacion || false,
			nro_poliza_anterior: poliza.nro_poliza_anterior || "",
		};

		// 4. Get payment data and build modalidad_pago
		const { data: pagos } = await supabase
			.from("polizas_pagos")
			.select("id, numero_cuota, monto, fecha_vencimiento, estado, fecha_pago, observaciones")
			.eq("poliza_id", polizaId)
			.order("numero_cuota", { ascending: true });

		let modalidad_pago: ModalidadPago;

		// Check if any cuota is paid (to block modality changes)
		const tienePagos = pagos?.some((p) => p.estado === "pagado") || false;

		if (poliza.modalidad_pago === "contado") {
			const pago = pagos?.[0];
			modalidad_pago = {
				tipo: "contado",
				cuota_unica: pago?.monto || poliza.prima_total,
				fecha_pago_unico: pago?.fecha_vencimiento || poliza.inicio_vigencia,
				prima_total: poliza.prima_total,
				moneda: poliza.moneda,
				prima_neta: poliza.prima_neta,
				comision: poliza.comision,
				cuota_id: pago?.id,
				cuota_pagada: pago?.estado === "pagado",
			};
		} else {
			// Credito
			const cuotaInicial = pagos?.find((p) => p.observaciones?.toLowerCase().includes("inicial"));
			const cuotasRestantes = pagos?.filter((p) => !p.observaciones?.toLowerCase().includes("inicial")) || [];

			if (!pagos || pagos.length === 0) {
				throw new Error("No se encontraron cuotas de pago para esta póliza a crédito");
			}

			// fecha_inicio_cuotas debe ser la fecha de la primera cuota (inicial si existe, sino la primera regular)
			const fechaInicioCuotas = cuotaInicial
				? cuotaInicial.fecha_vencimiento
				: cuotasRestantes[0].fecha_vencimiento;

			modalidad_pago = {
				tipo: "credito",
				prima_total: poliza.prima_total,
				moneda: poliza.moneda,
				cantidad_cuotas: cuotasRestantes.length + (cuotaInicial ? 1 : 0),
				cuota_inicial: cuotaInicial?.monto || 0,
				fecha_inicio_cuotas: fechaInicioCuotas,
				periodo_pago: "mensual", // Default, this is calculated
				cuotas: cuotasRestantes.map((c) => ({
					id: c.id,
					numero: c.numero_cuota, // Preservar número original de la BD
					monto: c.monto,
					fecha_vencimiento: c.fecha_vencimiento,
					estado: c.estado as "pendiente" | "pagado" | "vencida",
					fecha_pago: c.fecha_pago || undefined,
				})),
				prima_neta: poliza.prima_neta,
				comision: poliza.comision,
				usar_factores_contado: poliza.usar_factores_contado || false,
				cuota_inicial_id: cuotaInicial?.id,
				cuota_inicial_pagada: cuotaInicial?.estado === "pagado",
				tiene_pagos: tienePagos,
			};
		}

		// 5. Get datos_especificos based on ramo
		let datos_especificos: DatosEspecificosPoliza | null = null;

		if (poliza.ramo.toLowerCase().includes("automotor")) {
			const { data: vehiculos } = await supabase
				.from("polizas_automotor_vehiculos")
				.select("*")
				.eq("poliza_id", polizaId);

			const vehiculosFormateados: VehiculoAutomotor[] = (vehiculos || []).map((v) => ({
				id: v.id,
				placa: v.placa,
				valor_asegurado: v.valor_asegurado,
				franquicia: v.franquicia,
				nro_chasis: v.nro_chasis,
				uso: v.uso,
				coaseguro: v.coaseguro || 0,
				tipo_vehiculo_id: v.tipo_vehiculo_id || undefined,
				marca_id: v.marca_id || undefined,
				modelo: v.modelo || undefined,
				ano: v.ano || undefined,
				color: v.color || undefined,
				ejes: v.ejes || undefined,
				nro_motor: v.nro_motor || undefined,
				nro_asientos: v.nro_asientos || undefined,
				plaza_circulacion: v.plaza_circulacion || undefined,
			}));

			datos_especificos = {
				tipo_ramo: "Automotores",
				datos: {
					tipo_poliza: vehiculosFormateados.length > 1 ? "corporativo" : "individual",
					vehiculos: vehiculosFormateados,
				},
			};
		}

		// Salud
		if (poliza.ramo.toLowerCase().includes("salud") || poliza.ramo.toLowerCase().includes("enfermedad")) {
			const { data: niveles, error: errorNiveles } = await supabase
				.from("polizas_salud_niveles")
				.select("id, nombre, monto")
				.eq("poliza_id", polizaId);

			if (errorNiveles) {
				throw new Error(`Error al cargar niveles de salud: ${errorNiveles.message}`);
			}

			const { data: aseguradosDB, error: errorAsegurados } = await supabase
				.from("polizas_salud_asegurados")
				.select("client_id, nivel_id, rol")
				.eq("poliza_id", polizaId);

			if (errorAsegurados) {
				throw new Error(`Error al cargar asegurados de salud: ${errorAsegurados.message}`);
			}

			const { data: beneficiariosDB, error: errorBeneficiarios } = await supabase
				.from("polizas_salud_beneficiarios")
				.select("id, nombre_completo, carnet, fecha_nacimiento, genero, nivel_id, rol, titular_id")
				.eq("poliza_id", polizaId);

			if (errorBeneficiarios) {
				throw new Error(`Error al cargar beneficiarios de salud: ${errorBeneficiarios.message}`);
			}

			const nivelesFormateados: NivelSalud[] = (niveles || []).map((n) => ({
				id: n.id,
				nombre: n.nombre,
				monto: n.monto,
			}));

			// Build contratante (single DB-linked client)
			let contratanteSalud: ContratanteSalud | null = null;
			const contratanteRecord = (aseguradosDB || [])[0];
			if (contratanteRecord) {
				const { data: clientData } = await supabase
					.from("natural_clients")
					.select("primer_nombre, segundo_nombre, primer_apellido, segundo_apellido, numero_documento")
					.eq("client_id", contratanteRecord.client_id)
					.single();
				const nombre = clientData
					? [clientData.primer_nombre, clientData.segundo_nombre, clientData.primer_apellido, clientData.segundo_apellido]
							.filter(Boolean).join(" ")
					: "Cliente";
				const familiaresDelContratante: FamiliarSalud[] = (beneficiariosDB || [])
					.filter((b) => b.titular_id === null && b.rol !== "titular")
					.map((b) => ({
						id: b.id,
						nombre_completo: b.nombre_completo,
						carnet: b.carnet,
						fecha_nacimiento: b.fecha_nacimiento || undefined,
						genero: b.genero as "M" | "F" | "Otro" | undefined,
						nivel_id: b.nivel_id,
						rol: b.rol as "conyugue" | "descendiente",
					}));
				contratanteSalud = {
					client_id: contratanteRecord.client_id,
					client_name: nombre,
					client_ci: clientData?.numero_documento || "-",
					nivel_id: contratanteRecord.nivel_id,
					rol: contratanteRecord.rol as RolContratanteSalud,
					conyugue: familiaresDelContratante.find((f) => f.rol === "conyugue"),
					descendientes: familiaresDelContratante.filter((f) => f.rol === "descendiente"),
				};
			}

			// Build titulares with their familiares
			const titularesDB = (beneficiariosDB || []).filter((b) => b.rol === "titular");
			const titulares: TitularSalud[] = titularesDB.map((t) => {
				const familiares: FamiliarSalud[] = (beneficiariosDB || [])
					.filter((b) => b.titular_id === t.id)
					.map((b) => ({
						id: b.id,
						nombre_completo: b.nombre_completo,
						carnet: b.carnet,
						fecha_nacimiento: b.fecha_nacimiento || undefined,
						genero: b.genero as "M" | "F" | "Otro" | undefined,
						nivel_id: b.nivel_id,
						rol: b.rol as "conyugue" | "descendiente",
					}));
				return {
					id: t.id,
					nombre_completo: t.nombre_completo,
					carnet: t.carnet,
					fecha_nacimiento: t.fecha_nacimiento || undefined,
					genero: t.genero as "M" | "F" | "Otro" | undefined,
					nivel_id: t.nivel_id,
					conyugue: familiares.find((f) => f.rol === "conyugue"),
					descendientes: familiares.filter((f) => f.rol === "descendiente"),
				};
			});

			datos_especificos = {
				tipo_ramo: "Salud",
				datos: {
					niveles: nivelesFormateados,
					tipo_poliza: titulares.length > 0 || contratanteSalud?.rol === "contratante" ? "corporativo" : "individual",
					regional_asegurado_id: poliza.regional_asegurado_id || "",
					tiene_maternidad: poliza.tiene_maternidad ?? false,
					contratante: contratanteSalud,
					titulares,
				},
			};
		}

		// Vida, Accidentes Personales, Sepelio (tablas compartidas: polizas_niveles, polizas_asegurados_nivel, polizas_beneficiarios)
		const ramoLower = poliza.ramo.toLowerCase();
		if (
			ramoLower.includes("vida") ||
			ramoLower.includes("accidente") ||
			ramoLower.includes("sepelio") || ramoLower.includes("defuncion")
		) {
			const { data: niveles, error: errorNiveles } = await supabase
				.from("polizas_niveles")
				.select("id, nombre, prima_nivel, coberturas")
				.eq("poliza_id", polizaId);

			if (errorNiveles) {
				throw new Error(`Error al cargar niveles: ${errorNiveles.message}`);
			}

			const { data: aseguradosDB, error: errorAsegurados } = await supabase
				.from("polizas_asegurados_nivel")
				.select("client_id, nivel_id, cargo, rol")
				.eq("poliza_id", polizaId);

			if (errorAsegurados) {
				throw new Error(`Error al cargar asegurados: ${errorAsegurados.message}`);
			}

			// Cargar nombres de clientes asegurados
			const aseguradosFormateadosNivel: AseguradoConNivel[] = [];
			for (const a of aseguradosDB || []) {
				const { data: naturalClient } = await supabase
					.from("natural_clients")
					.select("primer_nombre, segundo_nombre, primer_apellido, segundo_apellido, numero_documento")
					.eq("client_id", a.client_id)
					.single();

				const nombre = naturalClient
					? [naturalClient.primer_nombre, naturalClient.segundo_nombre, naturalClient.primer_apellido, naturalClient.segundo_apellido]
							.filter(Boolean)
							.join(" ")
					: "Cliente";
				const ci = naturalClient?.numero_documento || "-";

				aseguradosFormateadosNivel.push({
					client_id: a.client_id,
					client_name: nombre,
					client_ci: ci,
					nivel_id: a.nivel_id,
					cargo: a.cargo || undefined,
					rol: a.rol as "contratante" | "titular" | undefined,
				});
			}

			const nivelesFormateados: NivelCobertura[] = (niveles || []).map((n) => ({
				id: n.id,
				nombre: n.nombre,
				prima_nivel: n.prima_nivel || undefined,
				coberturas: n.coberturas,
			}));

			// Determinar tipo_ramo
			let tipoRamo: "Vida" | "Accidentes Personales" | "Sepelio" = "Vida";
			if (ramoLower.includes("accidente")) {
				tipoRamo = "Accidentes Personales";
			} else if (ramoLower.includes("sepelio") || ramoLower.includes("defuncion")) {
				tipoRamo = "Sepelio";
			}

			if (tipoRamo === "Vida" || tipoRamo === "Accidentes Personales") {
				// contratante: 1 DB client from polizas_asegurados_nivel
				const contratanteRec = aseguradosFormateadosNivel[0];
				let contratanteAPVida: ContratanteAPVida | null = null;
				if (contratanteRec) {
					contratanteAPVida = {
						client_id: contratanteRec.client_id,
						client_name: contratanteRec.client_name,
						client_ci: contratanteRec.client_ci,
						nivel_id: contratanteRec.nivel_id,
						rol: (contratanteRec.rol ?? "contratante-asegurado") as "contratante" | "contratante-asegurado",
					};
				}

				const { data: aseguradosMinDB, error: errorAsegMin } = await supabase
					.from("polizas_beneficiarios")
					.select("id, nombre_completo, carnet, fecha_nacimiento, genero, nivel_id")
					.eq("poliza_id", polizaId)
					.eq("rol", "asegurado");

				if (errorAsegMin) {
					throw new Error(`Error al cargar asegurados: ${errorAsegMin.message}`);
				}

				const aseguradosMin: AseguradoAPVida[] = (aseguradosMinDB || []).map((a) => ({
					id: a.id,
					nombre_completo: a.nombre_completo,
					carnet: a.carnet,
					fecha_nacimiento: a.fecha_nacimiento || undefined,
					genero: a.genero as "M" | "F" | "Otro" | undefined,
					nivel_id: a.nivel_id,
				}));

				datos_especificos = {
					tipo_ramo: tipoRamo,
					datos: {
						niveles: nivelesFormateados,
						tipo_poliza: aseguradosMin.length > 0 ? "corporativo" : "individual",
						regional_asegurado_id: poliza.regional_asegurado_id || "",
						contratante: contratanteAPVida,
						asegurados: aseguradosMin,
					},
				};
			} else {
				// Sepelio: DB clients from polizas_asegurados_nivel
				datos_especificos = {
					tipo_ramo: "Sepelio",
					datos: {
						niveles: nivelesFormateados,
						tipo_poliza: aseguradosFormateadosNivel.length > 1 ? "corporativo" : "individual",
						regional_asegurado_id: poliza.regional_asegurado_id || "",
						asegurados: aseguradosFormateadosNivel,
					},
				};
			}
		}

		// Incendio y Aliados
		if (ramoLower.includes("incendio")) {
			const { data: bienesDB, error: errorBienes } = await supabase
				.from("polizas_incendio_bienes")
				.select("id, direccion, valor_total_declarado, es_primer_riesgo")
				.eq("poliza_id", polizaId);

			if (errorBienes) {
				throw new Error(`Error al cargar bienes de incendio: ${errorBienes.message}`);
			}

			const bienesFormateados: BienAseguradoIncendio[] = [];
			for (const bien of bienesDB || []) {
				const { data: itemsDB } = await supabase
					.from("polizas_incendio_items")
					.select("nombre, monto")
					.eq("bien_id", bien.id);

				bienesFormateados.push({
					direccion: bien.direccion,
					valor_total_declarado: Number(bien.valor_total_declarado),
					es_primer_riesgo: bien.es_primer_riesgo,
					items: (itemsDB || []).map((i) => ({ nombre: i.nombre as ItemIncendio["nombre"], monto: Number(i.monto) })),
				});
			}

			const { data: aseguradosIncendioDB, error: errorAsegIncendio } = await supabase
				.from("polizas_incendio_asegurados")
				.select("client_id")
				.eq("poliza_id", polizaId);

			if (errorAsegIncendio) {
				throw new Error(`Error al cargar asegurados de incendio: ${errorAsegIncendio.message}`);
			}

			const aseguradosIncendioFormateados: AseguradoIncendio[] = [];
			for (const a of aseguradosIncendioDB || []) {
				const { data: naturalClient } = await supabase
					.from("natural_clients")
					.select("primer_nombre, segundo_nombre, primer_apellido, segundo_apellido, numero_documento")
					.eq("client_id", a.client_id)
					.single();

				if (naturalClient) {
					aseguradosIncendioFormateados.push({
						client_id: a.client_id,
						client_name: [naturalClient.primer_nombre, naturalClient.segundo_nombre, naturalClient.primer_apellido, naturalClient.segundo_apellido]
							.filter(Boolean)
							.join(" "),
						client_ci: naturalClient.numero_documento || "-",
					});
				} else {
					const { data: juridicClient } = await supabase
						.from("juridic_clients")
						.select("razon_social, nit")
						.eq("client_id", a.client_id)
						.single();

					aseguradosIncendioFormateados.push({
						client_id: a.client_id,
						client_name: juridicClient?.razon_social || "Cliente",
						client_ci: juridicClient?.nit || "-",
					});
				}
			}

			datos_especificos = {
				tipo_ramo: "Incendio y Aliados",
				datos: {
					tipo_poliza: aseguradosIncendioFormateados.length > 1 ? "corporativo" : "individual",
					regional_asegurado_id: poliza.regional_asegurado_id || "",
					valor_asegurado: bienesFormateados.reduce((sum, b) => sum + b.valor_total_declarado, 0),
					bienes: bienesFormateados,
					asegurados: aseguradosIncendioFormateados,
				},
			};
		}

		// Responsabilidad Civil
		if (ramoLower.includes("responsabilidad") || ramoLower.includes("civil")) {
			const { data: rcData } = await supabase
				.from("polizas_responsabilidad_civil")
				.select("tipo_poliza, valor_asegurado")
				.eq("poliza_id", polizaId)
				.single();

			const { data: vehiculosRC } = await supabase
				.from("polizas_rc_vehiculos")
				.select("*")
				.eq("poliza_id", polizaId);

			datos_especificos = {
				tipo_ramo: "Responsabilidad Civil",
				datos: {
					tipo_poliza: (rcData?.tipo_poliza as "individual" | "corporativo") ?? "individual",
					valor_asegurado: rcData?.valor_asegurado ?? 0,
					vehiculos: (vehiculosRC ?? []).map((v) => ({
						placa: v.placa,
						nro_chasis: v.nro_chasis,
						uso: v.uso as "publico" | "particular" | "privado",
						tipo_vehiculo_id: v.tipo_vehiculo_id ?? undefined,
						marca_vehiculo_id: v.marca_vehiculo_id ?? undefined,
						modelo: v.modelo ?? undefined,
						ano: v.ano ?? undefined,
						color: v.color ?? undefined,
						nro_motor: v.nro_motor ?? undefined,
						servicio: v.servicio ?? undefined,
						capacidad: v.capacidad ?? undefined,
						region_uso: v.region_uso ?? undefined,
						tipo_carroceria: v.tipo_carroceria ?? undefined,
						propiedad: (v.propiedad as "privada" | "publica" | undefined) ?? undefined,
						ejes: v.ejes ?? undefined,
						asientos: v.asientos ?? undefined,
						cilindrada: v.cilindrada ?? undefined,
					})),
				},
			};
		}

		// 6. Get documents (only active ones)
		const { data: documentos } = await supabase
			.from("polizas_documentos")
			.select("id, tipo_documento, nombre_archivo, archivo_url, tamano_bytes")
			.eq("poliza_id", polizaId)
			.eq("estado", "activo");

		const documentosFormateados: DocumentoPoliza[] = (documentos || []).map((d) => ({
			id: d.id,
			tipo_documento: d.tipo_documento,
			nombre_archivo: d.nombre_archivo,
			archivo_url: d.archivo_url,
			tamano_bytes: d.tamano_bytes,
			estado: "activo",
		}));

		// 7. Build complete PolizaFormState
		const formState: PolizaFormState = {
			paso_actual: 6, // Start at summary step for editing
			asegurado,
			datos_basicos,
			datos_especificos,
			modalidad_pago,
			documentos: documentosFormateados,
			advertencias: [],
			en_edicion: true,
			poliza_id: polizaId,
		};

		return { success: true, data: formState };
	} catch (error) {
		console.error("[cargarPolizaFormState] Error:", error);
		return {
			success: false,
			error: error instanceof Error ? error.message : "Error desconocido",
		};
	}
}
