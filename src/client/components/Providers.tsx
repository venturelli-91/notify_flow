"use client";

import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "sonner";
import { queryClient } from "@client/lib/queryClient";
import { type ReactNode } from "react";

/**
 * Providers — client boundary that mounts all React context providers.
 *
 * Kept separate from layout.tsx so the root layout stays a Server Component.
 * SRP : only responsibility is wrapping children with the required providers.
 */
export function Providers({ children }: { readonly children: ReactNode }) {
	return (
		<QueryClientProvider client={queryClient}>
			{children}
			<Toaster position="bottom-right" richColors />
		</QueryClientProvider>
	);
}
