import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const scanRoots = ["apps/web"];
const extensions = new Set([".css", ".ts", ".tsx", ".js", ".jsx"]);
const ignoredSegments = new Set([".next", "node_modules"]);

const allowedPrimaryHex = new Set([
  "#e8eaf6",
  "#c5cae9",
  "#9fa8da",
  "#7986cb",
  "#5c6bc0",
  "#3f51b5",
  "#3949ab",
  "#303f9f",
  "#283593",
  "#1a237e",
  "#334296",
  "#28347a",
]);

const allowedBrandHex = new Set([
  "#24292f",
  "#eaecef",
  "#fc6d26",
  "#fff0e8",
  "#d0d7de",
  "#ffd2bd",
]);

const allowedPrimaryRgb = new Set([
  "232,234,246",
  "197,202,233",
  "159,168,218",
  "121,134,203",
  "92,107,192",
  "63,81,181",
  "57,73,171",
  "48,63,159",
  "40,53,147",
  "26,35,126",
  "51,66,150",
  "40,52,122",
]);

function isIgnored(filePath) {
  return filePath.split(path.sep).some((segment) => ignoredSegments.has(segment));
}

async function listFiles(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (isIgnored(fullPath)) continue;
    if (entry.isDirectory()) {
      files.push(...(await listFiles(fullPath)));
      continue;
    }
    if (entry.isFile() && extensions.has(path.extname(entry.name))) {
      files.push(fullPath);
    }
  }

  return files;
}

function isNeutralHex(hex) {
  if (hex === "#fff" || hex === "#ffffff") return true;
  if (hex.length === 4) return hex[1] === hex[2] && hex[2] === hex[3];
  if (hex.length !== 7) return false;

  const r = hex.slice(1, 3);
  const g = hex.slice(3, 5);
  const b = hex.slice(5, 7);
  return r === g && g === b;
}

function isAllowedRgb(values) {
  const [r, g, b] = values;
  if (r === g && g === b) return true;
  return allowedPrimaryRgb.has(values.join(","));
}

const issues = [];

for (const scanRoot of scanRoots) {
  const files = await listFiles(path.join(root, scanRoot));

  for (const file of files) {
    let content;
    try {
      content = await readFile(file, "utf8");
    } catch {
      continue;
    }

    const relative = path.relative(root, file);
    const lines = content.split(/\r?\n/);

    lines.forEach((line, index) => {
      const lineNumber = index + 1;

      for (const match of line.matchAll(/#[0-9A-Fa-f]{3,8}/g)) {
        const hex = match[0].toLowerCase();
        if (hex === "#feedbac") continue;
        if (!allowedPrimaryHex.has(hex) && !allowedBrandHex.has(hex) && !isNeutralHex(hex)) {
          issues.push(`${relative}:${lineNumber} disallowed hex ${hex}`);
        }
      }

      for (const match of line.matchAll(/rgba?\(\s*([0-9.]+)\s*,\s*([0-9.]+)\s*,\s*([0-9.]+)/g)) {
        const values = match.slice(1, 4).map((value) => Number.parseInt(value, 10));
        if (!isAllowedRgb(values)) {
          issues.push(`${relative}:${lineNumber} disallowed rgb(${values.join(", ")})`);
        }
      }

      if (/\bhsla?\(/.test(line)) {
        issues.push(`${relative}:${lineNumber} hsl/hsla is not allowed by the color policy`);
      }

      if (/\bcolor-mix\(/.test(line)) {
        issues.push(`${relative}:${lineNumber} color-mix is not allowed by the color policy`);
      }
    });
  }
}

if (issues.length > 0) {
  console.error("Color policy violations:");
  for (const issue of issues) {
    console.error(`- ${issue}`);
  }
  process.exit(1);
}

console.log("Color policy OK: only primary, fully desaturated neutrals, and provider brand exceptions were found.");


