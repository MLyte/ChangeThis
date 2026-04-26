import { NextResponse } from "next/server";
import { readWidgetBundle } from "../../lib/widget-bundle";

export async function GET() {
  try {
    const widget = await readWidgetBundle();

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
