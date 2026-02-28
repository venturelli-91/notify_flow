import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

/**
 * Middleware — authentication + userId injection.
 *
 * Runs on all routes except login, register, NextAuth callbacks, and static files.
 *
 * For API routes: extracts userId from the verified JWT and injects it as
 * the `x-user-id` request header, clearing any spoofed incoming value.
 * Route handlers read this header directly — no need to re-verify the JWT.
 *
 * For dashboard routes: redirects to /login if no valid session exists.
 */
export default withAuth(
	function middleware(req) {
		const userId = req.nextauth.token?.id as string | undefined;

		const headers = new Headers(req.headers);
		// Clear any incoming x-user-id to prevent client-side spoofing.
		headers.delete("x-user-id");
		if (userId) {
			headers.set("x-user-id", userId);
		}

		return NextResponse.next({ request: { headers } });
	},
	{
		callbacks: {
			authorized: ({ token, req }) => {
				// API routes manage their own 401 — let all requests through.
				if (req.nextUrl.pathname.startsWith("/api/")) return true;
				// Dashboard routes require a valid session.
				return !!token;
			},
		},
	},
);

export const config = {
	matcher: [
		// Run on all routes except NextAuth's own API, login/register pages, and static assets.
		"/((?!api/auth|login|register|_next/static|_next/image|favicon.ico).*)",
	],
};
