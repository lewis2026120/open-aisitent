import type { LlmGenerateRequest } from "../llm/llm-client.js";
import type { TicketPriority, TicketState, TicketStatus } from "../core/contracts.js";
import type { TicketOperationResult } from "../tools/ticket-tools.js";
import { parseTicketModelStep } from "./tickets-react-step.js";
import type {
  TicketToolCycle,
  TicketToolName,
  TicketsAgentResult,
  TicketsAgentRunParams,
} from "./types.js";

const MAX_REACT_STEPS = 4;

export async function runTicketsAgent(
  params: TicketsAgentRunParams,
): Promise<TicketsAgentResult> {
  const latestTicketState = await resolveLatestTicketState(params);
  const promptBundle = params.deps.sectionBuilder.buildTicketsPrompt({
    ...params.input,
    session: {
      ...params.input.session,
      ticketState: latestTicketState,
    },
  });

  const reactResult = await runReactToolLoop({
    params,
    latestTicketState,
    promptBundle: promptBundle.systemPrompt,
  });

  const finalToolResult = await resolveFinalToolResult({
    params,
    latestTicketState: reactResult.latestTicketState,
    plan: reactResult.plan,
    lastLoopToolResult: reactResult.lastLoopToolResult,
  });

  return {
    plan: reactResult.plan,
    promptBundle,
    rawOutput: reactResult.rawOutputs.at(-1) ?? "",
    rawCycleOutputs: reactResult.rawOutputs,
    latestTicketState: finalToolResult.ticketState,
    toolResult: finalToolResult,
    toolCycles: reactResult.toolCycles,
  };
}

async function runReactToolLoop(args: {
  params: TicketsAgentRunParams;
  latestTicketState: TicketState | null;
  promptBundle: string;
}): Promise<{
  plan: TicketsAgentResult["plan"];
  rawOutputs: string[];
  toolCycles: TicketToolCycle[];
  latestTicketState: TicketState | null;
  lastLoopToolResult: TicketOperationResult | null;
}> {
  const { params } = args;
  const rawOutputs: string[] = [];
  const toolCycles: TicketToolCycle[] = [];

  let workingTicketState = args.latestTicketState;
  let lastLoopToolResult: TicketOperationResult | null = null;

  for (let step = 1; step <= MAX_REACT_STEPS; step += 1) {
    const modelResponse = await params.deps.llmClient.generate(
      buildLoopRequest({
        params,
        systemPrompt: args.promptBundle,
        step,
        toolCycles,
      }),
    );

    rawOutputs.push(modelResponse.text);

    const modelStep = parseTicketModelStep(modelResponse.text);
    if (modelStep.kind === "final") {
      return {
        plan: modelStep.plan,
        rawOutputs,
        toolCycles,
        latestTicketState: workingTicketState,
        lastLoopToolResult,
      };
    }

    const loopToolResult = await executeToolCallFromModel({
      params,
      toolName: modelStep.toolCall.name,
      toolArgs: modelStep.toolCall.args,
      latestTicketState: workingTicketState,
    });

    lastLoopToolResult = loopToolResult;
    workingTicketState = loopToolResult.ticketState ?? workingTicketState;
    toolCycles.push({
      step,
      thought: modelStep.thought,
      toolName: modelStep.toolCall.name,
      toolArgs: modelStep.toolCall.args,
      toolResult: loopToolResult.ticketState,
    });
  }

  throw new Error(
    `TicketsAgent exceeded max ReAct steps (${MAX_REACT_STEPS}) without final action plan.`,
  );
}

function buildLoopRequest(args: {
  params: TicketsAgentRunParams;
  systemPrompt: string;
  step: number;
  toolCycles: TicketToolCycle[];
}): LlmGenerateRequest {
  return {
    systemPrompt: args.systemPrompt,
    inputText: buildLoopInputText({
      latestUserMessage: args.params.input.session.latestUserMessage,
      toolCycles: args.toolCycles,
    }),
    metadata: {
      variant: "tickets",
      sessionId: args.params.input.session.sessionId,
      customerId: args.params.input.session.customerId,
      reactStep: args.step,
      toolCycleCount: args.toolCycles.length,
    },
  };
}

function buildLoopInputText(args: {
  latestUserMessage: string;
  toolCycles: TicketToolCycle[];
}): string {
  if (args.toolCycles.length === 0) {
    return args.latestUserMessage;
  }

  const observationLines = args.toolCycles.map((cycle) => {
    return [
      `Step ${cycle.step} thought: ${cycle.thought ?? "(none)"}`,
      `Step ${cycle.step} tool: ${cycle.toolName}`,
      `Step ${cycle.step} args: ${JSON.stringify(cycle.toolArgs)}`,
      `Step ${cycle.step} result: ${formatTicketState(cycle.toolResult)}`,
    ].join("\n");
  });

  return [
    args.latestUserMessage,
    "",
    "Tool observations from previous steps:",
    observationLines.join("\n\n"),
    "",
    "Now decide next tool call or output final action JSON.",
  ].join("\n");
}

function formatTicketState(ticketState: TicketState | null): string {
  if (!ticketState) {
    return "null";
  }

  return JSON.stringify({
    ticketId: ticketState.ticketId,
    status: ticketState.status,
    priority: ticketState.priority,
    summary: ticketState.summary,
    lastUpdateAt: ticketState.lastUpdateAt,
  });
}

async function resolveLatestTicketState(params: TicketsAgentRunParams): Promise<TicketState | null> {
  const ticketId =
    params.input.preferredTicketId ?? params.input.session.ticketState?.ticketId ?? undefined;
  if (!ticketId) {
    return params.input.session.ticketState ?? null;
  }

  const queried = await params.deps.ticketTools.ticketsQuery({
    ticketId,
    customerId: params.input.session.customerId,
    sessionId: params.input.session.sessionId,
  });

  return queried ?? params.input.session.ticketState ?? null;
}

async function resolveFinalToolResult(args: {
  params: TicketsAgentRunParams;
  latestTicketState: TicketState | null;
  plan: TicketsAgentResult["plan"];
  lastLoopToolResult: TicketOperationResult | null;
}): Promise<TicketOperationResult> {
  if (args.lastLoopToolResult && args.lastLoopToolResult.action === args.plan.action) {
    return args.lastLoopToolResult;
  }

  return executeTicketPlan({
    params: args.params,
    latestTicketState: args.latestTicketState,
    plan: args.plan,
  });
}

async function executeToolCallFromModel(args: {
  params: TicketsAgentRunParams;
  toolName: TicketToolName;
  toolArgs: Record<string, string>;
  latestTicketState: TicketState | null;
}): Promise<TicketOperationResult> {
  const { params, toolName, toolArgs, latestTicketState } = args;

  if (toolName === "ticketsQuery") {
    const ticketState = await params.deps.ticketTools.ticketsQuery({
      ticketId: toolArgs.ticketId ?? latestTicketState?.ticketId ?? params.input.preferredTicketId,
      customerId: params.input.session.customerId,
      sessionId: params.input.session.sessionId,
    });
    return { action: "query", ticketState };
  }

  if (toolName === "ticketsCreate") {
    const ticketState = await params.deps.ticketTools.ticketsCreate({
      customerId: params.input.session.customerId,
      sessionId: params.input.session.sessionId,
      summary: toolArgs.summary ?? params.input.session.latestUserMessage,
      message: toolArgs.message ?? params.input.session.latestUserMessage,
      priority: parsePriority(toolArgs.priority),
    });
    return { action: "create", ticketState };
  }

  const ticketId =
    toolArgs.ticketId ?? latestTicketState?.ticketId ?? params.input.preferredTicketId;
  if (!ticketId) {
    throw new Error("TicketsAgent ReAct update step requires ticketId.");
  }

  const ticketState = await params.deps.ticketTools.ticketsUpdate({
    ticketId,
    message: toolArgs.message ?? params.input.session.latestUserMessage,
    summary: toolArgs.summary,
    priority: parsePriority(toolArgs.priority),
    status: parseStatus(toolArgs.status),
  });

  return { action: "update", ticketState };
}

async function executeTicketPlan(args: {
  params: TicketsAgentRunParams;
  latestTicketState: TicketState | null;
  plan: TicketsAgentResult["plan"];
}): Promise<TicketOperationResult> {
  const { params, latestTicketState, plan } = args;

  if (plan.action === "query") {
    const ticketState = await params.deps.ticketTools.ticketsQuery({
      ticketId:
        plan.ticketFields.ticketId ??
        latestTicketState?.ticketId ??
        params.input.preferredTicketId,
      customerId: params.input.session.customerId,
      sessionId: params.input.session.sessionId,
    });
    return { action: "query", ticketState };
  }

  if (plan.action === "create") {
    const ticketState = await params.deps.ticketTools.ticketsCreate({
      customerId: params.input.session.customerId,
      sessionId: params.input.session.sessionId,
      summary: plan.ticketFields.summary ?? params.input.session.latestUserMessage,
      message: params.input.session.latestUserMessage,
      priority: parsePriority(plan.ticketFields.priority),
    });
    return { action: "create", ticketState };
  }

  const ticketId =
    plan.ticketFields.ticketId ?? latestTicketState?.ticketId ?? params.input.preferredTicketId;
  if (!ticketId) {
    throw new Error("TicketsAgent cannot update a ticket without a ticketId.");
  }

  const ticketState = await params.deps.ticketTools.ticketsUpdate({
    ticketId,
    message: params.input.session.latestUserMessage,
    summary: plan.ticketFields.summary,
    priority: parsePriority(plan.ticketFields.priority),
    status: parseStatus(plan.ticketFields.status),
  });
  return { action: "update", ticketState };
}

function parsePriority(value: string | undefined): TicketPriority | undefined {
  if (value === "low" || value === "medium" || value === "high") {
    return value;
  }
  return undefined;
}

function parseStatus(value: string | undefined): TicketStatus | undefined {
  if (
    value === "none" ||
    value === "open" ||
    value === "pending" ||
    value === "resolved" ||
    value === "closed"
  ) {
    return value;
  }
  return undefined;
}
