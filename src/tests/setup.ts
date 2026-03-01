import "@testing-library/jest-dom";

/**
 * Test environment setup
 * Configure environment variables before any imports that use them
 */

// Set test environment variables if not already set
if (!process.env.DATABASE_URL) {
	process.env.DATABASE_URL =
		"postgresql://user:password@localhost:5433/notifyflow_test";
}

if (!process.env.REDIS_URL) {
	process.env.REDIS_URL = "redis://localhost:6379";
}

if (!process.env.NEXTAUTH_SECRET) {
	process.env.NEXTAUTH_SECRET = "test-secret-key-at-least-32-characters-long";
}

if (!process.env.NEXTAUTH_URL) {
	process.env.NEXTAUTH_URL = "http://localhost:3000";
}

if (!process.env.NODE_ENV) {
	// TypeScript marks NODE_ENV as read-only, but we need to set it for tests
	(process.env as Record<string, string>).NODE_ENV = "test";
}
