// app/api/invite/route.ts
import { createClient } from "@/utils/supabase/server"; // Ajusta la ruta si es necesario
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
	// 1. Cliente con el contexto del usuario que hace la llamada
	const supabase = await createClient();

	// 2. Verificar que el usuario que hace la llamada es un admin
	// const {
	// 	data: { user },
	// } = await supabase.auth.getUser();

	// if (!user) {
	// 	return new NextResponse("No autenticado", { status: 401 });
	// }

	// Lógica para verificar el rol de admin (esencial para la seguridad)
	// Debes tener una tabla 'profiles' o similar con una columna 'role'
	// const { data: profile, error: profileError } = await supabase
	// 	.from("profiles")
	// 	.select("role")
	// 	.eq("id", user.id)
	// 	.single();

	// if (profileError || profile?.role !== "admin") {
	// 	return new NextResponse("No autorizado", { status: 403 });
	// }

	// 3. Cliente de Administrador para realizar la invitación
	// Usa el paquete estándar @supabase/supabase-js con la SERVICE_ROLE_KEY
	// ¡IMPORTANTE! Nunca expongas esta clave en el cliente.
	const supabaseAdmin = createAdminClient(
		process.env.NEXT_PUBLIC_SUPABASE_URL!,
		process.env.SUPABASE_SERVICE_ROLE_KEY!
	);

	// 4. Obtener el email del cuerpo de la petición y enviar la invitación
	const { email } = await request.json();
	const { origin } = new URL(request.url); // Obtiene la URL base (ej. https://tu-web.com)

	if (!email) {
		return new NextResponse("Email es requerido", { status: 400 });
	}
	console.log(email);
	console.log(origin);

	const { data, error } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
		// URL a la que el usuario será redirigido tras aceptar la invitación
		redirectTo: `${origin}/auth/signup`,
	});

	if (error) {
		console.error("Error al invitar al usuario:", error.message);
		return new NextResponse(JSON.stringify({ error: error.message }), {
			status: 500,
		});
	}

	return NextResponse.json({ message: "Invitación enviada exitosamente", data });
}
