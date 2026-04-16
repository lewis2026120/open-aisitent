export type ChatControlAction =
  | {
      type: "ignore";
    }
  | {
      type: "exit";
    }
  | {
      type: "new-session";
    }
  | {
      type: "message";
      text: string;
    };

const newSessionCommands = new Set(["/new", "/new-session", "/reset", "新上下文"]);

export function parseChatControlAction(rawInput: string): ChatControlAction {
  const normalized = rawInput.trim();

  if (!normalized) {
    return { type: "ignore" };
  }

  if (normalized.toLowerCase() === "exit") {
    return { type: "exit" };
  }

  if (newSessionCommands.has(normalized.toLowerCase()) || newSessionCommands.has(normalized)) {
    return { type: "new-session" };
  }

  return {
    type: "message",
    text: normalized,
  };
}
