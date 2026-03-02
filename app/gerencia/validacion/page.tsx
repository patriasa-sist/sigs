import { requirePermission } from "@/utils/auth/helpers";
import { ValidacionTabs } from "@/components/gerencia/ValidacionTabs";
import { obtenerPolizasPendientes } from "./actions";
import { obtenerAnexosPendientes } from "@/app/gerencia/validacion-anexos/actions";

export const metadata = {
	title: "Validación - Gerencia",
	description: "Validación de pólizas y anexos pendientes de aprobación",
};

export default async function ValidacionPage() {
	await requirePermission("polizas.validar");

	// Cargar pólizas y anexos pendientes en paralelo
	const [polizasResult, anexosResult] = await Promise.all([
		obtenerPolizasPendientes(),
		obtenerAnexosPendientes(),
	]);

	const polizasError = !polizasResult.success ? polizasResult.error : null;
	const anexosError = !anexosResult.success ? anexosResult.error : null;

	return (
		<div className="container mx-auto py-8 px-4">
			<div className="mb-8">
				<h1 className="text-3xl font-bold mb-2">Validación</h1>
				<p className="text-gray-600">
					Revisa y valida las pólizas y anexos pendientes de aprobación gerencial
				</p>
			</div>

			{(polizasError || anexosError) && (
				<div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-800 mb-6">
					<p className="font-semibold">Error al cargar datos</p>
					{polizasError && <p className="text-sm mt-1">Pólizas: {polizasError}</p>}
					{anexosError && <p className="text-sm mt-1">Anexos: {anexosError}</p>}
				</div>
			)}

			<ValidacionTabs
				polizas={polizasResult.polizas || []}
				anexos={anexosResult.anexos || []}
			/>
		</div>
	);
}
