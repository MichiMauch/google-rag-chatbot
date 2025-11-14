import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { chatMessages } from "@/lib/schema";
import { eq } from "drizzle-orm";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { messageId, feedback } = body;

    // Validation
    if (!messageId) {
      return NextResponse.json(
        { error: "Message ID ist erforderlich" },
        { status: 400 }
      );
    }

    if (feedback !== 1 && feedback !== -1) {
      return NextResponse.json(
        { error: "Feedback muss 1 (thumbs up) oder -1 (thumbs down) sein" },
        { status: 400 }
      );
    }

    // Check if message exists
    const message = await db.query.chatMessages.findFirst({
      where: eq(chatMessages.id, messageId),
    });

    if (!message) {
      return NextResponse.json(
        { error: "Nachricht nicht gefunden" },
        { status: 404 }
      );
    }

    // Only allow feedback on assistant messages
    if (message.role !== "assistant") {
      return NextResponse.json(
        { error: "Feedback kann nur für Assistant-Nachrichten gegeben werden" },
        { status: 400 }
      );
    }

    // Update the message with feedback
    const updatedMessage = await db
      .update(chatMessages)
      .set({
        feedback: feedback,
        feedbackAt: Date.now(),
      })
      .where(eq(chatMessages.id, messageId))
      .returning();

    return NextResponse.json({
      success: true,
      message: "Feedback gespeichert",
      data: updatedMessage[0],
    });
  } catch (error: any) {
    console.error("Error saving feedback:", error);
    return NextResponse.json(
      { error: error.message || "Fehler beim Speichern des Feedbacks" },
      { status: 500 }
    );
  }
}
