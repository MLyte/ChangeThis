import {
  validateIssueTarget,
  type IssueTarget,
  type Site,
  type Workspace
} from "@changethis/shared";

export type ChangeThisProject = Site & {
  issueTarget: IssueTarget;
};

const localTimestamp = "2026-04-27T00:00:00.000Z";

export const localWorkspace: Workspace = {
  id: "workspace_changethis_local",
  name: "ChangeThis Local",
  slug: "changethis-local",
  createdAt: localTimestamp,
  updatedAt: localTimestamp
};

function projectKey(envName: string, fallback: string): string {
  const configuredKey = process.env[envName];

  if (configuredKey) {
    return configuredKey;
  }

  if (process.env.VERCEL_ENV === "production") {
    throw new Error(`${envName} must be configured in production`);
  }

  return fallback;
}

export const demoProject: ChangeThisProject = {
  id: "site_demo",
  workspaceId: localWorkspace.id,
  publicKey: projectKey("NEXT_PUBLIC_DEMO_PROJECT_KEY", "demo_project_key"),
  name: "Demo ChangeThis",
  allowedOrigins: [
    "http://localhost:3000",
    "http://127.0.0.1:3000"
  ],
  issueTarget: {
    provider: "github",
    namespace: "MLyte",
    project: "ChangeThis",
    webUrl: "https://github.com/MLyte/ChangeThis"
  },
  createdAt: localTimestamp,
  updatedAt: localTimestamp
};

validateDemoProject();

function validateDemoProject(): void {
  const validation = validateIssueTarget(demoProject.issueTarget);
  if (!validation.ok) {
    throw new Error(`Invalid demo issue target: ${validation.error}`);
  }
}
