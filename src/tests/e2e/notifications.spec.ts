import { test, expect, Page } from "@playwright/test";

// Helper function to login before each test
async function login(page: Page) {
	await page.goto("/login");
	await page.fill("input[type='email']", "admin@notifyflow.com");
	await page.fill("input[type='password']", "admin123");
	await page.click("button[type='submit']");
	await page.waitForURL("/", { timeout: 10000 });
}

test("send notification and see it in dashboard", async ({ page }) => {
	await login(page);

	// Navigate to send page
	await page.click("a:has-text('+ New Notification')");
	await page.waitForURL("/send");

	// Fill in notification form
	await page.fill("input[placeholder*='Deployment']", "Test Notification");
	await page.fill("textarea[placeholder*='details']", "This is a test notification");

	// Submit the form
	await page.click("button[type='submit']");

	// Wait for success toast
	await page.waitForSelector("text=Notification queued");
	expect(page.locator("text=Notification queued")).toBeVisible();

	// Should redirect back to dashboard
	await page.waitForURL("/");

	// Check that the notification appears in the list
	await page.waitForSelector("text=Test Notification");
	expect(page.locator("text=Test Notification")).toBeVisible();
});

test("delete notification from dashboard", async ({ page }) => {
	await login(page);

	// First, create a notification
	await page.click("a:has-text('+ New Notification')");
	await page.waitForURL("/send");

	await page.fill("input[placeholder*='Deployment']", "Notification to Delete");
	await page.fill("textarea[placeholder*='details']", "This will be deleted");
	await page.click("button[type='submit']");

	await page.waitForSelector("text=Notification queued");
	await page.waitForURL("/");

	// Wait for the notification to appear
	await page.waitForSelector("text=Notification to Delete");

	// Find and click the delete button for this notification
	const notificationCard = page.locator("text=Notification to Delete").first();
	const deleteButton = notificationCard.locator("xpath=./../../button[last()]");
	await deleteButton.click();

	// Notification should disappear from the list
	await page.waitForTimeout(500);
	expect(page.locator("text=Notification to Delete")).not.toBeVisible();
});
