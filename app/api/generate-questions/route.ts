import { NextRequest, NextResponse } from "next/server";
import { ai } from "@/lib/gemini";
import { createPartFromUri, createUserContent } from "@google/genai";

export async function POST(request: NextRequest) {
  try {
    // Parse request body
    let body;
    try {
      body = await request.json();
    } catch (parseError: any) {
      console.error("JSON parse error:", parseError);
      return NextResponse.json(
        { error: "Ungültiges JSON im Request Body", success: false },
        { status: 400 }
      );
    }

    const { fileUris } = body;

    if (!fileUris || fileUris.length === 0) {
      return NextResponse.json(
        { error: "Keine Dateien angegeben", success: false },
        { status: 400 }
      );
    }

    // Validate fileUris structure
    for (const file of fileUris) {
      if (!file.uri || !file.mimeType) {
        console.error("Invalid file structure:", file);
        return NextResponse.json(
          { error: "Ungültige Dateistruktur (uri oder mimeType fehlt)", success: false },
          { status: 400 }
        );
      }
    }

    console.log(`Generating questions for ${fileUris.length} file(s)`);

    // Limitation: File Search Store URIs cannot be used directly with createPartFromUri
    // Only works with direct Files API URIs
    // For large websites (>10 files), skip question generation
    if (fileUris.length > 10) {
      console.log("Too many files for question generation (File Search Store limitation), returning fallback questions");
      return NextResponse.json({
        success: true,
        questions: [
          "Was ist der Hauptinhalt dieser Webseite?",
          "Welche Themen werden hier behandelt?",
          "Gibt es spezielle Angebote oder Dienstleistungen?",
          "Wo finde ich weitere Informationen?",
        ],
      });
    }

    // Note: Files are already verified as ACTIVE by create-chat API
    // No need to check again - this saves ~50 API requests per website scrape

    // IMPORTANT: File parts must come FIRST, then the prompt
    // Limit to first 5 files to avoid API errors
    const limitedFiles = fileUris.slice(0, 5);
    const parts = [
      ...limitedFiles.map((file: any) =>
        createPartFromUri(file.uri, file.mimeType)
      ),
      "Basierend auf dem Inhalt der hochgeladenen Dokumente, generiere 4 Fragen die ein Nutzer stellen könnte. Gib nur die Fragen zurück, nummeriert von 1-4:\n\n1.\n2.\n3.\n4."
    ];

    console.log("Sending request to Gemini with parts:", {
      fileCount: limitedFiles.length,
      files: limitedFiles.map((f: any) => ({ name: f.name, uri: f.uri, mimeType: f.mimeType })),
      promptAtEnd: true
    });

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: createUserContent(parts),
      config: {
        temperature: 0.7,
        maxOutputTokens: 1024, // Increased from 512
      }
    });

    const text = response.text || "";
    console.log("Generated text:", text);

    // Parse the numbered questions - more flexible parsing
    let questions: string[] = [];

    // Try different parsing strategies
    const lines = text.split("\n").map(line => line.trim()).filter(line => line.length > 0);

    // Strategy 1: Lines starting with 1., 2., 3., 4.
    questions = lines
      .filter(line => line.match(/^[1-4]\./))
      .map(line => line.replace(/^[1-4]\.\s*/, "").trim())
      .filter(q => q.length > 0);

    // Strategy 2: If that didn't work, try lines starting with any number
    if (questions.length === 0) {
      questions = lines
        .filter(line => line.match(/^\d+\./))
        .map(line => line.replace(/^\d+\.\s*/, "").trim())
        .filter(q => q.length > 0)
        .slice(0, 4);
    }

    // Strategy 3: If still nothing, try lines starting with - or *
    if (questions.length === 0) {
      questions = lines
        .filter(line => line.match(/^[-*]/))
        .map(line => line.replace(/^[-*]\s*/, "").trim())
        .filter(q => q.length > 0)
        .slice(0, 4);
    }

    // Strategy 4: If still nothing, just take the first 4 non-empty lines
    if (questions.length === 0) {
      questions = lines.slice(0, 4);
    }

    console.log("Parsed questions:", questions);

    return NextResponse.json({
      success: true,
      questions,
      debugText: process.env.NODE_ENV === 'development' ? text : undefined, // For debugging
    });
  } catch (error: any) {
    console.error("Generate questions error:", error);
    console.error("Error stack:", error.stack);

    // Always return JSON, never HTML
    return NextResponse.json(
      {
        error: error.message || "Fehler beim Generieren der Fragen",
        success: false,
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}
