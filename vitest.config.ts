import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
	plugins: [react(), tsconfigPaths()],
	test: {
		environment: "jsdom",
		globals: true,
		setupFiles: ["./src/tests/setup.ts"],
		// Exclude Playwright E2E tests (*.spec.ts) from Vitest
		exclude: [
			"**/node_modules/**",
			"**/dist/**",
			"**/.next/**",
			"**/e2e/**",
			"**/*.spec.ts",
		],
	},
});
