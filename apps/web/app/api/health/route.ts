import { NextResponse } from "next/server";
import { getAuthMode } from "../../../lib/auth";
import { getDataStoreMode } from "../../../lib/runtime";

export async function GET() {
  return NextResponse.json({
    ok: true,
    service: "changethis-web",
    authMode: getAuthMode(),
    dataStore: getDataStoreMode(),
    timestamp: new Date().toISOString()
  });
}
