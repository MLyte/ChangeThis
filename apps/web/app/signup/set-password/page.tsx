import { redirect } from "next/navigation";
import { getAuthMode, getCurrentSession } from "../../../lib/auth";

export const dynamic = "force-dynamic";

export default async function SetPasswordPage() {
  const isLocalMode = getAuthMode() === "local";
  const session = await getCurrentSession();

  if (isLocalMode || session?.workspace) {
    redirect("/settings/connected-sites");
  }

  redirect(session ? "/settings/connected-sites" : "/signup");
}
