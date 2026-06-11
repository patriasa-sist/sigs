import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";

const eslintConfig = [
	...nextCoreWebVitals,
	...nextTypescript,
	{
		// Reglas nuevas del React Compiler (eslint-plugin-react-hooks v7, llegó con
		// eslint-config-next 16). Marcan ~66 patrones preexistentes que funcionan en
		// producción; se bajan a warning para corregirlos incrementalmente en vez de
		// refactorizar todo en el commit de migración a Next 16.
		rules: {
			"react-hooks/set-state-in-effect": "warn",
			"react-hooks/purity": "warn",
			"react-hooks/immutability": "warn",
			"react-hooks/preserve-manual-memoization": "warn",
			"react-hooks/refs": "warn",
			"react-hooks/static-components": "warn",
			"react-hooks/incompatible-library": "warn",
		},
	},
	{
		// El <Image> de @react-pdf/renderer no acepta prop `alt` (renderiza a PDF,
		// no a HTML). jsx-a11y/alt-text genera falsos positivos en estos archivos.
		files: ["components/**/pdf/**/*.tsx"],
		rules: {
			"jsx-a11y/alt-text": "off",
		},
	},
	{
		ignores: ["node_modules/**", ".next/**", "out/**", "build/**", "next-env.d.ts"],
	},
];

export default eslintConfig;
