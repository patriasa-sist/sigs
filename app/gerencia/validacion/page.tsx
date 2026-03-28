import { requirePermission } from "@/utils/auth/helpers";
import { ValidacionTabs } from "@/components/gerencia/ValidacionTabs";
import { obtenerPolizasPendientes } from "./actions";
import { obtenerAnexosPendientes } from "@/app/gerencia/validacion-anexos/actions";
import { Card } from "@/components/ui/card";
import { CheckSquare, FileText, GitPullRequest, Banknote } from "lucide-react";

export const metadata = {
	title: "Validación - Gerencia",
	description: "Validación de pólizas y anexos pendientes de aprobación",
};

export default async function ValidacionPage() {
	await requirePermission("polizas.validar");

	const [polizasResult, anexosResult] = await Promise.all([obtenerPolizasPendientes(), obtenerAnexosPendientes()]);

	const polizas = polizasResult.success ? (polizasResult.polizas ?? []) : [];
	const anexos = anexosResult.success ? (anexosResult.anexos ?? []) : [];
	const polizasError = !polizasResult.success ? polizasResult.error : null;
	const anexosError = !anexosResult.success ? anexosResult.error : null;

	// KPIs calculados server-side
	const primaAcumulada = polizas.reduce((sum, p) => sum + ((p as { prima_total?: number }).prima_total ?? 0), 0);
	const polizaMasAntigua = polizas.reduce<string | null>((oldest, p) => {
		const fecha = (p as { created_at?: string }).created_at ?? "";
		if (!oldest || fecha < oldest) return fecha;
		return oldest;
	}, null);
	const diasEsperandoMax = polizaMasAntigua
		? Math.floor((Date.now() - new Date(polizaMasAntigua).getTime()) / (1000 * 60 * 60 * 24))
		: 0;

	return (
		<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-8">
			{/* Page header */}
			<div className="mb-6">
				<div className="flex items-center gap-2 mb-1">
					<CheckSquare className="h-5 w-5 text-primary" />
					<h1 className="text-2xl font-semibold text-foreground">Validación</h1>
				</div>
				<p className="text-sm text-muted-foreground">
					Revisa y valida pólizas y anexos antes de que se activen en el sistema
				</p>
			</div>

			{/* KPI strip */}
			<div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
				<KpiCard
					icon={<FileText className="h-4 w-4" />}
					label="Pólizas pendientes"
					value={String(polizas.length)}
					accent={polizas.length > 0}
				/>
				<KpiCard
					icon={<GitPullRequest className="h-4 w-4" />}
					label="Anexos pendientes"
					value={String(anexos.length)}
					accent={anexos.length > 0}
				/>
				<KpiCard
					icon={<Banknote className="h-4 w-4" />}
					label="Prima acumulada"
					value={
						primaAcumulada > 0
							? `Bs ${primaAcumulada.toLocaleString("es-BO", { maximumFractionDigits: 0 })}`
							: "—"
					}
				/>
				<KpiCard
					icon={<CheckSquare className="h-4 w-4" />}
					label="Más antiguo"
					value={diasEsperandoMax === 0 ? "—" : diasEsperandoMax === 1 ? "1 día" : `${diasEsperandoMax} días`}
					alert={diasEsperandoMax >= 3}
				/>
			</div>

			{/* Error banners */}
			{(polizasError || anexosError) && (
				<div className="rounded-md border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive mb-6">
					<p className="font-semibold">Error al cargar datos</p>
					{polizasError && <p className="mt-1">Pólizas: {polizasError}</p>}
					{anexosError && <p className="mt-1">Anexos: {anexosError}</p>}
				</div>
			)}

			<ValidacionTabs polizas={polizas} anexos={anexos} />
		</div>
	);
}

function KpiCard({
	icon,
	label,
	value,
	accent,
	alert,
}: {
	icon: React.ReactNode;
	label: string;
	value: string;
	accent?: boolean;
	alert?: boolean;
}) {
	return (
		<Card className="p-4 shadow-sm">
			<div className="flex items-center gap-2 mb-2">
				<span className={alert ? "text-amber-600" : accent ? "text-primary" : "text-muted-foreground"}>
					{icon}
				</span>
				<span className="text-xs text-muted-foreground">{label}</span>
			</div>
			<p
				className={`text-xl font-semibold tabular-nums ${
					alert ? "text-amber-700" : accent ? "text-primary" : "text-foreground"
				}`}
			>
				{value}
			</p>
		</Card>
	);
}
