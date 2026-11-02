export function GeminiIcon({ size = 16, className = "" }: { size?: number; className?: string }) {
	return (
		<svg
			role="img"
			viewBox="0 0 24 24"
			width={size}
			height={size}
			fill="currentColor"
			className={className}
			xmlns="http://www.w3.org/2000/svg"
		>
			<title>Gemini</title>
			<path d="M12 24c0-6.627-5.373-12-12-12 6.627 0 12-5.373 12-12 0 6.627 5.373 12 12 12-6.627 0-12 5.373-12 12z" />
		</svg>
	);
}
