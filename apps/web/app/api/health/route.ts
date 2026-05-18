import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    ok: true,
    git: {
      branch: process.env.RAILWAY_GIT_BRANCH,
      commit: process.env.RAILWAY_GIT_COMMIT_SHA
    },
    railway: {
      environment: process.env.RAILWAY_ENVIRONMENT_NAME
    },
    timestamp: new Date().toISOString()
  }, {
    headers: {
      "Cache-Control": "no-store"
    }
  });
}
