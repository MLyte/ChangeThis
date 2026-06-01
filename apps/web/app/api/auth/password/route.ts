import { NextResponse } from "next/server";
import { getAuthMode, isAuthFailure, requireWorkspaceSession } from "../../../../lib/auth";
import { changeInternalPassword } from "../../../../lib/internal-api";

export async function POST(request: Request) {
  const session = await requireWorkspaceSession(request);
  if (isAuthFailure(session)) {
    return NextResponse.json({ error: session.error }, { status: session.status });
  }

  if (getAuthMode() !== "internal") {
    return NextResponse.json({ error: "password_change_unavailable" }, { status: 409 });
  }

  let body: {
    currentPassword?: unknown;
    newPassword?: unknown;
  };

  try {
    body = await request.json() as typeof body;
  } catch {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }

  const currentPassword = typeof body.currentPassword === "string" ? body.currentPassword : "";
  const newPassword = typeof body.newPassword === "string" ? body.newPassword : "";
  if (!currentPassword || newPassword.length < 8) {
    return NextResponse.json({ error: "invalid_password" }, { status: 422 });
  }

  const result = await changeInternalPassword({ currentPassword, newPassword }, request);
  if (!result.ok) {
    const status = result.error === "invalid" ? 401 : result.error === "missing" ? 422 : 503;
    return NextResponse.json({ error: result.error }, { status });
  }

  return NextResponse.json({ ok: true });
}
