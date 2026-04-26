import { NextResponse } from "next/server";
import { findProjectByKey } from "../../../../lib/demo-project";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const projectKey = searchParams.get("project");
  const project = projectKey ? findProjectByKey(projectKey) : undefined;

  if (!project) {
    return NextResponse.json({ error: "Unknown project" }, { status: 404 });
  }

  return NextResponse.json({
    projectKey: project.publicKey,
    name: project.name,
    modes: ["comment", "pin", "screenshot"],
    endpoint: "/api/public/feedback"
  });
}
