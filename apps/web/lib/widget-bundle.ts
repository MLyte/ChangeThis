import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const currentDir = dirname(fileURLToPath(import.meta.url));
const widgetPath = join(currentDir, "..", "..", "..", "packages", "widget", "dist", "widget.global.js");

export async function readWidgetBundle(): Promise<string> {
  return readFile(widgetPath, "utf8");
}
