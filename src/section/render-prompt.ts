import type { PromptSection, PromptVariant } from "./types.js";

const variantTitles: Record<PromptVariant, string> = {
  route: "ServiceAgent Routing Prompt",
  knowledge: "KnowledgeAgent Prompt",
  tickets: "TicketsAgent Prompt",
  handoff: "HandoffToHumanAgent Prompt",
};

export function renderPrompt(variant: PromptVariant, sections: PromptSection[]): string {
  const validSections = sections.filter((section) => section.body.trim().length > 0);

  return [
    `# ${variantTitles[variant]}`,
    "",
    "Use the sections below as the full context for the current task.",
    "Follow the required output format exactly.",
    "",
    ...validSections.flatMap((section) => [renderSection(section), ""]),
  ]
    .join("\n")
    .trim();
}

function renderSection(section: PromptSection): string {
  return [`## ${section.title}`, section.body].join("\n");
}
