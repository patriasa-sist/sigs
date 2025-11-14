"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import {
	ClientType,
	NaturalClientFormData,
	JuridicClientFormData,
	naturalClientFormSchema,
	juridicClientFormSchema,
	Executive,
	ClientFormState,
} from "@/types/clientForm";
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
import { JuridicClientForm } from "@/components/clientes/JuridicClientForm";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, Save, X } from "lucide-react";
import { createClient } from "@/utils/supabase/client";

export default function NuevoClientePage() {
	const router = useRouter();
	const supabase = createClient();

	const [clientType, setClientType] = useState<ClientType | null>(null);
	const [executives, setExecutives] = useState<Executive[]>([]);
	const [currentUser, setCurrentUser] = useState<Executive | null>(null);
	const [isLoading, setIsLoading] = useState(true);
	const [isSaving, setIsSaving] = useState(false);

	// Natural client form
	const naturalForm = useForm<NaturalClientFormData>({
		resolver: zodResolver(naturalClientFormSchema),
		mode: "onBlur",
	});

	// Juridic client form
	const juridicForm = useForm<JuridicClientFormData>({
		resolver: zodResolver(juridicClientFormSchema),
		mode: "onBlur",
		defaultValues: {
			legal_representatives: [
				{
					nombre_completo: "",
					ci: "",
					cargo: "",
					telefono: "",
					email: "",
				},
			],
		},
	});

	// Load executives and check for draft on mount
	useEffect(() => {
		const initialize = async () => {
			try {
				// Get current user
				const {
					data: { user },
					error: userError,
				} = await supabase.auth.getUser();

				if (userError) throw userError;

				// Fetch executives from profiles table
				const { data: profiles, error: profilesError } = await supabase
					.from("profiles")
					.select("id, full_name, email")
					.order("full_name");

				if (profilesError) throw profilesError;

				const execs = (profiles || []).map((p) => ({
					id: p.id,
					full_name: p.full_name || p.email,
					email: p.email,
				}));

				setExecutives(execs);

				// Find current user in executives
				const currentExec = execs.find((e) => e.id === user?.id);
				setCurrentUser(currentExec || null);

				// Set current user as default executive if found
				if (currentExec) {
					naturalForm.setValue("executive_id", currentExec.id);
					juridicForm.setValue("executive_id", currentExec.id);
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
							// Restore draft
							setClientType(draft.clientType);

							if (draft.clientType === "natural" && draft.naturalData) {
								Object.entries(draft.naturalData).forEach(([key, value]) => {
									naturalForm.setValue(key as keyof NaturalClientFormData, value as never);
								});
							} else if (draft.clientType === "juridico" && draft.juridicData) {
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
		} else if (clientType === "juridico") {
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
		const shouldCancel = confirm(
			"¿Está seguro que desea cancelar? Se perderá el borrador guardado."
		);

		if (shouldCancel) {
			clearDraft();
			router.push("/clientes");
		}
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

				const formData = naturalForm.getValues();

				// TODO: Save to database
				// For now, just show success message
				console.log("Natural client data:", formData);

				toast.success("Cliente natural creado exitosamente");
				clearDraft();
				router.push("/clientes");
			} else if (clientType === "juridico") {
				const isValid = await juridicForm.trigger();
				if (!isValid) {
					toast.error("Por favor complete todos los campos requeridos");
					setIsSaving(false);
					return;
				}

				const formData = juridicForm.getValues();

				// TODO: Save to database
				// For now, just show success message
				console.log("Juridic client data:", formData);

				toast.success("Cliente jurídico creado exitosamente");
				clearDraft();
				router.push("/clientes");
			}
		} catch (error) {
			console.error("Error saving client:", error);
			toast.error("Error al guardar el cliente");
		} finally {
			setIsSaving(false);
		}
	};

	// Calculate completed sections
	const getCompletedSections = () => {
		if (clientType === "natural") {
			const values = naturalForm.watch();
			return {
				tier1:
					!!values.primer_nombre &&
					!!values.primer_apellido &&
					!!values.tipo_documento &&
					!!values.numero_documento &&
					!!values.nacionalidad &&
					!!values.fecha_nacimiento &&
					!!values.direccion &&
					!!values.estado_civil &&
					!!values.fecha_ingreso_sarlaft &&
					!!values.executive_id,
			};
		} else if (clientType === "juridico") {
			const values = juridicForm.watch();
			return {
				company:
					!!values.razon_social &&
					!!values.nit &&
					!!values.direccion &&
					!!values.telefono &&
					!!values.email &&
					!!values.fecha_constitucion &&
					!!values.actividad_economica &&
					!!values.executive_id,
				representatives:
					values.legal_representatives &&
					values.legal_representatives.length > 0 &&
					values.legal_representatives[0].nombre_completo !== "",
			};
		}
		return {};
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
			<FormProgressBar
				currentStep={clientType ? 2 : 1}
				clientType={clientType}
				completedSections={getCompletedSections()}
			/>

			{/* Client Type Selector */}
			<ClientTypeSelector selectedType={clientType} onSelect={handleClientTypeSelect} />

			{/* Form Content */}
			{clientType === "natural" && (
				<div className="mt-6">
					<NaturalClientForm
						form={naturalForm}
						executives={executives}
						onFieldBlur={handleAutoSave}
					/>
				</div>
			)}

			{clientType === "juridico" && (
				<div className="mt-6">
					<JuridicClientForm form={juridicForm} executives={executives} onFieldBlur={handleAutoSave} />
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
