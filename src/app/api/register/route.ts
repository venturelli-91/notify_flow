import { NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "@server/lib/prisma";

const schema = z.object({
	name: z.string().min(2, "Name must be at least 2 characters"),
	email: z.string().email("Invalid email"),
	password: z.string().min(6, "Password must be at least 6 characters"),
});

export async function POST(req: Request) {
	const body = await req.json().catch(() => null);
	const parsed = schema.safeParse(body);

	if (!parsed.success) {
		return NextResponse.json(
			{ error: parsed.error.issues[0]?.message ?? "Invalid input" },
			{ status: 400 },
		);
	}

	const { name, email, password } = parsed.data;

	const existing = await prisma.user.findUnique({ where: { email } });
	if (existing) {
		return NextResponse.json(
			{ error: "Email already in use" },
			{ status: 409 },
		);
	}

	const hashed = await bcrypt.hash(password, 10);
	await prisma.user.create({ data: { name, email, password: hashed } });

	return NextResponse.json({ ok: true }, { status: 201 });
}
