import { render } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { type ReactNode } from "react";

/**
 * renderWithProviders — wraps RTL render with a fresh QueryClient per test.
 *
 * A new QueryClient is created for every call so tests never share cache
 * state, which would cause false positives or order-dependent failures.
 * retry: false prevents the client from making extra network calls in tests.
 */
export function renderWithProviders(ui: ReactNode) {
	const queryClient = new QueryClient({
		defaultOptions: {
			queries: { retry: false },
			mutations: { retry: false },
		},
	});

	return render(
		<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>,
	);
}
