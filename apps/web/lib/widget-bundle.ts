import { readFile } from "node:fs/promises";
import { join } from "node:path";

export async function readWidgetBundle(): Promise<string> {
  const widgetPath = join(process.cwd(), "..", "..", "packages", "widget", "dist", "widget.global.js");
  return readFile(widgetPath, "utf8");
}
