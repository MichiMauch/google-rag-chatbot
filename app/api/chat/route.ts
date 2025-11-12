import { NextRequest, NextResponse } from "next/server";
import { ai } from "@/lib/gemini";
import { createPartFromUri, createUserContent } from "@google/genai";

// Only use gemini-2.5-flash - no fallback to other models
const MODEL = "gemini-2.5-flash";

// Helper function for exponential backoff retry (optimized for overload)
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries = 4,  // Increased to 4 for better overload handling
  baseDelay = 2000  // Increased to 2s base delay
): Promise<T> {
  let lastError: any;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;

      // DON'T retry on quota errors - fail fast and try next model
      const isQuotaError =
        error.message?.includes("quota") ||
        error.message?.includes("429") ||
        error.message?.includes("RESOURCE_EXHAUSTED") ||
        error.status === 429;

      if (isQuotaError) {
        console.log("Quota error detected - skipping retries");
        throw error;
      }

      // Only retry on temporary overload errors
      const shouldRetry =
        error.message?.includes("overloaded") ||
        error.message?.includes("503") ||
        error.message?.includes("UNAVAILABLE") ||
        error.status === 503;

      if (!shouldRetry || attempt === maxRetries - 1) {
        throw error;
      }

      // Exponential backoff: 2s, 4s, 8s, 16s (for overload tolerance)
      const delay = baseDelay * Math.pow(2, attempt);
      console.log(`Retry attempt ${attempt + 1} after ${delay}ms...`);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}

// Direct call to gemini-2.5-flash with retry logic
async function generateWithRetry(params: any): Promise<any> {
  console.log(`Using model: ${MODEL}`);

  try {
    const response = await retryWithBackoff(
      () => ai.models.generateContent({
        ...params,
        model: MODEL,
      })
    );

    console.log(`Success with model: ${MODEL}`);
    return response;
  } catch (error: any) {
    console.error(`Model ${MODEL} failed after all retries:`, error.message);
    console.error(`Error status: ${error.status}, Error code: ${error.code}`);
    throw error;
  }
}

export async function POST(request: NextRequest) {
  try {
    const { message, fileSearchStoreName, files } = await request.json();

    if (!message) {
      return NextResponse.json(
        { error: "Keine Nachricht angegeben" },
        { status: 400 }
      );
    }

    let response;

    if (fileSearchStoreName) {
      // Use File Search tool for RAG
      const prompt = `Beantworte die folgende Frage prägnant und auf den Punkt gebracht. Beschränke deine Antwort auf maximal 3-4 kurze Absätze. Schreibe in einem natürlichen, flüssigen Schreibstil mit zusammenhängenden Sätzen. Markiere wichtige Aussagen, Zahlen und Kernpunkte mit Fettdruck (**Text**). Verzichte auf Einleitungen wie "Basierend auf..." oder "Gemäß den Dokumenten...". Wenn die Information nicht verfügbar ist, antworte kurz: "Diese Information ist nicht in den Dokumenten enthalten."\n\n${message}`;

      response = await generateWithRetry({
        contents: prompt,
        config: {
          temperature: 0.7,
          maxOutputTokens: 8192,
          tools: [
            {
              fileSearch: {
                fileSearchStoreNames: [fileSearchStoreName],
              },
            },
          ],
        }
      });
    } else {
      // No File Search Store - regular chat
      response = await generateWithRetry({
        contents: message,
        config: {
          temperature: 0.7,
          maxOutputTokens: 8192,
        }
      });
    }

    // Extract text from response
    const text = response.text || "";

    // Extract grounding metadata to identify which files were actually used
    let usedFileUris: string[] | undefined;

    console.log("Full response structure:", JSON.stringify({
      hasCandidates: !!response.candidates,
      candidateCount: response.candidates?.length,
      hasGroundingMetadata: !!response.candidates?.[0]?.groundingMetadata,
      groundingMetadata: response.candidates?.[0]?.groundingMetadata,
    }, null, 2));

    if (response.candidates && response.candidates[0]?.groundingMetadata) {
      const groundingMetadata = response.candidates[0].groundingMetadata;
      const extractedFileUris: string[] = [];

      console.log("Grounding Metadata found:", JSON.stringify(groundingMetadata, null, 2));

      // Extract file URIs from grounding chunks
      if (groundingMetadata.groundingChunks) {
        console.log(`Found ${groundingMetadata.groundingChunks.length} grounding chunks`);

        for (const chunk of groundingMetadata.groundingChunks) {
          console.log("Processing chunk:", JSON.stringify(chunk, null, 2));

          if (chunk.web?.uri) {
            // Skip web sources
            console.log("Skipping web source:", chunk.web.uri);
            continue;
          }

          // File Search Tool uses different structure than Files API
          // It provides: title (filename) + fileSearchStore (store name), but NO uri
          if (chunk.retrievedContext?.title && chunk.retrievedContext?.fileSearchStore) {
            // Construct URI from store name + filename
            const uri = `${chunk.retrievedContext.fileSearchStore}/files/${chunk.retrievedContext.title}`;
            console.log("Constructed URI from File Search chunk:", uri);

            if (!extractedFileUris.includes(uri)) {
              extractedFileUris.push(uri);
            }
          } else if (chunk.retrievedContext?.uri) {
            // Fallback for direct Files API (old approach)
            const uri = chunk.retrievedContext.uri;
            console.log("Found retrieved context URI (Files API):", uri);
            if (!extractedFileUris.includes(uri)) {
              extractedFileUris.push(uri);
            }
          }
        }
      }

      console.log("Extracted file URIs:", extractedFileUris);

      if (extractedFileUris.length > 0) {
        usedFileUris = extractedFileUris;
      }
    } else {
      console.log("No grounding metadata found in response");
    }
    // If no grounding metadata: Don't show sources or images
    // (We can't know which files were actually used)

    return NextResponse.json({
      success: true,
      response: text,
      usedFileUris,
    });
  } catch (error: any) {
    console.error("Chat error:", error);

    // Provide user-friendly error messages
    let errorMessage = "Fehler bei der Anfrage";

    if (error.message?.includes("overloaded") || error.message?.includes("UNAVAILABLE") || error.status === 503) {
      errorMessage = "⏳ gemini-2.5-flash ist momentan überlastet. Bitte warte 1-2 Minuten und versuche es erneut.";
    } else if (error.message?.includes("quota") || error.message?.includes("429")) {
      errorMessage = "API-Limit für gemini-2.5-flash erreicht. Bitte versuche es in ein paar Stunden erneut.";
    } else if (error.message?.includes("invalid") || error.message?.includes("400")) {
      errorMessage = "Ungültige Anfrage. Bitte überprüfe deine Eingabe.";
    } else if (error.message) {
      errorMessage = error.message;
    }

    return NextResponse.json(
      { error: errorMessage, success: false },
      { status: error.status || 500 }
    );
  }
}
