import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { NextResponse } from "next/server";

export async function GET() {
  try {
    const widgetPath = join(process.cwd(), "..", "..", "packages", "widget", "dist", "widget.global.js");
    const widget = await readFile(widgetPath, "utf8");

    return new NextResponse(widget, {
      headers: {
        "Cache-Control": "no-store",
        "Content-Type": "application/javascript; charset=utf-8"
      }
    });
  } catch {
    return NextResponse.json(
      { error: "Widget bundle not found. Run npm run widget:build first." },
      { status: 404 }
    );
  }
}
