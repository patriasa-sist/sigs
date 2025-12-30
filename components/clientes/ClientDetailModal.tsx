"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { X, User, Building2, FileText, Briefcase, Phone, Mail, MapPin, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getClientDetailsComplete, type ClienteDetalleCompleto } from "@/app/clientes/detail-actions";
import { formatFileSize, getDocumentTypesForClientType, type ClienteDocumento } from "@/types/clienteDocumento";
import type { NaturalClient, JuridicClient, UnipersonalClient } from "@/types/database/client";

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

	useEffect(() => {
		async function loadClientDetails() {
			setIsLoading(true);
			setError(null);

			const result = await getClientDetailsComplete(clientId);

			console.log("[ClientDetailModal] Result:", result);

			if (result.success && result.data) {
				console.log("[ClientDetailModal] Setting client data:", result.data);
				setClient(result.data);
			} else {
				console.error("[ClientDetailModal] Error:", result.error);
				setError(result.error || "Error al cargar detalles");
			}

			setIsLoading(false);
		}

		loadClientDetails();
	}, [clientId]);

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
							<h2 className="text-xl font-semibold">Detalles del Cliente</h2>
							<p className="text-sm text-gray-600">
								{client.client_type === "natural"
									? "Persona Natural"
									: client.client_type === "unipersonal"
										? "Unipersonal"
										: "Persona Jurídica"}
							</p>
						</div>
					</div>
					<Button variant="ghost" size="icon" onClick={onClose} className="rounded-full">
						<X className="h-5 w-5" />
					</Button>
				</div>

				{/* Content */}
				<div className="flex-1 overflow-y-auto p-6">
					<Tabs defaultValue="general" className="w-full">
						<TabsList className="grid w-full grid-cols-5">
							<TabsTrigger value="general">General</TabsTrigger>
							<TabsTrigger value="contacto">Contacto</TabsTrigger>
							{client.partner && <TabsTrigger value="conyuge">Cónyuge</TabsTrigger>}
							{client.legal_representatives && client.legal_representatives.length > 0 && (
								<TabsTrigger value="representantes">Representantes</TabsTrigger>
							)}
							<TabsTrigger value="polizas">
								Pólizas ({client.policies?.length || 0})
							</TabsTrigger>
							<TabsTrigger value="documentos">
								Documentos ({client.documents?.length || 0})
							</TabsTrigger>
						</TabsList>

						{/* GENERAL TAB */}
						<TabsContent value="general" className="space-y-6">
							{client.client_type === "natural" && client.natural_data && (
								<NaturalClientGeneral data={client.natural_data} executive={client.executive_name} />
							)}
							{client.client_type === "unipersonal" && client.unipersonal_data && client.natural_data && (
								<UnipersonalClientGeneral
									naturalData={client.natural_data}
									unipersonalData={client.unipersonal_data}
									executive={client.executive_name}
								/>
							)}
							{client.client_type === "juridica" && client.juridic_data && (
								<JuridicClientGeneral data={client.juridic_data} executive={client.executive_name} />
							)}
						</TabsContent>

						{/* CONTACTO TAB */}
						<TabsContent value="contacto" className="space-y-6">
							<ContactInfo client={client} />
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
					</Tabs>
				</div>
			</div>
		</div>
	);
}

// Helper Components

function NaturalClientGeneral({ data, executive }: { data: NaturalClient; executive?: string }) {
	return (
		<div className="space-y-6">
			<InfoSection title="Datos Personales">
				<InfoRow label="Nombres" value={`${data.primer_nombre} ${data.segundo_nombre || ""}`.trim()} />
				<InfoRow label="Apellidos" value={`${data.primer_apellido} ${data.segundo_apellido || ""}`.trim()} />
				<InfoRow label="Documento" value={`${data.tipo_documento.toUpperCase()} ${data.numero_documento} ${data.extension_ci || ""}`} />
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
				{data.nivel_ingresos && <InfoRow label="Nivel de Ingresos" value={`Bs. ${data.nivel_ingresos.toLocaleString()}`} />}
			</InfoSection>

			{data.nit && (
				<InfoSection title="Datos de Facturación">
					<InfoRow label="NIT" value={data.nit} />
					{data.domicilio_comercial && <InfoRow label="Dirección de Facturación" value={data.domicilio_comercial} />}
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

function UnipersonalClientGeneral({
	naturalData,
	unipersonalData,
	executive,
}: {
	naturalData: NaturalClient;
	unipersonalData: UnipersonalClient;
	executive?: string;
}) {
	return (
		<div className="space-y-6">
			<InfoSection title="Datos Personales del Propietario">
				<InfoRow label="Nombres" value={`${naturalData.primer_nombre} ${naturalData.segundo_nombre || ""}`.trim()} />
				<InfoRow label="Apellidos" value={`${naturalData.primer_apellido} ${naturalData.segundo_apellido || ""}`.trim()} />
				<InfoRow label="Documento" value={`${naturalData.tipo_documento.toUpperCase()} ${naturalData.numero_documento} ${naturalData.extension_ci || ""}`} />
				<InfoRow label="Nacionalidad" value={naturalData.nacionalidad} />
			</InfoSection>

			<InfoSection title="Datos Comerciales">
				<InfoRow label="Razón Social" value={unipersonalData.razon_social} />
				<InfoRow label="NIT" value={unipersonalData.nit} />
				<InfoRow label="Matrícula de Comercio" value={unipersonalData.matricula_comercio} />
				<InfoRow label="Actividad Económica" value={unipersonalData.actividad_economica_comercial} />
				{unipersonalData.nivel_ingresos && (
					<InfoRow label="Nivel de Ingresos" value={`Bs. ${unipersonalData.nivel_ingresos.toLocaleString()}`} />
				)}
			</InfoSection>

			<InfoSection title="Representante">
				<InfoRow label="Nombre" value={unipersonalData.nombre_representante} />
				<InfoRow label="CI" value={`${unipersonalData.ci_representante} ${unipersonalData.extension_representante || ""}`} />
			</InfoSection>

			{executive && (
				<InfoSection title="Información Adicional">
					<InfoRow label="Director de Cartera" value={executive} />
				</InfoSection>
			)}
		</div>
	);
}

function JuridicClientGeneral({ data, executive }: { data: JuridicClient; executive?: string }) {
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

function ContactInfo({ client }: { client: ClienteDetalleCompleto }) {
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
									<p className="font-medium">{client.unipersonal_data.correo_electronico_comercial}</p>
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
				<InfoRow label="Apellidos" value={`${partner.primer_apellido} ${partner.segundo_apellido || ""}`.trim()} />
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
							{`${rep.primer_nombre} ${rep.segundo_nombre || ""} ${rep.primer_apellido} ${rep.segundo_apellido || ""}`.trim()}
						</h4>
						{rep.is_primary && (
							<Badge variant="default" className="ml-auto">
								Principal
							</Badge>
						)}
					</div>
					<div className="grid grid-cols-2 gap-3 text-sm">
						<InfoRow label="Documento" value={`${rep.tipo_documento} ${rep.numero_documento} ${rep.extension || ""}`} />
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
								<p className="font-semibold text-primary">{formatCurrency(policy.prima_total, policy.moneda)}</p>
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

function InfoSection({ title, children }: { title: string; children: React.ReactNode }) {
	return (
		<div className="border rounded-lg p-4">
			<h3 className="font-semibold text-gray-900 mb-4">{title}</h3>
			<div className="space-y-3">{children}</div>
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
