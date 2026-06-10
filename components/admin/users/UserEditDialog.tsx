"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { toast } from "sonner";
import { PenLine, Loader2, Upload, Trash2, Save, ImageIcon } from "lucide-react";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { actualizarDatosFirmante, subirFirma, quitarFirma } from "@/app/admin/users/actions";
import type { AdminUserRow } from "./UsersTable";

const FIRMA_ACCEPT = "image/png,image/jpeg,image/webp";
const FIRMA_MAX_BYTES = 2 * 1024 * 1024;

export function UserEditDialog({ user }: { user: AdminUserRow }) {
	const router = useRouter();
	const [open, setOpen] = useState(false);
	const [saving, setSaving] = useState(false);
	const [uploading, setUploading] = useState(false);
	const fileRef = useRef<HTMLInputElement>(null);

	const [form, setForm] = useState({
		full_name: user.full_name || "",
		cargo: user.cargo || "",
		telefono: user.telefono || "",
		acronimo: user.acronimo || "",
		porcentaje_comision: user.porcentaje_comision != null ? String(user.porcentaje_comision) : "",
	});
	const [firmaUrl, setFirmaUrl] = useState<string | null>(user.firma_url);

	const setField = (key: keyof typeof form, value: string) => setForm((prev) => ({ ...prev, [key]: value }));

	const handleSave = async () => {
		const raw = form.porcentaje_comision.trim();
		const pct = raw === "" ? null : Number(raw);
		if (pct !== null && (isNaN(pct) || pct < 0 || pct > 100)) {
			toast.error("La comisión debe estar entre 0 y 100");
			return;
		}

		setSaving(true);
		const res = await actualizarDatosFirmante(user.id, {
			full_name: form.full_name.trim(),
			cargo: form.cargo.trim(),
			telefono: form.telefono.trim(),
			acronimo: form.acronimo.trim().toUpperCase().slice(0, 5),
			porcentaje_comision: pct,
		});
		setSaving(false);

		if (res.success) {
			toast.success(res.message || "Datos guardados");
			router.refresh();
			setOpen(false);
		} else {
			toast.error(res.error || "No se pudieron guardar los datos");
		}
	};

	const handleSelectFile = async (file: File | undefined) => {
		if (!file) return;
		if (!FIRMA_ACCEPT.split(",").includes(file.type)) {
			toast.error("Formato no permitido (use PNG, JPG o WEBP)");
			return;
		}
		if (file.size > FIRMA_MAX_BYTES) {
			toast.error("La firma supera el límite de 2 MB");
			return;
		}

		setUploading(true);
		const fd = new FormData();
		fd.append("firma", file);
		const res = await subirFirma(user.id, fd);
		setUploading(false);
		if (fileRef.current) fileRef.current.value = "";

		if (res.success) {
			toast.success(res.message || "Firma actualizada");
			if (res.firmaUrl) setFirmaUrl(res.firmaUrl);
			router.refresh();
		} else {
			toast.error(res.error || "No se pudo subir la firma");
		}
	};

	const handleQuitarFirma = async () => {
		setUploading(true);
		const res = await quitarFirma(user.id);
		setUploading(false);
		if (res.success) {
			toast.success(res.message || "Firma eliminada");
			setFirmaUrl(null);
			router.refresh();
		} else {
			toast.error(res.error || "No se pudo quitar la firma");
		}
	};

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogTrigger asChild>
				<DropdownMenuItem onSelect={(e) => e.preventDefault()}>
					<PenLine className="h-4 w-4 mr-2" />
					Editar datos
				</DropdownMenuItem>
			</DialogTrigger>
			<DialogContent className="sm:max-w-lg">
				<DialogHeader>
					<DialogTitle>Editar datos de firmante</DialogTitle>
					<DialogDescription>{user.email}</DialogDescription>
				</DialogHeader>

				<div className="space-y-4 py-2">
					<div className="space-y-1.5">
						<Label htmlFor="full_name">Nombre completo</Label>
						<Input
							id="full_name"
							value={form.full_name}
							onChange={(e) => setField("full_name", e.target.value)}
							placeholder="Ej: Carmen Ferrufino Howard"
						/>
						<p className="text-xs text-muted-foreground">
							Aparece en la firma de las cartas. El Excel resuelve el ejecutivo contra este nombre.
						</p>
					</div>

					<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
						<div className="space-y-1.5">
							<Label htmlFor="cargo">Cargo</Label>
							<Input
								id="cargo"
								value={form.cargo}
								onChange={(e) => setField("cargo", e.target.value)}
								placeholder="Ej: Ejecutiva de Cuentas"
							/>
						</div>
						<div className="space-y-1.5">
							<Label htmlFor="telefono">Teléfono</Label>
							<Input
								id="telefono"
								value={form.telefono}
								onChange={(e) => setField("telefono", e.target.value)}
								placeholder="Ej: 77342938"
								type="tel"
							/>
						</div>
					</div>

					<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
						<div className="space-y-1.5">
							<Label htmlFor="acronimo">Acrónimo</Label>
							<Input
								id="acronimo"
								value={form.acronimo}
								onChange={(e) => setField("acronimo", e.target.value.toUpperCase())}
								placeholder="Ej: CFH"
								maxLength={5}
								className="uppercase font-mono tracking-widest"
							/>
							<p className="text-xs text-muted-foreground">Máx. 5 letras · número de referencia PDF</p>
						</div>
						<div className="space-y-1.5">
							<Label htmlFor="porcentaje_comision">Comisión (%)</Label>
							<Input
								id="porcentaje_comision"
								value={form.porcentaje_comision}
								onChange={(e) => setField("porcentaje_comision", e.target.value)}
								placeholder="Ej: 2.5"
								type="number"
								min={0}
								max={100}
								step="0.01"
							/>
						</div>
					</div>

					{/* Firma */}
					<div className="space-y-2 rounded-md border border-border p-3">
						<Label className="flex items-center gap-2 text-sm">
							<ImageIcon className="h-4 w-4 text-primary" />
							Firma digital
						</Label>
						<div className="flex items-start gap-4">
							<div className="border border-border rounded-md p-2 bg-background w-[180px] h-[80px] flex items-center justify-center shrink-0">
								{firmaUrl ? (
									<Image
										src={firmaUrl}
										alt="Firma"
										width={170}
										height={70}
										className="object-contain max-h-[70px] w-auto"
										unoptimized
									/>
								) : (
									<span className="text-xs text-muted-foreground">Sin firma</span>
								)}
							</div>
							<div className="flex flex-col gap-2">
								<input
									ref={fileRef}
									type="file"
									accept={FIRMA_ACCEPT}
									className="hidden"
									onChange={(e) => handleSelectFile(e.target.files?.[0])}
								/>
								<Button
									type="button"
									variant="outline"
									size="sm"
									disabled={uploading}
									onClick={() => fileRef.current?.click()}
									className="gap-2"
								>
									{uploading ? (
										<Loader2 className="h-4 w-4 animate-spin" />
									) : (
										<Upload className="h-4 w-4" />
									)}
									{firmaUrl ? "Reemplazar firma" : "Subir firma"}
								</Button>
								{firmaUrl && (
									<Button
										type="button"
										variant="ghost"
										size="sm"
										disabled={uploading}
										onClick={handleQuitarFirma}
										className="gap-2 text-destructive hover:text-destructive"
									>
										<Trash2 className="h-4 w-4" />
										Quitar firma
									</Button>
								)}
								<p className="text-xs text-muted-foreground">PNG, JPG o WEBP · máx. 2 MB</p>
							</div>
						</div>
					</div>
				</div>

				<DialogFooter>
					<Button onClick={handleSave} disabled={saving} className="gap-2">
						{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
						Guardar cambios
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
