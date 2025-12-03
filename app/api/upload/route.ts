import { NextRequest, NextResponse } from "next/server";
import { uploadFile, ai } from "@/lib/gemini";
import fs from "fs";
import path from "path";

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

    // Save file locally for preview functionality
    let localPath: string | undefined;
    try {
      const uploadsDir = path.join(process.cwd(), "uploads");

      // Ensure uploads directory exists
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
      }

      // Use Gemini file ID as unique filename, preserve original extension
      const fileId = uploadedFile.name?.replace("files/", "") || Date.now().toString();
      const originalExt = path.extname(file.name);
      const localFileName = `${fileId}${originalExt}`;
      const localFilePath = path.join(uploadsDir, localFileName);

      // Write file to local storage
      const buffer = Buffer.from(await file.arrayBuffer());
      fs.writeFileSync(localFilePath, buffer);

      localPath = localFileName;
      console.log(`[Upload] File saved locally: ${localFileName}`);
    } catch (localError) {
      console.error("Error saving file locally:", localError);
      // Continue without local storage - preview won't work but upload succeeded
    }

    return NextResponse.json({
      success: true,
      file: {
        name: uploadedFile.name,
        displayName: uploadedFile.displayName,
        mimeType: uploadedFile.mimeType,
        sizeBytes: uploadedFile.sizeBytes,
        uri: uploadedFile.uri,
        localPath, // Path to local file for preview
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
