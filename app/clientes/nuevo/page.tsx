"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import {
	ClientType,
	NaturalClientFormData,
	UnipersonalClientFormData,
	JuridicClientFormData,
	ClientPartnerData,
	naturalClientFormSchema,
	unipersonalClientFormSchema,
	juridicClientFormSchema,
	clientPartnerSchema,
	ClientFormState,
} from "@/types/clientForm";
import type { ClienteDocumentoFormState } from "@/types/clienteDocumento";
import { generateStoragePath } from "@/types/clienteDocumento";
import {
	normalizeNaturalClientData,
	normalizeUnipersonalClientData,
	normalizeJuridicClientData,
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
import { FormProgressBar } from "@/components/clientes/FormProgressBar";
import { ClientTypeSelector } from "@/components/clientes/ClientTypeSelector";
import { NaturalClientForm } from "@/components/clientes/NaturalClientForm";
import { UnipersonalClientForm } from "@/components/clientes/UnipersonalClientForm";
import { JuridicClientForm } from "@/components/clientes/JuridicClientForm";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, Save, X } from "lucide-react";
import { createClient } from "@/utils/supabase/client";

export default function NuevoClientePage() {
	const router = useRouter();
	const supabase = createClient();

	const [clientType, setClientType] = useState<ClientType | null>(null);
	const [isLoading, setIsLoading] = useState(true);
	const [isSaving, setIsSaving] = useState(false);
	const [currentUserId, setCurrentUserId] = useState<string | null>(null);

	// Natural client form
	const naturalForm = useForm<NaturalClientFormData>({
		resolver: zodResolver(naturalClientFormSchema),
		mode: "onBlur",
	});

	// Partner form (for natural clients when estado_civil = 'casado')
	const partnerForm = useForm<ClientPartnerData>({
		resolver: zodResolver(clientPartnerSchema),
		mode: "onBlur",
	});

	// Unipersonal client form
	const unipersonalForm = useForm<UnipersonalClientFormData>({
		resolver: zodResolver(unipersonalClientFormSchema),
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
		}

		saveDraft(formState);
	};

	// Handle client type selection
	const handleClientTypeSelect = (type: ClientType) => {
		setClientType(type);
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

	// Natural client submission
	const submitNaturalClient = async () => {
		const formData = naturalForm.getValues();
		const normalized = normalizeNaturalClientData(formData);

		// Validate and convert required date fields before submission
		if (!normalized.fecha_nacimiento || typeof normalized.fecha_nacimiento !== "string") {
			throw new Error("Fecha de nacimiento es requerida");
		}

		// Validate fecha_nacimiento format (YYYY-MM-DD)
		if (!/^\d{4}-\d{2}-\d{2}$/.test(normalized.fecha_nacimiento)) {
			throw new Error("Fecha de nacimiento inválida");
		}

		// Keep anio_ingreso as YYYY-MM-DD string or null (PostgreSQL date type expects this format)
		const anioIngreso =
			normalized.anio_ingreso && normalized.anio_ingreso.trim() !== "" ? normalized.anio_ingreso : null;

		// 1. Insert into clients table
		const { data: client, error: clientError } = await supabase
			.from("clients")
			.insert({
				client_type: "natural",
				executive_in_charge: normalized.executive_in_charge,
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
			anio_ingreso: anioIngreso, // Already in YYYY-MM-DD format or null
			nit: normalized.nit || null,
			domicilio_comercial: normalized.domicilio_comercial || null,
		});

		if (naturalError) throw naturalError;

		// 3. If married, insert partner data
		if (normalized.estado_civil === "casado") {
			const partnerData = partnerForm.getValues();
			if (partnerData && partnerData.primer_nombre) {
				const normalizedPartner = normalizePartnerData(partnerData);

				const { error: partnerError } = await supabase.from("client_partners").insert({
					client_id: client.id,
					primer_nombre: normalizedPartner.primer_nombre,
					segundo_nombre: normalizedPartner.segundo_nombre || null,
					primer_apellido: normalizedPartner.primer_apellido,
					segundo_apellido: normalizedPartner.segundo_apellido || null,
					direccion: normalizedPartner.direccion,
					celular: normalizedPartner.celular,
					correo_electronico: normalizedPartner.correo_electronico,
					profesion_oficio: normalizedPartner.profesion_oficio,
					actividad_economica: normalizedPartner.actividad_economica,
					lugar_trabajo: normalizedPartner.lugar_trabajo,
				});

				if (partnerError) throw partnerError;
			}
		}

		// 4. Upload client documents
		await uploadClientDocuments(client.id, formData.documentos);

		return client.id;
	};

	// Unipersonal client submission (3 tables)
	const submitUnipersonalClient = async () => {
		const formData = unipersonalForm.getValues();
		const normalized = normalizeUnipersonalClientData(formData);

		// Validate and convert required date fields before submission
		if (!normalized.fecha_nacimiento || typeof normalized.fecha_nacimiento !== "string") {
			throw new Error("Fecha de nacimiento es requerida");
		}

		// Validate fecha_nacimiento format (YYYY-MM-DD)
		if (!/^\d{4}-\d{2}-\d{2}$/.test(normalized.fecha_nacimiento)) {
			throw new Error("Fecha de nacimiento inválida");
		}

		// Keep anio_ingreso as YYYY-MM-DD string or null (PostgreSQL date type expects this format)
		const anioIngreso =
			normalized.anio_ingreso && normalized.anio_ingreso.trim() !== "" ? normalized.anio_ingreso : null;

		// 1. Insert into clients table
		const { data: client, error: clientError } = await supabase
			.from("clients")
			.insert({
				client_type: "unipersonal",
				executive_in_charge: normalized.executive_in_charge,
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
			anio_ingreso: anioIngreso, // Already in YYYY-MM-DD format or null
			nit: normalized.nit || null,
			domicilio_comercial: normalized.domicilio_comercial || null,
		});

		if (naturalError) throw naturalError;

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

		if (unipersonalError) throw unipersonalError;

		// 4. If married, insert partner data
		if (normalized.estado_civil === "casado") {
			const partnerData = partnerForm.getValues();
			if (partnerData && partnerData.primer_nombre) {
				const normalizedPartner = normalizePartnerData(partnerData);

				const { error: partnerError } = await supabase.from("client_partners").insert({
					client_id: client.id,
					primer_nombre: normalizedPartner.primer_nombre,
					segundo_nombre: normalizedPartner.segundo_nombre || null,
					primer_apellido: normalizedPartner.primer_apellido,
					segundo_apellido: normalizedPartner.segundo_apellido || null,
					direccion: normalizedPartner.direccion,
					celular: normalizedPartner.celular,
					correo_electronico: normalizedPartner.correo_electronico,
					profesion_oficio: normalizedPartner.profesion_oficio,
					actividad_economica: normalizedPartner.actividad_economica,
					lugar_trabajo: normalizedPartner.lugar_trabajo,
				});

				if (partnerError) throw partnerError;
			}
		}

		// 5. Upload client documents
		await uploadClientDocuments(client.id, formData.documentos);

		return client.id;
	};

	// Juridic client submission
	const submitJuridicClient = async () => {
		const formData = juridicForm.getValues();
		const normalized = normalizeJuridicClientData(formData);

		// 1. Insert into clients table
		const { data: client, error: clientError } = await supabase
			.from("clients")
			.insert({
				client_type: "juridica",
				executive_in_charge: normalized.executive_in_charge,
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

		if (juridicError) throw juridicError;

		// 3. Insert legal representatives
		if (formData.legal_representatives && formData.legal_representatives.length > 0) {
			const representatives = formData.legal_representatives.map((rep, index) => {
				const normalizedRep = normalizeLegalRepresentativeData(rep);
				return {
					juridic_client_id: client.id,
					primer_nombre: normalizedRep.primer_nombre,
					segundo_nombre: normalizedRep.segundo_nombre || null,
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

			if (repsError) throw repsError;
		}

		// 3. Upload client documents
		await uploadClientDocuments(client.id, formData.documentos);

		return client.id;
	};

	// Handle form submission
	const handleSubmit = async () => {
		setIsSaving(true);

		try {
			if (clientType === "natural") {
				const isValid = await naturalForm.trigger();
				if (!isValid) {
					toast.error("Por favor complete todos los campos requeridos");
					setIsSaving(false);
					return;
				}

				await submitNaturalClient();
				toast.success("Cliente natural creado exitosamente");
			} else if (clientType === "unipersonal") {
				const isValid = await unipersonalForm.trigger();
				if (!isValid) {
					toast.error("Por favor complete todos los campos requeridos");
					setIsSaving(false);
					return;
				}

				await submitUnipersonalClient();
				toast.success("Cliente unipersonal creado exitosamente");
			} else if (clientType === "juridica") {
				const isValid = await juridicForm.trigger();
				if (!isValid) {
					toast.error("Por favor complete todos los campos requeridos");
					setIsSaving(false);
					return;
				}

				await submitJuridicClient();
				toast.success("Cliente jurídico creado exitosamente");
			}

			clearDraft();
			router.push("/clientes");
		} catch (error: unknown) {
			console.error("Error saving client:", error);
			const errorMessage = error instanceof Error ? error.message : "Error al guardar el cliente";
			toast.error(errorMessage);
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

	return (
		<div className="container mx-auto py-8 max-w-5xl">
			{/* Header */}
			<div className="flex items-center justify-between mb-6">
				<div className="flex items-center gap-4">
					<Button variant="ghost" size="sm" onClick={() => router.push("/clientes")}>
						<ArrowLeft className="h-4 w-4 mr-2" />
						Volver
					</Button>
					<h1 className="text-3xl font-bold">Agregar Nuevo Cliente</h1>
				</div>
			</div>

			{/* Progress Bar */}
			<FormProgressBar currentStep={clientType ? 2 : 1} clientType={clientType} completedSections={{}} />

			{/* Client Type Selector */}
			<ClientTypeSelector selectedType={clientType} onSelect={handleClientTypeSelect} />

			{/* Form Content */}
			{clientType === "natural" && (
				<div className="mt-6">
					<NaturalClientForm form={naturalForm} partnerForm={partnerForm} onFieldBlur={handleAutoSave} />
				</div>
			)}

			{clientType === "unipersonal" && (
				<div className="mt-6">
					<UnipersonalClientForm
						form={unipersonalForm}
						partnerForm={partnerForm}
						onFieldBlur={handleAutoSave}
					/>
				</div>
			)}

			{clientType === "juridica" && (
				<div className="mt-6">
					<JuridicClientForm form={juridicForm} onFieldBlur={handleAutoSave} />
				</div>
			)}

			{/* Action Buttons */}
			{clientType && (
				<Card className="mt-8 p-6">
					<div className="flex items-center justify-between">
						<Button variant="outline" onClick={handleCancel} disabled={isSaving}>
							<X className="h-4 w-4 mr-2" />
							Cancelar
						</Button>
						<Button onClick={handleSubmit} disabled={isSaving} className="bg-blue-500 hover:bg-blue-600">
							<Save className="h-4 w-4 mr-2" />
							{isSaving ? "Guardando..." : "Guardar Cliente"}
						</Button>
					</div>
				</Card>
			)}
		</div>
	);
}
