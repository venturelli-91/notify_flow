/**
 * Centralised query-key factory — eliminates magic strings across the codebase.
 *
 * SRP  : only responsibility is defining stable, hierarchical cache keys.
 * Usage: always import from here; never write ['notifications'] inline.
 */
export const queryKeys = {
	notifications: {
		all: ["notifications"] as const,
		list: () => [...queryKeys.notifications.all, "list"] as const,
	},
	channels: {
		all: ["channels"] as const,
		list: () => [...queryKeys.channels.all, "list"] as const,
	},
	analytics: {
		all: ["analytics"] as const,
		summary: () => [...queryKeys.analytics.all, "summary"] as const,
	},
} as const;
