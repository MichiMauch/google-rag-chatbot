import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sql } from "drizzle-orm";

/**
 * One-time migration endpoint to add defaultQuestions column
 * Can be deleted after successful migration
 */
export async function POST() {
  try {
    // Check if column already exists
    const tableInfo = await db.all(sql`PRAGMA table_info(chat_configs)`);
    const columnExists = (tableInfo as any[]).some(
      (col: any) => col.name === "default_questions"
    );

    if (columnExists) {
      return NextResponse.json({
        success: true,
        message: "Column default_questions already exists",
      });
    }

    // Add the column
    await db.run(
      sql`ALTER TABLE chat_configs ADD COLUMN default_questions TEXT`
    );

    return NextResponse.json({
      success: true,
      message: "Column default_questions added successfully",
    });
  } catch (error: any) {
    console.error("Migration error:", error);
    return NextResponse.json(
      { error: error.message || "Migration failed" },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    // Check current state
    const tableInfo = await db.all(sql`PRAGMA table_info(chat_configs)`);
    const columns = (tableInfo as any[]).map((col: any) => col.name);

    return NextResponse.json({
      columns,
      hasDefaultQuestions: columns.includes("default_questions"),
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to check schema" },
      { status: 500 }
    );
  }
}
