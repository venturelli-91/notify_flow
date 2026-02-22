import { type ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary" | "danger";
type Size = "sm" | "md";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
	readonly variant?: Variant;
	readonly size?: Size;
	readonly isLoading?: boolean;
}

/**
 * Button — OCP in practice.
 *
 * Variants are resolved via a config map, never with if/else chains.
 * Adding a new variant = one new entry in the map. Zero changes elsewhere.
 */
const variantStyles: Record<Variant, string> = {
	primary:
		"bg-violet-600 text-white hover:bg-violet-700 focus-visible:ring-violet-500",
	secondary:
		"bg-gray-100 text-gray-800 hover:bg-gray-200 focus-visible:ring-gray-400",
	danger: "bg-red-600 text-white hover:bg-red-700 focus-visible:ring-red-500",
};

const sizeStyles: Record<Size, string> = {
	sm: "px-3 py-1.5 text-sm",
	md: "px-4 py-2 text-base",
};

export function Button({
	variant = "primary",
	size = "md",
	isLoading = false,
	disabled,
	children,
	className = "",
	...props
}: ButtonProps) {
	return (
		<button
			{...props}
			disabled={disabled ?? isLoading}
			className={[
				"inline-flex items-center justify-center rounded-md font-medium transition-colors",
				"focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
				"disabled:cursor-not-allowed disabled:opacity-50",
				variantStyles[variant],
				sizeStyles[size],
				className,
			].join(" ")}>
			{isLoading && (
				<span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
			)}
			{children}
		</button>
	);
}
