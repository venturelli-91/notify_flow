import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import { renderWithProviders } from "@tests/utils/renderWithProviders";
import { NotificationList } from "@client/components/notifications/NotificationList";
import type { Notification } from "@server/core/domain/entities/Notification";

// Mock the hook — the component under test is the list, not the hook
vi.mock("@client/hooks/useNotifications", () => ({
	useNotifications: vi.fn(),
}));

import { useNotifications } from "@client/hooks/useNotifications";
const mockUseNotifications = vi.mocked(useNotifications);

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeNotification(overrides: Partial<Notification> = {}): Notification {
	return {
		id: `id-${Math.random()}`,
		title: "Test notification",
		body: "This is a test",
		channel: "in-app",
		status: "sent",
		metadata: null,
		correlationId: null,
		createdAt: new Date(),
		updatedAt: new Date(),
		...overrides,
	};
}

function mockQuery(overrides: object) {
	mockUseNotifications.mockReturnValue({
		query: {
			isLoading: false,
			isError: false,
			data: undefined,
			...overrides,
		} as ReturnType<typeof useNotifications>["query"],
		mutation: {} as ReturnType<typeof useNotifications>["mutation"],
	});
}

// ── Tests ─────────────────────────────────────────────────────────────────────

beforeEach(() => {
	vi.clearAllMocks();
});

describe("NotificationList", () => {
	it("renders loading skeleton while query is in flight", () => {
		mockQuery({ isLoading: true });
		renderWithProviders(<NotificationList />);
		expect(screen.getByLabelText("Loading notifications")).toBeInTheDocument();
	});

	it("renders notification cards when data is available", async () => {
		const notifications = [
			makeNotification({ title: "First" }),
			makeNotification({ title: "Second" }),
		];
		mockQuery({ data: notifications });

		renderWithProviders(<NotificationList />);

		await waitFor(() => {
			expect(screen.getByText("First")).toBeInTheDocument();
			expect(screen.getByText("Second")).toBeInTheDocument();
		});
	});

	it("renders empty state when the list is empty", () => {
		mockQuery({ data: [] });
		renderWithProviders(<NotificationList />);
		expect(
			screen.getByText(/no notifications yet/i),
		).toBeInTheDocument();
	});

	it("renders error state when query fails", () => {
		mockQuery({ isError: true });
		renderWithProviders(<NotificationList />);
		expect(
			screen.getByText(/failed to load notifications/i),
		).toBeInTheDocument();
	});

	it("shows pulsing badge for optimistic (pending) entries", async () => {
		const optimistic = makeNotification({
			id: "optimistic-1234",
			title: "Sending…",
			status: "pending",
		});
		mockQuery({ data: [optimistic] });

		renderWithProviders(<NotificationList />);

		await waitFor(() => {
			const badge = screen.getByText("Pending");
			expect(badge).toBeInTheDocument();
			expect(badge.className).toContain("animate-pulse");
		});
	});
});
