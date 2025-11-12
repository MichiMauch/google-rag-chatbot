import { NextRequest, NextResponse } from "next/server";
import { ai } from "@/lib/gemini";

export async function POST(request: NextRequest) {
  try {
    const { chatName, fileSearchStoreName } = await request.json();

    if (!chatName || !fileSearchStoreName) {
      return NextResponse.json(
        { error: "Chat-Name und File Search Store Name erforderlich" },
        { status: 400 }
      );
    }

    console.log(`Deleting File Search Store for chat: ${chatName}`);
    console.log(`Store name: ${fileSearchStoreName}`);

    // Delete the File Search Store
    await ai.fileSearchStores.delete({
      name: fileSearchStoreName,
    });

    console.log(`File Search Store deleted successfully: ${fileSearchStoreName}`);

    return NextResponse.json({
      success: true,
      message: "Chat erfolgreich gelöscht",
    });
  } catch (error: any) {
    console.error("Delete chat error:", error);

    // If store doesn't exist or already deleted, still return success
    if (error.status === 404 || error.message?.includes("not found")) {
      return NextResponse.json({
        success: true,
        message: "Chat bereits gelöscht oder nicht gefunden",
      });
    }

    return NextResponse.json(
      { error: error.message || "Fehler beim Löschen des Chats" },
      { status: 500 }
    );
  }
}
