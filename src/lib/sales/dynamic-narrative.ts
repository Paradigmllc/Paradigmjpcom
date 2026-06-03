import { callDeepSeek } from "../deepseek";
import type { ReportLocale } from "./routing";
import type { Industry, IssueCode } from "./types";

export interface DynamicNarrative {
  hook: string;
  acts: {
    headline: string;
    body: string;
  }[];
  cta: string;
}

export async function generateDynamicNarrative(
  companyName: string,
  industry: Industry | null,
  locale: ReportLocale,
  issues: IssueCode[],
): Promise<DynamicNarrative | null> {
  const language = locale === "ja" ? "Japanese" : "English";
  const prompt = `
You are a top-tier B2B sales consultant.
Write a personalized diagnostic report narrative for a company named "${companyName}".
Industry: ${industry || "Unknown"}
Key Issues Detected: ${issues.join(", ")}
Language: ${language}

Output EXACTLY as JSON, with NO markdown formatting around it:
{
  "hook": "A strong, single-sentence opening hook tailored to their industry and the detected issues.",
  "acts": [
    {
      "headline": "Headline for Issue 1",
      "body": "Business impact of Issue 1 (max 100 characters)"
    },
    {
      "headline": "Headline for Issue 2",
      "body": "Business impact of Issue 2 (max 100 characters)"
    },
    {
      "headline": "Headline for Issue 3",
      "body": "Business impact of Issue 3 (max 100 characters)"
    }
  ],
  "cta": "A compelling call to action to review the details and book a meeting (max 80 characters)."
}
`;

  const response = await callDeepSeek(
    [
      { role: "system", content: "You are a specialized B2B sales copywriter. Always output valid JSON." },
      { role: "user", content: prompt }
    ],
    { responseFormat: "json_object", temperature: 0.5, maxTokens: 1000 }
  );

  if (!response.ok || !response.text) {
    console.warn("[generateDynamicNarrative] LLM failed:", response.error);
    return null;
  }

  try {
    const data = JSON.parse(response.text) as DynamicNarrative;
    return data;
  } catch (e) {
    console.warn("[generateDynamicNarrative] JSON parse failed:", e);
    return null;
  }
}
