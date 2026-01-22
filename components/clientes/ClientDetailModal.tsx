"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
	X,
	User,
	Building2,
	FileText,
	Briefcase,
	Phone,
	Mail,
	MapPin,
	Download,
	Pencil,
	Save,
	XCircle,
	Loader2,
	Shield,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getClientDetailsComplete, type ClienteDetalleCompleto } from "@/app/clientes/detail-actions";
import { formatFileSize, getDocumentTypesForClientType, type ClienteDocumento } from "@/types/clienteDocumento";
import type { NaturalClient, JuridicClient, UnipersonalClient } from "@/types/database/client";
import { checkEditPermission } from "@/app/clientes/permisos/actions";
import { updateNaturalClient, updateJuridicClient, updateUnipersonalClient } from "@/app/clientes/editar/actions";
import { ClientPermissionsPanel } from "./ClientPermissionsPanel";
import type { PermissionCheckResult } from "@/types/clientPermission";
import { CIVIL_STATUS, DOCUMENT_TYPES, GENDER_OPTIONS, COMPANY_TYPES } from "@/types/clientForm";

// Additional types from detail-actions
type PartnerData = {
	id: string;
	client_id: string;
	primer_nombre: string;
	segundo_nombre: string | null;
	primer_apellido: string;
	segundo_apellido: string | null;
	tipo_documento: string;
	numero_documento: string;
	fecha_nacimiento: string;
	nacionalidad: string;
	direccion: string;
	celular: string;
	correo_electronico: string;
	profesion_oficio: string | null;
	actividad_economica: string | null;
	lugar_trabajo: string | null;
	created_at: string;
	updated_at: string;
};

type LegalRepresentative = {
	id: string;
	juridic_client_id: string;
	nombre_completo: string;
	primer_nombre: string;
	segundo_nombre: string | null;
	primer_apellido: string;
	segundo_apellido: string | null;
	tipo_documento: string;
	numero_documento: string;
	extension: string | null;
	cargo: string;
	telefono: string | null;
	correo_electronico: string | null;
	is_primary: boolean;
	created_at: string;
	updated_at: string;
};

type PolicyData = {
	id: string;
	numero_poliza: string;
	ramo: string;
	estado: string;
	inicio_vigencia: string;
	fin_vigencia: string;
	prima_total: number;
	moneda: string;
	companias_aseguradoras: { nombre: string } | null;
};

type Props = {
	clientId: string;
	onClose: () => void;
};

export function ClientDetailModal({ clientId, onClose }: Props) {
	const [client, setClient] = useState<ClienteDetalleCompleto | null>(null);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	// Edit mode state
	const [permission, setPermission] = useState<PermissionCheckResult | null>(null);
	const [isEditMode, setIsEditMode] = useState(false);
	const [isSaving, setIsSaving] = useState(false);
	const [saveError, setSaveError] = useState<string | null>(null);

	// Editable form data (copy of client data for editing)
	const [editData, setEditData] = useState<Partial<ClienteDetalleCompleto>>({});

	const loadClientDetails = useCallback(async () => {
		setIsLoading(true);
		setError(null);

		const [clientResult, permissionResult] = await Promise.all([
			getClientDetailsComplete(clientId),
			checkEditPermission(clientId),
		]);

		if (clientResult.success && clientResult.data) {
			setClient(clientResult.data);
			// Initialize edit data with current values
			setEditData({
				natural_data: clientResult.data.natural_data,
				juridic_data: clientResult.data.juridic_data,
				unipersonal_data: clientResult.data.unipersonal_data,
			});
		} else {
			setError(clientResult.error || "Error al cargar detalles");
		}

		if (permissionResult.success) {
			setPermission(permissionResult.data);
		}

		setIsLoading(false);
	}, [clientId]);

	useEffect(() => {
		loadClientDetails();
	}, [loadClientDetails]);

	// Handle entering edit mode
	const handleEnterEditMode = () => {
		setIsEditMode(true);
		setSaveError(null);
	};

	// Handle cancel edit
	const handleCancelEdit = () => {
		setIsEditMode(false);
		setSaveError(null);
		// Reset edit data to original values
		if (client) {
			setEditData({
				natural_data: client.natural_data,
				juridic_data: client.juridic_data,
				unipersonal_data: client.unipersonal_data,
			});
		}
	};

	// Handle save
	const handleSave = async () => {
		if (!client) return;

		setIsSaving(true);
		setSaveError(null);

		let result;

		// Type assertions needed because database types use null while form types use undefined
		if (client.client_type === "natural" && editData.natural_data) {
			result = await updateNaturalClient(
				clientId,
				editData.natural_data as unknown as Parameters<typeof updateNaturalClient>[1]
			);
		} else if (client.client_type === "juridica" && editData.juridic_data) {
			result = await updateJuridicClient(
				clientId,
				editData.juridic_data as unknown as Parameters<typeof updateJuridicClient>[1]
			);
		} else if (client.client_type === "unipersonal" && editData.unipersonal_data && editData.natural_data) {
			result = await updateUnipersonalClient(clientId, {
				...editData.natural_data,
				...editData.unipersonal_data,
			} as unknown as Parameters<typeof updateUnipersonalClient>[1]);
		}

		if (result?.success) {
			setIsEditMode(false);
			// Reload client data
			await loadClientDetails();
		} else {
			setSaveError(result?.error || "Error al guardar cambios");
		}

		setIsSaving(false);
	};

	// Update natural data field
	const updateNaturalField = (field: keyof NaturalClient, value: unknown) => {
		setEditData((prev) => ({
			...prev,
			natural_data: {
				...prev.natural_data,
				[field]: value,
			} as NaturalClient,
		}));
	};

	// Update juridic data field
	const updateJuridicField = (field: keyof JuridicClient, value: unknown) => {
		setEditData((prev) => ({
			...prev,
			juridic_data: {
				...prev.juridic_data,
				[field]: value,
			} as JuridicClient,
		}));
	};

	// Update unipersonal data field
	const updateUnipersonalField = (field: keyof UnipersonalClient, value: unknown) => {
		setEditData((prev) => ({
			...prev,
			unipersonal_data: {
				...prev.unipersonal_data,
				[field]: value,
			} as UnipersonalClient,
		}));
	};

	// Get client display name for permissions panel
	const getClientName = (): string => {
		if (!client) return "";
		if (client.client_type === "natural" && client.natural_data) {
			return `${client.natural_data.primer_nombre} ${client.natural_data.primer_apellido}`;
		}
		if (client.client_type === "juridica" && client.juridic_data) {
			return client.juridic_data.razon_social;
		}
		if (client.client_type === "unipersonal" && client.unipersonal_data) {
			return client.unipersonal_data.razon_social;
		}
		return "";
	};

	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	const handleDownloadDocument = async (storagePath: string, _fileName?: string) => {
		try {
			// Crear cliente de Supabase en el lado del cliente
			const { createClient } = await import("@/utils/supabase/client");
			const supabase = createClient();

			// Obtener URL pública del documento
			const { data } = supabase.storage.from("clientes-documentos").getPublicUrl(storagePath);

			if (data?.publicUrl) {
				// Abrir en nueva ventana
				window.open(data.publicUrl, "_blank");
			} else {
				console.error("No se pudo obtener la URL del documento");
				alert("Error al abrir el documento");
			}
		} catch (error) {
			console.error("Error downloading document:", error);
			alert("Error al abrir el documento");
		}
	};

	if (isLoading) {
		return (
			<div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
				<div className="bg-white rounded-lg p-8">
					<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
					<p className="text-center mt-4 text-gray-600">Cargando detalles...</p>
				</div>
			</div>
		);
	}

	if (error || !client) {
		return (
			<div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
				<div className="bg-white rounded-lg p-8 max-w-md">
					<p className="text-red-600 mb-4">{error || "Error desconocido"}</p>
					<Button onClick={onClose}>Cerrar</Button>
				</div>
			</div>
		);
	}

	const documentTypes = getDocumentTypesForClientType(client.client_type);

	return (
		<div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
			<div className="bg-white rounded-lg w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
				{/* Header */}
				<div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between z-10">
					<div className="flex items-center gap-3">
						{client.client_type === "natural" || client.client_type === "unipersonal" ? (
							<User className="h-6 w-6 text-primary" />
						) : (
							<Building2 className="h-6 w-6 text-primary" />
						)}
						<div>
							<h2 className="text-xl font-semibold">
								{isEditMode ? "Editando Cliente" : "Detalles del Cliente"}
							</h2>
							<p className="text-sm text-gray-600">
								{client.client_type === "natural"
									? "Persona Natural"
									: client.client_type === "unipersonal"
									? "Unipersonal"
									: "Persona Jurídica"}
							</p>
						</div>
					</div>

					<div className="flex items-center gap-2">
						{/* Edit/Save/Cancel buttons */}
						{isEditMode ? (
							<>
								<Button variant="outline" onClick={handleCancelEdit} disabled={isSaving}>
									<XCircle className="h-4 w-4 mr-2" />
									Cancelar
								</Button>
								<Button onClick={handleSave} disabled={isSaving}>
									{isSaving ? (
										<Loader2 className="h-4 w-4 mr-2 animate-spin" />
									) : (
										<Save className="h-4 w-4 mr-2" />
									)}
									Guardar
								</Button>
							</>
						) : (
							permission?.canEdit && (
								<Button variant="outline" onClick={handleEnterEditMode}>
									<Pencil className="h-4 w-4 mr-2" />
									Editar
								</Button>
							)
						)}

						<Button variant="ghost" size="icon" onClick={onClose} className="rounded-full">
							<X className="h-5 w-5" />
						</Button>
					</div>
				</div>

				{/* Save error message */}
				{saveError && (
					<div className="mx-6 mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
						<p className="text-sm text-red-600">{saveError}</p>
					</div>
				)}

				{/* Content */}
				<div className="flex-1 overflow-y-auto p-6">
					<Tabs defaultValue="general" className="w-full">
						<TabsList className="flex w-full">
							<TabsTrigger value="general" className="flex-1">
								General
							</TabsTrigger>
							<TabsTrigger value="contacto" className="flex-1">
								Contacto
							</TabsTrigger>
							{client.partner && (
								<TabsTrigger value="conyuge" className="flex-1">
									Cónyuge
								</TabsTrigger>
							)}
							{client.legal_representatives && client.legal_representatives.length > 0 && (
								<TabsTrigger value="representantes" className="flex-1">
									Representantes
								</TabsTrigger>
							)}
							<TabsTrigger value="polizas" className="flex-1">
								Pólizas ({client.policies?.length || 0})
							</TabsTrigger>
							<TabsTrigger value="documentos" className="flex-1">
								Documentos ({client.documents?.length || 0})
							</TabsTrigger>
							{permission?.isAdmin && (
								<TabsTrigger value="permisos" className="flex-1">
									<Shield className="h-4 w-4 mr-1" />
									Permisos
								</TabsTrigger>
							)}
						</TabsList>

						{/* GENERAL TAB */}
						<TabsContent value="general" className="space-y-6">
							{client.client_type === "natural" && (editData.natural_data || client.natural_data) && (
								<NaturalClientGeneral
									data={isEditMode ? (editData.natural_data as NaturalClient) : client.natural_data!}
									executive={client.executive_name}
									isEditing={isEditMode}
									onFieldChange={updateNaturalField}
								/>
							)}
							{client.client_type === "unipersonal" &&
								(editData.unipersonal_data || client.unipersonal_data) &&
								(editData.natural_data || client.natural_data) && (
									<UnipersonalClientGeneral
										naturalData={
											isEditMode ? (editData.natural_data as NaturalClient) : client.natural_data!
										}
										unipersonalData={
											isEditMode
												? (editData.unipersonal_data as UnipersonalClient)
												: client.unipersonal_data!
										}
										executive={client.executive_name}
										isEditing={isEditMode}
										onNaturalFieldChange={updateNaturalField}
										onUnipersonalFieldChange={updateUnipersonalField}
									/>
								)}
							{client.client_type === "juridica" && (editData.juridic_data || client.juridic_data) && (
								<JuridicClientGeneral
									data={isEditMode ? (editData.juridic_data as JuridicClient) : client.juridic_data!}
									executive={client.executive_name}
									isEditing={isEditMode}
									onFieldChange={updateJuridicField}
								/>
							)}
						</TabsContent>

						{/* CONTACTO TAB */}
						<TabsContent value="contacto" className="space-y-6">
							<ContactInfo
								client={client}
								editData={editData}
								isEditing={isEditMode}
								onNaturalFieldChange={updateNaturalField}
								onJuridicFieldChange={updateJuridicField}
								onUnipersonalFieldChange={updateUnipersonalField}
							/>
						</TabsContent>

						{/* CÓNYUGE TAB */}
						{client.partner && (
							<TabsContent value="conyuge" className="space-y-6">
								<PartnerInfo partner={client.partner} />
							</TabsContent>
						)}

						{/* REPRESENTANTES TAB */}
						{client.legal_representatives && client.legal_representatives.length > 0 && (
							<TabsContent value="representantes" className="space-y-6">
								<LegalRepresentatives representatives={client.legal_representatives} />
							</TabsContent>
						)}

						{/* PÓLIZAS TAB */}
						<TabsContent value="polizas" className="space-y-6">
							<PoliciesList policies={client.policies || []} />
						</TabsContent>

						{/* DOCUMENTOS TAB */}
						<TabsContent value="documentos" className="space-y-6">
							<DocumentsList
								documents={client.documents || []}
								documentTypes={documentTypes}
								onDownload={handleDownloadDocument}
							/>
						</TabsContent>

						{/* PERMISOS TAB (Admin only) */}
						{permission?.isAdmin && (
							<TabsContent value="permisos" className="space-y-6">
								<ClientPermissionsPanel clientId={clientId} clientName={getClientName()} />
							</TabsContent>
						)}
					</Tabs>
				</div>
			</div>
		</div>
	);
}

// Helper Components

interface NaturalClientGeneralProps {
	data: NaturalClient;
	executive?: string;
	isEditing?: boolean;
	onFieldChange?: (field: keyof NaturalClient, value: unknown) => void;
}

function NaturalClientGeneral({ data, executive, isEditing = false, onFieldChange }: NaturalClientGeneralProps) {
	if (isEditing) {
		return (
			<div className="space-y-6">
				<InfoSection title="Datos Personales" isEditing>
					<div className="grid grid-cols-2 gap-4">
						<div className="space-y-1">
							<Label className="text-sm">Primer Nombre *</Label>
							<Input
								value={data.primer_nombre || ""}
								onChange={(e) => onFieldChange?.("primer_nombre", e.target.value)}
							/>
						</div>
						<div className="space-y-1">
							<Label className="text-sm">Segundo Nombre</Label>
							<Input
								value={data.segundo_nombre || ""}
								onChange={(e) => onFieldChange?.("segundo_nombre", e.target.value)}
							/>
						</div>
						<div className="space-y-1">
							<Label className="text-sm">Primer Apellido *</Label>
							<Input
								value={data.primer_apellido || ""}
								onChange={(e) => onFieldChange?.("primer_apellido", e.target.value)}
							/>
						</div>
						<div className="space-y-1">
							<Label className="text-sm">Segundo Apellido</Label>
							<Input
								value={data.segundo_apellido || ""}
								onChange={(e) => onFieldChange?.("segundo_apellido", e.target.value)}
							/>
						</div>
						<div className="space-y-1">
							<Label className="text-sm">Tipo Documento *</Label>
							<Select
								value={data.tipo_documento || ""}
								onValueChange={(v) => onFieldChange?.("tipo_documento", v)}
							>
								<SelectTrigger>
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									{DOCUMENT_TYPES.map((t) => (
										<SelectItem key={t} value={t}>
											{t.toUpperCase()}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
						<div className="space-y-1">
							<Label className="text-sm">Número de Documento *</Label>
							<Input
								value={data.numero_documento || ""}
								onChange={(e) => onFieldChange?.("numero_documento", e.target.value)}
							/>
						</div>
						<div className="space-y-1">
							<Label className="text-sm">Extensión CI</Label>
							<Input
								value={data.extension_ci || ""}
								onChange={(e) => onFieldChange?.("extension_ci", e.target.value)}
								placeholder="Ej: A, Z, etc."
							/>
						</div>
						<div className="space-y-1">
							<Label className="text-sm">Nacionalidad *</Label>
							<Input
								value={data.nacionalidad || ""}
								onChange={(e) => onFieldChange?.("nacionalidad", e.target.value)}
							/>
						</div>
						<div className="space-y-1">
							<Label className="text-sm">Fecha de Nacimiento *</Label>
							<Input
								type="date"
								value={data.fecha_nacimiento || ""}
								onChange={(e) => onFieldChange?.("fecha_nacimiento", e.target.value)}
							/>
						</div>
						<div className="space-y-1">
							<Label className="text-sm">Estado Civil *</Label>
							<Select
								value={data.estado_civil || ""}
								onValueChange={(v) => onFieldChange?.("estado_civil", v)}
							>
								<SelectTrigger>
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									{CIVIL_STATUS.map((s) => (
										<SelectItem key={s} value={s}>
											{s.charAt(0).toUpperCase() + s.slice(1)}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
						<div className="space-y-1">
							<Label className="text-sm">Género</Label>
							<Select value={data.genero || ""} onValueChange={(v) => onFieldChange?.("genero", v)}>
								<SelectTrigger>
									<SelectValue placeholder="Seleccionar..." />
								</SelectTrigger>
								<SelectContent>
									{GENDER_OPTIONS.map((g) => (
										<SelectItem key={g} value={g}>
											{g.charAt(0).toUpperCase() + g.slice(1)}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
					</div>
				</InfoSection>

				<InfoSection title="Información Laboral" isEditing>
					<div className="grid grid-cols-2 gap-4">
						<div className="space-y-1">
							<Label className="text-sm">Profesión u Oficio</Label>
							<Input
								value={data.profesion_oficio || ""}
								onChange={(e) => onFieldChange?.("profesion_oficio", e.target.value)}
							/>
						</div>
						<div className="space-y-1">
							<Label className="text-sm">Actividad Económica</Label>
							<Input
								value={data.actividad_economica || ""}
								onChange={(e) => onFieldChange?.("actividad_economica", e.target.value)}
							/>
						</div>
						<div className="space-y-1">
							<Label className="text-sm">Lugar de Trabajo</Label>
							<Input
								value={data.lugar_trabajo || ""}
								onChange={(e) => onFieldChange?.("lugar_trabajo", e.target.value)}
							/>
						</div>
						<div className="space-y-1">
							<Label className="text-sm">Cargo</Label>
							<Input
								value={data.cargo || ""}
								onChange={(e) => onFieldChange?.("cargo", e.target.value)}
							/>
						</div>
						<div className="space-y-1">
							<Label className="text-sm">Nivel de Ingresos (Bs.)</Label>
							<Input
								type="number"
								value={data.nivel_ingresos || ""}
								onChange={(e) =>
									onFieldChange?.("nivel_ingresos", e.target.value ? Number(e.target.value) : null)
								}
							/>
						</div>
					</div>
				</InfoSection>

				<InfoSection title="Datos de Facturación" isEditing>
					<div className="grid grid-cols-2 gap-4">
						<div className="space-y-1">
							<Label className="text-sm">NIT</Label>
							<Input value={data.nit || ""} onChange={(e) => onFieldChange?.("nit", e.target.value)} />
						</div>
						<div className="space-y-1">
							<Label className="text-sm">Dirección de Facturación</Label>
							<Input
								value={data.domicilio_comercial || ""}
								onChange={(e) => onFieldChange?.("domicilio_comercial", e.target.value)}
							/>
						</div>
					</div>
				</InfoSection>
			</div>
		);
	}

	return (
		<div className="space-y-6">
			<InfoSection title="Datos Personales">
				<InfoRow label="Nombres" value={`${data.primer_nombre} ${data.segundo_nombre || ""}`.trim()} />
				<InfoRow label="Apellidos" value={`${data.primer_apellido} ${data.segundo_apellido || ""}`.trim()} />
				<InfoRow
					label="Documento"
					value={`${data.tipo_documento.toUpperCase()} ${data.numero_documento} ${data.extension_ci || ""}`}
				/>
				<InfoRow label="Nacionalidad" value={data.nacionalidad} />
				<InfoRow label="Fecha de Nacimiento" value={new Date(data.fecha_nacimiento).toLocaleDateString()} />
				<InfoRow label="Estado Civil" value={data.estado_civil} />
				{data.genero && <InfoRow label="Género" value={data.genero} />}
			</InfoSection>

			<InfoSection title="Información Laboral">
				{data.profesion_oficio && <InfoRow label="Profesión u Oficio" value={data.profesion_oficio} />}
				{data.actividad_economica && <InfoRow label="Actividad Económica" value={data.actividad_economica} />}
				{data.lugar_trabajo && <InfoRow label="Lugar de Trabajo" value={data.lugar_trabajo} />}
				{data.cargo && <InfoRow label="Cargo" value={data.cargo} />}
				{data.nivel_ingresos && (
					<InfoRow label="Nivel de Ingresos" value={`Bs. ${data.nivel_ingresos.toLocaleString()}`} />
				)}
			</InfoSection>

			{data.nit && (
				<InfoSection title="Datos de Facturación">
					<InfoRow label="NIT" value={data.nit} />
					{data.domicilio_comercial && (
						<InfoRow label="Dirección de Facturación" value={data.domicilio_comercial} />
					)}
				</InfoSection>
			)}

			{executive && (
				<InfoSection title="Información Adicional">
					<InfoRow label="Director de Cartera" value={executive} />
				</InfoSection>
			)}
		</div>
	);
}

interface UnipersonalClientGeneralProps {
	naturalData: NaturalClient;
	unipersonalData: UnipersonalClient;
	executive?: string;
	isEditing?: boolean;
	onNaturalFieldChange?: (field: keyof NaturalClient, value: unknown) => void;
	onUnipersonalFieldChange?: (field: keyof UnipersonalClient, value: unknown) => void;
}

function UnipersonalClientGeneral({
	naturalData,
	unipersonalData,
	executive,
	isEditing = false,
	onNaturalFieldChange,
	onUnipersonalFieldChange,
}: UnipersonalClientGeneralProps) {
	if (isEditing) {
		return (
			<div className="space-y-6">
				<InfoSection title="Datos Personales del Propietario" isEditing>
					<div className="grid grid-cols-2 gap-4">
						<div className="space-y-1">
							<Label className="text-sm">Primer Nombre *</Label>
							<Input
								value={naturalData.primer_nombre || ""}
								onChange={(e) => onNaturalFieldChange?.("primer_nombre", e.target.value)}
							/>
						</div>
						<div className="space-y-1">
							<Label className="text-sm">Primer Apellido *</Label>
							<Input
								value={naturalData.primer_apellido || ""}
								onChange={(e) => onNaturalFieldChange?.("primer_apellido", e.target.value)}
							/>
						</div>
						<div className="space-y-1">
							<Label className="text-sm">Número de Documento *</Label>
							<Input
								value={naturalData.numero_documento || ""}
								onChange={(e) => onNaturalFieldChange?.("numero_documento", e.target.value)}
							/>
						</div>
						<div className="space-y-1">
							<Label className="text-sm">Nacionalidad *</Label>
							<Input
								value={naturalData.nacionalidad || ""}
								onChange={(e) => onNaturalFieldChange?.("nacionalidad", e.target.value)}
							/>
						</div>
					</div>
				</InfoSection>

				<InfoSection title="Datos Comerciales" isEditing>
					<div className="grid grid-cols-2 gap-4">
						<div className="space-y-1">
							<Label className="text-sm">Razón Social *</Label>
							<Input
								value={unipersonalData.razon_social || ""}
								onChange={(e) => onUnipersonalFieldChange?.("razon_social", e.target.value)}
							/>
						</div>
						<div className="space-y-1">
							<Label className="text-sm">NIT *</Label>
							<Input
								value={unipersonalData.nit || ""}
								onChange={(e) => onUnipersonalFieldChange?.("nit", e.target.value)}
							/>
						</div>
						<div className="space-y-1">
							<Label className="text-sm">Matrícula de Comercio</Label>
							<Input
								value={unipersonalData.matricula_comercio || ""}
								onChange={(e) => onUnipersonalFieldChange?.("matricula_comercio", e.target.value)}
							/>
						</div>
						<div className="space-y-1">
							<Label className="text-sm">Actividad Económica *</Label>
							<Input
								value={unipersonalData.actividad_economica_comercial || ""}
								onChange={(e) =>
									onUnipersonalFieldChange?.("actividad_economica_comercial", e.target.value)
								}
							/>
						</div>
						<div className="space-y-1">
							<Label className="text-sm">Nivel de Ingresos (Bs.)</Label>
							<Input
								type="number"
								value={unipersonalData.nivel_ingresos || ""}
								onChange={(e) =>
									onUnipersonalFieldChange?.(
										"nivel_ingresos",
										e.target.value ? Number(e.target.value) : null
									)
								}
							/>
						</div>
					</div>
				</InfoSection>

				<InfoSection title="Representante" isEditing>
					<div className="grid grid-cols-2 gap-4">
						<div className="space-y-1">
							<Label className="text-sm">Nombre del Representante *</Label>
							<Input
								value={unipersonalData.nombre_representante || ""}
								onChange={(e) => onUnipersonalFieldChange?.("nombre_representante", e.target.value)}
							/>
						</div>
						<div className="space-y-1">
							<Label className="text-sm">CI del Representante *</Label>
							<Input
								value={unipersonalData.ci_representante || ""}
								onChange={(e) => onUnipersonalFieldChange?.("ci_representante", e.target.value)}
							/>
						</div>
					</div>
				</InfoSection>
			</div>
		);
	}

	return (
		<div className="space-y-6">
			<InfoSection title="Datos Personales del Propietario">
				<InfoRow
					label="Nombres"
					value={`${naturalData.primer_nombre} ${naturalData.segundo_nombre || ""}`.trim()}
				/>
				<InfoRow
					label="Apellidos"
					value={`${naturalData.primer_apellido} ${naturalData.segundo_apellido || ""}`.trim()}
				/>
				<InfoRow
					label="Documento"
					value={`${naturalData.tipo_documento.toUpperCase()} ${naturalData.numero_documento} ${
						naturalData.extension_ci || ""
					}`}
				/>
				<InfoRow label="Nacionalidad" value={naturalData.nacionalidad} />
			</InfoSection>

			<InfoSection title="Datos Comerciales">
				<InfoRow label="Razón Social" value={unipersonalData.razon_social} />
				<InfoRow label="NIT" value={unipersonalData.nit} />
				<InfoRow label="Matrícula de Comercio" value={unipersonalData.matricula_comercio} />
				<InfoRow label="Actividad Económica" value={unipersonalData.actividad_economica_comercial} />
				{unipersonalData.nivel_ingresos && (
					<InfoRow
						label="Nivel de Ingresos"
						value={`Bs. ${unipersonalData.nivel_ingresos.toLocaleString()}`}
					/>
				)}
			</InfoSection>

			<InfoSection title="Representante">
				<InfoRow label="Nombre" value={unipersonalData.nombre_representante} />
				<InfoRow
					label="CI"
					value={`${unipersonalData.ci_representante} ${unipersonalData.extension_representante || ""}`}
				/>
			</InfoSection>

			{executive && (
				<InfoSection title="Información Adicional">
					<InfoRow label="Director de Cartera" value={executive} />
				</InfoSection>
			)}
		</div>
	);
}

interface JuridicClientGeneralProps {
	data: JuridicClient;
	executive?: string;
	isEditing?: boolean;
	onFieldChange?: (field: keyof JuridicClient, value: unknown) => void;
}

function JuridicClientGeneral({ data, executive, isEditing = false, onFieldChange }: JuridicClientGeneralProps) {
	if (isEditing) {
		return (
			<div className="space-y-6">
				<InfoSection title="Datos de la Empresa" isEditing>
					<div className="grid grid-cols-2 gap-4">
						<div className="space-y-1">
							<Label className="text-sm">Razón Social *</Label>
							<Input
								value={data.razon_social || ""}
								onChange={(e) => onFieldChange?.("razon_social", e.target.value)}
							/>
						</div>
						<div className="space-y-1">
							<Label className="text-sm">NIT *</Label>
							<Input value={data.nit || ""} onChange={(e) => onFieldChange?.("nit", e.target.value)} />
						</div>
						<div className="space-y-1">
							<Label className="text-sm">Tipo de Sociedad</Label>
							<Select
								value={data.tipo_sociedad || ""}
								onValueChange={(v) => onFieldChange?.("tipo_sociedad", v)}
							>
								<SelectTrigger>
									<SelectValue placeholder="Seleccionar..." />
								</SelectTrigger>
								<SelectContent>
									{COMPANY_TYPES.map((t) => (
										<SelectItem key={t} value={t}>
											{t}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
						<div className="space-y-1">
							<Label className="text-sm">Matrícula de Comercio</Label>
							<Input
								value={data.matricula_comercio || ""}
								onChange={(e) => onFieldChange?.("matricula_comercio", e.target.value)}
							/>
						</div>
						<div className="space-y-1">
							<Label className="text-sm">País de Constitución *</Label>
							<Input
								value={data.pais_constitucion || ""}
								onChange={(e) => onFieldChange?.("pais_constitucion", e.target.value)}
							/>
						</div>
						<div className="space-y-1">
							<Label className="text-sm">Actividad Económica</Label>
							<Input
								value={data.actividad_economica || ""}
								onChange={(e) => onFieldChange?.("actividad_economica", e.target.value)}
							/>
						</div>
					</div>
				</InfoSection>
			</div>
		);
	}

	return (
		<div className="space-y-6">
			<InfoSection title="Datos de la Empresa">
				<InfoRow label="Razón Social" value={data.razon_social} />
				<InfoRow label="NIT" value={data.nit} />
				<InfoRow label="Tipo de Sociedad" value={data.tipo_sociedad} />
				{data.matricula_comercio && <InfoRow label="Matrícula de Comercio" value={data.matricula_comercio} />}
				<InfoRow label="País de Constitución" value={data.pais_constitucion} />
				{data.actividad_economica && <InfoRow label="Actividad Económica" value={data.actividad_economica} />}
			</InfoSection>

			{executive && (
				<InfoSection title="Información Adicional">
					<InfoRow label="Director de Cartera" value={executive} />
				</InfoSection>
			)}
		</div>
	);
}

interface ContactInfoProps {
	client: ClienteDetalleCompleto;
	editData?: Partial<ClienteDetalleCompleto>;
	isEditing?: boolean;
	onNaturalFieldChange?: (field: keyof NaturalClient, value: unknown) => void;
	onJuridicFieldChange?: (field: keyof JuridicClient, value: unknown) => void;
	onUnipersonalFieldChange?: (field: keyof UnipersonalClient, value: unknown) => void;
}

function ContactInfo({
	client,
	editData,
	isEditing = false,
	onNaturalFieldChange,
	onJuridicFieldChange,
	onUnipersonalFieldChange,
}: ContactInfoProps) {
	const naturalData = isEditing ? editData?.natural_data || client.natural_data : client.natural_data;
	const juridicData = isEditing ? editData?.juridic_data || client.juridic_data : client.juridic_data;
	const unipersonalData = isEditing ? editData?.unipersonal_data || client.unipersonal_data : client.unipersonal_data;

	if (isEditing) {
		return (
			<div className="space-y-6">
				<InfoSection title="Información de Contacto" isEditing>
					{client.client_type === "natural" && naturalData && (
						<div className="grid grid-cols-2 gap-4">
							<div className="space-y-1">
								<Label className="text-sm">Correo Electrónico *</Label>
								<Input
									type="email"
									value={naturalData.correo_electronico || ""}
									onChange={(e) => onNaturalFieldChange?.("correo_electronico", e.target.value)}
								/>
							</div>
							<div className="space-y-1">
								<Label className="text-sm">Teléfono/Celular *</Label>
								<Input
									type="tel"
									value={naturalData.celular || ""}
									onChange={(e) => onNaturalFieldChange?.("celular", e.target.value)}
								/>
							</div>
							<div className="col-span-2 space-y-1">
								<Label className="text-sm">Dirección *</Label>
								<Input
									value={naturalData.direccion || ""}
									onChange={(e) => onNaturalFieldChange?.("direccion", e.target.value)}
								/>
							</div>
						</div>
					)}

					{client.client_type === "juridica" && juridicData && (
						<div className="grid grid-cols-2 gap-4">
							<div className="space-y-1">
								<Label className="text-sm">Correo Electrónico</Label>
								<Input
									type="email"
									value={juridicData.correo_electronico || ""}
									onChange={(e) => onJuridicFieldChange?.("correo_electronico", e.target.value)}
								/>
							</div>
							<div className="space-y-1">
								<Label className="text-sm">Teléfono</Label>
								<Input
									type="tel"
									value={juridicData.telefono || ""}
									onChange={(e) => onJuridicFieldChange?.("telefono", e.target.value)}
								/>
							</div>
							<div className="col-span-2 space-y-1">
								<Label className="text-sm">Dirección Legal *</Label>
								<Input
									value={juridicData.direccion_legal || ""}
									onChange={(e) => onJuridicFieldChange?.("direccion_legal", e.target.value)}
								/>
							</div>
						</div>
					)}

					{client.client_type === "unipersonal" && naturalData && unipersonalData && (
						<div className="grid grid-cols-2 gap-4">
							<div className="space-y-1">
								<Label className="text-sm">Correo Comercial *</Label>
								<Input
									type="email"
									value={unipersonalData.correo_electronico_comercial || ""}
									onChange={(e) =>
										onUnipersonalFieldChange?.("correo_electronico_comercial", e.target.value)
									}
								/>
							</div>
							<div className="space-y-1">
								<Label className="text-sm">Teléfono Comercial *</Label>
								<Input
									type="tel"
									value={unipersonalData.telefono_comercial || ""}
									onChange={(e) => onUnipersonalFieldChange?.("telefono_comercial", e.target.value)}
								/>
							</div>
							<div className="space-y-1">
								<Label className="text-sm">Celular Personal *</Label>
								<Input
									type="tel"
									value={naturalData.celular || ""}
									onChange={(e) => onNaturalFieldChange?.("celular", e.target.value)}
								/>
							</div>
							<div className="space-y-1">
								<Label className="text-sm">Domicilio Comercial *</Label>
								<Input
									value={unipersonalData.domicilio_comercial || ""}
									onChange={(e) => onUnipersonalFieldChange?.("domicilio_comercial", e.target.value)}
								/>
							</div>
							<div className="col-span-2 space-y-1">
								<Label className="text-sm">Dirección Personal *</Label>
								<Input
									value={naturalData.direccion || ""}
									onChange={(e) => onNaturalFieldChange?.("direccion", e.target.value)}
								/>
							</div>
						</div>
					)}
				</InfoSection>
			</div>
		);
	}

	return (
		<div className="space-y-6">
			<InfoSection title="Información de Contacto">
				{client.client_type === "natural" && client.natural_data && (
					<>
						{client.natural_data.correo_electronico && (
							<div className="flex items-start gap-3">
								<Mail className="h-5 w-5 text-gray-400 mt-0.5" />
								<div>
									<p className="text-sm text-gray-600">Correo Electrónico</p>
									<p className="font-medium">{client.natural_data.correo_electronico}</p>
								</div>
							</div>
						)}
						{client.natural_data.celular && (
							<div className="flex items-start gap-3">
								<Phone className="h-5 w-5 text-gray-400 mt-0.5" />
								<div>
									<p className="text-sm text-gray-600">Teléfono/Celular</p>
									<p className="font-medium">{client.natural_data.celular}</p>
								</div>
							</div>
						)}
						{client.natural_data.direccion && (
							<div className="flex items-start gap-3">
								<MapPin className="h-5 w-5 text-gray-400 mt-0.5" />
								<div>
									<p className="text-sm text-gray-600">Dirección</p>
									<p className="font-medium">{client.natural_data.direccion}</p>
								</div>
							</div>
						)}
					</>
				)}

				{client.client_type === "juridica" && client.juridic_data && (
					<>
						{client.juridic_data.correo_electronico && (
							<div className="flex items-start gap-3">
								<Mail className="h-5 w-5 text-gray-400 mt-0.5" />
								<div>
									<p className="text-sm text-gray-600">Correo Electrónico</p>
									<p className="font-medium">{client.juridic_data.correo_electronico}</p>
								</div>
							</div>
						)}
						{client.juridic_data.telefono && (
							<div className="flex items-start gap-3">
								<Phone className="h-5 w-5 text-gray-400 mt-0.5" />
								<div>
									<p className="text-sm text-gray-600">Teléfono</p>
									<p className="font-medium">{client.juridic_data.telefono}</p>
								</div>
							</div>
						)}
						{client.juridic_data.direccion_legal && (
							<div className="flex items-start gap-3">
								<MapPin className="h-5 w-5 text-gray-400 mt-0.5" />
								<div>
									<p className="text-sm text-gray-600">Dirección Legal</p>
									<p className="font-medium">{client.juridic_data.direccion_legal}</p>
								</div>
							</div>
						)}
					</>
				)}

				{client.client_type === "unipersonal" && client.natural_data && client.unipersonal_data && (
					<>
						{client.unipersonal_data.correo_electronico_comercial && (
							<div className="flex items-start gap-3">
								<Mail className="h-5 w-5 text-gray-400 mt-0.5" />
								<div>
									<p className="text-sm text-gray-600">Correo Electrónico Comercial</p>
									<p className="font-medium">
										{client.unipersonal_data.correo_electronico_comercial}
									</p>
								</div>
							</div>
						)}
						{client.unipersonal_data.telefono_comercial && (
							<div className="flex items-start gap-3">
								<Phone className="h-5 w-5 text-gray-400 mt-0.5" />
								<div>
									<p className="text-sm text-gray-600">Teléfono Comercial</p>
									<p className="font-medium">{client.unipersonal_data.telefono_comercial}</p>
								</div>
							</div>
						)}
						{client.natural_data.celular && (
							<div className="flex items-start gap-3">
								<Phone className="h-5 w-5 text-gray-400 mt-0.5" />
								<div>
									<p className="text-sm text-gray-600">Celular Personal</p>
									<p className="font-medium">{client.natural_data.celular}</p>
								</div>
							</div>
						)}
						{client.unipersonal_data.domicilio_comercial && (
							<div className="flex items-start gap-3">
								<Briefcase className="h-5 w-5 text-gray-400 mt-0.5" />
								<div>
									<p className="text-sm text-gray-600">Domicilio Comercial</p>
									<p className="font-medium">{client.unipersonal_data.domicilio_comercial}</p>
								</div>
							</div>
						)}
						{client.natural_data.direccion && (
							<div className="flex items-start gap-3">
								<MapPin className="h-5 w-5 text-gray-400 mt-0.5" />
								<div>
									<p className="text-sm text-gray-600">Dirección Personal</p>
									<p className="font-medium">{client.natural_data.direccion}</p>
								</div>
							</div>
						)}
					</>
				)}
			</InfoSection>
		</div>
	);
}

function PartnerInfo({ partner }: { partner: PartnerData }) {
	return (
		<div className="space-y-6">
			<InfoSection title="Datos del Cónyuge">
				<InfoRow label="Nombres" value={`${partner.primer_nombre} ${partner.segundo_nombre || ""}`.trim()} />
				<InfoRow
					label="Apellidos"
					value={`${partner.primer_apellido} ${partner.segundo_apellido || ""}`.trim()}
				/>
				<InfoRow label="Dirección" value={partner.direccion} />
				<InfoRow label="Celular" value={partner.celular} />
				<InfoRow label="Correo Electrónico" value={partner.correo_electronico} />
				<InfoRow label="Profesión u Oficio" value={partner.profesion_oficio} />
				<InfoRow label="Actividad Económica" value={partner.actividad_economica} />
				<InfoRow label="Lugar de Trabajo" value={partner.lugar_trabajo} />
			</InfoSection>
		</div>
	);
}

function LegalRepresentatives({ representatives }: { representatives: LegalRepresentative[] }) {
	return (
		<div className="space-y-4">
			{representatives.map((rep, index) => (
				<div key={index} className="p-4 border rounded-lg">
					<div className="flex items-center gap-2 mb-3">
						<User className="h-5 w-5 text-primary" />
						<h4 className="font-semibold">
							{`${rep.primer_nombre} ${rep.segundo_nombre || ""} ${rep.primer_apellido} ${
								rep.segundo_apellido || ""
							}`.trim()}
						</h4>
						{rep.is_primary && (
							<Badge variant="default" className="ml-auto">
								Principal
							</Badge>
						)}
					</div>
					<div className="grid grid-cols-2 gap-3 text-sm">
						<InfoRow
							label="Documento"
							value={`${rep.tipo_documento} ${rep.numero_documento} ${rep.extension || ""}`}
						/>
						{rep.cargo && <InfoRow label="Cargo" value={rep.cargo} />}
						{rep.telefono && <InfoRow label="Teléfono" value={rep.telefono} />}
						{rep.correo_electronico && <InfoRow label="Email" value={rep.correo_electronico} />}
					</div>
				</div>
			))}
		</div>
	);
}

function PoliciesList({ policies }: { policies: PolicyData[] }) {
	const router = useRouter();

	if (policies.length === 0) {
		return (
			<div className="text-center py-12 border-2 border-dashed rounded-lg">
				<FileText className="h-12 w-12 text-gray-400 mx-auto mb-3" />
				<p className="text-gray-600">No hay pólizas asociadas</p>
			</div>
		);
	}

	const getStatusColor = (estado: string) => {
		switch (estado) {
			case "activa":
				return "bg-green-500 text-white";
			case "pendiente":
				return "bg-yellow-500 text-white";
			case "vencida":
				return "bg-red-500 text-white";
			case "cancelada":
				return "bg-gray-500 text-white";
			case "renovada":
				return "bg-blue-500 text-white";
			default:
				return "bg-gray-500 text-white";
		}
	};

	const formatCurrency = (amount: number, currency: string) => {
		return `${currency} ${amount.toLocaleString("es-BO", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
	};

	return (
		<div className="space-y-3">
			{policies.map((policy) => (
				<div key={policy.id} className="border rounded-lg overflow-hidden">
					<button
						onClick={() => router.push(`/polizas/${policy.id}`)}
						className="w-full p-4 hover:bg-gray-50 transition-colors text-left"
					>
						<div className="flex items-center justify-between gap-3">
							<div className="flex items-center gap-3 flex-1">
								<FileText className="h-8 w-8 text-primary flex-shrink-0" />
								<div>
									<div className="flex items-center gap-2 mb-1">
										<Badge className={getStatusColor(policy.estado)}>
											{policy.estado.toUpperCase()}
										</Badge>
										<span className="font-semibold">{policy.numero_poliza}</span>
									</div>
									<p className="text-sm text-gray-600">
										{policy.ramo} • {policy.companias_aseguradoras?.nombre || "Sin compañía"}
									</p>
								</div>
							</div>
							<div className="text-right">
								<p className="font-semibold text-primary">
									{formatCurrency(policy.prima_total, policy.moneda)}
								</p>
								<p className="text-xs text-gray-500">
									{new Date(policy.inicio_vigencia).toLocaleDateString()} -{" "}
									{new Date(policy.fin_vigencia).toLocaleDateString()}
								</p>
							</div>
						</div>
					</button>
				</div>
			))}
		</div>
	);
}

function DocumentsList({
	documents,
	documentTypes,
	onDownload,
}: {
	documents: ClienteDocumento[];
	documentTypes: Record<string, string>;
	onDownload: (path: string, name?: string) => void;
}) {
	if (documents.length === 0) {
		return (
			<div className="text-center py-12 border-2 border-dashed rounded-lg">
				<FileText className="h-12 w-12 text-gray-400 mx-auto mb-3" />
				<p className="text-gray-600">No hay documentos cargados</p>
			</div>
		);
	}

	return (
		<div className="space-y-3">
			{documents.map((doc, index) => {
				const docLabel = (documentTypes as Record<string, string>)[doc.tipo_documento] || doc.tipo_documento;

				return (
					<div key={index} className="p-4 border rounded-lg hover:bg-gray-50 transition-colors">
						<div className="flex items-start gap-3">
							<FileText className="h-10 w-10 text-primary flex-shrink-0" />

							<div className="flex-1 min-w-0">
								<p className="font-medium text-gray-900">{docLabel}</p>
								<p className="text-sm text-gray-600 truncate">{doc.nombre_archivo}</p>
								<p className="text-xs text-gray-500 mt-1">
									{formatFileSize(doc.tamano_bytes)}
									{doc.descripcion && ` • ${doc.descripcion}`}
								</p>
								<p className="text-xs text-gray-400 mt-1">
									Subido: {new Date(doc.fecha_subida).toLocaleDateString()}
								</p>
							</div>

							<Button
								variant="outline"
								size="sm"
								onClick={() => onDownload(doc.storage_path, doc.nombre_archivo)}
								className="flex-shrink-0"
							>
								<Download className="h-4 w-4 mr-2" />
								Descargar
							</Button>
						</div>
					</div>
				);
			})}
		</div>
	);
}

// Utility Components

function InfoSection({
	title,
	children,
	isEditing,
}: {
	title: string;
	children: React.ReactNode;
	isEditing?: boolean;
}) {
	return (
		<div className="border rounded-lg p-4">
			<h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
				{title}
				{isEditing && <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">Editando</span>}
			</h3>
			<div className={isEditing ? "space-y-4" : "space-y-3"}>{children}</div>
		</div>
	);
}

function InfoRow({ label, value }: { label: string; value: string | number | null | undefined }) {
	return (
		<div className="grid grid-cols-3 gap-4">
			<p className="text-sm text-gray-600">{label}:</p>
			<p className="col-span-2 font-medium">{value ?? "-"}</p>
		</div>
	);
}
