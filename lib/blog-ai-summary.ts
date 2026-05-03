import { createGroqClient } from "@/lib/groq";
import { extractDescriptionFromHtml } from "@/lib/blog-shared";

const DEFAULT_BLOG_SUMMARY_MODEL = "gemma2-9b-it";

function stripHtmlToPlainText(html: string) {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function sanitizeBlogAiSummary(summary: string, fallback: string) {
  const normalized = summary
    .replace(/^["'\s]+|["'\s]+$/g, "")
    .replace(/\s+/g, " ")
    .trim();

  if (!normalized) {
    return fallback;
  }

  return normalized.slice(0, 160);
}

export async function generateBlogAiSummary(title: string, contentHtml: string) {
  const fallback = extractDescriptionFromHtml(contentHtml);
  const plainText = stripHtmlToPlainText(contentHtml).slice(0, 2200);

  if (!plainText) {
    return fallback;
  }

  try {
    const configuredModel =
      process.env.GROQ_BLOG_SUMMARY_MODEL?.trim()
      || process.env.GROQ_GEMMA_MODEL?.trim()
      || DEFAULT_BLOG_SUMMARY_MODEL;
    const { client: groq, model } = createGroqClient({ model: configuredModel });

    const completion = await groq.chat.completions.create({
      model,
      messages: [
        {
          role: "system",
          content:
            "당신은 한국어 블로그 편집자입니다. 글의 핵심만 2문장 이내, 최대 160자 안쪽으로 자연스럽게 요약하세요. 문장 앞뒤 설명 없이 요약문만 반환하세요.",
        },
        {
          role: "user",
          content: [
            `제목: ${title}`,
            "",
            "본문:",
            plainText,
          ].join("\n"),
        },
      ],
      temperature: 0.4,
      max_tokens: 180,
    });

    const summary = completion.choices[0]?.message?.content ?? "";
    return sanitizeBlogAiSummary(summary, fallback);
  } catch {
    return fallback;
  }
}
