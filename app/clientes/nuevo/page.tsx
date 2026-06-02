"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import * as Sentry from "@sentry/nextjs";
import {
	ClientType,
	NaturalClientFormData,
	UnipersonalClientFormData,
	JuridicClientFormData,
	OngClientFormData,
	ClubClientFormData,
	AsociacionCivilClientFormData,
	ClientPartnerData,
	naturalClientFormSchema,
	unipersonalClientFormSchema,
	juridicClientFormSchema,
	ongClientFormSchema,
	clubClientFormSchema,
	asociacionCivilClientFormSchema,
	clientPartnerSchema,
	ClientFormState,
} from "@/types/clientForm";
import type { ClienteDocumentoFormState, TipoDocumentoCliente } from "@/types/clienteDocumento";
import { generateStoragePath, validateClientDocuments, REQUIRED_DOCUMENTS } from "@/types/clienteDocumento";
import { obtenerMisExcepciones, consumirExcepciones } from "@/app/auditoria/excepciones/actions";
import {
	normalizeNaturalClientData,
	normalizeUnipersonalClientData,
	normalizeJuridicClientData,
	normalizeOngClientData,
	normalizeClubClientData,
	normalizeAsociacionCivilClientData,
	normalizePartnerData,
	normalizeLegalRepresentativeData,
} from "@/utils/formNormalization";
import {
	saveDraft,
	loadDraft,
	clearDraft,
	hasDraft,
	getDraftTimestamp,
	formatDraftAge,
} from "@/utils/clientFormStorage";
import { ClientTypeSelector } from "@/components/clientes/ClientTypeSelector";
import { NaturalClientForm } from "@/components/clientes/NaturalClientForm";
import { UnipersonalClientForm } from "@/components/clientes/UnipersonalClientForm";
import { JuridicClientForm } from "@/components/clientes/JuridicClientForm";
import { OngClientForm } from "@/components/clientes/OngClientForm";
import { ClubClientForm } from "@/components/clientes/ClubClientForm";
import { AsociacionCivilClientForm } from "@/components/clientes/AsociacionCivilClientForm";
import { Button } from "@/components/ui/button";
import { Save, X, ChevronLeft, Users, Check, AlertTriangle } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { saveExtraPhones } from "@/app/clientes/celulares/actions";
import {
	verificarDocumentoExistente,
	verificarNitExistente,
	verificarRegistroClubExistente,
	verificarPersoneriaAsociacionExistente,
	type VerificarDocumentoResult,
	type VerificarNitResult,
	type VerificarRegistroClubResult,
	type VerificarPersoneriaAsociacionResult,
} from "@/app/clientes/actions";

// ---------------------------------------------------------------------------
// Field label maps – used to display human-readable names in validation toasts
// ---------------------------------------------------------------------------
const COMMON_FIELD_LABELS: Record<string, string> = {
	primer_nombre: "Primer nombre",
	segundo_nombre: "Segundo nombre",
	primer_apellido: "Primer apellido",
	segundo_apellido: "Segundo apellido",
	tipo_documento: "Tipo de documento",
	numero_documento: "Número de documento",
	extension_ci: "Extensión CI",
	nacionalidad: "Nacionalidad",
	fecha_nacimiento: "Fecha de nacimiento",
	estado_civil: "Estado civil",
	direccion: "Dirección",
	correo_electronico: "Correo electrónico",
	celular: "Celular",
	telefono: "Teléfono",
	profesion_oficio: "Profesión u oficio",
	actividad_economica: "Actividad económica",
	lugar_trabajo: "Lugar de trabajo",
	pais_residencia: "País de residencia",
	genero: "Género",
	nivel_ingresos: "Nivel de ingresos",
	anios_servicio: "Años de servicio",
	nit: "NIT",
	domicilio_comercial: "Domicilio comercial",
	// Unipersonal commercial
	razon_social: "Razón social",
	matricula_comercio: "Matrícula de comercio",
	telefono_comercial: "Teléfono comercial",
	actividad_economica_comercial: "Actividad económica comercial",
	correo_electronico_comercial: "Correo electrónico comercial",
	// Unipersonal owner
	nombre_propietario: "Nombre del propietario",
	apellido_propietario: "Apellido del propietario",
	ci_propietario: "CI del propietario",
	// Representative
	nombre_representante: "Nombre del representante",
	apellido_representante: "Apellido del representante",
	ci_representante: "CI del representante",
	cargo_representante: "Cargo del representante",
	// Juridic
	tipo_empresa: "Tipo de empresa",
	fecha_constitucion: "Fecha de constitución",
	pais_origen: "País de origen",
	sitio_web: "Sitio web",
	tipo_actividad: "Tipo de actividad",
};

/** Flattens React Hook Form errors into human-readable field labels. */
function getErrorFieldLabels(
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	errors: Record<string, any>,
	labelMap: Record<string, string> = COMMON_FIELD_LABELS
): string[] {
	const labels: string[] = [];

	function traverse(obj: Record<string, unknown>) {
		for (const [key, value] of Object.entries(obj)) {
			if (!value || typeof value !== "object") continue;
			if ("message" in value) {
				labels.push(labelMap[key] ?? key);
			} else {
				traverse(value as Record<string, unknown>);
			}
		}
	}

	traverse(errors);
	return [...new Set(labels)];
}

export default function NuevoClientePage() {
	const router = useRouter();
	const supabase = createClient();

	const [clientType, setClientType] = useState<ClientType | null>(null);
	const [isLoading, setIsLoading] = useState(true);
	const [isSaving, setIsSaving] = useState(false);
	const [currentUserId, setCurrentUserId] = useState<string | null>(null);
	const [docExceptions, setDocExceptions] = useState<TipoDocumentoCliente[]>([]);
	// Track which sidebar sections passed validation after clicking "Guardar"
	const [validatedSections, setValidatedSections] = useState<boolean[]>([]);

	// Natural client form
	const naturalForm = useForm<NaturalClientFormData>({
		resolver: zodResolver(naturalClientFormSchema) as Resolver<NaturalClientFormData>,
		mode: "onBlur",
	});

	// Partner form (for natural clients when estado_civil = 'casado')
	const partnerForm = useForm<ClientPartnerData>({
		resolver: zodResolver(clientPartnerSchema),
		mode: "onBlur",
	});

	// Unipersonal client form
	const unipersonalForm = useForm<UnipersonalClientFormData>({
		resolver: zodResolver(unipersonalClientFormSchema) as Resolver<UnipersonalClientFormData>,
		mode: "onBlur",
	});

	// Juridic client form
	const juridicForm = useForm<JuridicClientFormData>({
		resolver: zodResolver(juridicClientFormSchema),
		mode: "onBlur",
		defaultValues: {
			legal_representatives: [],
		},
	});

	// ONG client form
	const ongForm = useForm<OngClientFormData>({
		resolver: zodResolver(ongClientFormSchema) as Resolver<OngClientFormData>,
		mode: "onBlur",
		defaultValues: {
			pais_origen: "BOLIVIA",
		},
	});

	// Club deportivo client form
	const clubForm = useForm<ClubClientFormData>({
		resolver: zodResolver(clubClientFormSchema) as Resolver<ClubClientFormData>,
		mode: "onBlur",
	});

	// Asociación Civil client form
	const asociacionCivilForm = useForm<AsociacionCivilClientFormData>({
		resolver: zodResolver(asociacionCivilClientFormSchema) as Resolver<AsociacionCivilClientFormData>,
		mode: "onBlur",
	});

	// Duplicate detection state
	const [duplicadoDocumento, setDuplicadoDocumento] = useState<VerificarDocumentoResult | null>(null);
	const [duplicadoNit, setDuplicadoNit] = useState<VerificarNitResult | null>(null);
	const [duplicadoRegistroClub, setDuplicadoRegistroClub] = useState<VerificarRegistroClubResult | null>(null);
	const [duplicadoPersoneriaAsoc, setDuplicadoPersoneriaAsoc] = useState<VerificarPersoneriaAsociacionResult | null>(null);

	// Watch documento fields for natural / unipersonal clients
	const naturalTipoDoc = naturalForm.watch("tipo_documento");
	const naturalNumDoc = naturalForm.watch("numero_documento");
	const unipersonalNumDoc = unipersonalForm.watch("numero_documento");
	const unipersonalTipoDoc = unipersonalForm.watch("tipo_documento");
	const juridicNit = juridicForm.watch("nit");
	const unipersonalNit = unipersonalForm.watch("nit");
	const clubNit = clubForm.watch("nit");
	const clubTipoRegistro = clubForm.watch("tipo_registro");
	const clubEntidadRegistro = clubForm.watch("entidad_registro");
	const clubNumeroRegistro = clubForm.watch("numero_registro");
	const asocNit = asociacionCivilForm.watch("nit");
	const asocEntidadPersoneria = asociacionCivilForm.watch("entidad_otorgante_personeria");
	const asocNumeroPersoneria = asociacionCivilForm.watch("numero_personeria_juridica");

	// Debounced duplicate check for natural clients
	const naturalDocTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	useEffect(() => {
		if (clientType !== "natural") return;
		if (naturalDocTimerRef.current) clearTimeout(naturalDocTimerRef.current);
		if (!naturalTipoDoc || !naturalNumDoc || naturalNumDoc.length < 6) {
			setDuplicadoDocumento(null);
			return;
		}
		naturalDocTimerRef.current = setTimeout(async () => {
			const result = await verificarDocumentoExistente(naturalTipoDoc, naturalNumDoc);
			if (result.success && result.data.existe) {
				setDuplicadoDocumento(result.data);
			} else {
				setDuplicadoDocumento(null);
			}
		}, 600);
		return () => { if (naturalDocTimerRef.current) clearTimeout(naturalDocTimerRef.current); };
	}, [naturalTipoDoc, naturalNumDoc, clientType]);

	// Debounced duplicate check for unipersonal clients (documento)
	const unipersonalDocTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	useEffect(() => {
		if (clientType !== "unipersonal") return;
		if (unipersonalDocTimerRef.current) clearTimeout(unipersonalDocTimerRef.current);
		if (!unipersonalTipoDoc || !unipersonalNumDoc || unipersonalNumDoc.length < 6) {
			setDuplicadoDocumento(null);
			return;
		}
		unipersonalDocTimerRef.current = setTimeout(async () => {
			const result = await verificarDocumentoExistente(unipersonalTipoDoc, unipersonalNumDoc);
			if (result.success && result.data.existe) {
				setDuplicadoDocumento(result.data);
			} else {
				setDuplicadoDocumento(null);
			}
		}, 600);
		return () => { if (unipersonalDocTimerRef.current) clearTimeout(unipersonalDocTimerRef.current); };
	}, [unipersonalTipoDoc, unipersonalNumDoc, clientType]);

	// Debounced duplicate check for NIT (juridic + unipersonal + club + asociacion_civil)
	const nitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const activeNit =
		clientType === "juridica" ? juridicNit
		: clientType === "unipersonal" ? unipersonalNit
		: clientType === "club" ? clubNit
		: clientType === "asociacion_civil" ? asocNit
		: undefined;
	useEffect(() => {
		if (clientType !== "juridica" && clientType !== "unipersonal" && clientType !== "club" && clientType !== "asociacion_civil") return;
		if (nitTimerRef.current) clearTimeout(nitTimerRef.current);
		if (!activeNit || activeNit.length < 7) {
			setDuplicadoNit(null);
			return;
		}
		nitTimerRef.current = setTimeout(async () => {
			const result = await verificarNitExistente(activeNit);
			if (result.success && result.data.existe) {
				setDuplicadoNit(result.data);
			} else {
				setDuplicadoNit(null);
			}
		}, 600);
		return () => { if (nitTimerRef.current) clearTimeout(nitTimerRef.current); };
	}, [activeNit, clientType]);

	// Debounced duplicate check for club registro (tipo + entidad + numero)
	const registroClubTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	useEffect(() => {
		if (clientType !== "club") return;
		if (registroClubTimerRef.current) clearTimeout(registroClubTimerRef.current);
		if (!clubTipoRegistro || !clubEntidadRegistro || !clubNumeroRegistro || clubEntidadRegistro.length < 2 || clubNumeroRegistro.length < 2) {
			setDuplicadoRegistroClub(null);
			return;
		}
		registroClubTimerRef.current = setTimeout(async () => {
			const result = await verificarRegistroClubExistente(clubTipoRegistro, clubEntidadRegistro, clubNumeroRegistro);
			if (result.success && result.data.existe) {
				setDuplicadoRegistroClub(result.data);
			} else {
				setDuplicadoRegistroClub(null);
			}
		}, 600);
		return () => { if (registroClubTimerRef.current) clearTimeout(registroClubTimerRef.current); };
	}, [clubTipoRegistro, clubEntidadRegistro, clubNumeroRegistro, clientType]);

	// Debounced duplicate check for asociación civil personería (entidad + numero)
	const personeriaAsocTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	useEffect(() => {
		if (clientType !== "asociacion_civil") return;
		if (personeriaAsocTimerRef.current) clearTimeout(personeriaAsocTimerRef.current);
		if (!asocEntidadPersoneria || !asocNumeroPersoneria || asocEntidadPersoneria.length < 2 || asocNumeroPersoneria.length < 2) {
			setDuplicadoPersoneriaAsoc(null);
			return;
		}
		personeriaAsocTimerRef.current = setTimeout(async () => {
			const result = await verificarPersoneriaAsociacionExistente(asocEntidadPersoneria, asocNumeroPersoneria);
			if (result.success && result.data.existe) {
				setDuplicadoPersoneriaAsoc(result.data);
			} else {
				setDuplicadoPersoneriaAsoc(null);
			}
		}, 600);
		return () => { if (personeriaAsocTimerRef.current) clearTimeout(personeriaAsocTimerRef.current); };
	}, [asocEntidadPersoneria, asocNumeroPersoneria, clientType]);

	// Load user and check for draft on mount
	useEffect(() => {
		const initialize = async () => {
			try {
				const {
					data: { user },
					error: userError,
				} = await supabase.auth.getUser();

				if (userError) throw userError;

				setCurrentUserId(user?.id || null);

				// Fetch document exceptions for this user
				try {
					const exceptions = await obtenerMisExcepciones();
					setDocExceptions(exceptions.map((e) => e.tipo_documento));
				} catch {
					// Non-critical: if exceptions can't be fetched, all docs remain required
				}

				// Check for draft and prompt user
				if (hasDraft()) {
					const draft = loadDraft();
					const timestamp = getDraftTimestamp();

					if (draft && timestamp) {
						const age = formatDraftAge(timestamp);
						const shouldRestore = confirm(
							`Se encontró un borrador guardado ${age}.\n\n¿Desea continuar con el borrador?`
						);

						if (shouldRestore) {
							setClientType(draft.clientType);

							if (draft.clientType === "natural" && draft.naturalData) {
								Object.entries(draft.naturalData).forEach(([key, value]) => {
									naturalForm.setValue(key as keyof NaturalClientFormData, value as never);
								});
							} else if (draft.clientType === "unipersonal" && draft.unipersonalData) {
								Object.entries(draft.unipersonalData).forEach(([key, value]) => {
									unipersonalForm.setValue(key as keyof UnipersonalClientFormData, value as never);
								});
							} else if (draft.clientType === "juridica" && draft.juridicData) {
								Object.entries(draft.juridicData).forEach(([key, value]) => {
									juridicForm.setValue(key as keyof JuridicClientFormData, value as never);
								});
							} else if (draft.clientType === "ong" && draft.ongData) {
								Object.entries(draft.ongData).forEach(([key, value]) => {
									ongForm.setValue(key as keyof OngClientFormData, value as never);
								});
							} else if (draft.clientType === "club" && draft.clubData) {
								Object.entries(draft.clubData).forEach(([key, value]) => {
									clubForm.setValue(key as keyof ClubClientFormData, value as never);
								});
							} else if (draft.clientType === "asociacion_civil" && draft.asociacionCivilData) {
								Object.entries(draft.asociacionCivilData).forEach(([key, value]) => {
									asociacionCivilForm.setValue(key as keyof AsociacionCivilClientFormData, value as never);
								});
							}

							toast.success("Borrador restaurado");
						} else {
							clearDraft();
						}
					}
				}
			} catch (error) {
				console.error("Error initializing form:", error);
				toast.error("Error al cargar datos del formulario");
			} finally {
				setIsLoading(false);
			}
		};

		initialize();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	// Auto-save draft on form changes
	const handleAutoSave = () => {
		if (!clientType) return;

		const formState: ClientFormState = {
			clientType,
			currentStep: clientType ? 2 : 1,
			completedSections: {},
		};

		if (clientType === "natural") {
			formState.naturalData = naturalForm.getValues();
		} else if (clientType === "unipersonal") {
			formState.unipersonalData = unipersonalForm.getValues();
		} else if (clientType === "juridica") {
			formState.juridicData = juridicForm.getValues();
		} else if (clientType === "ong") {
			formState.ongData = ongForm.getValues();
		} else if (clientType === "club") {
			formState.clubData = clubForm.getValues();
		} else if (clientType === "asociacion_civil") {
			formState.asociacionCivilData = asociacionCivilForm.getValues();
		}

		saveDraft(formState);
	};

	// Handle client type selection
	const handleClientTypeSelect = (type: ClientType) => {
		setClientType(type);
		setValidatedSections([]);
		handleAutoSave();
	};

	// Handle cancel
	const handleCancel = () => {
		const shouldCancel = confirm("¿Está seguro que desea cancelar? Se perderá el borrador guardado.");

		if (shouldCancel) {
			clearDraft();
			router.push("/clientes");
		}
	};

	// Upload client documents to Storage and database
	const uploadClientDocuments = async (
		clientId: string,
		documentos: ClienteDocumentoFormState[] | undefined
	): Promise<void> => {
		if (!documentos || documentos.length === 0) {
			return; // No documents to upload
		}

		const {
			data: { user },
		} = await supabase.auth.getUser();
		const currentUserId = user?.id;

		if (!currentUserId) {
			throw new Error("Usuario no autenticado");
		}

		// Upload each document
		for (const doc of documentos) {
			try {
				// Generate storage path
				const storagePath = generateStoragePath(clientId, doc.nombre_archivo);

				// Upload file to Storage
				const { error: uploadError } = await supabase.storage
					.from("clientes-documentos")
					.upload(storagePath, doc.file, {
						contentType: doc.tipo_archivo,
						upsert: false,
					});

				if (uploadError) {
					console.error(`Error uploading document ${doc.nombre_archivo}:`, uploadError);
					throw new Error(`Error al subir documento: ${doc.nombre_archivo}`);
				}

				// Insert document metadata into database
				const { error: dbError } = await supabase.from("clientes_documentos").insert({
					client_id: clientId,
					tipo_documento: doc.tipo_documento,
					nombre_archivo: doc.nombre_archivo,
					tipo_archivo: doc.tipo_archivo,
					tamano_bytes: doc.tamano_bytes,
					storage_path: storagePath,
					storage_bucket: "clientes-documentos",
					estado: "activo",
					subido_por: currentUserId,
					descripcion: doc.descripcion || null,
				});

				if (dbError) {
					console.error(`Error saving document metadata for ${doc.nombre_archivo}:`, dbError);
					throw new Error(`Error al guardar metadatos del documento: ${doc.nombre_archivo}`);
				}
			} catch (error) {
				console.error("Error processing document:", error);
				throw error;
			}
		}
	};

	// Helper to rollback a clients record if a subsequent insert fails
	const rollbackClient = async (clientId: string) => {
		await supabase.from("clients").delete().eq("id", clientId);
	};

	// Natural client submission
	const submitNaturalClient = async () => {
		const formData = naturalForm.getValues();
		const normalized = normalizeNaturalClientData(formData);

		// Check if document already exists (unique constraint on tipo_documento + numero_documento)
		const { data: existingDoc } = await supabase
			.from("natural_clients")
			.select("numero_documento")
			.eq("tipo_documento", normalized.tipo_documento)
			.eq("numero_documento", normalized.numero_documento)
			.maybeSingle();

		if (existingDoc) {
			throw new Error(`Ya existe un cliente registrado con el documento ${normalized.tipo_documento.toUpperCase()} ${normalized.numero_documento}`);
		}

		// Validate and convert required date fields before submission
		if (!normalized.fecha_nacimiento || typeof normalized.fecha_nacimiento !== "string") {
			throw new Error("Fecha de nacimiento es requerida");
		}

		// Validate fecha_nacimiento format (YYYY-MM-DD)
		if (!/^\d{4}-\d{2}-\d{2}$/.test(normalized.fecha_nacimiento)) {
			throw new Error("Fecha de nacimiento inválida");
		}

		// anio_ingreso is an integer (year only) or null
		const anioIngreso =
			normalized.anio_ingreso && !isNaN(normalized.anio_ingreso) ? normalized.anio_ingreso : null;

		// 1. Insert into clients table
		const { data: client, error: clientError } = await supabase
			.from("clients")
			.insert({
				client_type: "natural",
				commercial_owner_id: currentUserId,
				status: "active",
				created_by: currentUserId,
			})
			.select()
			.single();

		if (clientError) throw clientError;

		// 2. Insert into natural_clients table
		const { error: naturalError } = await supabase.from("natural_clients").insert({
			client_id: client.id,
			primer_nombre: normalized.primer_nombre,
			segundo_nombre: normalized.segundo_nombre || null,
			primer_apellido: normalized.primer_apellido,
			segundo_apellido: normalized.segundo_apellido || null,
			tipo_documento: normalized.tipo_documento,
			numero_documento: normalized.numero_documento,
			extension_ci: normalized.extension_ci || null,
			nacionalidad: normalized.nacionalidad,
			fecha_nacimiento: normalized.fecha_nacimiento, // Already in YYYY-MM-DD format (PostgreSQL date type)
			estado_civil: normalized.estado_civil,
			direccion: normalized.direccion,
			correo_electronico: normalized.correo_electronico,
			celular: normalized.celular,
			profesion_oficio: normalized.profesion_oficio || null,
			actividad_economica: normalized.actividad_economica || null,
			lugar_trabajo: normalized.lugar_trabajo || null,
			pais_residencia: normalized.pais_residencia || null,
			genero: normalized.genero || null,
			nivel_ingresos: normalized.nivel_ingresos || null,
			cargo: normalized.cargo || null,
			anio_ingreso: anioIngreso, // Integer (year only) or null
			nit: normalized.nit || null,
			domicilio_comercial: normalized.domicilio_comercial || null,
		});

		if (naturalError) { await rollbackClient(client.id); throw naturalError; }

		// 3. If married, insert partner data
		if (normalized.estado_civil === "casado") {
			const partnerData = partnerForm.getValues();
			const hasPartnerData = partnerData && Object.values(partnerData).some(v => v && v !== partnerData.client_id);
			if (hasPartnerData) {
				const normalizedPartner = normalizePartnerData(partnerData);

				const { error: partnerError } = await supabase.from("client_partners").insert({
					client_id: client.id,
					primer_nombre: normalizedPartner.primer_nombre || null,
					segundo_nombre: normalizedPartner.segundo_nombre || null,
					primer_apellido: normalizedPartner.primer_apellido || null,
					segundo_apellido: normalizedPartner.segundo_apellido || null,
					direccion: normalizedPartner.direccion || null,
					celular: normalizedPartner.celular || null,
					correo_electronico: normalizedPartner.correo_electronico || null,
					profesion_oficio: normalizedPartner.profesion_oficio || null,
					actividad_economica: normalizedPartner.actividad_economica || null,
					lugar_trabajo: normalizedPartner.lugar_trabajo || null,
				});

				if (partnerError) { await rollbackClient(client.id); throw partnerError; }
			}
		}

		// 4. Upload client documents
		await uploadClientDocuments(client.id, formData.documentos);

		// 5. Save extra phones
		if (formData.celulares_extra && formData.celulares_extra.length > 0) {
			await saveExtraPhones(client.id, formData.celulares_extra);
		}

		return client.id;
	};

	// Unipersonal client submission (3 tables)
	const submitUnipersonalClient = async () => {
		const formData = unipersonalForm.getValues();
		const normalized = normalizeUnipersonalClientData(formData);

		// Check if NIT already exists (unique constraint)
		const { data: existingNit } = await supabase
			.from("unipersonal_clients")
			.select("nit")
			.eq("nit", normalized.nit)
			.maybeSingle();

		if (existingNit) {
			throw new Error(`Ya existe un cliente unipersonal registrado con el NIT ${normalized.nit}`);
		}

		// Validate and convert required date fields before submission
		if (!normalized.fecha_nacimiento || typeof normalized.fecha_nacimiento !== "string") {
			throw new Error("Fecha de nacimiento es requerida");
		}

		// Validate fecha_nacimiento format (YYYY-MM-DD)
		if (!/^\d{4}-\d{2}-\d{2}$/.test(normalized.fecha_nacimiento)) {
			throw new Error("Fecha de nacimiento inválida");
		}

		// anio_ingreso is an integer (year only) or null
		const anioIngreso =
			normalized.anio_ingreso && !isNaN(normalized.anio_ingreso) ? normalized.anio_ingreso : null;

		// 1. Insert into clients table
		const { data: client, error: clientError } = await supabase
			.from("clients")
			.insert({
				client_type: "unipersonal",
				commercial_owner_id: currentUserId,
				status: "active",
				created_by: currentUserId,
			})
			.select()
			.single();

		if (clientError) throw clientError;

		// 2. Insert into natural_clients table (personal data)
		const { error: naturalError } = await supabase.from("natural_clients").insert({
			client_id: client.id,
			primer_nombre: normalized.primer_nombre,
			segundo_nombre: normalized.segundo_nombre || null,
			primer_apellido: normalized.primer_apellido,
			segundo_apellido: normalized.segundo_apellido || null,
			tipo_documento: normalized.tipo_documento,
			numero_documento: normalized.numero_documento,
			extension_ci: normalized.extension_ci || null,
			nacionalidad: normalized.nacionalidad,
			fecha_nacimiento: normalized.fecha_nacimiento, // Already in YYYY-MM-DD format (PostgreSQL date type)
			estado_civil: normalized.estado_civil,
			direccion: normalized.direccion,
			correo_electronico: normalized.correo_electronico,
			celular: normalized.celular,
			profesion_oficio: normalized.profesion_oficio || null,
			actividad_economica: normalized.actividad_economica || null,
			lugar_trabajo: normalized.lugar_trabajo || null,
			pais_residencia: normalized.pais_residencia || null,
			genero: normalized.genero || null,
			nivel_ingresos: normalized.nivel_ingresos || null,
			cargo: normalized.cargo || null,
			anio_ingreso: anioIngreso, // Integer (year only) or null
			nit: normalized.nit || null,
			domicilio_comercial: normalized.domicilio_comercial || null,
		});

		if (naturalError) { await rollbackClient(client.id); throw naturalError; }

		// 3. Insert into unipersonal_clients table (commercial data)
		// Auto-fill propietario fields from personal data (unipersonal = same person)
		const nombrePropietario = [normalized.primer_nombre, normalized.segundo_nombre].filter(Boolean).join(" ");
		const apellidoPropietario = [normalized.primer_apellido, normalized.segundo_apellido].filter(Boolean).join(" ");

		const { error: unipersonalError } = await supabase.from("unipersonal_clients").insert({
			client_id: client.id,
			razon_social: normalized.razon_social,
			nit: normalized.nit,
			matricula_comercio: normalized.matricula_comercio || null,
			domicilio_comercial: normalized.domicilio_comercial,
			telefono_comercial: normalized.telefono_comercial,
			actividad_economica_comercial: normalized.actividad_economica_comercial,
			nivel_ingresos: normalized.nivel_ingresos,
			correo_electronico_comercial: normalized.correo_electronico_comercial,
			// Propietario data auto-filled from personal data
			nombre_propietario: nombrePropietario,
			apellido_propietario: apellidoPropietario,
			documento_propietario: normalized.numero_documento,
			extension_propietario: normalized.extension_ci || null,
			nacionalidad_propietario: normalized.nacionalidad,
			nombre_representante: normalized.nombre_representante,
			ci_representante: normalized.ci_representante,
			extension_representante: normalized.extension_representante || null,
		});

		if (unipersonalError) { await rollbackClient(client.id); throw unipersonalError; }

		// 4. If married, insert partner data
		if (normalized.estado_civil === "casado") {
			const partnerData = partnerForm.getValues();
			const hasPartnerData = partnerData && Object.values(partnerData).some(v => v && v !== partnerData.client_id);
			if (hasPartnerData) {
				const normalizedPartner = normalizePartnerData(partnerData);

				const { error: partnerError } = await supabase.from("client_partners").insert({
					client_id: client.id,
					primer_nombre: normalizedPartner.primer_nombre || null,
					segundo_nombre: normalizedPartner.segundo_nombre || null,
					primer_apellido: normalizedPartner.primer_apellido || null,
					segundo_apellido: normalizedPartner.segundo_apellido || null,
					direccion: normalizedPartner.direccion || null,
					celular: normalizedPartner.celular || null,
					correo_electronico: normalizedPartner.correo_electronico || null,
					profesion_oficio: normalizedPartner.profesion_oficio || null,
					actividad_economica: normalizedPartner.actividad_economica || null,
					lugar_trabajo: normalizedPartner.lugar_trabajo || null,
				});

				if (partnerError) { await rollbackClient(client.id); throw partnerError; }
			}
		}

		// 5. Upload client documents
		await uploadClientDocuments(client.id, formData.documentos);

		// 6. Save extra phones
		if (formData.celulares_extra && formData.celulares_extra.length > 0) {
			await saveExtraPhones(client.id, formData.celulares_extra);
		}

		return client.id;
	};

	// Juridic client submission
	const submitJuridicClient = async () => {
		const formData = juridicForm.getValues();
		const normalized = normalizeJuridicClientData(formData);

		// Check if NIT already exists (unique constraint)
		const { data: existingNit } = await supabase
			.from("juridic_clients")
			.select("nit")
			.eq("nit", normalized.nit)
			.maybeSingle();

		if (existingNit) {
			throw new Error(`Ya existe un cliente jurídico registrado con el NIT ${normalized.nit}`);
		}

		// 1. Insert into clients table
		const { data: client, error: clientError } = await supabase
			.from("clients")
			.insert({
				client_type: "juridica",
				commercial_owner_id: currentUserId,
				status: "active",
				created_by: currentUserId,
			})
			.select()
			.single();

		if (clientError) throw clientError;

		// 2. Insert into juridic_clients table
		const { error: juridicError } = await supabase.from("juridic_clients").insert({
			client_id: client.id,
			razon_social: normalized.razon_social,
			tipo_sociedad: normalized.tipo_sociedad || null,
			tipo_documento: "NIT",
			nit: normalized.nit,
			matricula_comercio: normalized.matricula_comercio || null,
			pais_constitucion: normalized.pais_constitucion,
			direccion_legal: normalized.direccion_legal,
			actividad_economica: normalized.actividad_economica,
			correo_electronico: normalized.correo_electronico || null,
			telefono: normalized.telefono || null,
		});

		if (juridicError) { await rollbackClient(client.id); throw juridicError; }

		// 3. Insert legal representatives
		if (formData.legal_representatives && formData.legal_representatives.length > 0) {
			const representatives = formData.legal_representatives.map((rep, index) => {
				const normalizedRep = normalizeLegalRepresentativeData(rep);
				const nombre = [normalizedRep.primer_nombre, normalizedRep.segundo_nombre]
					.filter(Boolean)
					.join(" ");
				return {
					juridic_client_id: client.id,
					nombre,
					primer_apellido: normalizedRep.primer_apellido,
					segundo_apellido: normalizedRep.segundo_apellido || null,
					tipo_documento: normalizedRep.tipo_documento,
					numero_documento: normalizedRep.numero_documento,
					extension: normalizedRep.extension || null,
					is_primary: index === 0, // First one is primary
					cargo: normalizedRep.cargo || null,
					telefono: normalizedRep.telefono || null,
					correo_electronico: normalizedRep.correo_electronico || null,
				};
			});

			const { error: repsError } = await supabase.from("legal_representatives").insert(representatives);

			if (repsError) { await rollbackClient(client.id); throw repsError; }
		}

		// 3. Upload client documents
		await uploadClientDocuments(client.id, formData.documentos);

		// 4. Save extra phones
		if (formData.celulares_extra && formData.celulares_extra.length > 0) {
			await saveExtraPhones(client.id, formData.celulares_extra);
		}

		return client.id;
	};

	// ONG client submission
	const submitOngClient = async () => {
		const formData = ongForm.getValues();
		const normalized = normalizeOngClientData(formData);

		// 1. Insert into clients table
		const { data: client, error: clientError } = await supabase
			.from("clients")
			.insert({
				client_type: "ong",
				commercial_owner_id: currentUserId,
				status: "active",
				created_by: currentUserId,
			})
			.select()
			.single();

		if (clientError) throw clientError;

		// 2. Insert into ong_clients table
		const { error: ongError } = await supabase.from("ong_clients").insert({
			client_id: client.id,
			nombre_ong: normalized.nombre_ong,
			sigla: normalized.sigla || null,
			nit: normalized.nit || null,
			numero_registro_vipfe: normalized.numero_registro_vipfe || null,
			pais_origen: normalized.pais_origen,
			actividad_principal: normalized.actividad_principal || null,
			direccion: normalized.direccion,
			correo_electronico: normalized.correo_electronico || null,
			telefono: normalized.telefono || null,
			nombre_representante: normalized.nombre_representante,
			apellido_representante: normalized.apellido_representante,
			cargo_representante: normalized.cargo_representante,
			ci_representante: normalized.ci_representante,
			extension_ci_representante: normalized.extension_ci_representante || null,
		});

		if (ongError) { await rollbackClient(client.id); throw ongError; }

		// 3. Upload client documents
		await uploadClientDocuments(client.id, formData.documentos);

		// 4. Save extra phones
		if (formData.celulares_extra && formData.celulares_extra.length > 0) {
			await saveExtraPhones(client.id, formData.celulares_extra);
		}

		return client.id;
	};

	// Club deportivo client submission
	const submitClubClient = async () => {
		const formData = clubForm.getValues();
		const normalized = normalizeClubClientData(formData);

		// Check for duplicate registro (tipo_registro + entidad_registro + numero_registro)
		const { data: existingRegistro } = await supabase
			.from("club_clients")
			.select("nombre_club, sigla")
			.eq("tipo_registro", normalized.tipo_registro)
			.eq("entidad_registro", normalized.entidad_registro)
			.eq("numero_registro", normalized.numero_registro)
			.maybeSingle();

		if (existingRegistro) {
			const nombre = existingRegistro.sigla
				? `${existingRegistro.nombre_club} (${existingRegistro.sigla})`
				: existingRegistro.nombre_club;
			throw new Error(`Ya existe el club "${nombre}" con ese número de registro en la misma entidad emisora`);
		}

		// Check for duplicate NIT (when provided) — partial unique index in DB
		if (normalized.nit) {
			const { data: existingNit } = await supabase
				.from("club_clients")
				.select("nombre_club, sigla")
				.eq("nit", normalized.nit)
				.maybeSingle();

			if (existingNit) {
				const nombre = existingNit.sigla
					? `${existingNit.nombre_club} (${existingNit.sigla})`
					: existingNit.nombre_club;
				throw new Error(`Ya existe el club "${nombre}" con el NIT ${normalized.nit}`);
			}
		}

		// 1. Insert into clients table
		const { data: client, error: clientError } = await supabase
			.from("clients")
			.insert({
				client_type: "club",
				commercial_owner_id: currentUserId,
				status: "active",
				created_by: currentUserId,
			})
			.select()
			.single();

		if (clientError) throw clientError;

		// 2. Insert into club_clients table
		const { error: clubError } = await supabase.from("club_clients").insert({
			client_id: client.id,
			nombre_club: normalized.nombre_club,
			sigla: normalized.sigla || null,
			disciplina_principal: normalized.disciplina_principal,
			nit: normalized.nit || null,
			numero_registro_vipfe: normalized.numero_registro_vipfe || null,
			tipo_registro: normalized.tipo_registro,
			entidad_registro: normalized.entidad_registro,
			numero_registro: normalized.numero_registro,
			direccion: normalized.direccion,
			correo_electronico: normalized.correo_electronico || null,
			telefono: normalized.telefono || null,
			nombre_representante: normalized.nombre_representante,
			apellido_representante: normalized.apellido_representante,
			cargo_representante: normalized.cargo_representante,
			ci_representante: normalized.ci_representante,
			extension_ci_representante: normalized.extension_ci_representante || null,
		});

		if (clubError) { await rollbackClient(client.id); throw clubError; }

		// 3. Upload client documents
		await uploadClientDocuments(client.id, formData.documentos);

		// 4. Save extra phones
		if (formData.celulares_extra && formData.celulares_extra.length > 0) {
			await saveExtraPhones(client.id, formData.celulares_extra);
		}

		return client.id;
	};

	// Asociación Civil client submission
	const submitAsociacionCivilClient = async () => {
		const formData = asociacionCivilForm.getValues();
		const normalized = normalizeAsociacionCivilClientData(formData);

		// Check for duplicate personería (entidad + numero)
		const { data: existingPersoneria } = await supabase
			.from("asociacion_civil_clients")
			.select("nombre_asociacion, sigla")
			.eq("entidad_otorgante_personeria", normalized.entidad_otorgante_personeria)
			.eq("numero_personeria_juridica", normalized.numero_personeria_juridica)
			.maybeSingle();

		if (existingPersoneria) {
			const nombre = existingPersoneria.sigla
				? `${existingPersoneria.nombre_asociacion} (${existingPersoneria.sigla})`
				: existingPersoneria.nombre_asociacion;
			throw new Error(`Ya existe la asociación "${nombre}" con esa personería jurídica en la misma entidad otorgante`);
		}

		// Check for duplicate NIT (when provided)
		if (normalized.nit) {
			const { data: existingNit } = await supabase
				.from("asociacion_civil_clients")
				.select("nombre_asociacion, sigla")
				.eq("nit", normalized.nit)
				.maybeSingle();

			if (existingNit) {
				const nombre = existingNit.sigla
					? `${existingNit.nombre_asociacion} (${existingNit.sigla})`
					: existingNit.nombre_asociacion;
				throw new Error(`Ya existe la asociación "${nombre}" con el NIT ${normalized.nit}`);
			}
		}

		// 1. Insert into clients table
		const { data: client, error: clientError } = await supabase
			.from("clients")
			.insert({
				client_type: "asociacion_civil",
				commercial_owner_id: currentUserId,
				status: "active",
				created_by: currentUserId,
			})
			.select()
			.single();

		if (clientError) throw clientError;

		// 2. Insert into asociacion_civil_clients table
		const { error: asocError } = await supabase.from("asociacion_civil_clients").insert({
			client_id: client.id,
			nombre_asociacion: normalized.nombre_asociacion,
			sigla: normalized.sigla || null,
			tipo_asociacion: normalized.tipo_asociacion,
			rubro_actividad: normalized.rubro_actividad,
			nit: normalized.nit || null,
			numero_personeria_juridica: normalized.numero_personeria_juridica,
			entidad_otorgante_personeria: normalized.entidad_otorgante_personeria,
			direccion: normalized.direccion,
			correo_electronico: normalized.correo_electronico || null,
			telefono: normalized.telefono || null,
			nombre_representante: normalized.nombre_representante,
			apellido_representante: normalized.apellido_representante,
			cargo_representante: normalized.cargo_representante,
			ci_representante: normalized.ci_representante,
			extension_ci_representante: normalized.extension_ci_representante || null,
		});

		if (asocError) { await rollbackClient(client.id); throw asocError; }

		// 3. Upload client documents
		await uploadClientDocuments(client.id, formData.documentos);

		// 4. Save extra phones
		if (formData.celulares_extra && formData.celulares_extra.length > 0) {
			await saveExtraPhones(client.id, formData.celulares_extra);
		}

		return client.id;
	};

	// Validate required documents before saving
	const validateDocumentsBeforeSave = (
		documentos: ClienteDocumentoFormState[] | undefined,
		type: "natural" | "unipersonal" | "juridica" | "ong" | "club" | "asociacion_civil"
	): boolean => {
		const docs = documentos || [];
		const validation = validateClientDocuments(docs, type, docExceptions);

		if (!validation.hasAllRequired) {
			const nameMap: Record<string, string> = {
				documento_identidad: "CI (completo o anverso)",
				documento_identidad_reverso: "CI Reverso",
				certificacion_pep: "Certificación PEP",
				carta_nombramiento: "Carta de Nombramiento",
				formulario_kyc: "KYC",
				nit: "NIT",
				matricula_comercio: "Matrícula de Comercio",
				testimonio_constitucion: "Testimonio de Constitución Social",
				balance_estado_resultados: "Balance General",
				poder_representacion: "Poder de Representación",
				ci_representante_anverso: "CI Representante Legal",
				ci_representante_reverso: "CI Reverso Representante Legal",
				acreditacion_resolucion: "Acreditación/Resolución en Bolivia",
				poder_representante_mae: "Poder Representante Legal / MAE",
				ci_representante_mae: "CI Representante Legal o MAE",
				formulario_registro_ong: "Formulario de Registro de Clientes",
				registro_existencia_legal: "Registro de Existencia Legal",
				estatutos_o_reglamento: "Estatutos o Reglamento Interno",
				ci_representante_club: "CI Representante Legal",
				poder_representante_club: "Poder del Representante Legal",
				formulario_d_club: "Formulario D — Persona Jurídica",
				testimonio_constitucion_asociacion: "Escritura/Testimonio de Constitución",
				resolucion_personeria_juridica: "Resolución de Personería Jurídica",
				poder_representante_asociacion: "Poder del Representante Legal",
				ci_representante_asociacion: "CI del Representante Legal",
			};
			const missingNames = validation.missingDocuments.map((docType) => nameMap[docType] ?? docType);

			toast.error("Documentos obligatorios faltantes", {
				description: `Faltan: ${missingNames.join(", ")}`,
			});
			return false;
		}
		return true;
	};

	// Determine which documents were skipped using exceptions (for consumption)
	const getSkippedDocTypes = (
		documentos: ClienteDocumentoFormState[] | undefined,
		type: "natural" | "unipersonal" | "juridica" | "ong" | "club" | "asociacion_civil"
	): TipoDocumentoCliente[] => {
		const docs = documentos || [];
		const uploadedTypes = docs.map((d) => d.tipo_documento);
		const allRequired = REQUIRED_DOCUMENTS[type];
		// Documents that are required, not uploaded, but allowed because of exception
		return allRequired.filter(
			(docType) =>
				!uploadedTypes.includes(docType) &&
				docExceptions.includes(docType as TipoDocumentoCliente)
		) as TipoDocumentoCliente[];
	};

	// ---------------------------------------------------------------------------
	// Section-field mapping for sidebar validation feedback
	// ---------------------------------------------------------------------------
	const NATURAL_SECTION_FIELDS: string[][] = [
		[], // 0: Tipo de Cliente (always valid when clientType is set)
		["primer_nombre", "segundo_nombre", "primer_apellido", "segundo_apellido", "tipo_documento", "numero_documento", "extension_ci", "nacionalidad", "fecha_nacimiento", "estado_civil", "genero"],
		["direccion", "correo_electronico", "celular"],
		["profesion_oficio", "actividad_economica", "lugar_trabajo", "pais_residencia", "nivel_ingresos", "cargo", "anio_ingreso", "nit", "domicilio_comercial"],
		[], // 4: Documentos (validated separately)
	];

	const UNIPERSONAL_SECTION_FIELDS: string[][] = [
		[], // 0: Tipo de Cliente
		// Sidebar "Datos Personales" groups form sections: Datos Personales + Otros Datos Personales
		["primer_nombre", "segundo_nombre", "primer_apellido", "segundo_apellido", "tipo_documento", "numero_documento", "extension_ci", "nacionalidad", "fecha_nacimiento", "estado_civil", "genero", "profesion_oficio", "actividad_economica", "lugar_trabajo", "pais_residencia", "cargo", "anio_ingreso"],
		["direccion", "correo_electronico", "celular"],
		["razon_social", "nit", "matricula_comercio", "domicilio_comercial", "telefono_comercial", "actividad_economica_comercial", "nivel_ingresos", "correo_electronico_comercial"],
		["nombre_representante", "ci_representante", "extension_representante"],
		[], // 5: Documentos
	];

	const JURIDIC_SECTION_FIELDS: string[][] = [
		[], // 0: Tipo de Cliente
		["razon_social", "tipo_sociedad", "tipo_documento", "nit", "matricula_comercio", "pais_constitucion", "actividad_economica"],
		["direccion_legal", "correo_electronico", "telefono"],
		["legal_representatives"],
		[], // 4: Documentos
	];

	const ONG_SECTION_FIELDS: string[][] = [
		[], // 0: Tipo de Cliente
		["nombre_ong", "sigla", "nit", "numero_registro_vipfe", "pais_origen", "actividad_principal"],
		["direccion", "correo_electronico", "telefono"],
		["nombre_representante", "apellido_representante", "cargo_representante", "ci_representante"],
		[], // 4: Documentos
	];

	const CLUB_SECTION_FIELDS: string[][] = [
		[], // 0: Tipo de Cliente
		["nombre_club", "sigla", "disciplina_principal", "nit", "numero_registro_vipfe", "tipo_registro", "entidad_registro", "numero_registro"],
		["direccion", "correo_electronico", "telefono"],
		["nombre_representante", "apellido_representante", "cargo_representante", "ci_representante"],
		[], // 4: Documentos
	];

	const ASOCIACION_CIVIL_SECTION_FIELDS: string[][] = [
		[], // 0: Tipo de Cliente
		["nombre_asociacion", "sigla", "tipo_asociacion", "rubro_actividad", "nit", "numero_personeria_juridica", "entidad_otorgante_personeria"],
		["direccion", "correo_electronico", "telefono"],
		["nombre_representante", "apellido_representante", "cargo_representante", "ci_representante"],
		[], // 4: Documentos
	];

	/** Compute per-section validity from form errors after trigger(). */
	const computeSectionValidity = (
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		errors: Record<string, any>,
		sectionFields: string[][],
	): boolean[] => {
		const errorKeys = new Set(Object.keys(errors));
		return sectionFields.map((fields, i) => {
			if (i === 0) return clientType !== null; // Tipo de Cliente
			if (fields.length === 0) return true; // Documentos checked separately
			return !fields.some((f) => errorKeys.has(f));
		});
	};

	// Handle form submission
	const handleSubmit = async () => {
		setIsSaving(true);
		let createdClientId: string | undefined;

		try {
			if (clientType === "natural") {
				const isValid = await naturalForm.trigger();
				const sectionResults = computeSectionValidity(naturalForm.formState.errors, NATURAL_SECTION_FIELDS);
				setValidatedSections(sectionResults);
				if (!isValid) {
					const fields = getErrorFieldLabels(naturalForm.formState.errors);
					toast.error("Campos incompletos o inválidos", {
						description: fields.length > 0 ? `Revisar: ${fields.join(", ")}` : "Por favor complete todos los campos requeridos",
					});
					setIsSaving(false);
					return;
				}

				// Validate required documents
				if (!validateDocumentsBeforeSave(naturalForm.getValues().documentos, "natural")) {
					setValidatedSections(prev => { const copy = [...prev]; copy[copy.length - 1] = false; return copy; });
					setIsSaving(false);
					return;
				}

				createdClientId = await submitNaturalClient();
				toast.success("Cliente natural creado exitosamente");
			} else if (clientType === "unipersonal") {
				// Pre-populate owner fields (auto-filled from personal data, no visible inputs)
				// so Zod validation does not reject them as empty.
				const personal = unipersonalForm.getValues();
				const nombrePropietario = [personal.primer_nombre, personal.segundo_nombre].filter(Boolean).join(" ");
				const apellidoPropietario = [personal.primer_apellido, personal.segundo_apellido].filter(Boolean).join(" ");
				unipersonalForm.setValue("nombre_propietario", nombrePropietario);
				unipersonalForm.setValue("apellido_propietario", apellidoPropietario);
				unipersonalForm.setValue("documento_propietario", (personal.numero_documento ?? "").replace(/\D/g, ""));
				unipersonalForm.setValue("nacionalidad_propietario", personal.nacionalidad ?? "");

				const isValid = await unipersonalForm.trigger();
				const sectionResults = computeSectionValidity(unipersonalForm.formState.errors, UNIPERSONAL_SECTION_FIELDS);
				setValidatedSections(sectionResults);
				if (!isValid) {
					const fields = getErrorFieldLabels(unipersonalForm.formState.errors);
					toast.error("Campos incompletos o inválidos", {
						description: fields.length > 0 ? `Revisar: ${fields.join(", ")}` : "Por favor complete todos los campos requeridos",
					});
					setIsSaving(false);
					return;
				}

				// Validate required documents
				if (!validateDocumentsBeforeSave(unipersonalForm.getValues().documentos, "unipersonal")) {
					setValidatedSections(prev => { const copy = [...prev]; copy[copy.length - 1] = false; return copy; });
					setIsSaving(false);
					return;
				}

				createdClientId = await submitUnipersonalClient();
				toast.success("Cliente unipersonal creado exitosamente");
			} else if (clientType === "juridica") {
				const isValid = await juridicForm.trigger();
				const sectionResults = computeSectionValidity(juridicForm.formState.errors, JURIDIC_SECTION_FIELDS);
				setValidatedSections(sectionResults);
				if (!isValid) {
					const fields = getErrorFieldLabels(juridicForm.formState.errors);
					toast.error("Campos incompletos o inválidos", {
						description: fields.length > 0 ? `Revisar: ${fields.join(", ")}` : "Por favor complete todos los campos requeridos",
					});
					setIsSaving(false);
					return;
				}

				// Validate required documents
				if (!validateDocumentsBeforeSave(juridicForm.getValues().documentos, "juridica")) {
					setValidatedSections(prev => { const copy = [...prev]; copy[copy.length - 1] = false; return copy; });
					setIsSaving(false);
					return;
				}

				createdClientId = await submitJuridicClient();
				toast.success("Cliente jurídico creado exitosamente");
			} else if (clientType === "ong") {
				const isValid = await ongForm.trigger();
				const sectionResults = computeSectionValidity(ongForm.formState.errors, ONG_SECTION_FIELDS);
				setValidatedSections(sectionResults);
				if (!isValid) {
					const fields = getErrorFieldLabels(ongForm.formState.errors);
					toast.error("Campos incompletos o inválidos", {
						description: fields.length > 0 ? `Revisar: ${fields.join(", ")}` : "Por favor complete todos los campos requeridos",
					});
					setIsSaving(false);
					return;
				}

				// Validate required documents
				if (!validateDocumentsBeforeSave(ongForm.getValues().documentos, "ong")) {
					setValidatedSections(prev => { const copy = [...prev]; copy[copy.length - 1] = false; return copy; });
					setIsSaving(false);
					return;
				}

				createdClientId = await submitOngClient();
				toast.success("ONG registrada exitosamente");
			} else if (clientType === "club") {
				const isValid = await clubForm.trigger();
				const sectionResults = computeSectionValidity(clubForm.formState.errors, CLUB_SECTION_FIELDS);
				setValidatedSections(sectionResults);
				if (!isValid) {
					const fields = getErrorFieldLabels(clubForm.formState.errors);
					toast.error("Campos incompletos o inválidos", {
						description: fields.length > 0 ? `Revisar: ${fields.join(", ")}` : "Por favor complete todos los campos requeridos",
					});
					setIsSaving(false);
					return;
				}

				// Validate required documents
				if (!validateDocumentsBeforeSave(clubForm.getValues().documentos, "club")) {
					setValidatedSections(prev => { const copy = [...prev]; copy[copy.length - 1] = false; return copy; });
					setIsSaving(false);
					return;
				}

				createdClientId = await submitClubClient();
				toast.success("Club deportivo registrado exitosamente");
			} else if (clientType === "asociacion_civil") {
				const isValid = await asociacionCivilForm.trigger();
				const sectionResults = computeSectionValidity(asociacionCivilForm.formState.errors, ASOCIACION_CIVIL_SECTION_FIELDS);
				setValidatedSections(sectionResults);
				if (!isValid) {
					const fields = getErrorFieldLabels(asociacionCivilForm.formState.errors);
					toast.error("Campos incompletos o inválidos", {
						description: fields.length > 0 ? `Revisar: ${fields.join(", ")}` : "Por favor complete todos los campos requeridos",
					});
					setIsSaving(false);
					return;
				}

				// Validate required documents
				if (!validateDocumentsBeforeSave(asociacionCivilForm.getValues().documentos, "asociacion_civil")) {
					setValidatedSections(prev => { const copy = [...prev]; copy[copy.length - 1] = false; return copy; });
					setIsSaving(false);
					return;
				}

				createdClientId = await submitAsociacionCivilClient();
				toast.success("Asociación civil registrada exitosamente");
			}

			// Consume used exceptions (if any documents were skipped)
			if (createdClientId && clientType && docExceptions.length > 0) {
				const formData = clientType === "natural"
					? naturalForm.getValues()
					: clientType === "unipersonal"
						? unipersonalForm.getValues()
						: clientType === "ong"
							? ongForm.getValues()
							: clientType === "club"
								? clubForm.getValues()
								: clientType === "asociacion_civil"
									? asociacionCivilForm.getValues()
									: juridicForm.getValues();
				const skipped = getSkippedDocTypes(formData.documentos, clientType);
				if (skipped.length > 0) {
					await consumirExcepciones(skipped, createdClientId);
				}
			}

			clearDraft();
			router.push("/clientes");
		} catch (error: unknown) {
			console.error("Error saving client:", error);
			// Capturar en Sentry cualquier error al guardar un cliente nuevo.
			Sentry.captureException(error, { tags: { feature: "guardar-cliente", action: "crear" } });
			let errorMessage = "Error al guardar el cliente";
			let errorDetail: string | undefined;
			if (error instanceof Error) {
				errorMessage = error.message;
			} else if (error && typeof error === "object" && "message" in error) {
				// Supabase PostgrestError: has message, details, hint, code
				const pgError = error as Record<string, unknown>;
				const code = String(pgError.code ?? "");
				if (code === "23505") {
					// Unique constraint violation — determine which field
					const constraint = String(pgError.message ?? "");
					if (constraint.includes("documento")) {
						errorMessage = "Ya existe un cliente con ese número de documento";
					} else if (constraint.includes("email")) {
						errorMessage = "Ya existe un cliente con ese correo electrónico";
					} else if (constraint.includes("nit")) {
						errorMessage = "Ya existe una empresa con ese NIT";
					} else {
						errorMessage = "Ya existe un registro con esos datos";
					}
				} else if (code === "23514") {
					// Check constraint violation — provide user-friendly message
					const constraint = String(pgError.message ?? "");
					if (constraint.includes("tipo_documento")) {
						errorMessage = "El tipo de documento seleccionado no es válido";
						errorDetail = "Valores permitidos: CI, Pasaporte, CEX. Contacte al administrador si el problema persiste.";
					} else if (constraint.includes("estado_civil")) {
						errorMessage = "El estado civil seleccionado no es válido";
					} else if (constraint.includes("genero")) {
						errorMessage = "El género seleccionado no es válido";
					} else {
						errorMessage = "Uno de los valores ingresados no es válido";
						errorDetail = "Verifique los campos del formulario e intente nuevamente.";
					}
				} else {
					errorMessage = String(pgError.message);
					const detail = pgError.details;
					const hint = pgError.hint;
					if (detail) errorDetail = String(detail);
					else if (hint) errorDetail = String(hint);
				}
			}
			toast.error(errorMessage, { description: errorDetail });
		} finally {
			setIsSaving(false);
		}
	};

	if (isLoading) {
		return (
			<div className="container mx-auto py-8">
				<div className="flex items-center justify-center h-64">
					<p className="text-muted-foreground">Cargando...</p>
				</div>
			</div>
		);
	}

	// Sidebar sections per client type
	const sidebarSections: { label: string; detail?: string }[] = clientType === "natural"
		? [
			{ label: "Tipo de Cliente", detail: "Persona Natural" },
			{ label: "Datos Personales" },
			{ label: "Información de Contacto" },
			{ label: "Otros Datos" },
			{ label: "Documentos" },
		]
		: clientType === "unipersonal"
		? [
			{ label: "Tipo de Cliente", detail: "Unipersonal" },
			{ label: "Datos Personales" },
			{ label: "Información de Contacto" },
			{ label: "Datos Comerciales" },
			{ label: "Representante Legal" },
			{ label: "Documentos" },
		]
		: clientType === "juridica"
		? [
			{ label: "Tipo de Cliente", detail: "Persona Jurídica" },
			{ label: "Datos de la Empresa" },
			{ label: "Información de Contacto" },
			{ label: "Representantes Legales" },
			{ label: "Documentos" },
		]
		: clientType === "ong"
		? [
			{ label: "Tipo de Cliente", detail: "ONG" },
			{ label: "Datos de la ONG" },
			{ label: "Información de Contacto" },
			{ label: "Representante / MAE" },
			{ label: "Documentos" },
		]
		: clientType === "club"
		? [
			{ label: "Tipo de Cliente", detail: "Club Deportivo" },
			{ label: "Datos del Club" },
			{ label: "Información de Contacto" },
			{ label: "Representante Legal" },
			{ label: "Documentos" },
		]
		: clientType === "asociacion_civil"
		? [
			{ label: "Tipo de Cliente", detail: "Asociación Civil" },
			{ label: "Datos de la Asociación" },
			{ label: "Información de Contacto" },
			{ label: "Representante Legal" },
			{ label: "Documentos" },
		]
		: [{ label: "Tipo de Cliente" }];

	return (
		<div className="max-w-7xl mx-auto pt-6">
			{/* Sticky header */}
			<div className="sticky top-0 z-20 bg-[#F1F4F9] border-b border-[#E2E8F0] -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 pt-4 pb-4 mb-6">
				<div className="flex items-center justify-between gap-4 max-w-7xl mx-auto">
					<div className="flex items-center gap-3 min-w-0">
						<button
							onClick={() => router.push("/clientes")}
							className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors shrink-0"
						>
							<ChevronLeft className="h-4 w-4" />
							Clientes
						</button>
						<span className="text-[#CBD5E1]">/</span>
						<Users className="h-6 w-6 text-primary shrink-0" />
						<div className="min-w-0">
							<h1 className="text-xl font-semibold text-foreground leading-tight">
								Agregar Nuevo Cliente
							</h1>
							<p className="text-sm text-muted-foreground leading-tight">
								{clientType
									? clientType === "natural"
										? "Persona Natural"
										: clientType === "unipersonal"
										? "Unipersonal"
										: clientType === "ong"
										? "ONG"
										: clientType === "club"
										? "Club Deportivo"
										: clientType === "asociacion_civil"
										? "Asociación Civil"
										: "Persona Jurídica"
									: "Seleccione el tipo de cliente"}
							</p>
						</div>
					</div>
					<div className="flex items-center gap-2 shrink-0">
						<Button variant="ghost" size="sm" onClick={handleCancel} disabled={isSaving} className="text-muted-foreground hover:text-destructive hover:bg-destructive/8">
							<X className="h-4 w-4 mr-1.5" />
							Cancelar
						</Button>
						{clientType && (
							<Button onClick={handleSubmit} disabled={isSaving} size="sm">
								<Save className="h-4 w-4 mr-1.5" />
								{isSaving ? "Guardando..." : "Guardar Cliente"}
							</Button>
						)}
					</div>
				</div>
			</div>

			{/* Two-column layout */}
			<div className="flex gap-8 items-start">
				{/* Sidebar */}
				<aside className="hidden lg:block w-52 shrink-0 sticky top-[81px] self-start">
					<div className="bg-card rounded-lg border border-border shadow-sm overflow-hidden">
						<div className="px-4 py-3 border-b border-border">
							<p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
								Secciones
							</p>
						</div>
						<div className="p-3 space-y-0.5">
							{sidebarSections.map((section, i) => {
								const isFirst = i === 0;
								const hasValidation = validatedSections.length > 0;
								const isCompleted = hasValidation
									? validatedSections[i] === true
									: isFirst && clientType !== null;
								const hasFailed = hasValidation && validatedSections[i] === false;
								const isPending = !isFirst && clientType !== null && !isCompleted && !hasFailed;
								const isActive = isFirst && clientType === null;
								return (
									<div key={i} className="relative">
										{i < sidebarSections.length - 1 && (
											<div className={`absolute left-[15px] top-8 w-px h-3 ${isCompleted ? "bg-[#0D9488]/40" : hasFailed ? "bg-rose-300" : "bg-border"}`} />
										)}
										<div className={`flex items-start gap-2.5 px-2 py-2 rounded-md ${isCompleted || isActive ? "bg-primary/8" : hasFailed ? "bg-rose-50" : ""}`}>
											<div className={`w-[22px] h-[22px] shrink-0 rounded-md flex items-center justify-center text-xs font-semibold mt-0.5 transition-colors ${
												isCompleted ? "bg-[#0D9488] text-white"
											: hasFailed ? "bg-rose-500 text-white"
											: isActive ? "bg-primary text-primary-foreground"
											: isPending ? "bg-primary/10 text-primary border border-primary/25"
											: "border-2 border-border text-muted-foreground"
											}`}>
												{isCompleted ? <Check className="h-3 w-3" /> : hasFailed ? "!" : i + 1}
											</div>
											<div className="flex-1 min-w-0">
												<p className={`text-sm font-medium leading-tight ${isCompleted || isActive ? "text-primary" : hasFailed ? "text-rose-700" : isPending ? "text-foreground" : "text-muted-foreground"}`}>
													{section.label}
												</p>
												{section.detail && isCompleted && (
													<p className="text-xs text-muted-foreground truncate mt-0.5 leading-tight">
														{section.detail}
													</p>
												)}
											</div>
										</div>
									</div>
								);
							})}
						</div>
					</div>
				</aside>

				{/* Main content */}
				<div className="flex-1 min-w-0 space-y-6">
					{/* Client Type Selector */}
					<ClientTypeSelector selectedType={clientType} onSelect={handleClientTypeSelect} />

					{/* Form Content */}
					{clientType === "natural" && (
						<>
							{duplicadoDocumento && (
								<DuplicadoBanner
									duplicado={duplicadoDocumento}
									tipo="documento"
								/>
							)}
							<NaturalClientForm form={naturalForm} partnerForm={partnerForm} onFieldBlur={handleAutoSave} exceptions={docExceptions} />
						</>
					)}

					{clientType === "unipersonal" && (
						<>
							{duplicadoDocumento && (
								<DuplicadoBanner
									duplicado={duplicadoDocumento}
									tipo="documento"
								/>
							)}
							{duplicadoNit && (
								<DuplicadoBanner
									duplicado={duplicadoNit}
									tipo="nit"
								/>
							)}
							<UnipersonalClientForm
								form={unipersonalForm}
								partnerForm={partnerForm}
								onFieldBlur={handleAutoSave}
								exceptions={docExceptions}
							/>
						</>
					)}

					{clientType === "juridica" && (
						<>
							{duplicadoNit && (
								<DuplicadoBanner
									duplicado={duplicadoNit}
									tipo="nit"
								/>
							)}
							<JuridicClientForm form={juridicForm} onFieldBlur={handleAutoSave} exceptions={docExceptions} />
						</>
					)}

					{clientType === "ong" && (
						<OngClientForm form={ongForm} onFieldBlur={handleAutoSave} exceptions={docExceptions} />
					)}

					{clientType === "club" && (
						<>
							{duplicadoRegistroClub && (
								<DuplicadoBanner
									duplicado={duplicadoRegistroClub}
									tipo="registroClub"
								/>
							)}
							{duplicadoNit && (
								<DuplicadoBanner
									duplicado={duplicadoNit}
									tipo="nit"
								/>
							)}
							<ClubClientForm form={clubForm} onFieldBlur={handleAutoSave} exceptions={docExceptions} />
						</>
					)}

					{clientType === "asociacion_civil" && (
						<>
							{duplicadoPersoneriaAsoc && (
								<DuplicadoBanner
									duplicado={duplicadoPersoneriaAsoc}
									tipo="personeriaAsoc"
								/>
							)}
							{duplicadoNit && (
								<DuplicadoBanner
									duplicado={duplicadoNit}
									tipo="nit"
								/>
							)}
							<AsociacionCivilClientForm form={asociacionCivilForm} onFieldBlur={handleAutoSave} exceptions={docExceptions} />
						</>
					)}
				</div>
			</div>
		</div>
	);
}

// ---------------------------------------------------------------------------
// DuplicadoBanner — alerta temprana cuando el documento/NIT/registro ya existe
// ---------------------------------------------------------------------------
type DuplicadoBannerProps =
	| { duplicado: VerificarDocumentoResult; tipo: "documento" }
	| { duplicado: VerificarNitResult; tipo: "nit" }
	| { duplicado: VerificarRegistroClubResult; tipo: "registroClub" }
	| { duplicado: VerificarPersoneriaAsociacionResult; tipo: "personeriaAsoc" };

function DuplicadoBanner({ duplicado, tipo }: DuplicadoBannerProps) {
	if (!duplicado.existe) return null;

	const titulo =
		tipo === "nit" ? "NIT ya registrado"
		: tipo === "registroClub" ? "Club ya registrado"
		: tipo === "personeriaAsoc" ? "Asociación ya registrada"
		: "Documento ya registrado";

	const detalle =
		tipo === "nit" ? "NIT"
		: tipo === "registroClub" ? "número de registro en la misma entidad emisora"
		: tipo === "personeriaAsoc" ? "número de personería jurídica en la misma entidad otorgante"
		: "documento";

	return (
		<div className="flex gap-3 p-4 rounded-lg border border-amber-200 bg-amber-50 text-amber-900">
			<AlertTriangle className="h-5 w-5 shrink-0 mt-0.5 text-amber-600" />
			<div className="text-sm space-y-1">
				<p className="font-medium">{titulo}</p>
				<p>
					Ya existe <span className="font-semibold">{duplicado.nombre}</span> con este{" "}
					{detalle} en el sistema.
					Para crear una póliza, búscalo desde el módulo de Pólizas.
				</p>
			</div>
		</div>
	);
}
