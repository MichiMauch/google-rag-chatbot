import { ai } from "./gemini";

const ANALYSIS_MODEL = "gemini-2.0-flash";

export interface MessageAnalysis {
  sentiment: "positive" | "negative" | "neutral";
  sentimentScore: number; // 0.0 - 1.0
  categories: string[];
  urgency: "low" | "medium" | "high";
}

/**
 * Analyzes a user message using Gemini AI to determine:
 * - Sentiment (positive, negative, neutral)
 * - Categories/Topics
 * - Urgency level
 */
export async function analyzeUserMessage(
  content: string
): Promise<MessageAnalysis | null> {
  try {
    const prompt = `Analyze the following user message and provide a structured analysis in JSON format.

User Message: "${content}"

Please analyze:
1. **Sentiment**: Determine if the message sentiment is "positive", "negative", or "neutral"
2. **Sentiment Score**: Provide a confidence score between 0.0 and 1.0 for the sentiment classification
3. **Categories**: Identify 1-3 relevant categories/topics (e.g., "Technical Support", "Product Inquiry", "Billing Question", "Feature Request", "Complaint", "General Question", etc.)
4. **Urgency**: Determine the urgency level as "low", "medium", or "high" based on language indicators (e.g., "urgent", "asap", "immediately" = high; question marks, casual tone = low)

Respond ONLY with a valid JSON object in this exact format:
{
  "sentiment": "positive" | "negative" | "neutral",
  "sentimentScore": 0.85,
  "categories": ["Category 1", "Category 2"],
  "urgency": "low" | "medium" | "high"
}`;

    const result = await ai.models.generateContent({
      model: ANALYSIS_MODEL,
      contents: prompt,
    });
    const text = result.text || "";

    // Extract JSON from response (might be wrapped in markdown code blocks)
    let jsonText = text.trim();
    if (jsonText.startsWith("```json")) {
      jsonText = jsonText.replace(/```json\n?/g, "").replace(/```\n?/g, "");
    } else if (jsonText.startsWith("```")) {
      jsonText = jsonText.replace(/```\n?/g, "");
    }

    const analysis = JSON.parse(jsonText);

    // Validate response structure
    if (
      !analysis.sentiment ||
      !["positive", "negative", "neutral"].includes(analysis.sentiment)
    ) {
      console.error("Invalid sentiment value:", analysis.sentiment);
      return null;
    }

    if (
      typeof analysis.sentimentScore !== "number" ||
      analysis.sentimentScore < 0 ||
      analysis.sentimentScore > 1
    ) {
      console.error("Invalid sentiment score:", analysis.sentimentScore);
      return null;
    }

    if (!Array.isArray(analysis.categories) || analysis.categories.length === 0) {
      console.error("Invalid categories:", analysis.categories);
      return null;
    }

    if (
      !analysis.urgency ||
      !["low", "medium", "high"].includes(analysis.urgency)
    ) {
      console.error("Invalid urgency value:", analysis.urgency);
      return null;
    }

    return {
      sentiment: analysis.sentiment,
      sentimentScore: analysis.sentimentScore,
      categories: analysis.categories,
      urgency: analysis.urgency,
    };
  } catch (error: any) {
    console.error("Error analyzing message:", error);

    // Handle specific error types
    if (error.message?.includes("RATE_LIMIT_EXCEEDED")) {
      console.error("Gemini API rate limit exceeded");
    } else if (error.message?.includes("SAFETY")) {
      console.error("Content blocked by safety filters");
    }

    return null;
  }
}

/**
 * Analyzes a user message with retry logic for robustness
 */
export async function analyzeUserMessageWithRetry(
  content: string,
  maxRetries: number = 2
): Promise<MessageAnalysis | null> {
  let lastError: any = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const result = await analyzeUserMessage(content);
      if (result) {
        return result;
      }
    } catch (error: any) {
      lastError = error;

      // Don't retry on certain errors
      if (
        error.message?.includes("SAFETY") ||
        error.message?.includes("INVALID_ARGUMENT")
      ) {
        console.error("Non-retryable error, stopping:", error.message);
        return null;
      }

      // Wait before retry (exponential backoff)
      if (attempt < maxRetries) {
        const waitTime = Math.pow(2, attempt) * 1000; // 1s, 2s, 4s
        console.log(`Retrying AI analysis in ${waitTime}ms...`);
        await new Promise((resolve) => setTimeout(resolve, waitTime));
      }
    }
  }

  console.error("AI analysis failed after all retries:", lastError);
  return null;
}
