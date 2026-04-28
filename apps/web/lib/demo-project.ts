import {
  validateIssueTarget,
  type IssueTarget,
  type Site,
  type Workspace
} from "@changethis/shared";

export type ChangeThisProject = Site & {
  issueTarget: IssueTarget;
};

const localOrigins = [
  "http://localhost:3000",
  "http://127.0.0.1:3000",
  "http://localhost:8080",
  "http://127.0.0.1:8080"
];

const mathieuOrigins = [
  "https://mathieuluyten.be",
  "https://www.mathieuluyten.be"
];

const andenneOrigins = [
  "https://andenne-bears.be",
  "https://www.andenne-bears.be"
];

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

const localTimestamp = "2026-04-27T00:00:00.000Z";

export const localWorkspace: Workspace = {
  id: "workspace_changethis_local",
  name: "ChangeThis Local",
  slug: "changethis-local",
  createdAt: localTimestamp,
  updatedAt: localTimestamp
};

export const localSites: Site[] = [
  {
    id: "site_changethis",
    workspaceId: localWorkspace.id,
    publicKey: projectKey("NEXT_PUBLIC_CHANGETHIS_PROJECT_KEY", process.env.NEXT_PUBLIC_DEMO_PROJECT_KEY ?? "changethis_project_key"),
    name: "ChangeThis",
    allowedOrigins: [...localOrigins, ...mathieuOrigins],
    createdAt: localTimestamp,
    updatedAt: localTimestamp
  },
  {
    id: "site_andenne_bears",
    workspaceId: localWorkspace.id,
    publicKey: projectKey("NEXT_PUBLIC_ANDENNE_BEARS_PROJECT_KEY", "andenne_bears_project_key"),
    name: "Andenne Bears",
    allowedOrigins: [...localOrigins, ...mathieuOrigins, ...andenneOrigins],
    createdAt: localTimestamp,
    updatedAt: localTimestamp
  },
  {
    id: "site_optimaster",
    workspaceId: localWorkspace.id,
    publicKey: projectKey("NEXT_PUBLIC_OPTIMASTER_PROJECT_KEY", "optimaster_project_key"),
    name: "OptiMaster",
    allowedOrigins: [...localOrigins, ...mathieuOrigins],
    createdAt: localTimestamp,
    updatedAt: localTimestamp
  },
  {
    id: "site_yoda_carrosserie",
    workspaceId: localWorkspace.id,
    publicKey: projectKey("NEXT_PUBLIC_YODA_CARROSSERIE_PROJECT_KEY", "yoda_carrosserie_project_key"),
    name: "Yoda Carrosserie Service",
    allowedOrigins: [...localOrigins, ...mathieuOrigins],
    createdAt: localTimestamp,
    updatedAt: localTimestamp
  }
];

const localSiteIssueTargets: Record<string, IssueTarget> = {
  site_changethis: {
    provider: "github",
    namespace: "MLyte",
    project: "ChangeThis",
    webUrl: "https://github.com/MLyte/ChangeThis"
  },
  site_andenne_bears: {
    provider: "github",
    namespace: "MLyte",
    project: "andenne-bears.be",
    webUrl: "https://github.com/MLyte/andenne-bears.be"
  },
  site_optimaster: {
    provider: "github",
    namespace: "MLyte",
    project: "OptiMaster",
    webUrl: "https://github.com/MLyte/OptiMaster"
  },
  site_yoda_carrosserie: {
    provider: "github",
    namespace: "MLyte",
    project: "YodaCarrosserieService",
    webUrl: "https://github.com/MLyte/YodaCarrosserieService"
  }
};

export const changeThisProjects: ChangeThisProject[] = localSites.map((site) => ({
  ...site,
  issueTarget: localSiteIssueTargets[site.id]
}));

export const demoProject = changeThisProjects[0];

export const providerIntegrations = [
  {
    id: "integration_github_mlyte",
    workspaceId: localWorkspace.id,
    provider: "github",
    name: "GitHub",
    accountLabel: "MLyte",
    status: "connected",
    connectPath: "/api/integrations/github/connect",
    managePath: "https://github.com/settings/installations",
    createdAt: localTimestamp,
    updatedAt: localTimestamp
  },
  {
    id: "integration_gitlab_local",
    workspaceId: localWorkspace.id,
    provider: "gitlab",
    name: "GitLab",
    accountLabel: "Aucun compte lié",
    status: "needs_setup",
    connectPath: "/api/integrations/gitlab/connect",
    createdAt: localTimestamp,
    updatedAt: localTimestamp
  }
];

validateDefaultProjects(changeThisProjects);

export function findProjectByKey(projectKey: string): ChangeThisProject | undefined {
  return changeThisProjects.find((project) => project.publicKey === projectKey);
}

export function isKnownOrigin(origin: string | null): boolean {
  return Boolean(origin && changeThisProjects.some((project) => project.allowedOrigins.includes(origin)));
}

function validateDefaultProjects(projects: ChangeThisProject[]): void {
  const seenKeys = new Set<string>();

  for (const project of projects) {
    if (seenKeys.has(project.publicKey)) {
      throw new Error(`Duplicate project key configured: ${project.publicKey}`);
    }

    seenKeys.add(project.publicKey);

    const validation = validateIssueTarget(project.issueTarget);
    if (!validation.ok) {
      throw new Error(`Invalid issue target for ${project.name}: ${validation.error}`);
    }
  }
}
