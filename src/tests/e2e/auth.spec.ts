import { test, expect } from "@playwright/test";

test("unauthenticated visit redirects to login", async ({ page }) => {
	await page.goto("/");
	await page.waitForURL("/login");
	expect(page.url()).toContain("/login");
});

test("login with valid credentials redirects to dashboard", async ({ page }) => {
	await page.goto("/login");

	// Fill in the login form
	await page.fill("input[type='email']", "admin@notifyflow.com");
	await page.fill("input[type='password']", "admin123");

	// Submit the form
	await page.click("button[type='submit']");

	// Wait for redirect to dashboard
	await page.waitForURL("/", { timeout: 10000 });
	expect(page.url()).toBe("http://localhost:3000/");
});
