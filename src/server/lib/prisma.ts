import { PrismaClient } from "@prisma/client";

/**
 * Prisma singleton — reuses the same PrismaClient across hot-reloads
 * in Next.js development mode.
 *
 * In production a new instance is created once per process.
 *
 * See: https://www.prisma.io/docs/guides/other/troubleshooting-orm/help-articles/nextjs-prisma-client-dev-practices
 */

const globalForPrisma = globalThis as unknown as {
	prisma: PrismaClient | undefined;
};

export const prisma: PrismaClient =
	globalForPrisma.prisma ??
	new PrismaClient({
		log:
			process.env["NODE_ENV"] === "development"
				? ["query", "error", "warn"]
				: ["error"],
	});

if (process.env["NODE_ENV"] !== "production") {
	globalForPrisma.prisma = prisma;
}
