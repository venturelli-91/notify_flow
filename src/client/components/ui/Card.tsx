import { type ReactNode } from "react";

interface CardProps {
	readonly children: ReactNode;
	readonly className?: string;
}

/** Generic surface container — border, shadow, white background. */
export function Card({ children, className = "" }: CardProps) {
	return (
		<div
			className={`rounded-lg border border-gray-200 bg-white p-4 shadow-sm ${className}`}
		>
			{children}
		</div>
	);
}
