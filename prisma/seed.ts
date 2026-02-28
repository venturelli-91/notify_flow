import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

const pool = new Pool({ connectionString: process.env["DATABASE_URL"] });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
	const password = await bcrypt.hash("admin123", 12);

	// Create admin user
	const user = await prisma.user.upsert({
		where: { email: "admin@notifyflow.com" },
		update: {},
		create: {
			email: "admin@notifyflow.com",
			password,
			name: "Admin User",
		},
	});

	console.log("✓ Admin user ready: admin@notifyflow.com / admin123");

	// Create sample notifications to demonstrate the system
	const sampleNotifications = [
		{
			title: "Welcome to NotifyFlow",
			body: "You can send notifications across email, webhooks, and in-app channels.",
			channel: "in-app" as const,
			status: "sent" as const,
		},
		{
			title: "Deployment succeeded",
			body: "Your application has been successfully deployed to production.",
			channel: "in-app" as const,
			status: "sent" as const,
		},
		{
			title: "Rate limit approaching",
			body: "You have sent 18 out of 20 notifications this minute.",
			channel: "in-app" as const,
			status: "pending" as const,
		},
		{
			title: "System maintenance",
			body: "Scheduled maintenance window: 2-3 AM UTC.",
			channel: "in-app" as const,
			status: "failed" as const,
		},
	];

	for (const notif of sampleNotifications) {
		await prisma.notification.upsert({
			where: { id: `seed-${notif.title}` },
			update: {},
			create: {
				id: `seed-${notif.title}`,
				...notif,
				userId: user.id,
				correlationId: "seed-data",
			},
		});
	}

	console.log(`✓ Created ${sampleNotifications.length} sample notifications`);
	console.log("✓ Database seeding complete!");
	console.log("");
	console.log("Next steps:");
	console.log("  npm run dev              # Start Next.js server");
	console.log("  npm run worker           # Start BullMQ worker (separate terminal)");
	console.log("  http://localhost:3000    # Open in browser");
}

main()
	.catch((err) => {
		console.error("Seed error:", err);
		process.exit(1);
	})
	.finally(() => prisma.$disconnect());
