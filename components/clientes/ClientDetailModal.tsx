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
	Globe2,
	Trophy,
	Users2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getClientDetailsComplete, type ClienteDetalleCompleto } from "@/app/clientes/detail-actions";
import { formatFileSize, getDocumentTypesForClientType, type ClienteDocumento } from "@/types/clienteDocumento";
import type {
	NaturalClient,
	JuridicClient,
	UnipersonalClient,
	OngClient,
	ClubClient,
	AsociacionCivilClient,
} from "@/types/database/client";
import { checkEditPermission } from "@/app/clientes/permisos/actions";
import {
	updateNaturalClient,
	updateJuridicClient,
	updateUnipersonalClient,
	updateOngClient,
	updateClubClient,
	updateAsociacionCivilClient,
} from "@/app/clientes/editar/actions";
import { saveExtraPhones } from "@/app/clientes/celulares/actions";
import { ClientPermissionsPanel } from "./ClientPermissionsPanel";
import { ClienteDocumentUploadEdit } from "./ClienteDocumentUploadEdit";
import { ClientAuditTrailPanel } from "./ClientAuditTrailPanel";
import { StatusBadge } from "@/components/ui/status-badge";
import type { PermissionCheckResult } from "@/types/clientPermission";
import {
	CIVIL_STATUS,
	DOCUMENT_TYPES,
	GENDER_OPTIONS,
	COMPANY_TYPES,
	SPORTS_DISCIPLINES,
	CLUB_REGISTRY_TYPES,
	ASOCIACION_CIVIL_TYPES,
	type ExtraPhone,
} from "@/types/clientForm";
import { ExtraPhonesInput } from "./ExtraPhonesInput";
import { toast } from "sonner";

// Additional types from detail-actions
type PartnerData = {
	id: string;
	client_id: string;
	primer_nombre: string | null;
	segundo_nombre: string | null;
	primer_apellido: string | null;
	segundo_apellido: string | null;
	tipo_documento: string;
	numero_documento: string;
	fecha_nacimiento: string;
	nacionalidad: string;
	direccion: string | null;
	celular: string | null;
	correo_electronico: string | null;
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
				ong_data: clientResult.data.ong_data,
				club_data: clientResult.data.club_data,
				asociacion_civil_data: clientResult.data.asociacion_civil_data,
				extra_phones: clientResult.data.extra_phones || [],
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
				ong_data: client.ong_data,
				club_data: client.club_data,
				asociacion_civil_data: client.asociacion_civil_data,
				extra_phones: client.extra_phones || [],
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
				editData.natural_data as unknown as Parameters<typeof updateNaturalClient>[1],
			);
		} else if (client.client_type === "juridica" && editData.juridic_data) {
			result = await updateJuridicClient(
				clientId,
				editData.juridic_data as unknown as Parameters<typeof updateJuridicClient>[1],
			);
		} else if (client.client_type === "unipersonal" && editData.unipersonal_data && editData.natural_data) {
			result = await updateUnipersonalClient(clientId, {
				...editData.natural_data,
				...editData.unipersonal_data,
			} as unknown as Parameters<typeof updateUnipersonalClient>[1]);
		} else if (client.client_type === "ong" && editData.ong_data) {
			result = await updateOngClient(
				clientId,
				editData.ong_data as unknown as Parameters<typeof updateOngClient>[1],
			);
		} else if (client.client_type === "club" && editData.club_data) {
			result = await updateClubClient(
				clientId,
				editData.club_data as unknown as Parameters<typeof updateClubClient>[1],
			);
		} else if (client.client_type === "asociacion_civil" && editData.asociacion_civil_data) {
			result = await updateAsociacionCivilClient(
				clientId,
				editData.asociacion_civil_data as unknown as Parameters<typeof updateAsociacionCivilClient>[1],
			);
		}

		if (result?.success) {
			// Save extra phones
			const phonesResult = await saveExtraPhones(clientId, editData.extra_phones || []);
			if (!phonesResult.success) {
				setSaveError(phonesResult.error || "Error al guardar celulares extra");
				setIsSaving(false);
				return;
			}

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

	// Update ONG data field
	const updateOngField = (field: keyof OngClient, value: unknown) => {
		setEditData((prev) => ({
			...prev,
			ong_data: {
				...prev.ong_data,
				[field]: value,
			} as OngClient,
		}));
	};

	// Update club data field
	const updateClubField = (field: keyof ClubClient, value: unknown) => {
		setEditData((prev) => ({
			...prev,
			club_data: {
				...prev.club_data,
				[field]: value,
			} as ClubClient,
		}));
	};

	// Update asociación civil data field
	const updateAsociacionCivilField = (field: keyof AsociacionCivilClient, value: unknown) => {
		setEditData((prev) => ({
			...prev,
			asociacion_civil_data: {
				...prev.asociacion_civil_data,
				[field]: value,
			} as AsociacionCivilClient,
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
		if (client.client_type === "ong" && client.ong_data) {
			return client.ong_data.nombre_ong;
		}
		if (client.client_type === "club" && client.club_data) {
			return client.club_data.nombre_club;
		}
		if (client.client_type === "asociacion_civil" && client.asociacion_civil_data) {
			return client.asociacion_civil_data.nombre_asociacion;
		}
		return "";
	};

	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	const handleDownloadDocument = async (storagePath: string, _fileName?: string) => {
		try {
			// Crear cliente de Supabase en el lado del cliente
			const { createClient } = await import("@/utils/supabase/client");
			const supabase = createClient();

			// Generar URL firmada para acceder al documento (bucket privado)
			const { data, error } = await supabase.storage
				.from("clientes-documentos")
				.createSignedUrl(storagePath, 3600);

			if (data?.signedUrl) {
				window.open(data.signedUrl, "_blank");
			} else {
				console.error("No se pudo obtener la URL del documento", error);
				toast.error("Error al abrir el documento");
			}
		} catch (error) {
			console.error("Error downloading document:", error);
			toast.error("Error al abrir el documento");
		}
	};

	if (isLoading) {
		return (
			<div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
				<div className="bg-card rounded-lg p-8 shadow-md">
					<div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent mx-auto"></div>
					<p className="text-center mt-4 text-sm text-muted-foreground">Cargando detalles…</p>
				</div>
			</div>
		);
	}

	if (error || !client) {
		return (
			<div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
				<div className="bg-card rounded-lg p-8 max-w-md shadow-md space-y-3">
					<p className="text-sm text-destructive">{error || "Error desconocido"}</p>
					<Button size="sm" onClick={onClose}>
						Cerrar
					</Button>
				</div>
			</div>
		);
	}

	const documentTypes = getDocumentTypesForClientType(client.client_type);

	return (
		<div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
			<div className="bg-card rounded-lg w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col shadow-md">
				{/* Header */}
				<div className="sticky top-0 bg-card border-b border-border px-6 py-4 flex items-center justify-between z-10">
					<div className="flex items-center gap-3">
						{client.client_type === "natural" || client.client_type === "unipersonal" ? (
							<User className="h-5 w-5 text-primary" />
						) : client.client_type === "ong" ? (
							<Globe2 className="h-5 w-5 text-primary" />
						) : client.client_type === "club" ? (
							<Trophy className="h-5 w-5 text-primary" />
						) : client.client_type === "asociacion_civil" ? (
							<Users2 className="h-5 w-5 text-primary" />
						) : (
							<Building2 className="h-5 w-5 text-primary" />
						)}
						<div>
							<h2 className="text-base font-semibold text-foreground">
								{isEditMode ? "Editando Cliente" : "Detalles del Cliente"}
							</h2>
							<p className="text-xs text-muted-foreground mt-0.5">
								{client.client_type === "natural"
									? "Persona Natural"
									: client.client_type === "unipersonal"
										? "Unipersonal"
										: client.client_type === "ong"
											? "ONG"
											: client.client_type === "club"
												? "Club Deportivo"
												: client.client_type === "asociacion_civil"
													? "Asociación Civil"
													: "Persona Jurídica"}
							</p>
						</div>
					</div>

					<div className="flex items-center gap-2">
						{isEditMode ? (
							<>
								<Button variant="outline" size="sm" onClick={handleCancelEdit} disabled={isSaving}>
									<XCircle className="h-4 w-4" />
									Cancelar
								</Button>
								<Button size="sm" onClick={handleSave} disabled={isSaving}>
									{isSaving ? (
										<Loader2 className="h-4 w-4 animate-spin" />
									) : (
										<Save className="h-4 w-4" />
									)}
									Guardar
								</Button>
							</>
						) : (
							permission?.canEdit && (
								<Button variant="outline" size="sm" onClick={handleEnterEditMode}>
									<Pencil className="h-4 w-4" />
									Editar
								</Button>
							)
						)}

						<Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
							<X className="h-4 w-4" />
						</Button>
					</div>
				</div>

				{/* Save error message */}
				{saveError && (
					<div className="mx-6 mt-4 p-3 bg-destructive/5 border border-destructive/20 rounded-md">
						<p className="text-sm text-destructive">{saveError}</p>
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
							{(permission?.isAdmin || permission?.isTeamLeader) && (
								<TabsTrigger value="permisos" className="flex-1">
									<Shield className="h-4 w-4 mr-1" />
									Permisos
								</TabsTrigger>
							)}
							{(permission?.isAdmin || permission?.isTeamLeader || permission?.isTeamMember) && (
								<TabsTrigger value="trazabilidad" className="flex-1">
									<FileText className="h-4 w-4 mr-1" />
									Trazabilidad
								</TabsTrigger>
							)}
						</TabsList>

						{/* GENERAL TAB */}
						<TabsContent value="general" className="space-y-6">
							{client.client_type === "natural" && (editData.natural_data || client.natural_data) && (
								<NaturalClientGeneral
									data={isEditMode ? (editData.natural_data as NaturalClient) : client.natural_data!}
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
										isEditing={isEditMode}
										onNaturalFieldChange={updateNaturalField}
										onUnipersonalFieldChange={updateUnipersonalField}
									/>
								)}
							{client.client_type === "juridica" && (editData.juridic_data || client.juridic_data) && (
								<JuridicClientGeneral
									data={isEditMode ? (editData.juridic_data as JuridicClient) : client.juridic_data!}
									isEditing={isEditMode}
									onFieldChange={updateJuridicField}
								/>
							)}
							{client.client_type === "ong" && (editData.ong_data || client.ong_data) && (
								<OngClientGeneral
									data={isEditMode ? (editData.ong_data as OngClient) : client.ong_data!}
									isEditing={isEditMode}
									onFieldChange={updateOngField}
								/>
							)}
							{client.client_type === "club" && (editData.club_data || client.club_data) && (
								<ClubClientGeneral
									data={isEditMode ? (editData.club_data as ClubClient) : client.club_data!}
									isEditing={isEditMode}
									onFieldChange={updateClubField}
								/>
							)}
							{client.client_type === "asociacion_civil" &&
								(editData.asociacion_civil_data || client.asociacion_civil_data) && (
									<AsociacionCivilClientGeneral
										data={
											isEditMode
												? (editData.asociacion_civil_data as AsociacionCivilClient)
												: client.asociacion_civil_data!
										}
										isEditing={isEditMode}
										onFieldChange={updateAsociacionCivilField}
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
								onOngFieldChange={updateOngField}
								onClubFieldChange={updateClubField}
								onAsociacionFieldChange={updateAsociacionCivilField}
								onExtraPhonesChange={(phones) =>
									setEditData((prev) => ({ ...prev, extra_phones: phones }))
								}
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
							{isEditMode ? (
								<ClienteDocumentUploadEdit
									clientId={clientId}
									clientType={client.client_type}
									isAdmin={permission?.isAdmin}
									onDocumentChange={loadClientDetails}
								/>
							) : (
								<DocumentsList
									documents={client.documents || []}
									documentTypes={documentTypes}
									onDownload={handleDownloadDocument}
								/>
							)}
						</TabsContent>

						{/* PERMISOS TAB (Admin or Team Leader) */}
						{(permission?.isAdmin || permission?.isTeamLeader) && (
							<TabsContent value="permisos" className="space-y-6">
								<ClientPermissionsPanel clientId={clientId} clientName={getClientName()} />
							</TabsContent>
						)}

						{/* TRAZABILIDAD TAB (Admin, Team Leader, or Team Member) */}
						{(permission?.isAdmin || permission?.isTeamLeader || permission?.isTeamMember) && (
							<TabsContent value="trazabilidad" className="space-y-6">
								<ClientAuditTrailPanel clientId={clientId} />
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
	isEditing?: boolean;
	onFieldChange?: (field: keyof NaturalClient, value: unknown) => void;
}

function NaturalClientGeneral({ data, isEditing = false, onFieldChange }: NaturalClientGeneralProps) {
	if (isEditing) {
		return (
			<div className="space-y-6">
				<InfoSection title="Datos Personales" isEditing>
					<div className="grid grid-cols-2 gap-4">
						<div className="space-y-1">
							<Label className="text-sm">Primer Nombre *</Label>
							<Input
								value={data.primer_nombre || ""}
								onChange={(e) => onFieldChange?.("primer_nombre", e.target.value.toUpperCase())}
							/>
						</div>
						<div className="space-y-1">
							<Label className="text-sm">Segundo Nombre</Label>
							<Input
								value={data.segundo_nombre || ""}
								onChange={(e) => onFieldChange?.("segundo_nombre", e.target.value.toUpperCase())}
							/>
						</div>
						<div className="space-y-1">
							<Label className="text-sm">Primer Apellido *</Label>
							<Input
								value={data.primer_apellido || ""}
								onChange={(e) => onFieldChange?.("primer_apellido", e.target.value.toUpperCase())}
							/>
						</div>
						<div className="space-y-1">
							<Label className="text-sm">Segundo Apellido</Label>
							<Input
								value={data.segundo_apellido || ""}
								onChange={(e) => onFieldChange?.("segundo_apellido", e.target.value.toUpperCase())}
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
								onChange={(e) => onFieldChange?.("numero_documento", e.target.value.toUpperCase())}
							/>
						</div>
						<div className="space-y-1">
							<Label className="text-sm">Extensión CI</Label>
							<Input
								value={data.extension_ci || ""}
								onChange={(e) => onFieldChange?.("extension_ci", e.target.value.toUpperCase())}
								placeholder="Ej: A, Z, etc."
							/>
						</div>
						<div className="space-y-1">
							<Label className="text-sm">Nacionalidad *</Label>
							<Input
								value={data.nacionalidad || ""}
								onChange={(e) => onFieldChange?.("nacionalidad", e.target.value.toUpperCase())}
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
								onChange={(e) => onFieldChange?.("profesion_oficio", e.target.value.toUpperCase())}
							/>
						</div>
						<div className="space-y-1">
							<Label className="text-sm">Actividad Económica</Label>
							<Input
								value={data.actividad_economica || ""}
								onChange={(e) => onFieldChange?.("actividad_economica", e.target.value.toUpperCase())}
							/>
						</div>
						<div className="space-y-1">
							<Label className="text-sm">Lugar de Trabajo</Label>
							<Input
								value={data.lugar_trabajo || ""}
								onChange={(e) => onFieldChange?.("lugar_trabajo", e.target.value.toUpperCase())}
							/>
						</div>
						<div className="space-y-1">
							<Label className="text-sm">Cargo</Label>
							<Input
								value={data.cargo || ""}
								onChange={(e) => onFieldChange?.("cargo", e.target.value.toUpperCase())}
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
							<Input
								value={data.nit || ""}
								onChange={(e) => onFieldChange?.("nit", e.target.value.toUpperCase())}
							/>
						</div>
						<div className="space-y-1">
							<Label className="text-sm">Dirección de Facturación</Label>
							<Input
								value={data.domicilio_comercial || ""}
								onChange={(e) => onFieldChange?.("domicilio_comercial", e.target.value.toUpperCase())}
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
		</div>
	);
}

interface UnipersonalClientGeneralProps {
	naturalData: NaturalClient;
	unipersonalData: UnipersonalClient;
	isEditing?: boolean;
	onNaturalFieldChange?: (field: keyof NaturalClient, value: unknown) => void;
	onUnipersonalFieldChange?: (field: keyof UnipersonalClient, value: unknown) => void;
}

function UnipersonalClientGeneral({
	naturalData,
	unipersonalData,
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
								onChange={(e) => onNaturalFieldChange?.("primer_nombre", e.target.value.toUpperCase())}
							/>
						</div>
						<div className="space-y-1">
							<Label className="text-sm">Primer Apellido *</Label>
							<Input
								value={naturalData.primer_apellido || ""}
								onChange={(e) =>
									onNaturalFieldChange?.("primer_apellido", e.target.value.toUpperCase())
								}
							/>
						</div>
						<div className="space-y-1">
							<Label className="text-sm">Número de Documento *</Label>
							<Input
								value={naturalData.numero_documento || ""}
								onChange={(e) =>
									onNaturalFieldChange?.("numero_documento", e.target.value.toUpperCase())
								}
							/>
						</div>
						<div className="space-y-1">
							<Label className="text-sm">Nacionalidad *</Label>
							<Input
								value={naturalData.nacionalidad || ""}
								onChange={(e) => onNaturalFieldChange?.("nacionalidad", e.target.value.toUpperCase())}
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
								onChange={(e) =>
									onUnipersonalFieldChange?.("razon_social", e.target.value.toUpperCase())
								}
							/>
						</div>
						<div className="space-y-1">
							<Label className="text-sm">NIT *</Label>
							<Input
								value={unipersonalData.nit || ""}
								onChange={(e) => onUnipersonalFieldChange?.("nit", e.target.value.toUpperCase())}
							/>
						</div>
						<div className="space-y-1">
							<Label className="text-sm">Matrícula de Comercio</Label>
							<Input
								value={unipersonalData.matricula_comercio || ""}
								onChange={(e) =>
									onUnipersonalFieldChange?.("matricula_comercio", e.target.value.toUpperCase())
								}
							/>
						</div>
						<div className="space-y-1">
							<Label className="text-sm">Actividad Económica *</Label>
							<Input
								value={unipersonalData.actividad_economica_comercial || ""}
								onChange={(e) =>
									onUnipersonalFieldChange?.(
										"actividad_economica_comercial",
										e.target.value.toUpperCase(),
									)
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
										e.target.value ? Number(e.target.value) : null,
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
								onChange={(e) =>
									onUnipersonalFieldChange?.("nombre_representante", e.target.value.toUpperCase())
								}
							/>
						</div>
						<div className="space-y-1">
							<Label className="text-sm">CI del Representante *</Label>
							<Input
								value={unipersonalData.ci_representante || ""}
								onChange={(e) =>
									onUnipersonalFieldChange?.("ci_representante", e.target.value.toUpperCase())
								}
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
		</div>
	);
}

interface JuridicClientGeneralProps {
	data: JuridicClient;
	isEditing?: boolean;
	onFieldChange?: (field: keyof JuridicClient, value: unknown) => void;
}

function JuridicClientGeneral({ data, isEditing = false, onFieldChange }: JuridicClientGeneralProps) {
	if (isEditing) {
		return (
			<div className="space-y-6">
				<InfoSection title="Datos de la Empresa" isEditing>
					<div className="grid grid-cols-2 gap-4">
						<div className="space-y-1">
							<Label className="text-sm">Razón Social *</Label>
							<Input
								value={data.razon_social || ""}
								onChange={(e) => onFieldChange?.("razon_social", e.target.value.toUpperCase())}
							/>
						</div>
						<div className="space-y-1">
							<Label className="text-sm">NIT *</Label>
							<Input
								value={data.nit || ""}
								onChange={(e) => onFieldChange?.("nit", e.target.value.toUpperCase())}
							/>
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
								onChange={(e) => onFieldChange?.("matricula_comercio", e.target.value.toUpperCase())}
							/>
						</div>
						<div className="space-y-1">
							<Label className="text-sm">País de Constitución *</Label>
							<Input
								value={data.pais_constitucion || ""}
								onChange={(e) => onFieldChange?.("pais_constitucion", e.target.value.toUpperCase())}
							/>
						</div>
						<div className="space-y-1">
							<Label className="text-sm">Actividad Económica</Label>
							<Input
								value={data.actividad_economica || ""}
								onChange={(e) => onFieldChange?.("actividad_economica", e.target.value.toUpperCase())}
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
		</div>
	);
}

// Etiquetas legibles para los enums de los tipos organizacionales
const SPORTS_DISCIPLINE_LABELS: Record<string, string> = {
	futbol: "Fútbol",
	basquetbol: "Básquetbol",
	voleibol: "Vóleibol",
	tenis: "Tenis",
	natacion: "Natación",
	ciclismo: "Ciclismo",
	multiple: "Múltiple",
	otra: "Otra",
};
const CLUB_REGISTRY_LABELS: Record<string, string> = {
	municipal: "Municipal",
	gobernacion: "Gobernación",
	viceministerio_de_deportes: "Viceministerio de Deportes",
	otra: "Otra",
};
const ASOCIACION_TYPE_LABELS: Record<string, string> = {
	sociedad_profesional: "Sociedad Profesional",
	asociacion_gremial: "Asociación Gremial",
	fundacion: "Fundación",
	otra: "Otra",
};

// Campos de representante legal compartidos por ONG, Club y Asociación Civil
type OrgRepFields = {
	nombre_representante: string;
	apellido_representante: string;
	cargo_representante: string;
	ci_representante: string;
	extension_ci_representante: string | null;
};

function OrgRepresentativeEdit({
	data,
	onFieldChange,
}: {
	data: OrgRepFields;
	onFieldChange: (field: string, value: unknown) => void;
}) {
	return (
		<InfoSection title="Representante Legal" isEditing>
			<div className="grid grid-cols-2 gap-4">
				<div className="space-y-1">
					<Label className="text-sm">Nombre *</Label>
					<Input
						value={data.nombre_representante || ""}
						onChange={(e) => onFieldChange("nombre_representante", e.target.value.toUpperCase())}
					/>
				</div>
				<div className="space-y-1">
					<Label className="text-sm">Apellido *</Label>
					<Input
						value={data.apellido_representante || ""}
						onChange={(e) => onFieldChange("apellido_representante", e.target.value.toUpperCase())}
					/>
				</div>
				<div className="space-y-1">
					<Label className="text-sm">Cargo *</Label>
					<Input
						value={data.cargo_representante || ""}
						onChange={(e) => onFieldChange("cargo_representante", e.target.value.toUpperCase())}
					/>
				</div>
				<div className="space-y-1">
					<Label className="text-sm">CI *</Label>
					<Input
						value={data.ci_representante || ""}
						onChange={(e) => onFieldChange("ci_representante", e.target.value.toUpperCase())}
					/>
				</div>
				<div className="space-y-1">
					<Label className="text-sm">Extensión CI</Label>
					<Input
						value={data.extension_ci_representante || ""}
						onChange={(e) => onFieldChange("extension_ci_representante", e.target.value.toUpperCase())}
						placeholder="Ej: SC, LP, etc."
					/>
				</div>
			</div>
		</InfoSection>
	);
}

function OrgRepresentativeView({ data }: { data: OrgRepFields }) {
	const extension = data.extension_ci_representante ? ` ${data.extension_ci_representante}` : "";
	return (
		<InfoSection title="Representante Legal">
			<InfoRow
				label="Nombre"
				value={`${data.nombre_representante} ${data.apellido_representante || ""}`.trim()}
			/>
			<InfoRow label="Cargo" value={data.cargo_representante} />
			<InfoRow label="CI" value={`${data.ci_representante}${extension}`} />
		</InfoSection>
	);
}

interface OngClientGeneralProps {
	data: OngClient;
	isEditing?: boolean;
	onFieldChange?: (field: keyof OngClient, value: unknown) => void;
}

function OngClientGeneral({ data, isEditing = false, onFieldChange }: OngClientGeneralProps) {
	if (isEditing) {
		return (
			<div className="space-y-6">
				<InfoSection title="Datos de la ONG" isEditing>
					<div className="grid grid-cols-2 gap-4">
						<div className="space-y-1">
							<Label className="text-sm">Nombre de la ONG *</Label>
							<Input
								value={data.nombre_ong || ""}
								onChange={(e) => onFieldChange?.("nombre_ong", e.target.value.toUpperCase())}
							/>
						</div>
						<div className="space-y-1">
							<Label className="text-sm">Sigla</Label>
							<Input
								value={data.sigla || ""}
								onChange={(e) => onFieldChange?.("sigla", e.target.value.toUpperCase())}
							/>
						</div>
						<div className="space-y-1">
							<Label className="text-sm">NIT</Label>
							<Input
								value={data.nit || ""}
								onChange={(e) => onFieldChange?.("nit", e.target.value.toUpperCase())}
							/>
						</div>
						<div className="space-y-1">
							<Label className="text-sm">N° Registro VIPFE</Label>
							<Input
								value={data.numero_registro_vipfe || ""}
								onChange={(e) => onFieldChange?.("numero_registro_vipfe", e.target.value.toUpperCase())}
							/>
						</div>
						<div className="space-y-1">
							<Label className="text-sm">País de Origen *</Label>
							<Input
								value={data.pais_origen || ""}
								onChange={(e) => onFieldChange?.("pais_origen", e.target.value.toUpperCase())}
							/>
						</div>
						<div className="space-y-1">
							<Label className="text-sm">Actividad Principal</Label>
							<Input
								value={data.actividad_principal || ""}
								onChange={(e) => onFieldChange?.("actividad_principal", e.target.value.toUpperCase())}
							/>
						</div>
					</div>
				</InfoSection>

				<OrgRepresentativeEdit data={data} onFieldChange={onFieldChange as (f: string, v: unknown) => void} />
			</div>
		);
	}

	return (
		<div className="space-y-6">
			<InfoSection title="Datos de la ONG">
				<InfoRow label="Nombre" value={data.nombre_ong} />
				{data.sigla && <InfoRow label="Sigla" value={data.sigla} />}
				{data.nit && <InfoRow label="NIT" value={data.nit} />}
				{data.numero_registro_vipfe && <InfoRow label="N° Registro VIPFE" value={data.numero_registro_vipfe} />}
				<InfoRow label="País de Origen" value={data.pais_origen} />
				{data.actividad_principal && <InfoRow label="Actividad Principal" value={data.actividad_principal} />}
			</InfoSection>

			<OrgRepresentativeView data={data} />
		</div>
	);
}

interface ClubClientGeneralProps {
	data: ClubClient;
	isEditing?: boolean;
	onFieldChange?: (field: keyof ClubClient, value: unknown) => void;
}

function ClubClientGeneral({ data, isEditing = false, onFieldChange }: ClubClientGeneralProps) {
	if (isEditing) {
		return (
			<div className="space-y-6">
				<InfoSection title="Datos del Club" isEditing>
					<div className="grid grid-cols-2 gap-4">
						<div className="space-y-1">
							<Label className="text-sm">Nombre del Club *</Label>
							<Input
								value={data.nombre_club || ""}
								onChange={(e) => onFieldChange?.("nombre_club", e.target.value.toUpperCase())}
							/>
						</div>
						<div className="space-y-1">
							<Label className="text-sm">Sigla</Label>
							<Input
								value={data.sigla || ""}
								onChange={(e) => onFieldChange?.("sigla", e.target.value.toUpperCase())}
							/>
						</div>
						<div className="space-y-1">
							<Label className="text-sm">Disciplina Principal *</Label>
							<Select
								value={data.disciplina_principal || ""}
								onValueChange={(v) => onFieldChange?.("disciplina_principal", v)}
							>
								<SelectTrigger>
									<SelectValue placeholder="Seleccionar..." />
								</SelectTrigger>
								<SelectContent>
									{SPORTS_DISCIPLINES.map((d) => (
										<SelectItem key={d} value={d}>
											{SPORTS_DISCIPLINE_LABELS[d] ?? d}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
						<div className="space-y-1">
							<Label className="text-sm">NIT</Label>
							<Input
								value={data.nit || ""}
								onChange={(e) => onFieldChange?.("nit", e.target.value.toUpperCase())}
							/>
						</div>
						<div className="space-y-1">
							<Label className="text-sm">N° Registro VIPFE</Label>
							<Input
								value={data.numero_registro_vipfe || ""}
								onChange={(e) => onFieldChange?.("numero_registro_vipfe", e.target.value.toUpperCase())}
							/>
						</div>
						<div className="space-y-1">
							<Label className="text-sm">Tipo de Registro *</Label>
							<Select
								value={data.tipo_registro || ""}
								onValueChange={(v) => onFieldChange?.("tipo_registro", v)}
							>
								<SelectTrigger>
									<SelectValue placeholder="Seleccionar..." />
								</SelectTrigger>
								<SelectContent>
									{CLUB_REGISTRY_TYPES.map((t) => (
										<SelectItem key={t} value={t}>
											{CLUB_REGISTRY_LABELS[t] ?? t}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
						<div className="space-y-1">
							<Label className="text-sm">Entidad Emisora *</Label>
							<Input
								value={data.entidad_registro || ""}
								onChange={(e) => onFieldChange?.("entidad_registro", e.target.value.toUpperCase())}
							/>
						</div>
						<div className="space-y-1">
							<Label className="text-sm">Número de Registro *</Label>
							<Input
								value={data.numero_registro || ""}
								onChange={(e) => onFieldChange?.("numero_registro", e.target.value.toUpperCase())}
							/>
						</div>
					</div>
				</InfoSection>

				<OrgRepresentativeEdit data={data} onFieldChange={onFieldChange as (f: string, v: unknown) => void} />
			</div>
		);
	}

	return (
		<div className="space-y-6">
			<InfoSection title="Datos del Club">
				<InfoRow label="Nombre" value={data.nombre_club} />
				{data.sigla && <InfoRow label="Sigla" value={data.sigla} />}
				<InfoRow
					label="Disciplina Principal"
					value={SPORTS_DISCIPLINE_LABELS[data.disciplina_principal] ?? data.disciplina_principal}
				/>
				{data.nit && <InfoRow label="NIT" value={data.nit} />}
				{data.numero_registro_vipfe && <InfoRow label="N° Registro VIPFE" value={data.numero_registro_vipfe} />}
				<InfoRow label="Tipo de Registro" value={CLUB_REGISTRY_LABELS[data.tipo_registro] ?? data.tipo_registro} />
				<InfoRow label="Entidad Emisora" value={data.entidad_registro} />
				<InfoRow label="Número de Registro" value={data.numero_registro} />
			</InfoSection>

			<OrgRepresentativeView data={data} />
		</div>
	);
}

interface AsociacionCivilClientGeneralProps {
	data: AsociacionCivilClient;
	isEditing?: boolean;
	onFieldChange?: (field: keyof AsociacionCivilClient, value: unknown) => void;
}

function AsociacionCivilClientGeneral({ data, isEditing = false, onFieldChange }: AsociacionCivilClientGeneralProps) {
	if (isEditing) {
		return (
			<div className="space-y-6">
				<InfoSection title="Datos de la Asociación" isEditing>
					<div className="grid grid-cols-2 gap-4">
						<div className="space-y-1">
							<Label className="text-sm">Nombre de la Asociación *</Label>
							<Input
								value={data.nombre_asociacion || ""}
								onChange={(e) => onFieldChange?.("nombre_asociacion", e.target.value.toUpperCase())}
							/>
						</div>
						<div className="space-y-1">
							<Label className="text-sm">Sigla</Label>
							<Input
								value={data.sigla || ""}
								onChange={(e) => onFieldChange?.("sigla", e.target.value.toUpperCase())}
							/>
						</div>
						<div className="space-y-1">
							<Label className="text-sm">Tipo de Asociación *</Label>
							<Select
								value={data.tipo_asociacion || ""}
								onValueChange={(v) => onFieldChange?.("tipo_asociacion", v)}
							>
								<SelectTrigger>
									<SelectValue placeholder="Seleccionar..." />
								</SelectTrigger>
								<SelectContent>
									{ASOCIACION_CIVIL_TYPES.map((t) => (
										<SelectItem key={t} value={t}>
											{ASOCIACION_TYPE_LABELS[t] ?? t}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
						<div className="space-y-1">
							<Label className="text-sm">Rubro o Actividad *</Label>
							<Input
								value={data.rubro_actividad || ""}
								onChange={(e) => onFieldChange?.("rubro_actividad", e.target.value.toUpperCase())}
							/>
						</div>
						<div className="space-y-1">
							<Label className="text-sm">NIT</Label>
							<Input
								value={data.nit || ""}
								onChange={(e) => onFieldChange?.("nit", e.target.value.toUpperCase())}
							/>
						</div>
						<div className="space-y-1">
							<Label className="text-sm">N° Personería Jurídica *</Label>
							<Input
								value={data.numero_personeria_juridica || ""}
								onChange={(e) =>
									onFieldChange?.("numero_personeria_juridica", e.target.value.toUpperCase())
								}
							/>
						</div>
						<div className="space-y-1">
							<Label className="text-sm">Entidad Otorgante *</Label>
							<Input
								value={data.entidad_otorgante_personeria || ""}
								onChange={(e) =>
									onFieldChange?.("entidad_otorgante_personeria", e.target.value.toUpperCase())
								}
							/>
						</div>
					</div>
				</InfoSection>

				<OrgRepresentativeEdit data={data} onFieldChange={onFieldChange as (f: string, v: unknown) => void} />
			</div>
		);
	}

	return (
		<div className="space-y-6">
			<InfoSection title="Datos de la Asociación">
				<InfoRow label="Nombre" value={data.nombre_asociacion} />
				{data.sigla && <InfoRow label="Sigla" value={data.sigla} />}
				<InfoRow
					label="Tipo de Asociación"
					value={ASOCIACION_TYPE_LABELS[data.tipo_asociacion] ?? data.tipo_asociacion}
				/>
				<InfoRow label="Rubro o Actividad" value={data.rubro_actividad} />
				{data.nit && <InfoRow label="NIT" value={data.nit} />}
				<InfoRow label="N° Personería Jurídica" value={data.numero_personeria_juridica} />
				<InfoRow label="Entidad Otorgante" value={data.entidad_otorgante_personeria} />
			</InfoSection>

			<OrgRepresentativeView data={data} />
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
	onOngFieldChange?: (field: keyof OngClient, value: unknown) => void;
	onClubFieldChange?: (field: keyof ClubClient, value: unknown) => void;
	onAsociacionFieldChange?: (field: keyof AsociacionCivilClient, value: unknown) => void;
	onExtraPhonesChange?: (phones: ExtraPhone[]) => void;
}

function ContactInfo({
	client,
	editData,
	isEditing = false,
	onNaturalFieldChange,
	onJuridicFieldChange,
	onUnipersonalFieldChange,
	onOngFieldChange,
	onClubFieldChange,
	onAsociacionFieldChange,
	onExtraPhonesChange,
}: ContactInfoProps) {
	const naturalData = isEditing ? editData?.natural_data || client.natural_data : client.natural_data;
	const juridicData = isEditing ? editData?.juridic_data || client.juridic_data : client.juridic_data;
	const unipersonalData = isEditing ? editData?.unipersonal_data || client.unipersonal_data : client.unipersonal_data;
	const ongData = isEditing ? editData?.ong_data || client.ong_data : client.ong_data;
	const clubData = isEditing ? editData?.club_data || client.club_data : client.club_data;
	const asociacionData = isEditing
		? editData?.asociacion_civil_data || client.asociacion_civil_data
		: client.asociacion_civil_data;

	// Las asociaciones civiles, ONG y clubes comparten el mismo set de campos de
	// contacto (dirección, correo, teléfono); se unifican para evitar repetir UI.
	const orgContact =
		client.client_type === "ong" && ongData
			? {
					direccion: ongData.direccion,
					correo_electronico: ongData.correo_electronico,
					telefono: ongData.telefono,
					onChange: onOngFieldChange as (field: string, value: unknown) => void,
				}
			: client.client_type === "club" && clubData
				? {
						direccion: clubData.direccion,
						correo_electronico: clubData.correo_electronico,
						telefono: clubData.telefono,
						onChange: onClubFieldChange as (field: string, value: unknown) => void,
					}
				: client.client_type === "asociacion_civil" && asociacionData
					? {
							direccion: asociacionData.direccion,
							correo_electronico: asociacionData.correo_electronico,
							telefono: asociacionData.telefono,
							onChange: onAsociacionFieldChange as (field: string, value: unknown) => void,
						}
					: null;

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
									onChange={(e) => onNaturalFieldChange?.("direccion", e.target.value.toUpperCase())}
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
									onChange={(e) =>
										onJuridicFieldChange?.("direccion_legal", e.target.value.toUpperCase())
									}
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
									onChange={(e) =>
										onUnipersonalFieldChange?.("domicilio_comercial", e.target.value.toUpperCase())
									}
								/>
							</div>
							<div className="col-span-2 space-y-1">
								<Label className="text-sm">Dirección Personal *</Label>
								<Input
									value={naturalData.direccion || ""}
									onChange={(e) => onNaturalFieldChange?.("direccion", e.target.value.toUpperCase())}
								/>
							</div>
						</div>
					)}

					{orgContact && (
						<div className="grid grid-cols-2 gap-4">
							<div className="space-y-1">
								<Label className="text-sm">Correo Electrónico</Label>
								<Input
									type="email"
									value={orgContact.correo_electronico || ""}
									onChange={(e) => orgContact.onChange("correo_electronico", e.target.value)}
								/>
							</div>
							<div className="space-y-1">
								<Label className="text-sm">Teléfono</Label>
								<Input
									type="tel"
									value={orgContact.telefono || ""}
									onChange={(e) => orgContact.onChange("telefono", e.target.value)}
								/>
							</div>
							<div className="col-span-2 space-y-1">
								<Label className="text-sm">Dirección *</Label>
								<Input
									value={orgContact.direccion || ""}
									onChange={(e) => orgContact.onChange("direccion", e.target.value.toUpperCase())}
								/>
							</div>
						</div>
					)}
				</InfoSection>

				<InfoSection title="Celulares Adicionales" isEditing>
					<ExtraPhonesInput
						phones={editData?.extra_phones || []}
						onChange={(phones) => onExtraPhonesChange?.(phones)}
					/>
				</InfoSection>
			</div>
		);
	}

	const LABEL_DISPLAY: Record<string, string> = {
		personal: "Personal",
		trabajo: "Trabajo",
		casa: "Casa",
		whatsapp: "WhatsApp",
		otro: "Otro",
	};

	return (
		<div className="space-y-6">
			<InfoSection title="Información de Contacto">
				{client.client_type === "natural" && client.natural_data && (
					<>
						{client.natural_data.correo_electronico && (
							<div className="flex items-start gap-3">
								<Mail className="h-5 w-5 text-muted-foreground mt-0.5" />
								<div>
									<p className="text-xs text-muted-foreground">Correo Electrónico</p>
									<p className="text-sm font-medium text-foreground">
										{client.natural_data.correo_electronico}
									</p>
								</div>
							</div>
						)}
						{client.natural_data.celular && (
							<div className="flex items-start gap-3">
								<Phone className="h-5 w-5 text-muted-foreground mt-0.5" />
								<div>
									<p className="text-xs text-muted-foreground">Teléfono/Celular</p>
									<p className="text-sm font-medium text-foreground">{client.natural_data.celular}</p>
								</div>
							</div>
						)}
						{client.natural_data.direccion && (
							<div className="flex items-start gap-3">
								<MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
								<div>
									<p className="text-xs text-muted-foreground">Dirección</p>
									<p className="text-sm font-medium text-foreground">
										{client.natural_data.direccion}
									</p>
								</div>
							</div>
						)}
					</>
				)}

				{client.client_type === "juridica" && client.juridic_data && (
					<>
						{client.juridic_data.correo_electronico && (
							<div className="flex items-start gap-3">
								<Mail className="h-5 w-5 text-muted-foreground mt-0.5" />
								<div>
									<p className="text-xs text-muted-foreground">Correo Electrónico</p>
									<p className="text-sm font-medium text-foreground">
										{client.juridic_data.correo_electronico}
									</p>
								</div>
							</div>
						)}
						{client.juridic_data.telefono && (
							<div className="flex items-start gap-3">
								<Phone className="h-5 w-5 text-muted-foreground mt-0.5" />
								<div>
									<p className="text-xs text-muted-foreground">Teléfono</p>
									<p className="text-sm font-medium text-foreground">
										{client.juridic_data.telefono}
									</p>
								</div>
							</div>
						)}
						{client.juridic_data.direccion_legal && (
							<div className="flex items-start gap-3">
								<MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
								<div>
									<p className="text-xs text-muted-foreground">Dirección Legal</p>
									<p className="text-sm font-medium text-foreground">
										{client.juridic_data.direccion_legal}
									</p>
								</div>
							</div>
						)}
					</>
				)}

				{client.client_type === "unipersonal" && client.natural_data && client.unipersonal_data && (
					<>
						{client.unipersonal_data.correo_electronico_comercial && (
							<div className="flex items-start gap-3">
								<Mail className="h-5 w-5 text-muted-foreground mt-0.5" />
								<div>
									<p className="text-xs text-muted-foreground">Correo Electrónico Comercial</p>
									<p className="text-sm font-medium text-foreground">
										{client.unipersonal_data.correo_electronico_comercial}
									</p>
								</div>
							</div>
						)}
						{client.unipersonal_data.telefono_comercial && (
							<div className="flex items-start gap-3">
								<Phone className="h-5 w-5 text-muted-foreground mt-0.5" />
								<div>
									<p className="text-xs text-muted-foreground">Teléfono Comercial</p>
									<p className="text-sm font-medium text-foreground">
										{client.unipersonal_data.telefono_comercial}
									</p>
								</div>
							</div>
						)}
						{client.natural_data.celular && (
							<div className="flex items-start gap-3">
								<Phone className="h-5 w-5 text-muted-foreground mt-0.5" />
								<div>
									<p className="text-xs text-muted-foreground">Celular Personal</p>
									<p className="text-sm font-medium text-foreground">{client.natural_data.celular}</p>
								</div>
							</div>
						)}
						{client.unipersonal_data.domicilio_comercial && (
							<div className="flex items-start gap-3">
								<Briefcase className="h-5 w-5 text-muted-foreground mt-0.5" />
								<div>
									<p className="text-xs text-muted-foreground">Domicilio Comercial</p>
									<p className="text-sm font-medium text-foreground">
										{client.unipersonal_data.domicilio_comercial}
									</p>
								</div>
							</div>
						)}
						{client.natural_data.direccion && (
							<div className="flex items-start gap-3">
								<MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
								<div>
									<p className="text-xs text-muted-foreground">Dirección Personal</p>
									<p className="text-sm font-medium text-foreground">
										{client.natural_data.direccion}
									</p>
								</div>
							</div>
						)}
					</>
				)}

				{orgContact && (
					<>
						{orgContact.correo_electronico && (
							<div className="flex items-start gap-3">
								<Mail className="h-5 w-5 text-muted-foreground mt-0.5" />
								<div>
									<p className="text-xs text-muted-foreground">Correo Electrónico</p>
									<p className="text-sm font-medium text-foreground">
										{orgContact.correo_electronico}
									</p>
								</div>
							</div>
						)}
						{orgContact.telefono && (
							<div className="flex items-start gap-3">
								<Phone className="h-5 w-5 text-muted-foreground mt-0.5" />
								<div>
									<p className="text-xs text-muted-foreground">Teléfono</p>
									<p className="text-sm font-medium text-foreground">{orgContact.telefono}</p>
								</div>
							</div>
						)}
						{orgContact.direccion && (
							<div className="flex items-start gap-3">
								<MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
								<div>
									<p className="text-xs text-muted-foreground">Dirección</p>
									<p className="text-sm font-medium text-foreground">{orgContact.direccion}</p>
								</div>
							</div>
						)}
					</>
				)}
			</InfoSection>

			{client.extra_phones && client.extra_phones.length > 0 && (
				<InfoSection title="Celulares Adicionales">
					{client.extra_phones.map((phone, index) => (
						<div key={index} className="flex items-start gap-3">
							<Phone className="h-5 w-5 text-muted-foreground mt-0.5" />
							<div>
								<p className="text-xs text-muted-foreground">
									{LABEL_DISPLAY[phone.etiqueta] || phone.etiqueta}
								</p>
								<p className="text-sm font-medium text-foreground">{phone.numero}</p>
							</div>
						</div>
					))}
				</InfoSection>
			)}
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
		<div className="space-y-3">
			{representatives.map((rep, index) => (
				<div key={index} className="p-4 border border-border rounded-lg">
					<div className="flex items-center gap-2 mb-3">
						<User className="h-4 w-4 text-muted-foreground" />
						<h4 className="text-sm font-semibold text-foreground">
							{`${rep.primer_nombre} ${rep.segundo_nombre || ""} ${rep.primer_apellido} ${
								rep.segundo_apellido || ""
							}`.trim()}
						</h4>
						{rep.is_primary && (
							<span className="ml-auto text-xs font-medium text-teal-800 bg-teal-50 border border-teal-200 px-2 py-0.5 rounded-md">
								Principal
							</span>
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
			<div className="text-center py-12 border-2 border-dashed border-border rounded-lg">
				<FileText className="h-10 w-10 text-muted-foreground/25 mx-auto mb-3" />
				<p className="text-sm font-medium text-foreground">Sin pólizas asociadas</p>
				<p className="text-xs text-muted-foreground mt-1">Este cliente no tiene pólizas registradas.</p>
			</div>
		);
	}

	const formatCurrency = (amount: number, currency: string) => {
		return `${currency} ${amount.toLocaleString("es-BO", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
	};

	return (
		<div className="space-y-2">
			{policies.map((policy) => (
				<div key={policy.id} className="border border-border rounded-lg overflow-hidden">
					<button
						onClick={() => router.push(`/polizas/${policy.id}`)}
						className="w-full px-4 py-3 hover:bg-muted/40 transition-colors duration-100 text-left"
					>
						<div className="flex items-center justify-between gap-3">
							<div className="flex items-center gap-3 flex-1 min-w-0">
								<div className="flex-1 min-w-0">
									<div className="flex items-center gap-2 mb-0.5">
										<StatusBadge status={policy.estado} />
										<span className="text-sm font-semibold text-foreground font-mono">
											{policy.numero_poliza}
										</span>
									</div>
									<p className="text-xs text-muted-foreground truncate">
										{policy.ramo} • {policy.companias_aseguradoras?.nombre || "Sin compañía"}
									</p>
								</div>
							</div>
							<div className="text-right shrink-0">
								<p className="text-sm font-semibold text-foreground tabular-nums">
									{formatCurrency(policy.prima_total, policy.moneda)}
								</p>
								<p className="text-xs text-muted-foreground tabular-nums mt-0.5">
									{new Date(policy.inicio_vigencia).toLocaleDateString()} –{" "}
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
			<div className="text-center py-12 border-2 border-dashed border-border rounded-lg">
				<FileText className="h-10 w-10 text-muted-foreground/25 mx-auto mb-3" />
				<p className="text-sm font-medium text-foreground">Sin documentos cargados</p>
				<p className="text-xs text-muted-foreground mt-1">No hay documentos adjuntos a este cliente.</p>
			</div>
		);
	}

	return (
		<div className="space-y-2">
			{documents.map((doc, index) => {
				const docLabel = (documentTypes as Record<string, string>)[doc.tipo_documento] || doc.tipo_documento;

				return (
					<div
						key={index}
						className="px-4 py-3 border border-border rounded-lg hover:bg-muted/40 transition-colors duration-100"
					>
						<div className="flex items-center gap-3">
							<FileText className="h-8 w-8 text-muted-foreground/40 flex-shrink-0" />

							<div className="flex-1 min-w-0">
								<p className="text-sm font-medium text-foreground">{docLabel}</p>
								<p className="text-xs text-muted-foreground truncate mt-0.5">{doc.nombre_archivo}</p>
								<p className="text-xs text-muted-foreground/70 mt-0.5">
									{formatFileSize(doc.tamano_bytes)}
									{doc.descripcion && ` • ${doc.descripcion}`}
									{" • "}
									{new Date(doc.fecha_subida).toLocaleDateString()}
								</p>
							</div>

							<Button
								variant="outline"
								size="sm"
								onClick={() => onDownload(doc.storage_path, doc.nombre_archivo)}
								className="shrink-0 h-7 px-2.5 text-xs"
							>
								<Download className="h-3.5 w-3.5" />
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
		<div className="border border-border rounded-lg p-5">
			<h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
				{title}
				{isEditing && <span className="text-xs font-medium text-primary">— editando</span>}
			</h3>
			<div className={isEditing ? "space-y-4" : "space-y-3"}>{children}</div>
		</div>
	);
}

function InfoRow({ label, value }: { label: string; value: string | number | null | undefined }) {
	return (
		<div className="grid grid-cols-3 gap-4">
			<p className="text-sm text-muted-foreground">{label}:</p>
			<p className="col-span-2 text-sm font-medium text-foreground">{value ?? "—"}</p>
		</div>
	);
}
