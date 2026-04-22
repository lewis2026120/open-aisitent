import path from "node:path";
import { createHandoffToHumanAgent } from "../agents/handoff-agent.js";
import { createKnowledgeAgent } from "../agents/knowledge-agent.js";
import { createServiceAgent } from "../agents/service-agent.js";
import { createTicketsAgent } from "../agents/tickets-agent.js";
import type { AgentRoute, KnowledgeCandidate, TicketState } from "../core/contracts.js";
import { createGateway } from "../gateway/gateway.js";
import type { GatewayBusinessMessageRequest } from "../gateway/types.js";
import type { LlmClient } from "../llm/llm-client.js";
import {
  createMinimaxClientFromEnv,
  type MinimaxEnvConfig,
} from "../llm/minimax-client.js";
import { createSupportOrchestrator } from "../orchestration/support-orchestrator.js";
import { createFileSessionStore } from "../session/session-store.js";
import { createFakeSqlTicketToolsBundle } from "../tools/fake-ticket-tools.js";
import { createBashTicketToolsBundle } from "../tools/bash-ticket-tools.js";
import { createConsoleHandoffTools } from "../tools/handoff-tools.js";
import type { TicketTools } from "../tools/ticket-tools.js";
import { createDefaultGatewayConfig } from "./default-support-config.js";
import { createHeuristicMockSupportLlmClient } from "./heuristic-mock-support-llm.js";

export interface SupportRuntimeOptions {
  llmMode?: "auto" | "mock" | "minimax";
  route?: AgentRoute;
  storeDir?: string;
  minimaxApiKey?: string;
  minimaxBaseUrl?: string;
  minimaxModel?: string;
  minimaxMaxTokens?: number;
  ticketToolMode?: "native" | "bash";
}

export interface SupportRuntimeTrace {
  llm: {
    mode: "mock" | "minimax";
    model: string;
    baseUrl?: string;
    configuredFromEnv: boolean;
  };
  ingress: {
    channel: string;
    conversationId: string;
    senderId: string;
    senderName?: string;
    messageId: string;
    text: string;
  };
  adaptedSession: {
    sessionId: string;
    customerId: string;
    latestUserMessage: string;
    historyCount: number;
    ticketId?: string;
  };
  sessionStore: {
    storeDir: string;
    sessionFilePath: string;
    transcriptCount: number;
  };
  ticketTools: {
    backend: "native" | "bash";
    databasePath: string;
  };
  routeDecision: {
    route: "knowledge" | "tickets" | "handoff";
    intent: string;
    confidence: number;
    reason: string;
    entities: Record<string, string>;
  };
  downstreamRoute: "knowledge" | "tickets" | "handoff";
  downstreamReply: string;
  knowledgeContextResult:
    | {
        summary: string;
        entryIds: string[];
      }
    | null;
  ticketToolResult:
    | {
        action: "query" | "create" | "update";
        ticketState: TicketState | null;
      }
    | null;
  handoffToolResult:
    | {
        queueId: string;
        acceptedAt: string;
        urgency: "normal" | "urgent";
        consoleView: string;
      }
    | null;
}

export interface SupportRuntime {
  handleBusinessMessage(request: GatewayBusinessMessageRequest): Promise<SupportRuntimeTrace>;
  close(): void;
}

export function createSupportRuntime(options: SupportRuntimeOptions = {}): SupportRuntime {
  const storeDir = options.storeDir ?? path.join(process.cwd(), ".support-session-store");
  const llmSelection = createRuntimeLlmSelection(options);
  const sessionStore = createFileSessionStore(storeDir);
  const ticketBundle = createRuntimeTicketToolsBundle({
    storeDir,
    mode: options.ticketToolMode ?? "native",
  });

  const orchestrator = createSupportOrchestrator({
    serviceAgent: createServiceAgent({ llmClient: llmSelection.client }),
    knowledgeAgent: createKnowledgeAgent({ llmClient: llmSelection.client }),
    ticketsAgent: createTicketsAgent({
      llmClient: llmSelection.client,
      ticketTools: ticketBundle.tools,
    }),
    handoffAgent: createHandoffToHumanAgent({
      llmClient: llmSelection.client,
      handoffTools: createConsoleHandoffTools(),
    }),
  });

  const gateway = createGateway({
    config: createDefaultGatewayConfig(),
    runner: orchestrator,
    sessionStore,
  });

  return {
    async handleBusinessMessage(request: GatewayBusinessMessageRequest): Promise<SupportRuntimeTrace> {
      const result = await gateway.handleBusinessMessage(request);
      const storedRecord = await sessionStore.getRecord(request.conversationId);

      return {
        llm: llmSelection.trace,
        ingress: {
          channel: request.channel,
          conversationId: request.conversationId,
          senderId: request.senderId,
          senderName: request.senderName,
          messageId: request.messageId,
          text: request.text,
        },
        adaptedSession: {
          sessionId: result.session.sessionId,
          customerId: result.session.customerId,
          latestUserMessage: result.session.latestUserMessage,
          historyCount: result.session.history.length,
          ticketId: result.session.ticketState?.ticketId,
        },
        sessionStore: {
          storeDir,
          sessionFilePath: sessionStore.resolveSessionFilePath(request.conversationId),
          transcriptCount: storedRecord?.transcript.length ?? 0,
        },
        ticketTools: {
          backend: ticketBundle.backend,
          databasePath: ticketBundle.databasePath,
        },
        routeDecision: result.orchestratorResult.routeResult.decision,
        downstreamRoute: result.orchestratorResult.downstream.route,
        downstreamReply: result.reply,
        knowledgeContextResult:
          result.orchestratorResult.downstream.route === "knowledge"
            ? {
                summary:
                  result.orchestratorResult.downstream.result.usedKnowledgeContext?.summary ?? "",
                entryIds:
                  result.orchestratorResult.downstream.result.usedKnowledgeContext?.entries.map(
                    (entry) => entry.id,
                  ) ?? [],
              }
            : null,
        ticketToolResult:
          result.orchestratorResult.downstream.route === "tickets"
            ? result.orchestratorResult.downstream.result.toolResult
            : null,
        handoffToolResult:
          result.orchestratorResult.downstream.route === "handoff"
            ? result.orchestratorResult.downstream.result.uploadResult
            : null,
      };
    },
    close(): void {
      ticketBundle.close();
    },
  };
}

function createRuntimeTicketToolsBundle(params: {
  storeDir: string;
  mode: "native" | "bash";
}): {
  backend: "native" | "bash";
  databasePath: string;
  tools: TicketTools;
  close: () => void;
} {
  const databasePath = path.join(params.storeDir, "tickets.sqlite");

  if (params.mode === "bash") {
    const bundle = createBashTicketToolsBundle({
      databasePath,
    });
    return {
      backend: "bash",
      databasePath,
      tools: bundle.tools,
      close: () => {
        // Bash-backed tools are process-based and do not hold DB handles.
      },
    };
  }

  const bundle = createFakeSqlTicketToolsBundle({
    databasePath,
    seed: true,
  });
  return {
    backend: "native",
    databasePath,
    tools: bundle.tools,
    close: () => {
      bundle.close();
    },
  };
}

function createRuntimeLlmSelection(options: SupportRuntimeOptions): {
  client: LlmClient;
  trace: SupportRuntimeTrace["llm"];
} {
  const mode = resolveRuntimeLlmMode(options);
  if (mode === "minimax") {
    const minimaxClient = createMinimaxClientFromEnv(resolveMinimaxEnvConfig(options));
    const minimaxConfig = minimaxClient.getConfig();
    return {
      client: minimaxClient,
      trace: {
        mode: "minimax",
        model: minimaxConfig.model,
        baseUrl: minimaxConfig.baseUrl,
        configuredFromEnv: !options.minimaxApiKey,
      },
    };
  }

  return {
    client: createHeuristicMockSupportLlmClient({
      forcedRoute: options.route,
    }),
    trace: {
      mode: "mock",
      model: "heuristic-mock-support-llm",
      configuredFromEnv: false,
    },
  };
}

function resolveRuntimeLlmMode(options: SupportRuntimeOptions): "mock" | "minimax" {
  if (options.llmMode === "mock") {
    return "mock";
  }

  if (options.llmMode === "minimax") {
    if (!(options.minimaxApiKey ?? process.env.MINIMAX_API_KEY)?.trim()) {
      throw new Error("MiniMax mode requires MINIMAX_API_KEY or options.minimaxApiKey.");
    }
    return "minimax";
  }

  return (options.minimaxApiKey ?? process.env.MINIMAX_API_KEY)?.trim() ? "minimax" : "mock";
}

function resolveMinimaxEnvConfig(options: SupportRuntimeOptions): MinimaxEnvConfig {
  return {
    apiKey: options.minimaxApiKey,
    baseUrl: options.minimaxBaseUrl,
    model: options.minimaxModel,
    maxTokens: options.minimaxMaxTokens,
  };
}
