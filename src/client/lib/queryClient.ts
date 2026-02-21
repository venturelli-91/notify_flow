import { QueryClient } from "@tanstack/react-query";

/**
 * TanStack QueryClient singleton — shared across the entire client app.
 *
 * SRP: only responsibility is configuring default query behaviour.
 * Not imported by any server-side code.
 */
export const queryClient = new QueryClient({
	defaultOptions: {
		queries: {
			staleTime: 1000 * 30, // 30 seconds
			retry: 1,
			refetchOnWindowFocus: true,
		},
		mutations: {
			retry: 0,
		},
	},
});
