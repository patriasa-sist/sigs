"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";

export interface UpdateProfileResult {
	success?: boolean;
	error?: string;
}

export async function updateCommercialProfile(
	_prevState: UpdateProfileResult,
	formData: FormData
): Promise<UpdateProfileResult> {
	const supabase = await createClient();

	const {
		data: { user },
	} = await supabase.auth.getUser();

	if (!user) return { error: "No autenticado" };

	const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
	if (profile?.role !== "admin") return { error: "Sin permisos" };

	const acronimo = ((formData.get("acronimo") as string) || "").trim().toUpperCase().slice(0, 5);
	const cargo = ((formData.get("cargo") as string) || "").trim();
	const telefono = ((formData.get("telefono") as string) || "").trim();

	const { error } = await supabase
		.from("profiles")
		.update({ acronimo, cargo, telefono })
		.eq("id", user.id);

	if (error) return { error: error.message };

	revalidatePath("/profile");
	return { success: true };
}
