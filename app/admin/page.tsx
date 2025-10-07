import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default async function AdminPage() {
	return (
		<div className="flex-1 w-full">
			<Card>
				<CardHeader>
					<CardTitle>Bienvenido al Panel de Administración</CardTitle>
					<CardDescription>
						Selecciona una opción del menú lateral para gestionar el sistema
					</CardDescription>
				</CardHeader>
				<CardContent>
					<div className="space-y-4">
						<div>
							<h3 className="font-medium mb-2">Administración de Usuarios</h3>
							<ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
								<li>Gestionar usuarios existentes del sistema</li>
								<li>Asignar y modificar roles de usuario</li>
								<li>Enviar invitaciones para nuevos usuarios</li>
								<li>Administrar invitaciones pendientes y expiradas</li>
							</ul>
						</div>
						<div>
							<h3 className="font-medium mb-2">Seguros (Próximamente)</h3>
							<ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
								<li>Gestión de ramos de seguros</li>
								<li>Crear y restaurar backups del sistema</li>
							</ul>
						</div>
					</div>
				</CardContent>
			</Card>
		</div>
	);
}
