import { NextRequest, NextResponse } from "next/server";
import { listFiles, deleteFile } from "@/lib/gemini";

// GET - List all uploaded files
export async function GET(request: NextRequest) {
  try {
    const files = await listFiles();

    return NextResponse.json({
      success: true,
      files: files.map((file: any) => ({
        name: file.name,
        displayName: file.displayName,
        mimeType: file.mimeType,
        sizeBytes: file.sizeBytes,
        createTime: file.createTime,
        uri: file.uri,
      })),
    });
  } catch (error: any) {
    console.error("List files error:", error);
    return NextResponse.json(
      { error: error.message || "Fehler beim Abrufen der Dateien" },
      { status: 500 }
    );
  }
}

// DELETE - Delete a file
export async function DELETE(request: NextRequest) {
  try {
    // Parse request body
    let body;
    try {
      body = await request.json();
    } catch (parseError: any) {
      console.error("JSON parse error in DELETE:", parseError);
      return NextResponse.json(
        { error: "Ungültiges JSON im Request Body", success: false },
        { status: 400 }
      );
    }

    const { fileName } = body;

    if (!fileName) {
      return NextResponse.json(
        { error: "Dateiname fehlt", success: false },
        { status: 400 }
      );
    }

    console.log("Attempting to delete file:", fileName);

    await deleteFile(fileName);

    console.log("File deleted successfully:", fileName);

    return NextResponse.json({
      success: true,
      message: "Datei erfolgreich gelöscht",
    });
  } catch (error: any) {
    console.error("Delete file error:", error);
    console.error("Error stack:", error.stack);

    // Always return JSON, never HTML
    return NextResponse.json(
      {
        error: error.message || "Fehler beim Löschen",
        success: false,
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}
