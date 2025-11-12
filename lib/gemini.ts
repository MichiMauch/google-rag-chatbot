import { GoogleGenAI } from "@google/genai";

const apiKey = process.env.GOOGLE_AI_API_KEY;

if (!apiKey) {
  throw new Error("GOOGLE_AI_API_KEY is not configured");
}

export const ai = new GoogleGenAI({ apiKey });

// Upload a file to Google's File API
export async function uploadFile(file: File) {
  try {
    const buffer = Buffer.from(await file.arrayBuffer());

    // Create a temporary file path (for Node.js environment)
    const tempPath = `/tmp/${Date.now()}-${file.name}`;
    const fs = await import('fs');
    fs.writeFileSync(tempPath, buffer);

    // Upload the file using the Files API
    const uploadedFile = await ai.files.upload({
      file: tempPath,
      config: {
        mimeType: file.type,
        displayName: file.name,
      },
    });

    // Clean up temp file
    fs.unlinkSync(tempPath);

    return uploadedFile;
  } catch (error) {
    console.error("Error uploading file:", error);
    throw error;
  }
}

// List all uploaded files
export async function listFiles() {
  try {
    const response = await ai.files.list({});
    const files = [];

    // The response is a pager, iterate through it
    for await (const file of response) {
      files.push(file);
    }

    return files;
  } catch (error) {
    console.error("Error listing files:", error);
    throw error;
  }
}

// Delete a file
export async function deleteFile(fileName: string) {
  try {
    await ai.files.delete({ name: fileName });
    return { success: true };
  } catch (error) {
    console.error("Error deleting file:", error);
    throw error;
  }
}
