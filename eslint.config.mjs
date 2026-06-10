import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
	baseDirectory: __dirname,
});

const eslintConfig = [
	...compat.extends("next/core-web-vitals", "next/typescript"),
	{
		// El <Image> de @react-pdf/renderer no acepta prop `alt` (renderiza a PDF,
		// no a HTML). jsx-a11y/alt-text genera falsos positivos en estos archivos.
		files: ["components/**/pdf/**/*.tsx"],
		rules: {
			"jsx-a11y/alt-text": "off",
		},
	},
];

export default eslintConfig;
