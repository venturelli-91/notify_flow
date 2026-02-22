import type { Config } from "tailwindcss";

const config: Config = {
	content: [
		"./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
		"./src/components/**/*.{js,ts,jsx,tsx,mdx}",
		"./src/app/**/*.{js,ts,jsx,tsx,mdx}",
		"./src/client/**/*.{js,ts,jsx,tsx,mdx}",
	],
	theme: {
		extend: {
			colors: {
				background: "var(--background)",
				foreground: "var(--foreground)",
				brand: "var(--brand)",
				"brand-hover": "var(--brand-hover)",
				"brand-accent": "var(--brand-accent)",
				"brand-light": "var(--brand-light)",
				"brand-pale": "var(--brand-pale)",
			},
		},
	},
	plugins: [],
};
export default config;
