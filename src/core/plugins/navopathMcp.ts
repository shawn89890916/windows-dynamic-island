/**
 * NavoPath MCP Client
 * Communicates directly with the remote NavoPath Streamable HTTP MCP Server.
 */

export interface NavoPathTask {
	id: string;
	title: string;
	dueDate?: string;
	priority?: string;
	urgency?: string;
	workflowStatus?: string;
	completed?: boolean;
	estimatedHours?: number;
	plannedForDate?: string;
}

export interface NavoPathSummary {
	projects: number;
	openTasks: number;
	completedTasks: number;
}

interface McpSession {
	sessionId: string;
	endpoint: string;
	token: string;
	initializedAt: number;
}

let activeSession: McpSession | null = null;
let reqCounter = 1;

function parseMcpPayload(raw: string): unknown {
	const lines = raw.split("\n");
	for (const line of lines) {
		if (line.startsWith("data:")) {
			const dataStr = line.slice(5).trim();
			try {
				const parsed = JSON.parse(dataStr);
				const contentText = parsed.result?.content?.[0]?.text;
				if (contentText) {
					try {
						return JSON.parse(contentText);
					} catch {
						return contentText;
					}
				}
				if (parsed.result) return parsed.result;
			} catch {
				// continue
			}
		}
	}
	try {
		const direct = JSON.parse(raw);
		const contentText = direct.result?.content?.[0]?.text;
		if (contentText) {
			try {
				return JSON.parse(contentText);
			} catch {
				return contentText;
			}
		}
		return direct.result ?? direct;
	} catch {
		return null;
	}
}

async function getOrInitSession(endpoint: string, token: string): Promise<string> {
	if (
		activeSession &&
		activeSession.endpoint === endpoint &&
		activeSession.token === token &&
		Date.now() - activeSession.initializedAt < 1000 * 60 * 30
	) {
		return activeSession.sessionId;
	}

	const res = await fetch(endpoint, {
		method: "POST",
		headers: {
			Authorization: `Bearer ${token}`,
			"Content-Type": "application/json",
			Accept: "application/json, text/event-stream",
		},
		body: JSON.stringify({
			jsonrpc: "2.0",
			id: reqCounter++,
			method: "initialize",
			params: {
				protocolVersion: "2024-11-05",
				capabilities: {},
				clientInfo: {
					name: "windows-dynamic-island",
					version: "1.0.0",
				},
			},
		}),
	});

	const sessionId = res.headers.get("mcp-session-id");
	if (!sessionId) {
		throw new Error("Failed to initialize MCP session: no mcp-session-id returned");
	}

	activeSession = {
		sessionId,
		endpoint,
		token,
		initializedAt: Date.now(),
	};

	return sessionId;
}

export async function callMcpTool<T>(
	endpoint: string,
	token: string,
	toolName: string,
	args: Record<string, unknown> = {},
): Promise<T> {
	if (!token) throw new Error("MCP token is required");
	const sessionId = await getOrInitSession(endpoint, token);

	const res = await fetch(endpoint, {
		method: "POST",
		headers: {
			Authorization: `Bearer ${token}`,
			"Content-Type": "application/json",
			Accept: "application/json, text/event-stream",
			"mcp-session-id": sessionId,
		},
		body: JSON.stringify({
			jsonrpc: "2.0",
			id: reqCounter++,
			method: "tools/call",
			params: {
				name: toolName,
				arguments: args,
			},
		}),
	});

	if (!res.ok) {
		// Session may have expired
		activeSession = null;
		throw new Error(`MCP tool call ${toolName} failed with HTTP ${res.status}`);
	}

	const rawText = await res.text();
	const parsed = parseMcpPayload(rawText);
	return parsed as T;
}

export async function fetchNavoPathSummary(endpoint: string, token: string): Promise<NavoPathSummary> {
	return callMcpTool<NavoPathSummary>(endpoint, token, "get_workspace_summary");
}

export async function fetchNavoPathTasks(endpoint: string, token: string, limit = 10): Promise<NavoPathTask[]> {
	return callMcpTool<NavoPathTask[]>(endpoint, token, "list_tasks", {
		status: "open",
		limit,
	});
}

export async function createNavoPathTask(endpoint: string, token: string, title: string): Promise<NavoPathTask> {
	return callMcpTool<NavoPathTask>(endpoint, token, "create_task", { title });
}

export async function completeNavoPathTask(endpoint: string, token: string, taskId: string): Promise<unknown> {
	return callMcpTool(endpoint, token, "update_task", {
		taskId,
		patch: {
			completed: true,
			workflowStatus: "done",
		},
	});
}
