import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

const pool = new Pool({ connectionString: process.env["DATABASE_URL"] });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
	const password = await bcrypt.hash("admin123", 12);

	await prisma.user.upsert({
		where: { email: "admin@notifyflow.com" },
		update: {},
		create: {
			email: "admin@notifyflow.com",
			password,
			name: "Admin",
		},
	});

	console.log("✓ Admin user ready: admin@notifyflow.com / admin123");
}

main()
	.catch(console.error)
	.finally(() => prisma.$disconnect());
