import type { IssueProvider, IssueTarget } from "@changethis/shared";

export type ChangeThisProject = {
  publicKey: string;
  name: string;
  allowedOrigins: string[];
  issueTarget: IssueTarget;
};

export type ProviderIntegrationStatus = "connected" | "needs_setup" | "needs_reconnect";

export type ProviderIntegrationSummary = {
  provider: IssueProvider;
  name: string;
  accountLabel: string;
  status: ProviderIntegrationStatus;
  connectPath: string;
  managePath?: string;
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

export const changeThisProjects: ChangeThisProject[] = [
  {
    publicKey: projectKey("NEXT_PUBLIC_CHANGETHIS_PROJECT_KEY", process.env.NEXT_PUBLIC_DEMO_PROJECT_KEY ?? "changethis_project_key"),
    name: "ChangeThis",
    allowedOrigins: [...localOrigins, ...mathieuOrigins],
    issueTarget: {
      provider: "github",
      namespace: "MLyte",
      project: "ChangeThis",
      webUrl: "https://github.com/MLyte/ChangeThis"
    }
  },
  {
    publicKey: projectKey("NEXT_PUBLIC_ANDENNE_BEARS_PROJECT_KEY", "andenne_bears_project_key"),
    name: "Andenne Bears",
    allowedOrigins: [...localOrigins, ...mathieuOrigins, ...andenneOrigins],
    issueTarget: {
      provider: "github",
      namespace: "MLyte",
      project: "andenne-bears.be",
      webUrl: "https://github.com/MLyte/andenne-bears.be"
    }
  },
  {
    publicKey: projectKey("NEXT_PUBLIC_OPTIMASTER_PROJECT_KEY", "optimaster_project_key"),
    name: "OptiMaster",
    allowedOrigins: [...localOrigins, ...mathieuOrigins],
    issueTarget: {
      provider: "github",
      namespace: "MLyte",
      project: "OptiMaster",
      webUrl: "https://github.com/MLyte/OptiMaster"
    }
  },
  {
    publicKey: projectKey("NEXT_PUBLIC_YODA_CARROSSERIE_PROJECT_KEY", "yoda_carrosserie_project_key"),
    name: "Yoda Carrosserie Service",
    allowedOrigins: [...localOrigins, ...mathieuOrigins],
    issueTarget: {
      provider: "github",
      namespace: "MLyte",
      project: "YodaCarrosserieService",
      webUrl: "https://github.com/MLyte/YodaCarrosserieService"
    }
  }
];

export const demoProject = changeThisProjects[0];

export const providerIntegrations: ProviderIntegrationSummary[] = [
  {
    provider: "github",
    name: "GitHub",
    accountLabel: "MLyte",
    status: "connected",
    connectPath: "/api/integrations/github/connect",
    managePath: "https://github.com/settings/installations"
  },
  {
    provider: "gitlab",
    name: "GitLab",
    accountLabel: "Aucun compte lie",
    status: "needs_setup",
    connectPath: "/api/integrations/gitlab/connect"
  }
];

export function findProjectByKey(projectKey: string): ChangeThisProject | undefined {
  return changeThisProjects.find((project) => project.publicKey === projectKey);
}

export function isKnownOrigin(origin: string | null): boolean {
  return Boolean(origin && changeThisProjects.some((project) => project.allowedOrigins.includes(origin)));
}
