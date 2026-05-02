#!/usr/bin/env node

import { stat } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const bundlePath = resolve(scriptDir, "../packages/widget/dist/widget.global.js");

// Commercial widget budget: keep the raw IIFE bundle under 280 KiB.
// Current baseline is about 249 KiB; this leaves a small buffer without hiding growth.
const maxBytes = 280 * 1024;

const formatKiB = (bytes) => `${(bytes / 1024).toFixed(1)} KiB`;

try {
  const { size } = await stat(bundlePath);

  if (size > maxBytes) {
    console.error(
      `[widget-size] ${bundlePath} is ${formatKiB(size)}, above the ${formatKiB(maxBytes)} budget.`,
    );
    process.exitCode = 1;
  } else {
    console.log(`[widget-size] ${bundlePath} is ${formatKiB(size)} / ${formatKiB(maxBytes)}.`);
  }
} catch (error) {
  console.error(`[widget-size] Unable to read ${bundlePath}. Run the widget build first.`);
  console.error(`[widget-size] ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
}
