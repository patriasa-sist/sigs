"use client";

import { useState } from "react";
import { ChevronRight, ChevronLeft, CheckCircle2, Plus, Trash2, Users, Home, Edit2 } from "lucide-react";
import type { DatosIncendio, BienAseguradoIncendio, AseguradoIncendio } from "@/types/poliza";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { BuscadorClientes } from "../BuscadorClientes";

type Props = {
	datos: DatosIncendio | null;
	regionales: Array<{ id: string; nombre: string }>;
	onChange: (datos: DatosIncendio) => void;
	onSiguiente: () => void;
	onAnterior: () => void;
};

export function IncendioForm({ datos, regionales, onChange, onSiguiente, onAnterior }: Props) {
	const [tipoPoliza, setTipoPoliza] = useState<"individual" | "corporativo">(
		datos?.tipo_poliza || "individual"
	);
	const [valorAsegurado, setValorAsegurado] = useState<number>(datos?.valor_asegurado || 0);
	const [regionalId, setRegionalId] = useState<string>(datos?.regional_asegurado_id || "");
	const [bienes, setBienes] = useState<BienAseguradoIncendio[]>(datos?.bienes || []);
	const [asegurados, setAsegurados] = useState<AseguradoIncendio[]>(datos?.asegurados || []);

	// Estados para modal de bien
	const [mostrarModalBien, setMostrarModalBien] = useState(false);
	const [bienEditando, setBienEditando] = useState<number | null>(null);
	const [direccionBien, setDireccionBien] = useState("");
	const [valorDeclarado, setValorDeclarado] = useState<number>(0);
	const [esPrimerRiesgo, setEsPrimerRiesgo] = useState(false);

	const [mostrarBuscador, setMostrarBuscador] = useState(false);
	const [errores, setErrores] = useState<Record<string, string>>({});

	const abrirModalBien = (index?: number) => {
		if (index !== undefined) {
			const bien = bienes[index];
			setBienEditando(index);
			setDireccionBien(bien.direccion);
			setValorDeclarado(bien.valor_declarado);
			setEsPrimerRiesgo(bien.es_primer_riesgo);
		} else {
			setBienEditando(null);
			setDireccionBien("");
			setValorDeclarado(0);
			setEsPrimerRiesgo(false);
		}
		setMostrarModalBien(true);
	};

	const guardarBien = () => {
		if (!direccionBien.trim()) {
			alert("Debe ingresar una dirección");
			return;
		}
		if (valorDeclarado <= 0) {
			alert("El valor declarado debe ser mayor a 0");
			return;
		}

		const nuevoBien: BienAseguradoIncendio = {
			direccion: direccionBien,
			valor_declarado: valorDeclarado,
			es_primer_riesgo: esPrimerRiesgo,
		};

		if (bienEditando !== null) {
			// Editar bien existente
			const nuevosBienes = [...bienes];
			nuevosBienes[bienEditando] = nuevoBien;
			setBienes(nuevosBienes);
		} else {
			// Si marca como primer riesgo, desmarcar los demás
			if (esPrimerRiesgo) {
				setBienes([...bienes.map((b) => ({ ...b, es_primer_riesgo: false })), nuevoBien]);
			} else {
				setBienes([...bienes, nuevoBien]);
			}
		}

		setMostrarModalBien(false);
	};

	const eliminarBien = (index: number) => {
		setBienes(bienes.filter((_, i) => i !== index));
	};

	const marcarPrimerRiesgo = (index: number) => {
		setBienes(
			bienes.map((bien, i) => ({
				...bien,
				es_primer_riesgo: i === index,
			}))
		);
	};

	const agregarAsegurado = (cliente: { id: string; nombre: string; ci: string }) => {
		if (asegurados.some((a) => a.client_id === cliente.id)) {
			return;
		}

		setAsegurados([
			...asegurados,
			{
				client_id: cliente.id,
				client_name: cliente.nombre,
				client_ci: cliente.ci,
			},
		]);
		setMostrarBuscador(false);
	};

	const eliminarAsegurado = (clientId: string) => {
		setAsegurados(asegurados.filter((a) => a.client_id !== clientId));
	};

	const handleContinuar = () => {
		const nuevosErrores: Record<string, string> = {};

		if (valorAsegurado <= 0) {
			nuevosErrores.valor_asegurado = "El valor asegurado debe ser mayor a 0";
		}

		if (!regionalId) {
			nuevosErrores.regional = "Debe seleccionar una regional";
		}

		if (bienes.length === 0) {
			nuevosErrores.bienes = "Debe agregar al menos un bien asegurado";
		}

		if (asegurados.length === 0) {
			nuevosErrores.asegurados = "Debe agregar al menos un asegurado";
		}

		if (Object.keys(nuevosErrores).length > 0) {
			setErrores(nuevosErrores);
			return;
		}

		onChange({
			tipo_poliza: tipoPoliza,
			regional_asegurado_id: regionalId,
			valor_asegurado: valorAsegurado,
			bienes,
			asegurados,
		});

		onSiguiente();
	};

	const tieneDatos = valorAsegurado > 0 && regionalId && bienes.length > 0 && asegurados.length > 0;

	return (
		<div className="bg-white rounded-lg shadow-sm border p-6">
			<div className="flex items-center justify-between mb-6">
				<div>
					<h2 className="text-xl font-semibold text-gray-900">
						Paso 3: Datos Específicos - Incendio y Aliados
					</h2>
					<p className="text-sm text-gray-600 mt-1">Configure los bienes y asegurados</p>
				</div>

				{tieneDatos && (
					<div className="flex items-center gap-2 text-green-600">
						<CheckCircle2 className="h-5 w-5" />
						<span className="text-sm font-medium">
							{bienes.length} bien(es), {asegurados.length} asegurado(s)
						</span>
					</div>
				)}
			</div>

			<div className="space-y-6">
				{/* Tipo de Póliza */}
				<div className="space-y-2">
					<Label htmlFor="tipo_poliza">
						Tipo de Póliza <span className="text-red-500">*</span>
					</Label>
					<Select value={tipoPoliza} onValueChange={(value: "individual" | "corporativo") => setTipoPoliza(value)}>
						<SelectTrigger>
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="individual">Individual</SelectItem>
							<SelectItem value="corporativo">Corporativo</SelectItem>
						</SelectContent>
					</Select>
				</div>

				{/* Regional */}
				<div className="space-y-2">
					<Label htmlFor="regional">
						Regional Asegurado <span className="text-red-500">*</span>
					</Label>
					<Select
						value={regionalId}
						onValueChange={(value) => {
							setRegionalId(value);
							if (errores.regional) {
								const { regional, ...rest } = errores;
								setErrores(rest);
							}
						}}
					>
						<SelectTrigger className={errores.regional ? "border-red-500" : ""}>
							<SelectValue placeholder="Seleccione una regional" />
						</SelectTrigger>
						<SelectContent>
							{regionales.map((regional) => (
								<SelectItem key={regional.id} value={regional.id}>
									{regional.nombre}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
					{errores.regional && <p className="text-sm text-red-600">{errores.regional}</p>}
				</div>

				{/* Valor Asegurado Total */}
				<div className="space-y-2">
					<Label htmlFor="valor_asegurado">
						Valor Asegurado Total <span className="text-red-500">*</span>
					</Label>
					<Input
						id="valor_asegurado"
						type="number"
						min="0"
						step="0.01"
						value={valorAsegurado || ""}
						onChange={(e) => {
							setValorAsegurado(parseFloat(e.target.value) || 0);
							if (errores.valor_asegurado) {
								const { valor_asegurado, ...rest } = errores;
								setErrores(rest);
							}
						}}
						placeholder="200000.00"
						className={errores.valor_asegurado ? "border-red-500" : ""}
					/>
					{errores.valor_asegurado && <p className="text-sm text-red-600">{errores.valor_asegurado}</p>}
				</div>

				{/* Bienes Asegurados */}
				<div className="space-y-3">
					<div className="flex items-center justify-between">
						<Label>
							Bienes Asegurados <span className="text-red-500">*</span>
						</Label>
						<Button type="button" variant="outline" size="sm" onClick={() => abrirModalBien()}>
							<Plus className="mr-2 h-4 w-4" />
							Agregar Bien
						</Button>
					</div>

					{errores.bienes && <p className="text-sm text-red-600">{errores.bienes}</p>}

					{bienes.length === 0 ? (
						<div className="border-2 border-dashed rounded-lg p-8 text-center">
							<Home className="h-12 w-12 text-gray-400 mx-auto mb-3" />
							<p className="text-sm text-gray-600">No hay bienes asegurados</p>
							<p className="text-xs text-gray-500 mt-1">Haga clic en "Agregar Bien" para comenzar</p>
						</div>
					) : (
						<div className="border rounded-lg divide-y">
							{bienes.map((bien, index) => (
								<div key={index} className="p-4">
									<div className="flex items-start justify-between gap-4">
										<div className="flex-1">
											<div className="flex items-center gap-2 mb-2">
												<p className="text-sm font-medium text-gray-900">{bien.direccion}</p>
												{bien.es_primer_riesgo && (
													<span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
														PRIMER RIESGO
													</span>
												)}
											</div>
											<p className="text-sm text-gray-600">
												Valor declarado: ${bien.valor_declarado.toLocaleString("es-BO", { minimumFractionDigits: 2 })}
											</p>
										</div>
										<div className="flex gap-2">
											{!bien.es_primer_riesgo && (
												<Button
													type="button"
													variant="outline"
													size="sm"
													onClick={() => marcarPrimerRiesgo(index)}
													title="Marcar como primer riesgo"
												>
													Marcar Principal
												</Button>
											)}
											<Button
												type="button"
												variant="ghost"
												size="sm"
												onClick={() => abrirModalBien(index)}
											>
												<Edit2 className="h-4 w-4" />
											</Button>
											<Button
												type="button"
												variant="ghost"
												size="sm"
												onClick={() => eliminarBien(index)}
											>
												<Trash2 className="h-4 w-4 text-red-600" />
											</Button>
										</div>
									</div>
								</div>
							))}
						</div>
					)}
				</div>

				{/* Lista de Asegurados */}
				<div className="space-y-3">
					<div className="flex items-center justify-between">
						<Label>
							Asegurados <span className="text-red-500">*</span>
						</Label>
						<Button type="button" variant="outline" size="sm" onClick={() => setMostrarBuscador(true)}>
							<Plus className="mr-2 h-4 w-4" />
							Agregar Asegurado
						</Button>
					</div>

					{errores.asegurados && <p className="text-sm text-red-600">{errores.asegurados}</p>}

					{asegurados.length === 0 ? (
						<div className="border-2 border-dashed rounded-lg p-8 text-center">
							<Users className="h-12 w-12 text-gray-400 mx-auto mb-3" />
							<p className="text-sm text-gray-600">No hay asegurados agregados</p>
						</div>
					) : (
						<div className="border rounded-lg divide-y">
							{asegurados.map((asegurado) => (
								<div key={asegurado.client_id} className="p-4 flex items-center justify-between hover:bg-gray-50">
									<div className="flex-1">
										<p className="text-sm font-medium text-gray-900">{asegurado.client_name}</p>
										<p className="text-xs text-gray-600">CI/NIT: {asegurado.client_ci}</p>
									</div>
									<Button
										type="button"
										variant="ghost"
										size="sm"
										onClick={() => eliminarAsegurado(asegurado.client_id)}
									>
										<Trash2 className="h-4 w-4 text-red-600" />
									</Button>
								</div>
							))}
						</div>
					)}
				</div>
			</div>

			{/* Modal para agregar/editar bien */}
			{mostrarModalBien && (
				<div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
					<div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
						<h3 className="text-lg font-semibold mb-4">
							{bienEditando !== null ? "Editar Bien" : "Agregar Bien"}
						</h3>

						<div className="space-y-4">
							<div className="space-y-2">
								<Label htmlFor="direccion_bien">
									Dirección del Bien <span className="text-red-500">*</span>
								</Label>
								<Input
									id="direccion_bien"
									value={direccionBien}
									onChange={(e) => setDireccionBien(e.target.value)}
									placeholder="Av. Principal #123, Zona Centro"
								/>
							</div>

							<div className="space-y-2">
								<Label htmlFor="valor_declarado">
									Valor Declarado (USD) <span className="text-red-500">*</span>
								</Label>
								<Input
									id="valor_declarado"
									type="number"
									min="0"
									step="0.01"
									value={valorDeclarado || ""}
									onChange={(e) => setValorDeclarado(parseFloat(e.target.value) || 0)}
									placeholder="50000.00"
								/>
							</div>

							<div className="flex items-center gap-2">
								<Checkbox
									id="primer_riesgo"
									checked={esPrimerRiesgo}
									onCheckedChange={(checked) => setEsPrimerRiesgo(checked as boolean)}
								/>
								<Label htmlFor="primer_riesgo" className="cursor-pointer">
									Marcar como PRIMER RIESGO (dirección principal)
								</Label>
							</div>
						</div>

						<div className="flex justify-end gap-2 mt-6">
							<Button variant="outline" onClick={() => setMostrarModalBien(false)}>
								Cancelar
							</Button>
							<Button onClick={guardarBien}>
								{bienEditando !== null ? "Actualizar" : "Agregar"}
							</Button>
						</div>
					</div>
				</div>
			)}

			{/* Buscador de Clientes Modal */}
			{mostrarBuscador && (
				<BuscadorClientes
					onSeleccionar={agregarAsegurado}
					onCancelar={() => setMostrarBuscador(false)}
					clientesExcluidos={asegurados.map((a) => a.client_id)}
				/>
			)}

			{/* Botones de navegación */}
			<div className="flex justify-between pt-6 mt-6 border-t">
				<Button variant="outline" onClick={onAnterior}>
					<ChevronLeft className="mr-2 h-5 w-5" />
					Anterior
				</Button>
				<Button onClick={handleContinuar}>
					Continuar
					<ChevronRight className="ml-2 h-5 w-5" />
				</Button>
			</div>
		</div>
	);
}
