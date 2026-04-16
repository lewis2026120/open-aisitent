import { describe, expect, it } from "vitest";
import { parseChatControlAction } from "./chat-control.js";

describe("parseChatControlAction", () => {
  it("ignores empty input", () => {
    expect(parseChatControlAction("   ")).toEqual({ type: "ignore" });
  });

  it("parses exit command", () => {
    expect(parseChatControlAction("exit")).toEqual({ type: "exit" });
  });

  it("parses new session commands", () => {
    expect(parseChatControlAction("/new")).toEqual({ type: "new-session" });
    expect(parseChatControlAction("/new-session")).toEqual({ type: "new-session" });
    expect(parseChatControlAction("/reset")).toEqual({ type: "new-session" });
    expect(parseChatControlAction("新上下文")).toEqual({ type: "new-session" });
  });

  it("treats other input as a user message", () => {
    expect(parseChatControlAction("请帮我查下退款进度")).toEqual({
      type: "message",
      text: "请帮我查下退款进度",
    });
  });
});
