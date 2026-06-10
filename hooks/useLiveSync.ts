"use client";

import { useEffect, useRef } from "react";

/**
 * Sincroniza en vivo el estado local de un paso del formulario con el padre,
 * sin necesidad de presionar "Siguiente/Continuar". Esto permite que el
 * borrador (recovery) capture lo que el usuario escribe y que las ediciones
 * posteriores se reflejen en el resumen/guardado.
 *
 * - Omite el primer render: el estado inicial proviene del padre, re-propagarlo
 *   sería un no-op y marcaría secciones como "tocadas" sin interacción.
 * - Si `construir` retorna null (datos aún sin la estructura mínima, p. ej.
 *   contratante sin seleccionar), no se propaga y el padre conserva el último
 *   snapshot válido.
 * - `onChange` se lee desde un ref para tolerar callbacks inline del padre sin
 *   re-disparar el efecto en cada render.
 */
export function useLiveSync<T>(
	construir: () => T | null,
	onChange: (datos: T) => void,
	deps: readonly unknown[],
): void {
	const onChangeRef = useRef(onChange);
	useEffect(() => {
		onChangeRef.current = onChange;
	});

	const construirRef = useRef(construir);
	useEffect(() => {
		construirRef.current = construir;
	});

	const primerRenderRef = useRef(true);

	useEffect(() => {
		if (primerRenderRef.current) {
			primerRenderRef.current = false;
			return;
		}
		const datos = construirRef.current();
		if (datos !== null) {
			onChangeRef.current(datos);
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, deps);
}
