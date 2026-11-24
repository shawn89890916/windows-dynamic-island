export const SESSION_HOVER_OPEN_DELAY_MS = 240;

/** Open a session after the pointer has settled on it; return a leave handler. */
export function scheduleHoverOpen(action: () => void, delay = SESSION_HOVER_OPEN_DELAY_MS) {
	const timer = setTimeout(action, delay);
	return () => clearTimeout(timer);
}
