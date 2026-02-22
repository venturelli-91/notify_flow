import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { Providers } from "@client/components/Providers";

const geistSans = localFont({
	src: "./fonts/GeistVF.woff",
	variable: "--font-geist-sans",
	weight: "100 900",
});

const geistMono = localFont({
	src: "./fonts/GeistMonoVF.woff",
	variable: "--font-geist-mono",
	weight: "100 900",
});

export const metadata: Metadata = {
	title: "NotifyFlow",
	description: "Self-hosted notification engine with multi-channel delivery",
};

/**
 * RootLayout — Server Component.
 *
 * Delegates all client-side provider mounting to <Providers> so this
 * file remains a Server Component and avoids unnecessary client bundles.
 */
export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<html lang="en">
			<body
				className={`${geistSans.variable} ${geistMono.variable} antialiased text-gray-900`}
			>
				<Providers>{children}</Providers>
			</body>
		</html>
	);
}
