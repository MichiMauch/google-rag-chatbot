import { NextRequest, NextResponse } from "next/server";
import { uploadFile, ai } from "@/lib/gemini";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json(
        { error: "Keine Datei hochgeladen" },
        { status: 400 }
      );
    }

    // Upload file to Google Gemini
    let uploadedFile = await uploadFile(file);

    // Wait for file to be processed (important for PDFs and videos)
    const maxWaitTime = 30000; // 30 seconds
    const startTime = Date.now();

    while (uploadedFile.state && uploadedFile.state !== "ACTIVE") {
      if (uploadedFile.state === "FAILED") {
        throw new Error(`Dateiverarbeitung fehlgeschlagen: ${uploadedFile.error || 'Unbekannter Fehler'}`);
      }

      // Timeout check
      if (Date.now() - startTime > maxWaitTime) {
        throw new Error("Timeout: Dateiverarbeitung dauert zu lange");
      }

      // Wait 6 seconds before checking again (optimized to reduce API calls)
      await new Promise(resolve => setTimeout(resolve, 6000));

      // Fetch updated file status
      if (!uploadedFile.name) {
        throw new Error("Dateiname fehlt");
      }
      uploadedFile = await ai.files.get({ name: uploadedFile.name });
    }

    return NextResponse.json({
      success: true,
      file: {
        name: uploadedFile.name,
        displayName: uploadedFile.displayName,
        mimeType: uploadedFile.mimeType,
        sizeBytes: uploadedFile.sizeBytes,
        uri: uploadedFile.uri,
      },
    });
  } catch (error: any) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { error: error.message || "Fehler beim Hochladen" },
      { status: 500 }
    );
  }
}
