import Anthropic from "@anthropic-ai/sdk";

const DEFAULT_CLAUDE_MODEL = "claude-haiku-4-5-20251001";

export function createAnthropicClient(options?: { model?: string | null }) {
  const apiKey = process.env.ANTHROPIC_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY가 설정되지 않았습니다.");
  }

  return {
    client: new Anthropic({ apiKey }),
    model: options?.model?.trim() || DEFAULT_CLAUDE_MODEL,
  };
}
