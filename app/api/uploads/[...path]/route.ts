import { NextRequest, NextResponse } from "next/server";
import path from "path";
import fs from "fs";

// MIME type mapping
const mimeTypes: Record<string, string> = {
  ".pdf": "application/pdf",
  ".txt": "text/plain",
  ".md": "text/markdown",
  ".json": "application/json",
  ".xml": "application/xml",
  ".csv": "text/csv",
  ".doc": "application/msword",
  ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ".xls": "application/vnd.ms-excel",
  ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ".rtf": "application/rtf",
};

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    const { path: pathSegments } = await params;

    if (!pathSegments || pathSegments.length === 0) {
      return NextResponse.json(
        { error: "Path is required" },
        { status: 400 }
      );
    }

    // Join path segments and decode
    const requestedPath = pathSegments.map(decodeURIComponent).join("/");

    // Security: Prevent path traversal attacks
    const normalizedPath = path.normalize(requestedPath);
    if (normalizedPath.includes("..") || path.isAbsolute(normalizedPath)) {
      return NextResponse.json(
        { error: "Invalid path" },
        { status: 400 }
      );
    }

    // Build absolute file path
    const uploadsDir = path.join(process.cwd(), "uploads");
    const filePath = path.join(uploadsDir, normalizedPath);

    // Ensure the file is within uploads directory
    if (!filePath.startsWith(uploadsDir)) {
      return NextResponse.json(
        { error: "Access denied" },
        { status: 403 }
      );
    }

    // Check if file exists
    if (!fs.existsSync(filePath)) {
      return NextResponse.json(
        { error: "File not found" },
        { status: 404 }
      );
    }

    // Get file stats
    const stats = fs.statSync(filePath);
    if (!stats.isFile()) {
      return NextResponse.json(
        { error: "Not a file" },
        { status: 400 }
      );
    }

    // Determine MIME type
    const ext = path.extname(filePath).toLowerCase();
    const mimeType = mimeTypes[ext] || "application/octet-stream";

    // Read file
    const fileContent = fs.readFileSync(filePath);

    // Return file with appropriate headers
    return new NextResponse(fileContent, {
      headers: {
        "Content-Type": mimeType,
        "Content-Length": stats.size.toString(),
        "Content-Disposition": `inline; filename="${path.basename(filePath)}"`,
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch (error) {
    console.error("Error serving file:", error);
    return NextResponse.json(
      { error: "Failed to serve file" },
      { status: 500 }
    );
  }
}
