import { NextResponse } from "next/server";
import { demoProject } from "../../../../lib/demo-project";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const projectKey = searchParams.get("project");

  if (projectKey !== demoProject.publicKey) {
    return NextResponse.json({ error: "Unknown project" }, { status: 404 });
  }

  return NextResponse.json({
    projectKey: demoProject.publicKey,
    name: demoProject.name,
    modes: ["comment", "pin", "screenshot"],
    endpoint: "/api/public/feedback"
  });
}
