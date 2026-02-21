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
		detail: (id: string) =>
			[...queryKeys.notifications.all, "detail", id] as const,
	},
	channels: {
		all: ["channels"] as const,
		list: () => [...queryKeys.channels.all, "list"] as const,
	},
} as const;
