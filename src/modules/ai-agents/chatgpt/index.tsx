import type { AgentDefinition } from "../common/types";
import { ChatGptIcon } from "./ChatGptIcon";
import { useChatGpt } from "./useChatGpt";

export const chatgptAgent: AgentDefinition = {
	id: "chatgpt",
	name: "ChatGPT",
	color: "#10A37F",
	Icon: ChatGptIcon,
	useAgent: useChatGpt,
	usageUrl: "https://chatgpt.com",
	openSession: () => {
		window.open("chatgpt://", "_blank");
	},
};
