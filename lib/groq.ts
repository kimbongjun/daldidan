import Groq from "groq-sdk";

const DEFAULT_GROQ_MODEL = process.env.GROQ_MODEL?.trim() || "llama-3.1-8b-instant";

export function createGroqClient() {
  const apiKey = process.env.GROQ_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("GROQ_API_KEY가 설정되지 않았습니다.");
  }

  return {
    client: new Groq({ apiKey }),
    model: DEFAULT_GROQ_MODEL,
  };
}
