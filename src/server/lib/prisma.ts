import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

/**
 * Prisma 7 requires a driver adapter — the connection URL is no longer
 * accepted in schema.prisma or the PrismaClient constructor directly.
 *
 * We use @prisma/adapter-pg (pg Pool) for both local Docker PostgreSQL
 * and Neon.tech in production (Neon speaks the pg wire protocol).
 *
 * The singleton pattern prevents multiple Pool/PrismaClient instances
 * from accumulating across Next.js hot-reloads in development.
 */

const globalForPrisma = globalThis as unknown as {
	prisma: PrismaClient | undefined;
};

function createPrismaClient(): PrismaClient {
	const pool = new Pool({
		connectionString: process.env["DATABASE_URL"],
	});

	const adapter = new PrismaPg(pool);

	return new PrismaClient({
		adapter,
		log:
			process.env["NODE_ENV"] === "development"
				? ["query", "error", "warn"]
				: ["error"],
	});
}

export const prisma: PrismaClient =
	globalForPrisma.prisma ?? createPrismaClient();

if (process.env["NODE_ENV"] !== "production") {
	globalForPrisma.prisma = prisma;
}
